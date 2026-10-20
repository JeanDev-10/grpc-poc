import * as grpc from '@grpc/grpc-js';
import { waitUnlessCancelled } from '@grpc-poc/common/src/call.js';
import { DOMAIN, statusError } from '@grpc-poc/common/src/errors.js';
import type { InventoryHandlers } from '@grpc-poc/common/src/inventory.js';

export interface InventoryOptions {
  /** Latencia simulada en ReserveStock (para probar deadlines). */
  latencyMs?: number;
  /** Se invoca cuando una llamada es cancelada antes de aplicar su efecto. */
  onCancel?: () => void;
}

export function createHandlers(initial: Record<string, number>, opts: InventoryOptions = {}): InventoryHandlers {
  const stock = new Map(Object.entries(initial));

  const notFound = (productId: string) =>
    statusError(grpc.status.NOT_FOUND, `producto ${productId} no existe`, [
      { type: 'ErrorInfo', reason: 'PRODUCT_NOT_FOUND', domain: DOMAIN, metadata: { productId } },
    ]);

  const invalidQuantity = (productId: string, quantity: number) => {
    const fieldViolations = [];
    if (!productId) fieldViolations.push({ field: 'product_id', description: 'es requerido' });
    if (quantity <= 0) fieldViolations.push({ field: 'quantity', description: 'debe ser mayor que 0' });
    return fieldViolations.length
      ? statusError(grpc.status.INVALID_ARGUMENT, 'request inválido', [{ type: 'BadRequest', fieldViolations }])
      : null;
  };

  return {
    GetStock(call, callback) {
      const productId = call.request.productId ?? '';
      const available = stock.get(productId);
      if (available === undefined) return callback(notFound(productId));
      callback(null, { productId, available });
    },

    async ReserveStock(call, callback) {
      const { productId = '', quantity = 0 } = call.request;
      const invalid = invalidQuantity(productId, quantity);
      if (invalid) return callback(invalid);

      if (opts.latencyMs && !(await waitUnlessCancelled(call, opts.latencyMs))) {
        // Deadline vencido o cliente cancelado: no aplicamos el efecto.
        opts.onCancel?.();
        return;
      }

      const available = stock.get(productId);
      if (available === undefined) return callback(notFound(productId));
      if (quantity > available) {
        return callback(
          statusError(grpc.status.FAILED_PRECONDITION, `stock insuficiente para ${productId}`, [
            {
              type: 'ErrorInfo',
              reason: 'INSUFFICIENT_STOCK',
              domain: DOMAIN,
              metadata: { productId, requested: String(quantity), available: String(available) },
            },
          ]),
        );
      }
      stock.set(productId, available - quantity);
      callback(null, { reserved: true, remaining: available - quantity });
    },

    ReleaseStock(call, callback) {
      const { productId = '', quantity = 0 } = call.request;
      const invalid = invalidQuantity(productId, quantity);
      if (invalid) return callback(invalid);
      const available = stock.get(productId);
      if (available === undefined) return callback(notFound(productId));
      stock.set(productId, available + quantity);
      callback(null, { available: available + quantity });
    },

    // Server streaming: write() por cada producto y end() para cerrar con OK.
    ListProducts(call) {
      for (const [productId, available] of stock) {
        if (call.request.onlyInStock && available === 0) continue;
        call.write({ productId, available });
      }
      call.end();
    },

    // Client streaming: acumulamos y respondemos una sola vez al cerrar el cliente.
    BulkUpdateStock(call, callback) {
      let updated = 0;
      call.on('data', ({ productId = '', delta = 0 }) => {
        stock.set(productId, Math.max(0, (stock.get(productId) ?? 0) + delta));
        updated++;
      });
      call.on('end', () => callback(null, { updated }));
    },
  };
}
