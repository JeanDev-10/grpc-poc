import path from 'node:path';
import * as grpc from '@grpc/grpc-js';
import protobuf from 'protobufjs';
import { PROTO_ROOT } from './load.js';

// Modelo de error enriquecido: google.rpc.Status con `details` (Any) viaja en el
// trailer binario `grpc-status-details-bin`. El code/message "planos" siguen
// viajando en grpc-status / grpc-message, así que clientes simples siguen funcionando.
const root = protobuf.loadSync([
  path.join(PROTO_ROOT, 'google/rpc/status.proto'),
  path.join(PROTO_ROOT, 'google/rpc/error_details.proto'),
]);
const StatusType = root.lookupType('google.rpc.Status');

const DETAILS_KEY = 'grpc-status-details-bin';
const typeUrl = (name: string) => `type.googleapis.com/google.rpc.${name}`;

export type ErrorDetail =
  | { type: 'ErrorInfo'; reason: string; domain?: string; metadata?: Record<string, string> }
  | { type: 'BadRequest'; fieldViolations: { field: string; description: string }[] };

export const DOMAIN = 'grpc-poc.devnova';

function pack({ type, ...fields }: ErrorDetail) {
  const T = root.lookupType(`google.rpc.${type}`);
  return { type_url: typeUrl(type), value: T.encode(T.fromObject(fields)).finish() };
}

/** Construye un error de servidor listo para `callback(err)` o para lanzar desde un handler async. */
export function statusError(code: grpc.status, message: string, details: ErrorDetail[] = []) {
  const metadata = new grpc.Metadata();
  if (details.length) {
    const bin = StatusType.encode(StatusType.fromObject({ code, message, details: details.map(pack) })).finish();
    metadata.set(DETAILS_KEY, Buffer.from(bin));
  }
  return { code, details: message, metadata };
}

/** Reenvía un error recibido de otro servicio conservando code, mensaje y detalles. */
export function passThrough(err: unknown) {
  const e = err as Partial<grpc.ServiceError>;
  if (typeof e?.code !== 'number') return statusError(grpc.status.INTERNAL, 'error interno');
  return { code: e.code, details: e.details ?? '', metadata: e.metadata };
}

/** Decodifica los detalles estructurados de un error recibido en el cliente. */
export function decodeDetails(err: { metadata?: grpc.Metadata }): ErrorDetail[] {
  const raw = err.metadata?.get(DETAILS_KEY)[0];
  if (!raw || typeof raw === 'string') return [];
  const status = StatusType.decode(raw) as unknown as { details: { type_url: string; value: Uint8Array }[] };
  return status.details.map((any) => {
    const name = any.type_url.split('/').pop()!.replace('google.rpc.', '');
    const T = root.lookupType(`google.rpc.${name}`);
    return { type: name, ...T.toObject(T.decode(any.value), { defaults: true }) } as ErrorDetail;
  });
}
