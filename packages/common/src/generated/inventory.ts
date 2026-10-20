import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { InventoryClient as _inventory_v1_InventoryClient, InventoryDefinition as _inventory_v1_InventoryDefinition } from './inventory/v1/Inventory';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  inventory: {
    v1: {
      GetStockRequest: MessageTypeDefinition
      GetStockResponse: MessageTypeDefinition
      Inventory: SubtypeConstructor<typeof grpc.Client, _inventory_v1_InventoryClient> & { service: _inventory_v1_InventoryDefinition }
      ReserveStockRequest: MessageTypeDefinition
      ReserveStockResponse: MessageTypeDefinition
    }
  }
}

