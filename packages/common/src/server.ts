import * as grpc from '@grpc/grpc-js';
import { JWT_SECRET } from './auth.js';
import { authInterceptor, clientInterceptor, observabilityInterceptor, type LogEntry } from './interceptors.js';
import { METHOD_SCOPES } from './scopes.js';

export interface SecureServerOptions {
  secret?: string;
  log?: (entry: LogEntry) => void;
  publicPaths?: string[];
}

/** Servidor con la pila estándar: observabilidad primero, auth después. */
export function createServer(service: string, { secret = JWT_SECRET, log, publicPaths }: SecureServerOptions = {}) {
  return new grpc.Server({
    interceptors: [
      observabilityInterceptor({ service, log }),
      authInterceptor({ secret, scopes: METHOD_SCOPES, publicPaths }),
    ],
  });
}

/** Opciones de cliente que añaden request-id y token a cada llamada. */
export const clientOptions = (getToken?: () => string | undefined): grpc.ClientOptions => ({
  interceptors: [clientInterceptor({ getToken })],
});
