import { afterAll, expect, test } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { rpc } from '@grpc-poc/common/src/call.js';
import { decodeDetails } from '@grpc-poc/common/src/errors.js';
import type { Event } from '@grpc-poc/common/src/notifications.js';
import { closeAll, setup } from './harness.js';

afterAll(closeAll);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fails = (p: Promise<unknown>) => p.then(() => Promise.reject(new Error('debía fallar')), (e: grpc.ServiceError) => e);

test('server streaming: ListProducts emite un mensaje por producto', async () => {
  const { inventory } = await setup({ a: 10, b: 0, c: 3 });
  const ids: string[] = [];
  for await (const p of inventory.ListProducts({ onlyInStock: true })) ids.push((p as { productId: string }).productId);
  expect(ids).toEqual(['a', 'c']);
});

test('client streaming: BulkUpdateStock responde una sola vez con el resumen', async () => {
  const { inventory } = await setup({ b: 0, c: 3 });
  const updated = await new Promise<number>((resolve, reject) => {
    const call = inventory.BulkUpdateStock((e, r) => (e ? reject(e) : resolve(r!.updated)));
    call.write({ productId: 'b', delta: 4 });
    call.write({ productId: 'c', delta: -10 });
    call.end();
  });
  expect(updated).toBe(2);

  const stock = await rpc<{ available: number }>((cb) => inventory.GetStock({ productId: 'c' }, cb));
  expect(stock.available).toBe(0); // clamp a 0
});

test('bidi: CreateOrder publica un evento que Watch recibe filtrado', async () => {
  const { notifications, orders } = await setup({ a: 10 });
  const watch = notifications.Watch();
  const received: Event[] = [];
  watch.on('data', (e) => received.push(e as Event));
  watch.write({ orderId: '' }); // todos
  await sleep(50);

  const res = await rpc<{ orderId: string; accepted: boolean }>((cb) =>
    orders.CreateOrder({ items: [{ productId: 'a', quantity: 2 }] }, cb),
  );
  expect(res.accepted).toBe(true);

  await sleep(100);
  expect(received).toHaveLength(1);
  expect(received[0]).toMatchObject({ orderId: res.orderId, type: 'ORDER_CREATED' });

  // Cambiamos el filtro a otro pedido: el siguiente evento no debe llegar.
  watch.write({ orderId: 'otro' });
  await sleep(50);
  await rpc((cb) => orders.CreateOrder({ items: [{ productId: 'a', quantity: 1 }] }, cb));
  await sleep(100);
  expect(received).toHaveLength(1);
  watch.end();
});

test('CreateOrder sin stock => FAILED_PRECONDITION y los detalles de Inventory llegan al cliente', async () => {
  const { orders } = await setup({ a: 10 });
  const err = await fails(rpc((cb) => orders.CreateOrder({ items: [{ productId: 'a', quantity: 999 }] }, cb)));
  expect(err.code).toBe(grpc.status.FAILED_PRECONDITION);
  expect(decodeDetails(err)[0]).toMatchObject({ type: 'ErrorInfo', reason: 'INSUFFICIENT_STOCK' });
});

test('CreateOrder con producto inexistente => NOT_FOUND', async () => {
  const { orders } = await setup({ a: 10 });
  const err = await fails(rpc((cb) => orders.CreateOrder({ items: [{ productId: 'zzz', quantity: 1 }] }, cb)));
  expect(err.code).toBe(grpc.status.NOT_FOUND);
});

test('CreateOrder sin items => INVALID_ARGUMENT', async () => {
  const { orders } = await setup({ a: 10 });
  const err = await fails(rpc((cb) => orders.CreateOrder({ items: [] }, cb)));
  expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
  expect(decodeDetails(err)[0]).toMatchObject({ type: 'BadRequest' });
});

test('compensación: si falla el 2º item se libera la reserva del 1º', async () => {
  const { orders, inventory } = await setup({ a: 10, b: 1 });
  const err = await fails(
    rpc((cb) =>
      orders.CreateOrder(
        {
          items: [
            { productId: 'a', quantity: 4 },
            { productId: 'b', quantity: 5 }, // no alcanza
          ],
        },
        cb,
      ),
    ),
  );
  expect(err.code).toBe(grpc.status.FAILED_PRECONDITION);
  const a = await rpc<{ available: number }>((cb) => inventory.GetStock({ productId: 'a' }, cb));
  expect(a.available).toBe(10); // restaurado
});

test('deadline: Inventory lento => DEADLINE_EXCEEDED, Inventory deja de trabajar y no aplica la reserva', async () => {
  let cancelled = 0;
  const { orders, inventory } = await setup({ a: 10 }, { latencyMs: 1000, onCancel: () => cancelled++ });

  const started = Date.now();
  const err = await fails(
    rpc((cb) =>
      orders.CreateOrder({ items: [{ productId: 'a', quantity: 2 }] }, new grpc.Metadata(), { deadline: started + 200 }, cb),
    ),
  );
  expect(err.code).toBe(grpc.status.DEADLINE_EXCEEDED);
  expect(Date.now() - started).toBeLessThan(800); // no esperó la latencia completa

  await sleep(150); // damos tiempo a que Inventory observe la cancelación
  expect(cancelled).toBe(1);
  const a = await rpc<{ available: number }>((cb) => inventory.GetStock({ productId: 'a' }, cb));
  expect(a.available).toBe(10); // la reserva nunca se aplicó
});
