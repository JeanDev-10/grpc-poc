import * as grpc from '@grpc/grpc-js';
import { InventoryService } from '@grpc-poc/common/src/inventory.js';
import { NotificationsService } from '@grpc-poc/common/src/notifications.js';
import { OrdersService } from '@grpc-poc/common/src/orders.js';
import { createHandlers } from './service.js';

const PORT = process.env.PORT ?? '50052';
const inventory = new InventoryService(process.env.INVENTORY_ADDR ?? 'localhost:50051', grpc.credentials.createInsecure());
const notifications = new NotificationsService(
  process.env.NOTIFICATIONS_ADDR ?? 'localhost:50053',
  grpc.credentials.createInsecure(),
);

const server = new grpc.Server();
server.addService(OrdersService.service, createHandlers(inventory, notifications));
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) throw err;
  console.log(`orders escuchando en :${port}`);
});

process.on('SIGINT', () => server.tryShutdown(() => process.exit(0)));
