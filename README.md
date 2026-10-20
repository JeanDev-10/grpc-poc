# Test gRPC

PoC de aprendizaje de gRPC con Node.js + TypeScript. Dominio: Pedidos / Inventario / Notificaciones.

## Servicios
- `inventory` (:50051) — stock de productos
- `orders` (:50052) — pedidos; llama a inventory propagando el deadline
- `notifications` (:50053) — eventos de pedido por streaming
- `client` — CLI que ejercita todos los RPC

## Fases
1. Setup + Unary
2. Los 4 tipos de RPC
3. Errores + Deadlines
4. Metadata + Interceptores
5. TLS / mTLS
6. Operación (health, reflection, retries, keepalive)
7. Balanceo + Gateway (opcional)

Cada fase termina con un hito verificable y un commit.
