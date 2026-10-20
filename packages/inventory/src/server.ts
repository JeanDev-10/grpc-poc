import * as grpc from '@grpc/grpc-js';
import { InventoryService } from '@grpc-poc/common/src/inventory.js';
import { createServer } from '@grpc-poc/common/src/server.js';
import { createHandlers } from './service.js';

const PORT = process.env.PORT ?? '50051';

// Stock en memoria: suficiente para la fase 1.
const latencyMs = Number(process.env.LATENCY_MS ?? 0); // simula un Inventory lento
const handlers = createHandlers({ 'sku-001': 100, 'sku-002': 5, 'sku-003': 0 }, { latencyMs });

const server = createServer('inventory');
server.addService(InventoryService.service, handlers);
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) throw err;
  console.log(`inventory escuchando en :${port}`);
});

process.on('SIGINT', () => server.tryShutdown(() => process.exit(0)));
