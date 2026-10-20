import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../proto');

export function loadProto<T>(file: string): T {
  const packageDefinition = protoLoader.loadSync(file, {
    includeDirs: [PROTO_ROOT],
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  return grpc.loadPackageDefinition(packageDefinition) as unknown as T;
}
