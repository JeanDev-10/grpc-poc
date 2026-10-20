import * as grpc from '@grpc/grpc-js';
import { decodeDetails } from '@grpc-poc/common/src/errors.js';
import { InventoryService } from '@grpc-poc/common/src/inventory.js';
import { NotificationsService } from '@grpc-poc/common/src/notifications.js';
import { OrdersService } from '@grpc-poc/common/src/orders.js';

const creds = grpc.credentials.createInsecure();
const inventory = new InventoryService(process.env.INVENTORY_ADDR ?? 'localhost:50051', creds);
const orders = new OrdersService(process.env.ORDERS_ADDR ?? 'localhost:50052', creds);
const notifications = new NotificationsService(process.env.NOTIFICATIONS_ADDR ?? 'localhost:50053', creds);

const closeAll = () => [inventory, orders, notifications].forEach((c) => c.close());

function done(err: grpc.ServiceError | null, res?: unknown) {
  if (err) {
    console.error(`ERROR ${grpc.status[err.code]}: ${err.details}`);
    for (const d of decodeDetails(err)) console.error(`  detalle ${JSON.stringify(d)}`);
  } else console.log(JSON.stringify(res));
  closeAll();
}

// DEADLINE_MS=200 npm run client -- order ... => la llamada falla si tarda más de 200 ms.
const callOptions = (): grpc.CallOptions =>
  process.env.DEADLINE_MS ? { deadline: Date.now() + Number(process.env.DEADLINE_MS) } : {};

// "sku-001:5" -> ['sku-001', 5]
const parsePair = (s: string): [string, number] => {
  const [id, n] = s.split(':');
  return [id, Number(n)];
};

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'get':
    inventory.GetStock({ productId: args[0] ?? 'sku-001' }, new grpc.Metadata(), callOptions(), done);
    break;

  case 'reserve':
    inventory.ReserveStock(
      { productId: args[0] ?? 'sku-001', quantity: Number(args[1] ?? 1) },
      new grpc.Metadata(),
      callOptions(),
      done,
    );
    break;

  // Server streaming: leemos hasta que el servidor cierra el stream.
  case 'list': {
    const stream = inventory.ListProducts({ onlyInStock: args[0] === '--in-stock' });
    stream.on('data', (p) => console.log(JSON.stringify(p)));
    stream.on('error', (e: grpc.ServiceError) => done(e));
    stream.on('end', closeAll);
    break;
  }

  // Client streaming: enviamos N mensajes y esperamos una única respuesta.
  case 'bulk': {
    const call = inventory.BulkUpdateStock(done);
    for (const pair of args) {
      const [productId, delta] = parsePair(pair);
      call.write({ productId, delta });
    }
    call.end();
    break;
  }

  case 'order':
    orders.CreateOrder(
      { items: args.map(parsePair).map(([productId, quantity]) => ({ productId, quantity })) },
      new grpc.Metadata(),
      callOptions(),
      done,
    );
    break;

  // Bidi: enviamos el filtro y escuchamos eventos hasta Ctrl+C.
  case 'watch': {
    const call = notifications.Watch();
    call.on('data', (e) => console.log(JSON.stringify(e)));
    call.on('error', (e: grpc.ServiceError) => done(e));
    call.write({ orderId: args[0] ?? '' });
    console.log('escuchando eventos (Ctrl+C para salir)...');
    process.on('SIGINT', () => {
      call.end();
      closeAll();
    });
    break;
  }

  default:
    console.log(
      [
        'uso: npm run client -- <comando>',
        '  get <sku> | reserve <sku> <n>        (unary)',
        '  list [--in-stock]                    (server streaming)',
        '  bulk <sku:delta> ...                 (client streaming)',
        '  order <sku:cantidad> ...             (unary, orquesta inventory + notifications)',
        '  watch [orderId]                      (bidi)',
      ].join('\n'),
    );
    closeAll();
}
