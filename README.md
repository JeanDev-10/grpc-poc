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

## Uso (fase 2)
```
npm install
npm run gen:types        # regenera tipos desde proto/
npm run dev:inventory    # :50051
npm run dev:notifications # :50053
npm run dev:orders       # :50052
npm run client -- list | bulk sku-003:10 | order sku-001:2 | watch
npm test
```
