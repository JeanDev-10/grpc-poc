// Original file: proto/orders/v1/orders.proto

import type { OrderItem as _orders_v1_OrderItem, OrderItem__Output as _orders_v1_OrderItem__Output } from '../../orders/v1/OrderItem';

export interface CreateOrderRequest {
  'items'?: (_orders_v1_OrderItem)[];
}

export interface CreateOrderRequest__Output {
  'items': (_orders_v1_OrderItem__Output)[];
}
