// Original file: proto/orders/v1/orders.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { CreateOrderRequest as _orders_v1_CreateOrderRequest, CreateOrderRequest__Output as _orders_v1_CreateOrderRequest__Output } from '../../orders/v1/CreateOrderRequest';
import type { CreateOrderResponse as _orders_v1_CreateOrderResponse, CreateOrderResponse__Output as _orders_v1_CreateOrderResponse__Output } from '../../orders/v1/CreateOrderResponse';

export interface OrdersClient extends grpc.Client {
  CreateOrder(argument: _orders_v1_CreateOrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_orders_v1_CreateOrderResponse__Output>): grpc.ClientUnaryCall;
  CreateOrder(argument: _orders_v1_CreateOrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_orders_v1_CreateOrderResponse__Output>): grpc.ClientUnaryCall;
  CreateOrder(argument: _orders_v1_CreateOrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_orders_v1_CreateOrderResponse__Output>): grpc.ClientUnaryCall;
  CreateOrder(argument: _orders_v1_CreateOrderRequest, callback: grpc.requestCallback<_orders_v1_CreateOrderResponse__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _orders_v1_CreateOrderRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_orders_v1_CreateOrderResponse__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _orders_v1_CreateOrderRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_orders_v1_CreateOrderResponse__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _orders_v1_CreateOrderRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_orders_v1_CreateOrderResponse__Output>): grpc.ClientUnaryCall;
  createOrder(argument: _orders_v1_CreateOrderRequest, callback: grpc.requestCallback<_orders_v1_CreateOrderResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface OrdersHandlers extends grpc.UntypedServiceImplementation {
  CreateOrder: grpc.handleUnaryCall<_orders_v1_CreateOrderRequest__Output, _orders_v1_CreateOrderResponse>;
  
}

export interface OrdersDefinition extends grpc.ServiceDefinition {
  CreateOrder: MethodDefinition<_orders_v1_CreateOrderRequest, _orders_v1_CreateOrderResponse, _orders_v1_CreateOrderRequest__Output, _orders_v1_CreateOrderResponse__Output>
}
