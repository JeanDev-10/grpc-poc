import * as grpc from '@grpc/grpc-js';
import { NotificationsService } from '@grpc-poc/common/src/notifications.js';
import { createServer } from '@grpc-poc/common/src/server.js';
import { createHandlers } from './service.js';

const PORT = process.env.PORT ?? '50053';

const server = createServer('notifications');
server.addService(NotificationsService.service, createHandlers());
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) throw err;
  console.log(`notifications escuchando en :${port}`);
});

process.on('SIGINT', () => server.tryShutdown(() => process.exit(0)));
