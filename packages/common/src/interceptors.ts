import { randomUUID } from 'node:crypto';
import * as grpc from '@grpc/grpc-js';
import { verifyToken } from './auth.js';
import { REQUEST_ID_HEADER, getContext, runWithContext, type RequestContext } from './context.js';
import { DOMAIN, statusError } from './errors.js';

const first = (values: grpc.MetadataValue[]) => {
  const v = values[0];
  return typeof v === 'string' ? v : undefined;
};

export interface LogEntry {
  ts: string;
  service: string;
  method: string;
  requestId: string;
  subject?: string;
  code: string;
  ms: number;
}

export interface ObservabilityOptions {
  service: string;
  log?: (entry: LogEntry) => void;
}

/**
 * Servidor: asigna/lee `x-request-id`, lo deja disponible en el contexto async del handler,
 * lo devuelve al cliente (headers y trailers) y escribe una línea de log por llamada.
 * Va PRIMERO en la lista: ve la metadata antes que auth y el status después de él.
 */
export function observabilityInterceptor({
  service,
  log = (e) => console.log(JSON.stringify(e)),
}: ObservabilityOptions): grpc.ServerInterceptor {
  return (methodDescriptor, call) => {
    const started = Date.now();
    const ctx: RequestContext = { requestId: randomUUID() };
    let logged = false;

    const finish = (code: grpc.status) => {
      if (logged) return;
      logged = true;
      log({
        ts: new Date().toISOString(),
        service,
        method: methodDescriptor.path,
        requestId: ctx.requestId,
        subject: ctx.subject,
        code: grpc.status[code],
        ms: Date.now() - started,
      });
    };

    // Todo lo que llega al handler se reenvía dentro de runWithContext para que sus
    // continuaciones async (incluidas llamadas salientes) vean el mismo contexto.
    const listener = new grpc.ServerListenerBuilder()
      .withOnReceiveMetadata((metadata, next) => {
        ctx.requestId = first(metadata.get(REQUEST_ID_HEADER)) ?? ctx.requestId;
        runWithContext(ctx, () => next(metadata));
      })
      .withOnReceiveMessage((message, next) => runWithContext(ctx, () => next(message)))
      .withOnReceiveHalfClose((next) => runWithContext(ctx, () => next()))
      .withOnCancel(() => finish(grpc.status.CANCELLED))
      .build();

    const responder = new grpc.ResponderBuilder()
      .withStart((next) => next(listener))
      .withSendMetadata((metadata, next) => {
        metadata.set(REQUEST_ID_HEADER, ctx.requestId);
        next(metadata);
      })
      .withSendStatus((status, next) => {
        const metadata = status.metadata ?? new grpc.Metadata();
        metadata.set(REQUEST_ID_HEADER, ctx.requestId);
        finish(status.code);
        next({ ...status, metadata });
      })
      .build();

    return new grpc.ServerInterceptingCall(call, responder);
  };
}

export interface AuthOptions {
  secret: string;
  /** Scope requerido por path; un path sin entrada solo exige estar autenticado. */
  scopes: Record<string, string>;
  /** Paths sin autenticación (health checks, reflection). */
  publicPaths?: string[];
}

/**
 * Servidor: valida `authorization: Bearer <jwt>`.
 *  - falta/ inválido/ vencido  => UNAUTHENTICATED
 *  - válido pero sin el scope  => PERMISSION_DENIED
 */
export function authInterceptor({ secret, scopes, publicPaths = [] }: AuthOptions): grpc.ServerInterceptor {
  return (methodDescriptor, call) => {
    const path = methodDescriptor.path;
    if (publicPaths.includes(path)) return new grpc.ServerInterceptingCall(call);

    let rejected = false;
    const reject = (code: grpc.status, message: string, reason: string, extra: Record<string, string> = {}) => {
      rejected = true;
      call.sendStatus(statusError(code, message, [{ type: 'ErrorInfo', reason, domain: DOMAIN, metadata: extra }]));
    };

    const listener = new grpc.ServerListenerBuilder()
      .withOnReceiveMetadata((metadata, next) => {
        const header = first(metadata.get('authorization'));
        const match = header?.match(/^Bearer\s+(.+)$/i);
        if (!match) return reject(grpc.status.UNAUTHENTICATED, 'falta el token Bearer', 'MISSING_TOKEN');

        let claims;
        try {
          claims = verifyToken(match[1], secret);
        } catch (err) {
          const reason = (err as Error).name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
          return reject(grpc.status.UNAUTHENTICATED, 'token inválido o vencido', reason);
        }

        // Antes del chequeo de scope: así el log de un PERMISSION_DENIED ya identifica al sujeto.
        const ctx = getContext();
        if (ctx) ctx.subject = claims.sub;

        const required = scopes[path];
        if (required && !claims.scope.split(' ').includes(required)) {
          return reject(grpc.status.PERMISSION_DENIED, `se requiere el scope ${required}`, 'MISSING_SCOPE', {
            required,
            subject: claims.sub,
          });
        }

        next(metadata);
      })
      // Tras rechazar, el handler nunca debe ver mensajes ni el half-close.
      .withOnReceiveMessage((message, next) => {
        if (!rejected) next(message);
      })
      .withOnReceiveHalfClose((next) => {
        if (!rejected) next();
      })
      .build();

    const responder = new grpc.ResponderBuilder().withStart((next) => next(listener)).build();
    return new grpc.ServerInterceptingCall(call, responder);
  };
}

export interface ClientInterceptorOptions {
  /** Token a enviar; se evalúa en cada llamada para poder renovarlo. */
  getToken?: () => string | undefined;
}

/**
 * Cliente: añade `x-request-id` (el del contexto actual si la llamada ocurre dentro de un
 * handler, o uno nuevo) y `authorization`. Se respeta lo que el llamador ya haya puesto.
 *
 * Se usa un interceptor y no "call credentials" porque grpc-js no permite combinar
 * credenciales de llamada con un canal inseguro; en la fase 5 (TLS) se migra.
 */
export function clientInterceptor({ getToken }: ClientInterceptorOptions = {}): grpc.Interceptor {
  return (options, nextCall) => {
    const requester = new grpc.RequesterBuilder()
      .withStart((metadata, listener, next) => {
        if (!metadata.get(REQUEST_ID_HEADER).length) {
          metadata.set(REQUEST_ID_HEADER, getContext()?.requestId ?? randomUUID());
        }
        const token = getToken?.();
        if (token && !metadata.get('authorization').length) metadata.set('authorization', `Bearer ${token}`);
        next(metadata, listener);
      })
      .build();
    return new grpc.InterceptingCall(nextCall(options), requester);
  };
}
