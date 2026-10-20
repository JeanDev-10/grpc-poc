import type { InventoryHandlers } from '@grpc-poc/common/src/inventory.js';

export function createHandlers(initial: Record<string, number>): InventoryHandlers {
  const stock = new Map(Object.entries(initial));

  return {
    GetStock(call, callback) {
      const productId = call.request.productId ?? '';
      callback(null, { productId, available: stock.get(productId) ?? 0 });
    },

    ReserveStock(call, callback) {
      const { productId = '', quantity = 0 } = call.request;
      const available = stock.get(productId) ?? 0;
      if (quantity <= 0 || quantity > available) {
        callback(null, { reserved: false, remaining: available });
        return;
      }
      stock.set(productId, available - quantity);
      callback(null, { reserved: true, remaining: available - quantity });
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
