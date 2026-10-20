import type { ProtoGrpcType } from './generated/inventory.js';
import { loadProto } from './load.js';

export type { InventoryClient, InventoryHandlers } from './generated/inventory/v1/Inventory.js';

export const InventoryService = loadProto<ProtoGrpcType>('inventory/v1/inventory.proto').inventory.v1.Inventory;
