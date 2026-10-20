import { afterAll, expect, test } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { signToken } from '@grpc-poc/common/src/auth.js';
import { rpc } from '@grpc-poc/common/src/call.js';
import { decodeDetails } from '@grpc-poc/common/src/errors.js';
import { InventoryService } from '@grpc-poc/common/src/inventory.js';
import { OrdersService } from '@grpc-poc/common/src/orders.js';
import { closeAll, setup, SECRET } from './harness.js';

afterAll(closeAll);

const fails = (p: Promise<unknown>) => p.then(() => Promise.reject(new Error('debía fallar')), (e: grpc.ServiceError) => e);
const order = { items: [{ productId: 'a', quantity: 1 }] };
const reasonOf = (err: grpc.ServiceError) => (decodeDetails(err)[0] as { reason: string }).reason;

test('sin token => UNAUTHENTICATED (MISSING_TOKEN) y el handler no se ejecuta', async () => {
  const { ports, connect, inventory } = await setup({ a: 10 });
  const anon = connect(InventoryService, ports.inventory); // sin token
  const err = await fails(rpc((cb) => anon.ReserveStock({ productId: 'a', quantity: 3 }, cb)));
  expect(err.code).toBe(grpc.status.UNAUTHENTICATED);
  expect(reasonOf(err)).toBe('MISSING_TOKEN');

  const stock = await rpc<{ available: number }>((cb) => inventory.GetStock({ productId: 'a' }, cb));
  expect(stock.available).toBe(10);
});

test.each([
  ['basura', () => 'esto-no-es-un-jwt', 'INVALID_TOKEN'],
  ['firmado con otro secreto', () => signToken({ sub: 'x', scope: 'orders:write' }, 'otro-secreto'), 'INVALID_TOKEN'],
  ['vencido', () => signToken({ sub: 'x', scope: 'orders:write' }, SECRET, -10), 'TOKEN_EXPIRED'],
  [
    'alg none',
    () => {
      const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
      return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'x', scope: 'orders:write' })}.`;
    },
    'INVALID_TOKEN',
  ],
])('token %s => UNAUTHENTICATED', async (_name, makeToken, reason) => {
  const { ports, connect } = await setup({ a: 10 });
  const client = connect(OrdersService, ports.orders, makeToken);
  const err = await fails(rpc((cb) => client.CreateOrder(order, cb)));
  expect(err.code).toBe(grpc.status.UNAUTHENTICATED);
  expect(reasonOf(err)).toBe(reason);
});

test('token válido sin el scope => PERMISSION_DENIED con el scope requerido', async () => {
  const { ports, connect, logs } = await setup({ a: 10 });
  const readOnly = connect(OrdersService, ports.orders, () => signToken({ sub: 'lector', scope: 'orders:read' }, SECRET));
  const err = await fails(rpc((cb) => readOnly.CreateOrder(order, cb)));
  expect(err.code).toBe(grpc.status.PERMISSION_DENIED);
  expect(logs.at(-1)).toMatchObject({ code: 'PERMISSION_DENIED', subject: 'lector' });
  expect(decodeDetails(err)[0]).toMatchObject({ reason: 'MISSING_SCOPE', metadata: { required: 'orders:write', subject: 'lector' } });
});

test('streaming sin token también se rechaza', async () => {
  const { ports, connect } = await setup({ a: 10 });
  const anon = connect(InventoryService, ports.inventory);
  const stream = anon.ListProducts({ onlyInStock: false });
  const err = await new Promise<grpc.ServiceError>((resolve) => stream.on('error', resolve));
  expect(err.code).toBe(grpc.status.UNAUTHENTICATED);
});

test('el x-request-id viaja cliente -> orders -> inventory y notifications con la identidad de cada servicio', async () => {
  const { orders, logs } = await setup({ a: 10 });
  const md = new grpc.Metadata();
  md.set('x-request-id', 'req-123');
  await rpc((cb) => orders.CreateOrder(order, md, cb));

  const mine = logs.filter((l) => l.requestId === 'req-123');
  expect(mine.map((l) => `${l.service}${l.method}`).sort()).toEqual([
    'inventory/inventory.v1.Inventory/ReserveStock',
    'notifications/notifications.v1.Notifications/Publish',
    'orders/orders.v1.Orders/CreateOrder',
  ]);
  const by = (service: string) => mine.find((l) => l.service === service)!;
  expect(by('orders').subject).toBe('test-admin'); // el usuario final
  expect(by('inventory').subject).toBe('svc:orders'); // Orders actuando como servicio
  expect(mine.every((l) => l.code === 'OK')).toBe(true);
});

test('el servidor genera un request-id si falta y lo devuelve en los headers', async () => {
  const { orders } = await setup({ a: 10 });
  const headerId = await new Promise<string>((resolve, reject) => {
    const call = orders.CreateOrder(order, (e) => e && reject(e));
    call.on('metadata', (md) => resolve(String(md.get('x-request-id')[0])));
  });
  expect(headerId).toMatch(/^[0-9a-f-]{36}$/);
});

test('los rechazos de auth quedan en el log con su código y el request-id viaja en el error', async () => {
  const { ports, connect, logs } = await setup({ a: 10 });
  const anon = connect(OrdersService, ports.orders);
  const md = new grpc.Metadata();
  md.set('x-request-id', 'req-denied');
  const err = await fails(rpc((cb) => anon.CreateOrder(order, md, cb)));
  expect(String(err.metadata.get('x-request-id')[0])).toBe('req-denied');
  expect(logs.find((l) => l.requestId === 'req-denied')).toMatchObject({ service: 'orders', code: 'UNAUTHENTICATED' });
});
