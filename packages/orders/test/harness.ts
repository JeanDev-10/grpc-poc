import * as grpc from '@grpc/grpc-js';
import { serviceTokenProvider, signToken } from '@grpc-poc/common/src/auth.js';
import type { LogEntry } from '@grpc-poc/common/src/interceptors.js';
import { InventoryService } from '@grpc-poc/common/src/inventory.js';
import { NotificationsService } from '@grpc-poc/common/src/notifications.js';
import { OrdersService } from '@grpc-poc/common/src/orders.js';
import { ALL_SCOPES, ORDERS_SERVICE_CLAIMS } from '@grpc-poc/common/src/scopes.js';
import { clientOptions, createServer } from '@grpc-poc/common/src/server.js';
import { createHandlers as inventoryHandlers, type InventoryOptions } from '../../inventory/src/service.js';
import { createHandlers as notificationsHandlers } from '../../notifications/src/service.js';
import { createHandlers as ordersHandlers } from '../src/service.js';

export const SECRET = 'test-secret';

const servers: grpc.Server[] = [];
const clients: grpc.Client[] = [];

export function closeAll() {
  clients.forEach((c) => c.close());
  servers.forEach((s) => s.forceShutdown());
}

type ClientCtor<C> = new (addr: string, creds: grpc.ChannelCredentials, options?: grpc.ClientOptions) => C;

/**
 * Levanta Inventory + Notifications + Orders en memoria con la pila real de interceptores
 * (observabilidad + auth). Los clientes devueltos usan un token con todos los scopes, salvo
 * que se pida otro con `connect`.
 */
export async function setup(stock: Record<string, number>, inventoryOpts: InventoryOptions = {}) {
  const logs: LogEntry[] = [];
  const serverOptions = { secret: SECRET, log: (e: LogEntry) => logs.push(e) };

  const start = async (name: string, add: (s: grpc.Server) => void) => {
    const server = createServer(name, serverOptions);
    add(server);
    servers.push(server);
    return new Promise<number>((resolve, reject) =>
      server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (e, p) => (e ? reject(e) : resolve(p))),
    );
  };

  const connect = <C extends grpc.Client>(Ctor: ClientCtor<C>, port: number, token?: () => string | undefined) => {
    const c = new Ctor(`127.0.0.1:${port}`, grpc.credentials.createInsecure(), clientOptions(token));
    clients.push(c);
    return c;
  };

  const admin = () => signToken({ sub: 'test-admin', scope: ALL_SCOPES }, SECRET);
  const serviceToken = serviceTokenProvider(ORDERS_SERVICE_CLAIMS, SECRET);

  const ports = {
    inventory: await start('inventory', (s) => s.addService(InventoryService.service, inventoryHandlers(stock, inventoryOpts))),
    notifications: await start('notifications', (s) =>
      s.addService(NotificationsService.service, notificationsHandlers()),
    ),
    orders: 0,
  };

  // Orders usa su identidad de servicio hacia los demás.
  const ordersToInventory = connect(InventoryService, ports.inventory, serviceToken);
  const ordersToNotifications = connect(NotificationsService, ports.notifications, serviceToken);
  ports.orders = await start('orders', (s) =>
    s.addService(OrdersService.service, ordersHandlers(ordersToInventory, ordersToNotifications)),
  );

  return {
    logs,
    ports,
    connect,
    inventory: connect(InventoryService, ports.inventory, admin),
    notifications: connect(NotificationsService, ports.notifications, admin),
    orders: connect(OrdersService, ports.orders, admin),
  };
}
