import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { OrdersClient as _orders_v1_OrdersClient, OrdersDefinition as _orders_v1_OrdersDefinition } from './orders/v1/Orders';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  orders: {
    v1: {
      CreateOrderRequest: MessageTypeDefinition
      CreateOrderResponse: MessageTypeDefinition
      OrderItem: MessageTypeDefinition
      Orders: SubtypeConstructor<typeof grpc.Client, _orders_v1_OrdersClient> & { service: _orders_v1_OrdersDefinition }
    }
  }
}

