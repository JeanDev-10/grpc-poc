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
  };
}
