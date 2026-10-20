import * as grpc from '@grpc/grpc-js';
import { InventoryService } from '@grpc-poc/common/src/inventory.js';

const target = process.env.INVENTORY_ADDR ?? 'localhost:50051';
const client = new InventoryService(target, grpc.credentials.createInsecure());

const [cmd, productId = 'sku-001', qty = '1'] = process.argv.slice(2);

function done(err: grpc.ServiceError | null, res?: unknown) {
  if (err) console.error(`ERROR ${grpc.status[err.code]}: ${err.details}`);
  else console.log(JSON.stringify(res));
  client.close();
}

switch (cmd) {
  case 'get':
    client.getStock({ productId }, done);
    break;
  case 'reserve':
    client.reserveStock({ productId, quantity: Number(qty) }, done);
    break;
  default:
    console.log('uso: npm run client -- get <sku> | reserve <sku> <cantidad>');
    client.close();
}
