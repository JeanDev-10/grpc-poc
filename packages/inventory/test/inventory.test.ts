import { afterAll, beforeAll, expect, test } from 'vitest';
import * as grpc from '@grpc/grpc-js';
import { rpc } from '@grpc-poc/common/src/call.js';
import { decodeDetails } from '@grpc-poc/common/src/errors.js';
import { InventoryService, type InventoryClient } from '@grpc-poc/common/src/inventory.js';
import { createHandlers } from '../src/service.js';

let server: grpc.Server;
let client: InventoryClient;

beforeAll(async () => {
  server = new grpc.Server();
  server.addService(InventoryService.service, createHandlers({ 'sku-x': 5 }));
  const port = await new Promise<number>((resolve, reject) =>
    server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (e, p) => (e ? reject(e) : resolve(p))),
  );
  client = new InventoryService(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
});

afterAll(() => {
  client.close();
  server.forceShutdown();
});

const fails = (p: Promise<unknown>) => p.then(() => Promise.reject(new Error('debía fallar')), (e: grpc.ServiceError) => e);

test('GetStock devuelve el stock disponible', async () => {
  const res = await rpc<{ available: number }>((cb) => client.GetStock({ productId: 'sku-x' }, cb));
  expect(res.available).toBe(5);
});

test('GetStock de un producto inexistente => NOT_FOUND con ErrorInfo', async () => {
  const err = await fails(rpc((cb) => client.GetStock({ productId: 'nope' }, cb)));
  expect(err.code).toBe(grpc.status.NOT_FOUND);
  expect(decodeDetails(err)[0]).toMatchObject({ type: 'ErrorInfo', reason: 'PRODUCT_NOT_FOUND', metadata: { productId: 'nope' } });
});

test('ReserveStock descuenta y ReleaseStock devuelve', async () => {
  const ok = await rpc<{ remaining: number }>((cb) => client.ReserveStock({ productId: 'sku-x', quantity: 3 }, cb));
  expect(ok.remaining).toBe(2);
  const back = await rpc<{ available: number }>((cb) => client.ReleaseStock({ productId: 'sku-x', quantity: 3 }, cb));
  expect(back.available).toBe(5);
});

test('ReserveStock sin stock suficiente => FAILED_PRECONDITION con ErrorInfo', async () => {
  const err = await fails(rpc((cb) => client.ReserveStock({ productId: 'sku-x', quantity: 99 }, cb)));
  expect(err.code).toBe(grpc.status.FAILED_PRECONDITION);
  expect(decodeDetails(err)[0]).toMatchObject({
    type: 'ErrorInfo',
    reason: 'INSUFFICIENT_STOCK',
    metadata: { requested: '99', available: '5' },
  });
});

test('ReserveStock con quantity 0 => INVALID_ARGUMENT con BadRequest', async () => {
  const err = await fails(rpc((cb) => client.ReserveStock({ productId: '', quantity: 0 }, cb)));
  expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
  const [detail] = decodeDetails(err);
  expect(detail).toMatchObject({ type: 'BadRequest' });
  expect((detail as { fieldViolations: { field: string }[] }).fieldViolations.map((v) => v.field)).toEqual([
    'product_id',
    'quantity',
  ]);
});
