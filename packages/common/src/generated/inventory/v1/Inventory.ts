// Original file: proto/inventory/v1/inventory.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { GetStockRequest as _inventory_v1_GetStockRequest, GetStockRequest__Output as _inventory_v1_GetStockRequest__Output } from '../../inventory/v1/GetStockRequest';
import type { GetStockResponse as _inventory_v1_GetStockResponse, GetStockResponse__Output as _inventory_v1_GetStockResponse__Output } from '../../inventory/v1/GetStockResponse';
import type { ReserveStockRequest as _inventory_v1_ReserveStockRequest, ReserveStockRequest__Output as _inventory_v1_ReserveStockRequest__Output } from '../../inventory/v1/ReserveStockRequest';
import type { ReserveStockResponse as _inventory_v1_ReserveStockResponse, ReserveStockResponse__Output as _inventory_v1_ReserveStockResponse__Output } from '../../inventory/v1/ReserveStockResponse';

export interface InventoryClient extends grpc.Client {
  GetStock(argument: _inventory_v1_GetStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  GetStock(argument: _inventory_v1_GetStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  GetStock(argument: _inventory_v1_GetStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  GetStock(argument: _inventory_v1_GetStockRequest, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  getStock(argument: _inventory_v1_GetStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  getStock(argument: _inventory_v1_GetStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  getStock(argument: _inventory_v1_GetStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  getStock(argument: _inventory_v1_GetStockRequest, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  
  ReserveStock(argument: _inventory_v1_ReserveStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  ReserveStock(argument: _inventory_v1_ReserveStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  ReserveStock(argument: _inventory_v1_ReserveStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  ReserveStock(argument: _inventory_v1_ReserveStockRequest, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _inventory_v1_ReserveStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _inventory_v1_ReserveStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _inventory_v1_ReserveStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  reserveStock(argument: _inventory_v1_ReserveStockRequest, callback: grpc.requestCallback<_inventory_v1_ReserveStockResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface InventoryHandlers extends grpc.UntypedServiceImplementation {
  GetStock: grpc.handleUnaryCall<_inventory_v1_GetStockRequest__Output, _inventory_v1_GetStockResponse>;
  
  ReserveStock: grpc.handleUnaryCall<_inventory_v1_ReserveStockRequest__Output, _inventory_v1_ReserveStockResponse>;
  
}

export interface InventoryDefinition extends grpc.ServiceDefinition {
  GetStock: MethodDefinition<_inventory_v1_GetStockRequest, _inventory_v1_GetStockResponse, _inventory_v1_GetStockRequest__Output, _inventory_v1_GetStockResponse__Output>
  ReserveStock: MethodDefinition<_inventory_v1_ReserveStockRequest, _inventory_v1_ReserveStockResponse, _inventory_v1_ReserveStockRequest__Output, _inventory_v1_ReserveStockResponse__Output>
}
