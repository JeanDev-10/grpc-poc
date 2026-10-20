import { EventEmitter } from 'node:events';
import type { Event, NotificationsHandlers } from '@grpc-poc/common/src/notifications.js';

export function createHandlers(): NotificationsHandlers {
  const bus = new EventEmitter();

  return {
    Publish(call, callback) {
      bus.emit('event', call.request);
      callback(null, {});
    },

    // Bidi: las lecturas (filtros) y las escrituras (eventos) son independientes.
    Watch(call) {
      let filter = '';
      const onEvent = (event: Event) => {
        if (!filter || event.orderId === filter) call.write(event);
      };
      bus.on('event', onEvent);

      call.on('data', ({ orderId = '' }) => {
        filter = orderId;
      });
      const cleanup = () => bus.off('event', onEvent);
      call.on('end', () => {
        cleanup();
        call.end();
      });
      call.on('cancelled', cleanup);
      call.on('error', cleanup);
    },
  };
}
