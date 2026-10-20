import { randomUUID } from 'node:crypto';
import * as grpc from '@grpc/grpc-js';
import { downstreamDeadline, rpc } from '@grpc-poc/common/src/call.js';
import { passThrough, statusError } from '@grpc-poc/common/src/errors.js';
import type { InventoryClient } from '@grpc-poc/common/src/inventory.js';
import type { NotificationsClient } from '@grpc-poc/common/src/notifications.js';
import type { OrdersHandlers } from '@grpc-poc/common/src/orders.js';

export interface OrdersOptions {
  /** Tope de tiempo para llamadas a Inventory aunque el cliente no pida deadline. */
  downstreamTimeoutMs?: number;
}

// Llamadas "best effort" (compensación y notificación) usan un deadline propio y corto:
// el del cliente puede haber vencido justo por lo que estamos compensando.
const BEST_EFFORT_MS = 1000;
const withDeadline = (ms: number) => ({ deadline: Date.now() + ms });
const noMetadata = () => new grpc.Metadata();

export function createHandlers(
  inventory: InventoryClient,
  notifications: NotificationsClient,
  { downstreamTimeoutMs = 3000 }: OrdersOptions = {},
): OrdersHandlers {
  const publishSafe = async (orderId: string, type: string, message: string) => {
    try {
      await rpc((cb) => notifications.Publish({ orderId, type, message }, noMetadata(), withDeadline(BEST_EFFORT_MS), cb));
    } catch (err) {
      console.warn(`no se pudo publicar ${type} de ${orderId}:`, (err as Error).message);
    }
  };

  const release = async (reserved: { productId: string; quantity: number }[]) => {
    const results = await Promise.allSettled(
      reserved.map((item) => rpc((cb) => inventory.ReleaseStock(item, noMetadata(), withDeadline(BEST_EFFORT_MS), cb))),
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`compensación fallida para ${reserved[i].productId}:`, r.reason.message);
    });
  };

  return {
    async CreateOrder(call, callback) {
      const items = call.request.items ?? [];
      if (items.length === 0) {
        return callback(
          statusError(grpc.status.INVALID_ARGUMENT, 'pedido sin items', [
            { type: 'BadRequest', fieldViolations: [{ field: 'items', description: 'al menos 1 item' }] },
          ]),
        );
      }

      const orderId = randomUUID();
      // Propagación manual del deadline del cliente hacia Inventory.
      const deadline = downstreamDeadline(call, downstreamTimeoutMs);
      const reserved: { productId: string; quantity: number }[] = [];

      try {
        for (const { productId = '', quantity = 0 } of items) {
          await rpc((cb) => inventory.ReserveStock({ productId, quantity }, noMetadata(), { deadline }, cb));
          reserved.push({ productId, quantity });
        }
      } catch (err) {
        // Saga mínima: deshacemos lo ya reservado y devolvemos el error original
        // (mismo code y detalles) para que el cliente sepa qué falló.
        await release(reserved);
        await publishSafe(orderId, 'ORDER_REJECTED', (err as grpc.ServiceError).details);
        return callback(passThrough(err));
      }

      await publishSafe(orderId, 'ORDER_CREATED', `${items.length} item(s) reservados`);
      callback(null, { orderId, accepted: true, reason: '' });
    },
  };
}
