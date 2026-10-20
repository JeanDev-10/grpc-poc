import type * as grpc from '@grpc/grpc-js';

/** Convierte un método estilo callback de grpc-js en una promesa. */
export const rpc = <T>(fn: (cb: (err: grpc.ServiceError | null, res?: T) => void) => void) =>
  new Promise<T>((resolve, reject) => fn((err, res) => (err ? reject(err) : resolve(res as T))));

const toMs = (d: Date | number) => (d instanceof Date ? d.getTime() : d);

/**
 * Deadline para una llamada saliente: el del cliente original (propagación manual,
 * grpc-js no la hace sola) acotado por un tope propio para no esperar de más.
 */
export function downstreamDeadline(call: grpc.ServerUnaryCall<unknown, unknown>, maxMs: number): number {
  return Math.min(toMs(call.getDeadline()), Date.now() + maxMs);
}

/**
 * Espera `ms` o hasta que la llamada se cancele (cliente se fue o venció el deadline).
 * Devuelve false si fue cancelada: el handler debe dejar de trabajar.
 */
export function waitUnlessCancelled(call: grpc.ServerUnaryCall<unknown, unknown>, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (call.cancelled) return resolve(false);
    const onCancel = () => {
      clearTimeout(timer);
      resolve(false);
    };
    const timer = setTimeout(() => {
      call.off('cancelled', onCancel);
      resolve(true);
    }, ms);
    call.once('cancelled', onCancel);
  });
}
