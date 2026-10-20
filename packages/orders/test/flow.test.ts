import { afterAll, beforeAll, expect, test } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { InventoryService, type InventoryClient } from '@grpc-poc/common/src/inventory.js';
import { NotificationsService, type Event, type NotificationsClient } from '@grpc-poc/common/src/notifications.js';
import { OrdersService, type OrdersClient } from '@grpc-poc/common/src/orders.js';
import { createHandlers as inventoryHandlers } from '../../inventory/src/service.js';
import { createHandlers as notificationsHandlers } from '../../notifications/src/service.js';
import { createHandlers as ordersHandlers } from '../src/service.js';

const servers: grpc.Server[] = [];
const clients: grpc.Client[] = [];
let inventory: InventoryClient;
let notifications: NotificationsClient;
let orders: OrdersClient;

async function start(add: (s: grpc.Server) => void): Promise<number> {
  const server = new grpc.Server();
  add(server);
  servers.push(server);
  return new Promise((resolve, reject) =>
    server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (e, p) => (e ? reject(e) : resolve(p))),
  );
}

const connect = <C extends grpc.Client>(Ctor: new (a: string, c: grpc.ChannelCredentials) => C, port: number) => {
  const c = new Ctor(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
  clients.push(c);
  return c;
};

beforeAll(async () => {
  const invPort = await start((s) => s.addService(InventoryService.service, inventoryHandlers({ a: 10, b: 0, c: 3 })));
  const notPort = await start((s) => s.addService(NotificationsService.service, notificationsHandlers()));
  inventory = connect(InventoryService, invPort);
  notifications = connect(NotificationsService, notPort);
  const ordPort = await start((s) => s.addService(OrdersService.service, ordersHandlers(inventory, notifications)));
  orders = connect(OrdersService, ordPort);
});

afterAll(() => {
  clients.forEach((c) => c.close());
  servers.forEach((s) => s.forceShutdown());
});

test('server streaming: ListProducts emite un mensaje por producto', async () => {
  const stream = inventory.ListProducts({ onlyInStock: true });
  const ids: string[] = [];
  for await (const p of stream) ids.push((p as { productId: string }).productId);
  expect(ids).toEqual(['a', 'c']);
});

test('client streaming: BulkUpdateStock responde una sola vez con el resumen', async () => {
  const updated = await new Promise<number>((resolve, reject) => {
    const call = inventory.BulkUpdateStock((e, r) => (e ? reject(e) : resolve(r!.updated)));
    call.write({ productId: 'b', delta: 4 });
    call.write({ productId: 'c', delta: -10 });
    call.end();
  });
  expect(updated).toBe(2);

  const stock = await new Promise<number>((resolve, reject) =>
    inventory.GetStock({ productId: 'c' }, (e, r) => (e ? reject(e) : resolve(r!.available))),
  );
  expect(stock).toBe(0); // clamp a 0
});

test('bidi: CreateOrder publica un evento que Watch recibe filtrado', async () => {
  const watch = notifications.Watch();
  const received: Event[] = [];
  watch.on('data', (e) => received.push(e as Event));
  watch.write({ orderId: '' }); // todos
  await new Promise((r) => setTimeout(r, 50));

  const res = await new Promise<{ orderId: string; accepted: boolean }>((resolve, reject) =>
    orders.CreateOrder({ items: [{ productId: 'a', quantity: 2 }] }, (e, r) => (e ? reject(e) : resolve(r!))),
  );
  expect(res.accepted).toBe(true);

  await new Promise((r) => setTimeout(r, 100));
  expect(received).toHaveLength(1);
  expect(received[0]).toMatchObject({ orderId: res.orderId, type: 'ORDER_CREATED' });

  // Cambiamos el filtro a otro pedido: el siguiente evento no debe llegar.
  watch.write({ orderId: 'otro' });
  await new Promise((r) => setTimeout(r, 50));
  await new Promise((resolve, reject) =>
    orders.CreateOrder({ items: [{ productId: 'a', quantity: 1 }] }, (e, r) => (e ? reject(e) : resolve(r))),
  );
  await new Promise((r) => setTimeout(r, 100));
  expect(received).toHaveLength(1);
  watch.end();
});

test('CreateOrder rechaza cuando no hay stock', async () => {
  const res = await new Promise<{ accepted: boolean; reason: string }>((resolve, reject) =>
    orders.CreateOrder({ items: [{ productId: 'a', quantity: 999 }] }, (e, r) => (e ? reject(e) : resolve(r!))),
  );
  expect(res.accepted).toBe(false);
  expect(res.reason).toContain('a');
});
