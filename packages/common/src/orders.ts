import type { ProtoGrpcType } from './generated/orders.js';
import { loadProto } from './load.js';

export type { OrdersClient, OrdersHandlers } from './generated/orders/v1/Orders.js';

export const OrdersService = loadProto<ProtoGrpcType>('orders/v1/orders.proto').orders.v1.Orders;
