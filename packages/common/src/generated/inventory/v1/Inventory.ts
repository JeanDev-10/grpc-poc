// Original file: proto/inventory/v1/inventory.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { BulkUpdateStockResponse as _inventory_v1_BulkUpdateStockResponse, BulkUpdateStockResponse__Output as _inventory_v1_BulkUpdateStockResponse__Output } from '../../inventory/v1/BulkUpdateStockResponse';
import type { GetStockRequest as _inventory_v1_GetStockRequest, GetStockRequest__Output as _inventory_v1_GetStockRequest__Output } from '../../inventory/v1/GetStockRequest';
import type { GetStockResponse as _inventory_v1_GetStockResponse, GetStockResponse__Output as _inventory_v1_GetStockResponse__Output } from '../../inventory/v1/GetStockResponse';
import type { ListProductsRequest as _inventory_v1_ListProductsRequest, ListProductsRequest__Output as _inventory_v1_ListProductsRequest__Output } from '../../inventory/v1/ListProductsRequest';
import type { Product as _inventory_v1_Product, Product__Output as _inventory_v1_Product__Output } from '../../inventory/v1/Product';
import type { ReleaseStockRequest as _inventory_v1_ReleaseStockRequest, ReleaseStockRequest__Output as _inventory_v1_ReleaseStockRequest__Output } from '../../inventory/v1/ReleaseStockRequest';
import type { ReleaseStockResponse as _inventory_v1_ReleaseStockResponse, ReleaseStockResponse__Output as _inventory_v1_ReleaseStockResponse__Output } from '../../inventory/v1/ReleaseStockResponse';
import type { ReserveStockRequest as _inventory_v1_ReserveStockRequest, ReserveStockRequest__Output as _inventory_v1_ReserveStockRequest__Output } from '../../inventory/v1/ReserveStockRequest';
import type { ReserveStockResponse as _inventory_v1_ReserveStockResponse, ReserveStockResponse__Output as _inventory_v1_ReserveStockResponse__Output } from '../../inventory/v1/ReserveStockResponse';
import type { StockUpdate as _inventory_v1_StockUpdate, StockUpdate__Output as _inventory_v1_StockUpdate__Output } from '../../inventory/v1/StockUpdate';

export interface InventoryClient extends grpc.Client {
  BulkUpdateStock(metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_BulkUpdateStockResponse__Output>): grpc.ClientWritableStream<_inventory_v1_StockUpdate>;
  BulkUpdateStock(metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_BulkUpdateStockResponse__Output>): grpc.ClientWritableStream<_inventory_v1_StockUpdate>;
  BulkUpdateStock(options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_BulkUpdateStockResponse__Output>): grpc.ClientWritableStream<_inventory_v1_StockUpdate>;
  BulkUpdateStock(callback: grpc.requestCallback<_inventory_v1_BulkUpdateStockResponse__Output>): grpc.ClientWritableStream<_inventory_v1_StockUpdate>;
  bulkUpdateStock(metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_BulkUpdateStockResponse__Output>): grpc.ClientWritableStream<_inventory_v1_StockUpdate>;
  bulkUpdateStock(metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_BulkUpdateStockResponse__Output>): grpc.ClientWritableStream<_inventory_v1_StockUpdate>;
  bulkUpdateStock(options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_BulkUpdateStockResponse__Output>): grpc.ClientWritableStream<_inventory_v1_StockUpdate>;
  bulkUpdateStock(callback: grpc.requestCallback<_inventory_v1_BulkUpdateStockResponse__Output>): grpc.ClientWritableStream<_inventory_v1_StockUpdate>;
  
  GetStock(argument: _inventory_v1_GetStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  GetStock(argument: _inventory_v1_GetStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  GetStock(argument: _inventory_v1_GetStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  GetStock(argument: _inventory_v1_GetStockRequest, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  getStock(argument: _inventory_v1_GetStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  getStock(argument: _inventory_v1_GetStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  getStock(argument: _inventory_v1_GetStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  getStock(argument: _inventory_v1_GetStockRequest, callback: grpc.requestCallback<_inventory_v1_GetStockResponse__Output>): grpc.ClientUnaryCall;
  
  ListProducts(argument: _inventory_v1_ListProductsRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_inventory_v1_Product__Output>;
  ListProducts(argument: _inventory_v1_ListProductsRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_inventory_v1_Product__Output>;
  listProducts(argument: _inventory_v1_ListProductsRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_inventory_v1_Product__Output>;
  listProducts(argument: _inventory_v1_ListProductsRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_inventory_v1_Product__Output>;
  
  ReleaseStock(argument: _inventory_v1_ReleaseStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  ReleaseStock(argument: _inventory_v1_ReleaseStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  ReleaseStock(argument: _inventory_v1_ReleaseStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  ReleaseStock(argument: _inventory_v1_ReleaseStockRequest, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _inventory_v1_ReleaseStockRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _inventory_v1_ReleaseStockRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _inventory_v1_ReleaseStockRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  releaseStock(argument: _inventory_v1_ReleaseStockRequest, callback: grpc.requestCallback<_inventory_v1_ReleaseStockResponse__Output>): grpc.ClientUnaryCall;
  
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
  BulkUpdateStock: grpc.handleClientStreamingCall<_inventory_v1_StockUpdate__Output, _inventory_v1_BulkUpdateStockResponse>;
  
  GetStock: grpc.handleUnaryCall<_inventory_v1_GetStockRequest__Output, _inventory_v1_GetStockResponse>;
  
  ListProducts: grpc.handleServerStreamingCall<_inventory_v1_ListProductsRequest__Output, _inventory_v1_Product>;
  
  ReleaseStock: grpc.handleUnaryCall<_inventory_v1_ReleaseStockRequest__Output, _inventory_v1_ReleaseStockResponse>;
  
  ReserveStock: grpc.handleUnaryCall<_inventory_v1_ReserveStockRequest__Output, _inventory_v1_ReserveStockResponse>;
  
}

export interface InventoryDefinition extends grpc.ServiceDefinition {
  BulkUpdateStock: MethodDefinition<_inventory_v1_StockUpdate, _inventory_v1_BulkUpdateStockResponse, _inventory_v1_StockUpdate__Output, _inventory_v1_BulkUpdateStockResponse__Output>
  GetStock: MethodDefinition<_inventory_v1_GetStockRequest, _inventory_v1_GetStockResponse, _inventory_v1_GetStockRequest__Output, _inventory_v1_GetStockResponse__Output>
  ListProducts: MethodDefinition<_inventory_v1_ListProductsRequest, _inventory_v1_Product, _inventory_v1_ListProductsRequest__Output, _inventory_v1_Product__Output>
  ReleaseStock: MethodDefinition<_inventory_v1_ReleaseStockRequest, _inventory_v1_ReleaseStockResponse, _inventory_v1_ReleaseStockRequest__Output, _inventory_v1_ReleaseStockResponse__Output>
  ReserveStock: MethodDefinition<_inventory_v1_ReserveStockRequest, _inventory_v1_ReserveStockResponse, _inventory_v1_ReserveStockRequest__Output, _inventory_v1_ReserveStockResponse__Output>
}
