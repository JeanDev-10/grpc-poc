import { afterAll, beforeAll, expect, test } from 'vitest';
import * as grpc from '@grpc/grpc-js';
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

const call = <T>(fn: (cb: (e: grpc.ServiceError | null, r?: T) => void) => void) =>
  new Promise<T>((resolve, reject) => fn((e, r) => (e ? reject(e) : resolve(r as T))));

test('GetStock devuelve el stock disponible', async () => {
  const res = await call<{ available: number }>((cb) => client.GetStock({ productId: 'sku-x' }, cb));
  expect(res.available).toBe(5);
});

test('ReserveStock descuenta y rechaza cuando no alcanza', async () => {
  const ok = await call<{ reserved: boolean; remaining: number }>((cb) =>
    client.ReserveStock({ productId: 'sku-x', quantity: 3 }, cb));
  expect(ok).toMatchObject({ reserved: true, remaining: 2 });

  const no = await call<{ reserved: boolean; remaining: number }>((cb) =>
    client.ReserveStock({ productId: 'sku-x', quantity: 3 }, cb));
  expect(no).toMatchObject({ reserved: false, remaining: 2 });
});
