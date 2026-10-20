import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import type { ProtoGrpcType } from './generated/inventory.js';

export type { InventoryClient } from './generated/inventory/v1/Inventory.js';
export type { InventoryHandlers } from './generated/inventory/v1/Inventory.js';

const PROTO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../proto');

const packageDefinition = protoLoader.loadSync('inventory/v1/inventory.proto', {
  includeDirs: [PROTO_ROOT],
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

export const inventoryProto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;
export const InventoryService = inventoryProto.inventory.v1.Inventory;
