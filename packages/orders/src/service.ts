import { randomUUID } from 'node:crypto';
import type { InventoryClient } from '@grpc-poc/common/src/inventory.js';
import type { NotificationsClient } from '@grpc-poc/common/src/notifications.js';
import type { OrdersHandlers } from '@grpc-poc/common/src/orders.js';

// Convierte un método estilo callback de grpc-js en una promesa.
const rpc = <T>(fn: (cb: (err: Error | null, res?: T) => void) => void) =>
  new Promise<T>((resolve, reject) => fn((err, res) => (err ? reject(err) : resolve(res as T))));

export function createHandlers(inventory: InventoryClient, notifications: NotificationsClient): OrdersHandlers {
  const publish = (orderId: string, type: string, message: string) =>
    rpc((cb) => notifications.Publish({ orderId, type, message }, cb));

  return {
    async CreateOrder(call, callback) {
      const orderId = randomUUID();
      const items = call.request.items ?? [];
      try {
        // Fase 2: reservas secuenciales sin compensación. El rollback y los
        // códigos de error correctos llegan en la fase 3.
        for (const { productId = '', quantity = 0 } of items) {
          const res = await rpc<{ reserved: boolean }>((cb) => inventory.ReserveStock({ productId, quantity }, cb));
          if (!res.reserved) {
            const reason = `stock insuficiente para ${productId}`;
            await publish(orderId, 'ORDER_REJECTED', reason);
            callback(null, { orderId, accepted: false, reason });
            return;
          }
        }
        await publish(orderId, 'ORDER_CREATED', `${items.length} item(s) reservados`);
        callback(null, { orderId, accepted: true, reason: '' });
      } catch (err) {
        callback(err as Error);
      }
    },
  };
}
