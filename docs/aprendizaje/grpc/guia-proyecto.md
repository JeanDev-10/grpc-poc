# Guía del proyecto: PoC de gRPC (Pedidos / Inventario / Notificaciones)

> Estado: **Fases 1 a 4 completas** (commit `8e60832`). Pendientes: Fase 5 (TLS/mTLS), 6 (operación) y 7 (balanceo/gateway).
> Las referencias `archivo:línea` corresponden a ese commit; si el código cambia, las líneas pueden desplazarse,
> pero el nombre de la función o símbolo sigue siendo la pista segura.

## Índice
1. [Qué es esto y para qué sirve](#1-qué-es-esto-y-para-qué-sirve)
2. [Mapa del sistema](#2-mapa-del-sistema)
3. [Cómo está organizado el repo](#3-cómo-está-organizado-el-repo)
4. [Glosario mínimo](#4-glosario-mínimo)
5. [Fase por fase](#5-fase-por-fase)
6. [Recorrido guiado de una llamada real](#6-recorrido-guiado-de-una-llamada-real)
7. [Los tests como documentación](#7-los-tests-como-documentación)
8. [Cómo ejecutar y experimentar](#8-cómo-ejecutar-y-experimentar)
9. [Decisiones de diseño y límites conocidos](#9-decisiones-de-diseño-y-límites-conocidos)
10. [Cómo rastrear el código](#10-cómo-rastrear-el-código)

---

## 1. Qué es esto y para qué sirve

Es una **prueba de concepto de aprendizaje** que aplica gRPC a un caso pequeño pero realista: **crear un pedido**.

Crear un pedido implica varias cosas que, en un sistema con microservicios, viven en procesos distintos:

1. Comprobar y **reservar stock** de cada producto (servicio *Inventory*).
2. Si algo falla a mitad, **deshacer** lo ya reservado.
3. **Avisar** a quien esté interesado de que el pedido se creó o se rechazó (servicio *Notifications*).

Por eso hay **tres servicios gRPC** más un **CLI** que hace de cliente. El objetivo no es el negocio (el stock vive en memoria),
sino que cada pieza obligue a usar un concepto distinto de gRPC:

| Necesidad del caso | Concepto gRPC que la resuelve | Fase |
|---|---|---|
| "Consultar / reservar stock" | RPC unary + contrato `.proto` | 1 |
| "Listar productos", "ajustar stock en lote", "escuchar eventos" | Server / client / bidi streaming | 2 |
| "Decir *por qué* falló algo, y no esperar eternamente" | Status codes, detalles de error, deadlines, cancelación | 3 |
| "Saber quién llama, qué puede hacer y seguir una petición entre servicios" | Metadata, interceptores, JWT, `x-request-id` | 4 |

Qué **no** es: no es producción. No hay base de datos, ni TLS todavía, y el secreto JWT es de desarrollo (ver [sección 9](#9-decisiones-de-diseño-y-límites-conocidos)).

---

## 2. Mapa del sistema

```
                         ┌────────────────────────────┐
   npm run client ─────► │  ORDERS        :50052       │
   (CLI, token de        │  Orders.CreateOrder (unary)  │
    usuario "cli-user")  └───────┬──────────────┬──────┘
                                 │              │
        token de servicio        │              │  token de servicio
        "svc:orders"             ▼              ▼  "svc:orders"
                    ┌───────────────────┐   ┌─────────────────────────┐
                    │ INVENTORY  :50051 │   │ NOTIFICATIONS  :50053   │
                    │ GetStock          │   │ Publish (unary)         │
                    │ ReserveStock      │   │ Watch   (bidi stream)   │
                    │ ReleaseStock      │   └────────────▲────────────┘
                    │ ListProducts (srv)│                │
                    │ BulkUpdateStock(c)│   npm run client -- watch
                    └───────────────────┘   (el CLI también habla directo
                                             con Inventory y Notifications)
```

El CLI (`packages/client`) puede hablar con los **tres** servicios; Orders habla con Inventory y Notifications.

### Flujo de `CreateOrder` (el caso central)

```
cliente ──CreateOrder(items)──► Orders
                                 │ 1. valida: items vacío => INVALID_ARGUMENT
                                 │ 2. calcula el deadline hacia Inventory
                                 │ 3. por cada item:  Inventory.ReserveStock
                                 │       ├─ OK            -> lo anota en "reserved"
                                 │       └─ error         -> ir a 5
                                 │ 4. Notifications.Publish(ORDER_CREATED)  (mejor esfuerzo)
                                 │    responde { orderId, accepted: true }
                                 │ 5. (si falló)  Inventory.ReleaseStock de lo ya reservado,
                                 │    Notifications.Publish(ORDER_REJECTED) (mejor esfuerzo),
                                 │    y devuelve AL CLIENTE el mismo error de Inventory
                                 ▼
```

Código: `packages/orders/src/service.ts:43` (`CreateOrder`).

---

## 3. Cómo está organizado el repo

```
Test gRPC/
├─ package.json            # npm workspaces + scripts (gen:types, dev:*, client, test, typecheck)
├─ tsconfig.json
├─ proto/                  # ★ FUENTE DE VERDAD: los contratos
│  ├─ inventory/v1/inventory.proto
│  ├─ orders/v1/orders.proto
│  ├─ notifications/v1/notifications.proto
│  └─ google/rpc/{status,error_details}.proto   # subconjunto del modelo de error estándar de Google
├─ packages/
│  ├─ common/src/          # código compartido por todos los servicios
│  │  ├─ generated/        # TIPOS TS generados desde los .proto (no editar a mano)
│  │  ├─ load.ts           # carga un .proto en runtime  (loadProto)
│  │  ├─ inventory.ts · orders.ts · notifications.ts   # exportan el "Service" y los tipos de cada contrato
│  │  ├─ errors.ts         # errores gRPC enriquecidos (statusError / decodeDetails / passThrough)
│  │  ├─ call.ts           # utilidades de llamada: rpc(), downstreamDeadline(), waitUnlessCancelled()
│  │  ├─ context.ts        # AsyncLocalStorage con el request-id de la petición en curso
│  │  ├─ auth.ts           # JWT: signToken / verifyToken / serviceTokenProvider
│  │  ├─ scopes.ts         # qué scope exige cada método + identidad de Orders
│  │  ├─ interceptors.ts   # los 3 interceptores (observabilidad, auth, cliente)
│  │  └─ server.ts         # createServer() y clientOptions(): ensamblan la pila estándar
│  ├─ inventory/    src/{server.ts, service.ts}  test/inventory.test.ts
│  ├─ orders/       src/{server.ts, service.ts}  test/{flow,auth}.test.ts + harness.ts
│  ├─ notifications/src/{server.ts, service.ts}
│  └─ client/       src/cli.ts
└─ docs/aprendizaje/grpc/guia-proyecto.md   # este documento
```

### Por qué esta forma

- **Monorepo con npm workspaces**: los paquetes se importan entre sí como `@grpc-poc/common/src/...` sin publicar nada.
- **`proto/` fuera de los paquetes**: el contrato no pertenece a ningún servicio; todos lo consumen. Es lo que haría un repo de contratos compartido.
- **Dos archivos por servicio, `service.ts` y `server.ts`** (patrón que se repite en los tres):
  - `service.ts` = **lógica** (los handlers). No abre puertos, así que se puede probar en memoria.
  - `server.ts` = **arranque**: crea el servidor con interceptores, registra los handlers y abre el puerto.
- **Tipos generados + carga en runtime**: `proto-loader` lee el `.proto` al arrancar (`load.ts`), y `npm run gen:types`
  genera `generated/` solo para que TypeScript conozca las formas de los mensajes y de los handlers.
  Si cambias un `.proto`, ejecuta `npm run gen:types` y haz commit de `generated/`.

---

## 4. Glosario mínimo

| Término | Significado en este proyecto |
|---|---|
| **Servicio / RPC** | Un grupo de métodos remotos declarados en un `.proto` (`service Inventory { rpc GetStock ... }`). |
| **Stub / cliente** | Objeto que expone esos métodos como funciones locales: `inventory.GetStock(...)`. |
| **Handler** | La función del lado servidor que implementa un RPC (`GetStock(call, callback)`). |
| **Channel** | La conexión HTTP/2 de larga duración que usa un cliente. Se crea una vez y se reutiliza. |
| **Metadata** | Pares clave-valor que viajan como cabeceras HTTP/2 (headers al inicio, **trailers** al final). Aquí: `authorization`, `x-request-id`. |
| **Interceptor** | Middleware que envuelve cada llamada (cliente o servidor) para añadir comportamiento transversal. |
| **Deadline** | Instante límite que fija el cliente; pasado ese momento la llamada termina con `DEADLINE_EXCEEDED`. |
| **Status** | Resultado final de un RPC: un código (`OK`, `NOT_FOUND`, ...) más un mensaje. Viaja en los trailers. |
| **Error enriquecido** | Un status con detalles estructurados (`ErrorInfo`, `BadRequest`) en el trailer `grpc-status-details-bin`. |
| **JWT / scope** | Token firmado con la identidad (`sub`) y los permisos (`scope`, separados por espacio) de quien llama. |
| **Saga / compensación** | Deshacer a mano pasos ya hechos cuando un paso posterior falla (no hay transacción distribuida). |
| **Contexto async** | `AsyncLocalStorage`: un "almacén" que sigue a la petición a través de `await`, sin pasarlo como parámetro. |

---

## 5. Fase por fase

### Fase 1 · Unary + el contrato `.proto`

**Concepto.** En gRPC primero se escribe el **contrato** y de él salen cliente y servidor tipados. Un RPC *unary* es la forma más simple: una petición, una respuesta (como una función).

**Qué problema resuelve.** Que dos procesos acuerden, sin ambigüedad, qué se pueden pedir y con qué forma de datos. Cambiar un campo se ve en un solo sitio.

**Dónde está en el código**

| Qué | Dónde |
|---|---|
| Contrato del servicio | `proto/inventory/v1/inventory.proto` (`service Inventory`) |
| Carga el `.proto` en runtime | `packages/common/src/load.ts:8` (`loadProto`) |
| Exporta `InventoryService` (el "definition" que usan cliente y servidor) | `packages/common/src/inventory.ts:6` |
| Tipos TS generados | `packages/common/src/generated/` (script `npm run gen:types`) |
| Handler unary `GetStock` | `packages/inventory/src/service.ts:31` |
| Handler unary `ReserveStock` | `packages/inventory/src/service.ts:38` |
| Arranque del servidor | `packages/inventory/src/server.ts` (`bindAsync`, puerto `50051`) |
| Cliente de línea de comandos | `packages/client/src/cli.ts:54` (`case 'get'`) y `:58` (`case 'reserve'`) |

**Cómo se ve un handler unary** (`packages/inventory/src/service.ts:31`):

```ts
GetStock(call, callback) {
  const productId = call.request.productId ?? '';
  const available = stock.get(productId);
  if (available === undefined) return callback(notFound(productId));
  callback(null, { productId, available });
},
```

`call.request` es el mensaje de entrada; `callback(error, respuesta)` termina el RPC.

**Verlo funcionando**
```
npm run dev:inventory            # terminal 1
npm run client -- get sku-001    # terminal 2  ->  {"productId":"sku-001","available":100}
```

**Tests.** `packages/inventory/test/inventory.test.ts` (`GetStock devuelve el stock disponible`, `ReserveStock descuenta y ReleaseStock devuelve`).

**Trampas / decisiones**
- Los handlers del servidor se llaman en **PascalCase** (`GetStock`), igual que en el `.proto`; el cliente acepta también camelCase.
- Los campos del mensaje llegan en camelCase (`product_id` → `productId`) por la configuración de `proto-loader`.
- `service.ts` recibe el stock inicial por parámetro (`createHandlers(initial)`) para poder testear con datos propios.

---

### Fase 2 · Los 4 tipos de RPC

**Concepto.** gRPC no solo hace "pregunta → respuesta". Un RPC puede mandar o recibir **flujos** de mensajes dentro de una misma llamada.

| Tipo | En el `.proto` | Aquí | Para qué sirve |
|---|---|---|---|
| **Unary** | `rpc A(Req) returns (Res)` | `Orders.CreateOrder` | CRUD, comandos puntuales |
| **Server streaming** | `returns (stream Res)` | `Inventory.ListProducts` | El servidor emite varios resultados (listados, feeds) |
| **Client streaming** | `(stream Req) returns (Res)` | `Inventory.BulkUpdateStock` | El cliente envía muchos datos y recibe un resumen |
| **Bidi streaming** | `(stream Req) returns (stream Res)` | `Notifications.Watch` | Conversación en tiempo real; ambos lados escriben cuando quieren |

**Qué problema resuelve.** Evita tener que paginar a mano, hacer N llamadas para un lote, o montar *polling* para recibir eventos.

**Dónde está en el código**

| Qué | Dónde |
|---|---|
| Unary que orquesta otros servicios | `packages/orders/src/service.ts:43` (`CreateOrder`) |
| Server streaming: `write()` por producto y `end()` | `packages/inventory/src/service.ts:78` (`ListProducts`) |
| Client streaming: acumula `data`, responde en `end` | `packages/inventory/src/service.ts:87` (`BulkUpdateStock`) |
| Bidi: `Publish` (unary) emite al bus | `packages/notifications/src/service.ts:8` |
| Bidi: `Watch` recibe filtros y emite eventos | `packages/notifications/src/service.ts:14` |
| Cómo los invoca el CLI | `packages/client/src/cli.ts:68` (`list`), `:77` (`bulk`), `:87` (`order`), `:97` (`watch`) |

**Server streaming** (`inventory/src/service.ts:78`):
```ts
ListProducts(call) {
  for (const [productId, available] of stock) {
    if (call.request.onlyInStock && available === 0) continue;
    call.write({ productId, available });   // un mensaje por producto
  }
  call.end();                               // cierra el stream con OK
},
```

**Client streaming** (`inventory/src/service.ts:87`): el handler no responde al recibir cada mensaje, sino cuando el cliente cierra.
```ts
BulkUpdateStock(call, callback) {
  let updated = 0;
  call.on('data', ({ productId = '', delta = 0 }) => { ...; updated++; });
  call.on('end', () => callback(null, { updated }));   // una sola respuesta al final
},
```

**Bidi** (`notifications/src/service.ts:14`): lectura y escritura son **independientes**. Cada mensaje que llega (`data`) cambia el filtro;
cada evento del bus se escribe si coincide con el filtro actual. Un `EventEmitter` en memoria hace de bus.
```ts
bus.on('event', onEvent);                         // escribe hacia el cliente
call.on('data', ({ orderId = '' }) => { filter = orderId; });   // lee filtros del cliente
call.on('cancelled', cleanup);  call.on('error', cleanup);      // libera la suscripción
```

**Verlo funcionando** (con los tres servicios levantados, en terminales separadas):
```
npm run client -- list --in-stock
npm run client -- bulk sku-003:10 sku-002:-1     # -> {"updated":2}
npm run client -- watch                          # deja la terminal escuchando
npm run client -- order sku-001:2                # el watch muestra ORDER_CREATED
```

**Tests.** `packages/orders/test/flow.test.ts:13` (server streaming), `:20` (client streaming), `:34` (bidi con cambio de filtro).

**Trampas / decisiones**
- El bus de eventos es un `EventEmitter` en memoria: solo funciona con **una** instancia de Notifications. Con réplicas necesitarías un broker.
- En el handler bidi hay que limpiar la suscripción (`cleanup`) al terminar, o se acumulan listeners.
- `ListProducts` escribe todo de golpe; sin control de *backpressure* es suficiente para esta PoC.

---

### Fase 3 · Errores y deadlines

**Concepto.** Un RPC que falla debe decir **qué** pasó con un código estándar, y debe poder **dejar de esperar** (deadline) y **dejar de trabajar** (cancelación).

**Qué problema resuelve.**
- Antes: "sin stock" se devolvía como `accepted:false` (un éxito disfrazado) y un Inventory colgado dejaba a Orders esperando para siempre.
- Ahora: cada fallo tiene su código, el cliente puede leer detalles estructurados, y el tiempo está acotado de extremo a extremo.

#### 3.1 Status codes y detalles

| Situación | Código | Detalle adjunto |
|---|---|---|
| Producto inexistente | `NOT_FOUND` | `ErrorInfo{reason: PRODUCT_NOT_FOUND}` |
| `quantity <= 0` o `product_id` vacío / pedido sin items | `INVALID_ARGUMENT` | `BadRequest{fieldViolations}` |
| Stock insuficiente | `FAILED_PRECONDITION` | `ErrorInfo{reason: INSUFFICIENT_STOCK, metadata: requested/available}` |
| Se agotó el tiempo | `DEADLINE_EXCEEDED` | (lo genera gRPC) |

| Qué | Dónde |
|---|---|
| Construir un error con detalles | `packages/common/src/errors.ts:30` (`statusError`) |
| Reenviar el error de otro servicio sin perder código ni detalles | `packages/common/src/errors.ts:40` (`passThrough`) |
| Leer los detalles en el cliente | `packages/common/src/errors.ts:47` (`decodeDetails`) |
| Mensajes `Status`, `ErrorInfo`, `BadRequest` | `proto/google/rpc/status.proto`, `error_details.proto` |
| Uso en Inventory (validaciones y códigos) | `packages/inventory/src/service.ts:16` (`notFound`), `:21` (`invalidQuantity`), `:38-65` (`ReserveStock`) |

**Cómo viaja.** El `code` y el `message` van en los trailers estándar. Los detalles se serializan como un `google.rpc.Status` con
`details` de tipo `Any` y viajan en el trailer binario `grpc-status-details-bin` (el sufijo `-bin` indica valor binario).
Un cliente que no sepa de detalles sigue viendo el código y el mensaje.

```ts
// packages/inventory/src/service.ts:51
if (quantity > available) {
  return callback(statusError(grpc.status.FAILED_PRECONDITION, `stock insuficiente para ${productId}`, [
    { type: 'ErrorInfo', reason: 'INSUFFICIENT_STOCK', domain: DOMAIN,
      metadata: { productId, requested: String(quantity), available: String(available) } },
  ]));
}
```

#### 3.2 Deadlines: propagarlos y respetarlos

Un deadline es **un instante**, no una duración. En esta PoC se aplica en tres puntos:

1. **El cliente lo fija** (`DEADLINE_MS=300` en el CLI → `packages/client/src/cli.ts:37`, `callOptions`).
2. **Orders lo propaga a Inventory a mano**: grpc-js no lo hace solo. `packages/common/src/call.ts:13` (`downstreamDeadline`)
   toma el deadline de la llamada entrante y lo acota con un tope propio (3 s). Se usa en `packages/orders/src/service.ts:55`.
3. **Inventory deja de trabajar cuando vence**: `packages/common/src/call.ts:21` (`waitUnlessCancelled`) espera `ms` o hasta
   que la llamada se cancele; si se canceló, el handler **no aplica el efecto** (`packages/inventory/src/service.ts:43`).

```ts
// packages/inventory/src/service.ts:43
if (opts.latencyMs && !(await waitUnlessCancelled(call, opts.latencyMs))) {
  opts.onCancel?.();   // gancho para que el test compruebe que se canceló
  return;              // NO se descuenta el stock
}
```

Consecuencia comprobada con un test: con Inventory lento (1 s) y un deadline de 200 ms, el cliente recibe `DEADLINE_EXCEEDED`
en ~0,3 s (no espera el segundo completo), Inventory observa la cancelación y el stock queda intacto.

#### 3.3 Compensación (saga mínima)

Si falla el 2.º item, el 1.º ya está reservado. Como no hay transacción distribuida, Orders **deshace a mano**:

| Qué | Dónde |
|---|---|
| Lista `reserved` de lo ya reservado | `packages/orders/src/service.ts:56` |
| `catch`: compensa, notifica y devuelve el error original | `packages/orders/src/service.ts:63-69` |
| `release()` → `Inventory.ReleaseStock` en paralelo | `packages/orders/src/service.ts:33` |
| `publishSafe()` → notificar sin romper el pedido si falla | `packages/orders/src/service.ts:25` |

Las llamadas de compensación y notificación usan un **deadline propio y corto** (`BEST_EFFORT_MS`, línea 16): el deadline
del cliente puede haber vencido justo por lo que se está compensando.

**Verlo funcionando**
```
LATENCY_MS=1000 npm run dev:inventory
DEADLINE_MS=300 npm run client -- order sku-001:2        # ERROR DEADLINE_EXCEEDED ...
npm run client -- get sku-001                            # sigue en 100: la reserva nunca se aplicó
npm run client -- order sku-002:999                      # FAILED_PRECONDITION + detalle INSUFFICIENT_STOCK
```

**Tests.** `inventory.test.ts:32, 45, 55` (códigos y detalles); `flow.test.ts:60, 67, 73` (errores vistos desde Orders),
`:80` (compensación), `:100` (deadline + cancelación).

**Trampas / decisiones**
- **Bug aprendido**: el tipo `Any` de protobufjs llama al campo `type_url` (no `typeUrl`). Con el nombre equivocado `fromObject`
  lo ignora **sin error** y los detalles se perdían. Lo detectaron los tests (`errors.ts:26` y `:50`).
- **Límite conocido**: si un `ReserveStock` da `DEADLINE_EXCEEDED`, el cliente no sabe si el servidor llegó a aplicarlo.
  En un sistema real se resolvería con una **clave de idempotencia**. Aquí se asume "no aplicado" porque Inventory comprueba la cancelación antes de aplicar.
- Publicar la notificación es *best effort*: si Notifications cae, el pedido no falla (solo se escribe un `console.warn`).

---

### Fase 4 · Metadata, interceptores y autenticación

**Concepto.** Lo que no es lógica de negocio (identificar la petición, loguear, autenticar) se pone en **interceptores**, no dentro de cada handler.
La **metadata** es el canal lateral (cabeceras HTTP/2) por el que viajan el token y el id de petición.

**Qué problema resuelve.**
- Seguir **una** petición a través de tres procesos (`x-request-id`).
- Tener un log uniforme de todas las llamadas sin tocar los handlers.
- Rechazar a quien no está autenticado o no tiene permiso **antes** de ejecutar el handler.

#### 4.1 Las tres piezas

| Interceptor | Lado | Qué hace | Dónde |
|---|---|---|---|
| `observabilityInterceptor` | servidor | Lee/crea `x-request-id`, lo guarda en el contexto async, lo devuelve en headers y trailers, escribe 1 log JSON por llamada | `packages/common/src/interceptors.ts:32` |
| `authInterceptor` | servidor | Valida `Authorization: Bearer <jwt>`; `UNAUTHENTICATED` o `PERMISSION_DENIED` | `packages/common/src/interceptors.ts:98` |
| `clientInterceptor` | cliente | Añade `x-request-id` y `authorization` a cada llamada saliente | `packages/common/src/interceptors.ts:163` |

Se ensamblan en un solo sitio, `packages/common/src/server.ts`:
- `createServer(service)` (`:13`) → `new grpc.Server({ interceptors: [observabilidad, auth] })`.
- `clientOptions(getToken)` (`:23`) → `{ interceptors: [clientInterceptor] }`, que se pasa al construir cada cliente.

**El orden importa.** `observabilityInterceptor` va **primero**: así ve la metadata antes que auth, y el status final
(incluidos los rechazos de auth) pasa por él para quedar en el log con su `request-id`. Está comprobado: un rechazo
`UNAUTHENTICATED` aparece en el log con el mismo `request-id` que envió el cliente.

#### 4.2 Propagar el `request-id` sin pasarlo por parámetro

`packages/common/src/context.ts` guarda el contexto en un `AsyncLocalStorage`.
`observabilityInterceptor` ejecuta el handler **dentro de** `runWithContext` (`interceptors.ts:60, 62, 63`).
Cuando Orders, dentro de su handler, llama a Inventory, `clientInterceptor` lee `getContext()?.requestId` (`interceptors.ts:168`)
y lo pone en la metadata saliente. El handler de Orders no hace nada especial: el `request-id` "viaja solo".

#### 4.3 Autenticación y autorización

```
Authorization: Bearer <jwt>      jwt = { sub, scope: "inventory:read inventory:write ..." , exp }
```

| Qué | Dónde |
|---|---|
| Firmar / verificar (HS256 **fijado**) / token de servicio con caché | `packages/common/src/auth.ts` (`signToken`, `verifyToken`, `serviceTokenProvider`) |
| Tabla *método → scope requerido* | `packages/common/src/scopes.ts:2` (`METHOD_SCOPES`) |
| Identidad con la que Orders llama a los demás | `packages/common/src/scopes.ts:16` (`ORDERS_SERVICE_CLAIMS`, `sub: 'svc:orders'`) |
| Decisión 401 vs 403 | `packages/common/src/interceptors.ts:113-133` |

Resultado de cada caso:

| Caso | Código | `ErrorInfo.reason` |
|---|---|---|
| No hay header `Authorization` | `UNAUTHENTICATED` | `MISSING_TOKEN` |
| Token basura, firma de otro secreto, `alg: none` | `UNAUTHENTICATED` | `INVALID_TOKEN` |
| Token vencido | `UNAUTHENTICATED` | `TOKEN_EXPIRED` |
| Token válido pero sin el scope del método | `PERMISSION_DENIED` | `MISSING_SCOPE` (+ `required`, `subject`) |

Detalles que importan:
- **Dos identidades en la misma petición**: el usuario entra como `cli-user` (con `orders:write`) y Orders llama a Inventory como `svc:orders`.
  Los logs muestran ambos `subject`.
- Tras rechazar, el interceptor **descarta** mensajes y half-close (`interceptors.ts:138-143`) para que el handler nunca se ejecute.
- `verifyToken` pasa `algorithms: ['HS256']` explícito: aceptar el algoritmo que declare el token abre ataques de confusión (`alg: none`).
- `authInterceptor` ya acepta `publicPaths` (`:90`), pensado para health checks/reflection en la Fase 6.

**Por qué el cliente usa un interceptor y no "call credentials"** (nota en `interceptors.ts:160`): grpc-js no deja combinar credenciales
de llamada con un canal inseguro (afirmación pendiente de comprobar en la Fase 5). Al activar TLS se migrará a call credentials,
que es la vía recomendada por la documentación de gRPC para autenticación del lado cliente.

**Verlo funcionando**
```
NO_AUTH=1 npm run client -- order sku-001:1                 # UNAUTHENTICATED / MISSING_TOKEN
TOKEN=abc npm run client -- get sku-001                     # UNAUTHENTICATED / INVALID_TOKEN
SCOPES="inventory:read" npm run client -- order sku-001:1   # PERMISSION_DENIED / MISSING_SCOPE
npm run client -- order sku-001:1                           # OK; busca el request-id en los 3 logs
```

**Tests.** `packages/orders/test/auth.test.ts` (ver [sección 7](#7-los-tests-como-documentación)).

**Trampas / decisiones**
- Orden de `interceptors: [A, B]`: el **primero** de la lista es el que ve antes los mensajes entrantes.
- Hay que forzar el contexto en **cada** callback que llega al handler (`metadata`, `message`, `half-close`); los eventos de red
  no heredan solos el `AsyncLocalStorage`.
- El subject se asigna **antes** de comprobar el scope (`interceptors.ts:123`) para que el log de un `PERMISSION_DENIED` ya identifique a quien lo provocó.

---

## 6. Recorrido guiado de una llamada real

Traza de `npm run client -- order sku-001:2` con todo levantado y auth activa.

```
 CLI                         ORDERS :50052                    INVENTORY :50051            NOTIFICATIONS :50053
  │ runWithContext({requestId})   (cli.ts:52)
  │ clientInterceptor: pone x-request-id + Authorization(cli-user)
  │── CreateOrder ─────────────►
  │                          observability: lee x-request-id, abre contexto
  │                          auth: verifica JWT, sub=cli-user, scope orders:write ✔
  │                          handler CreateOrder (service.ts:43)
  │                            downstreamDeadline() (service.ts:55)
  │                            clientInterceptor: x-request-id (del contexto) + token svc:orders
  │                            ────────── ReserveStock ───────►
  │                                                         observability: mismo x-request-id
  │                                                         auth: sub=svc:orders, inventory:write ✔
  │                                                         handler ReserveStock (service.ts:38)
  │                            ◄────────── OK ───────────────
  │                            ─────────────────────────── Publish(ORDER_CREATED) ──────────►
  │                                                                                    auth: svc:orders, notifications:publish ✔
  │                            ◄───────────────────────────────────────────────────────── OK
  │◄── {orderId, accepted:true}  (+ trailer x-request-id)
```

**Qué se ve en los logs** (salida real capturada; una línea JSON por llamada, mismo `requestId` en los tres):

```
inventory     {"service":"inventory","method":"/inventory.v1.Inventory/ReserveStock","requestId":"eff4f162-…","subject":"svc:orders","code":"OK","ms":3}
notifications {"service":"notifications","method":"/notifications.v1.Notifications/Publish","requestId":"eff4f162-…","subject":"svc:orders","code":"OK","ms":5}
orders        {"service":"orders","method":"/orders.v1.Orders/CreateOrder","requestId":"eff4f162-…","subject":"cli-user","code":"OK","ms":28}
```

Cómo leerlo: el CLI imprime su `request-id=…` en `stderr` (`cli.ts:50`); búscalo en los tres logs y reconstruyes la petición completa.
Fíjate en que `orders` tarda 28 ms porque **incluye** el tiempo de las dos llamadas que hizo.

El mismo recorrido, pero con un rechazo de auth (`SCOPES="inventory:read" ...`): solo aparece una línea, en `orders`,
con `"code":"PERMISSION_DENIED"` y `"subject":"cli-user"`. Inventory y Notifications ni se enteran: el handler no llegó a ejecutarse.

---

## 7. Los tests como documentación

Total: **23 tests** en 3 archivos (`npm test`). Todos usan servidores reales de grpc-js en puertos efímeros dentro del mismo proceso.

### `packages/orders/test/harness.ts` (no es un test)
`setup(stock, inventoryOpts)` (`:30`) levanta Inventory, Notifications y Orders **con la pila real de interceptores**
(observabilidad + auth), conecta Orders a los otros dos con su token de servicio, y devuelve clientes ya autenticados con
todos los scopes, además de `logs` (los `LogEntry` capturados) y `connect(...)` para crear clientes con otro token.
`closeAll()` (`:18`) cierra todo. Es la mejor "guía de cableado" del proyecto.

### `packages/inventory/test/inventory.test.ts` — lógica de Inventory sin interceptores
| Línea | Test | Demuestra |
|---|---|---|
| 27 | GetStock devuelve el stock | unary básico |
| 32 | producto inexistente → `NOT_FOUND` + `ErrorInfo` | códigos y detalles (Fase 3) |
| 38 | Reserve descuenta y Release devuelve | efecto de los RPC |
| 45 | sin stock → `FAILED_PRECONDITION` | detalle `requested`/`available` |
| 55 | quantity 0 → `INVALID_ARGUMENT` + `BadRequest` | validación por campo |

### `packages/orders/test/flow.test.ts` — flujos entre servicios
| Línea | Test | Demuestra |
|---|---|---|
| 13 | `ListProducts` | server streaming |
| 20 | `BulkUpdateStock` | client streaming (+ el stock nunca baja de 0) |
| 34 | `CreateOrder` publica y `Watch` recibe, con cambio de filtro | bidi + Publish |
| 60 | sin stock → `FAILED_PRECONDITION` visto desde Orders | los detalles de Inventory llegan al cliente |
| 67 | producto inexistente → `NOT_FOUND` | `passThrough` |
| 73 | pedido sin items → `INVALID_ARGUMENT` | validación en Orders |
| 80 | falla el 2.º item → se libera el 1.º | compensación |
| 100 | Inventory lento + deadline | `DEADLINE_EXCEEDED`, cancelación y reserva no aplicada |

### `packages/orders/test/auth.test.ts` — seguridad y trazabilidad
| Línea | Test | Demuestra |
|---|---|---|
| 16 | sin token | `UNAUTHENTICATED/MISSING_TOKEN` y el stock no cambia |
| 27 | `test.each`: basura, otro secreto, vencido, `alg: none` | `INVALID_TOKEN` / `TOKEN_EXPIRED` |
| 47 | token sin el scope | `PERMISSION_DENIED` + sujeto en el log |
| 56 | streaming sin token | el rechazo también aplica a streams |
| 64 | `x-request-id` cliente→orders→inventory/notifications | propagación y dos identidades |
| 82 | request-id generado por el servidor | llega en los headers |
| 91 | rechazo de auth | queda en el log y el id vuelve en el error |

---

## 8. Cómo ejecutar y experimentar

### Comandos (`package.json`)
| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias y enlaza los workspaces |
| `npm run gen:types` | Regenera `packages/common/src/generated/` desde `proto/` (hazlo tras editar un `.proto`) |
| `npm run dev:inventory` / `dev:notifications` / `dev:orders` | Arranca cada servicio (50051 / 50053 / 50052) |
| `npm run client -- <comando>` | Ejecuta el CLI (`get`, `reserve`, `list`, `bulk`, `order`, `watch`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Los 23 tests con vitest |

Levanta los tres servicios en tres terminales y usa una cuarta para el CLI.

### Variables de entorno del CLI y de los servicios
| Variable | Efecto |
|---|---|
| `DEADLINE_MS=300` (CLI) | Fija un deadline a las llamadas unary del CLI |
| `LATENCY_MS=1000` (Inventory) | Simula un `ReserveStock` lento |
| `NO_AUTH=1` (CLI) | No envía token |
| `TOKEN=abc` (CLI) | Envía ese token tal cual |
| `SCOPES="inventory:read"` (CLI) | Firma un token con solo esos scopes |
| `JWT_SECRET` | Secreto de firma (por defecto uno de desarrollo; **debe ser el mismo en los tres servicios**) |
| `INVENTORY_ADDR`, `ORDERS_ADDR`, `NOTIFICATIONS_ADDR` | Direcciones destino |

### Experimentos guiados (haz una predicción antes de ejecutar)

| # | Experimento | Salida esperada | Qué aprendes |
|---|---|---|---|
| 1 | `npm run client -- get nope` | `ERROR NOT_FOUND` + `detalle {"type":"ErrorInfo",...,"reason":"PRODUCT_NOT_FOUND"}` | Errores enriquecidos |
| 2 | `npm run client -- reserve sku-001 0` | `INVALID_ARGUMENT` + `BadRequest` con el campo `quantity` | Validación por campo |
| 3 | `npm run client -- order sku-002:999` | `FAILED_PRECONDITION` + `INSUFFICIENT_STOCK` (`requested` 999, `available` 5) | Los detalles cruzan Orders sin perderse |
| 4 | `npm run client -- order sku-001:1 sku-002:999` y luego `get sku-001` | el stock de `sku-001` queda como antes | Compensación |
| 5 | Inventory con `LATENCY_MS=1000` + `DEADLINE_MS=300 ... order sku-001:2` | `DEADLINE_EXCEEDED` a los ~0,3 s; luego `get sku-001` = 100 | Deadline y cancelación |
| 6 | `NO_AUTH=1 ... order sku-001:1` | `UNAUTHENTICATED` / `MISSING_TOKEN` | Autenticación |
| 7 | `SCOPES="inventory:read" ... order sku-001:1` | `PERMISSION_DENIED` / `MISSING_SCOPE` (`required: orders:write`) | Autorización por scope |
| 8 | `watch` en una terminal y `order` en otra | el `watch` imprime `ORDER_CREATED` | Bidi streaming |
| 9 | Mira los 3 logs tras un `order` OK | un mismo `requestId` en las tres líneas | Propagación de contexto |

---

## 9. Decisiones de diseño y límites conocidos

**Simplificaciones de PoC (a propósito)**
- Stock y eventos **en memoria**: se pierden al reiniciar y no escalan a varias réplicas.
- `JWT_SECRET` por defecto (`'dev-only-secret-change-me'`) y HS256 simétrico. En producción: gestor de secretos o claves asimétricas con JWKS.
- Canales **sin cifrar** (`createInsecure()`): lo resuelve la Fase 5.
- Sin `buf` ni `grpcurl` instalados: los tipos se generan con `proto-loader-gen-types` y las demos se hacen con el CLI propio.

**Límites reales que conviene recordar**
- **Compensación sin idempotencia**: un `DEADLINE_EXCEEDED` en `ReserveStock` deja ambiguo si se aplicó o no.
- **No hay reintentos ni health checks**: Fase 6.
- Los handlers de `ListProducts` y `Watch` no controlan *backpressure*.
- El stock de `sku-003` empieza en 0 a propósito (para probar `FAILED_PRECONDITION`).

**Decisiones que podrías cuestionar (y por qué se tomaron así)**
| Decisión | Alternativa | Motivo |
|---|---|---|
| `proto-loader` en runtime + tipos generados | `ts-proto` / `buf generate` | Menos herramientas en Windows; ver el mecanismo "desnudo" de grpc-js |
| Auth de cliente en un interceptor | Call credentials | grpc-js lo exige sobre TLS; se migra en la Fase 5 |
| Errores con `google.rpc.Status` hecho a mano | Librería de error details | Entender qué viaja realmente en `grpc-status-details-bin` |
| Contexto con `AsyncLocalStorage` | Pasar `requestId` por parámetro | Los handlers quedan limpios; los interceptores hacen el trabajo |

**Lo que viene**
- **Fase 5**: TLS y mTLS (script de certificados, canales seguros, call credentials). Hito: un cliente sin certificado es rechazado.
- **Fase 6**: health checking, reflection, reintentos (`retryPolicy` solo en `UNAVAILABLE`), keepalive, límites de mensaje.
- **Fase 7** (opcional): dos réplicas de Inventory con `round_robin` y pasarela REST.

---

## 10. Cómo rastrear el código

### "Si quieres entender X, empieza en Y"
| Quiero entender... | Empieza en | Luego mira |
|---|---|---|
| Qué expone cada servicio | `proto/*/v1/*.proto` | `packages/common/src/{inventory,orders,notifications}.ts` |
| Cómo se arranca un servicio | `packages/<servicio>/src/server.ts` | `packages/common/src/server.ts:13` (`createServer`) |
| Qué hace un RPC en concreto | `packages/<servicio>/src/service.ts` | el test correspondiente |
| Cómo se crea un pedido de punta a punta | `packages/orders/src/service.ts:43` | `inventory/src/service.ts:38`, `notifications/src/service.ts:8` |
| De dónde sale un código de error | `inventory/src/service.ts` (`statusError(...)`) | `common/src/errors.ts` |
| Por qué una llamada devuelve `UNAUTHENTICATED` | `common/src/interceptors.ts:98` | `common/src/auth.ts`, `common/src/scopes.ts` |
| Cómo viaja el `request-id` | `common/src/interceptors.ts:32` | `common/src/context.ts`, `interceptors.ts:163` |
| Cómo se acota el tiempo | `common/src/call.ts` | `orders/src/service.ts:55`, `inventory/src/service.ts:43` |
| Cómo se prueba todo junto | `packages/orders/test/harness.ts` | `flow.test.ts`, `auth.test.ts` |

### Orden de lectura recomendado (≈ 1 hora)
1. `proto/inventory/v1/inventory.proto`, `proto/orders/v1/orders.proto`, `proto/notifications/v1/notifications.proto` — el contrato.
2. `packages/inventory/src/service.ts` — handlers sencillos + los códigos de error.
3. `packages/inventory/src/server.ts` y `packages/common/src/server.ts` — cómo se ensambla un servidor.
4. `packages/orders/src/service.ts` — el único handler que **también es cliente**.
5. `packages/notifications/src/service.ts` — el bidi.
6. `packages/common/src/{call,errors}.ts` — utilidades de la Fase 3.
7. `packages/common/src/{context,auth,scopes,interceptors}.ts` — la Fase 4.
8. `packages/orders/test/harness.ts` y los tres archivos de test — ven todo funcionando.
9. `packages/client/src/cli.ts` — cómo un cliente real usa los stubs.

### Ejercicios de comprensión
1. **Añadir un RPC unary** `Inventory.GetLowStock(threshold)`. ¿Qué archivos tocas, en qué orden? *(Pista: `.proto` → `npm run gen:types` → handler en `service.ts` → scope en `scopes.ts` → CLI → test.)*
2. **Nuevo scope**: haz que `ListProducts` exija `inventory:admin`. ¿Qué token deja de funcionar y qué código recibe?
3. **Romper algo a propósito**: en `common/src/errors.ts:26` cambia `type_url` por `typeUrl` y ejecuta `npm test`. ¿Qué tests fallan y por qué? *(Revierte después.)*
4. **Mover el orden de los interceptores** en `common/src/server.ts:13` (auth primero). ¿Qué desaparece de los logs de los rechazos y por qué?
5. **Preguntas abiertas**: ¿qué pasaría si dos `CreateOrder` reservan el mismo producto a la vez? ¿Y si Orders se cae justo entre `ReserveStock` y `Publish`?
