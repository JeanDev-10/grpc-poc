import { AsyncLocalStorage } from 'node:async_hooks';

/** Datos de la petición en curso; viajan por las continuaciones async del handler. */
export interface RequestContext {
  requestId: string;
  /** `sub` del JWT, lo completa el interceptor de auth. */
  subject?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const runWithContext = <T>(ctx: RequestContext, fn: () => T): T => storage.run(ctx, fn);
export const getContext = (): RequestContext | undefined => storage.getStore();

export const REQUEST_ID_HEADER = 'x-request-id';
