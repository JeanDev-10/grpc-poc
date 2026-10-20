import * as grpc from '@grpc/grpc-js';
import { serviceTokenProvider } from '@grpc-poc/common/src/auth.js';
import { InventoryService } from '@grpc-poc/common/src/inventory.js';
import { NotificationsService } from '@grpc-poc/common/src/notifications.js';
import { OrdersService } from '@grpc-poc/common/src/orders.js';
import { ORDERS_SERVICE_CLAIMS } from '@grpc-poc/common/src/scopes.js';
import { clientOptions, createServer } from '@grpc-poc/common/src/server.js';
import { createHandlers } from './service.js';

const PORT = process.env.PORT ?? '50052';
// Orders llama a los demás servicios con su propia identidad (token de servicio).
const options = clientOptions(serviceTokenProvider(ORDERS_SERVICE_CLAIMS));
const inventory = new InventoryService(
  process.env.INVENTORY_ADDR ?? 'localhost:50051',
  grpc.credentials.createInsecure(),
  options,
);
const notifications = new NotificationsService(
  process.env.NOTIFICATIONS_ADDR ?? 'localhost:50053',
  grpc.credentials.createInsecure(),
  options,
);

const server = createServer('orders');
server.addService(OrdersService.service, createHandlers(inventory, notifications));
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) throw err;
  console.log(`orders escuchando en :${port}`);
});

process.on('SIGINT', () => server.tryShutdown(() => process.exit(0)));
