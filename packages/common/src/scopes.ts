/** Scope exigido por método (clave = path HTTP/2 del RPC: /paquete.Servicio/Metodo). */
export const METHOD_SCOPES: Record<string, string> = {
  '/inventory.v1.Inventory/GetStock': 'inventory:read',
  '/inventory.v1.Inventory/ListProducts': 'inventory:read',
  '/inventory.v1.Inventory/ReserveStock': 'inventory:write',
  '/inventory.v1.Inventory/ReleaseStock': 'inventory:write',
  '/inventory.v1.Inventory/BulkUpdateStock': 'inventory:write',
  '/orders.v1.Orders/CreateOrder': 'orders:write',
  '/notifications.v1.Notifications/Publish': 'notifications:publish',
  '/notifications.v1.Notifications/Watch': 'notifications:read',
};

export const ALL_SCOPES = [...new Set(Object.values(METHOD_SCOPES))].join(' ');

/** Identidad con la que Orders llama a los demás servicios. */
export const ORDERS_SERVICE_CLAIMS = {
  sub: 'svc:orders',
  scope: 'inventory:read inventory:write notifications:publish',
};
