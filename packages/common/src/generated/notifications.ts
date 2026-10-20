import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { NotificationsClient as _notifications_v1_NotificationsClient, NotificationsDefinition as _notifications_v1_NotificationsDefinition } from './notifications/v1/Notifications';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  notifications: {
    v1: {
      Event: MessageTypeDefinition
      Notifications: SubtypeConstructor<typeof grpc.Client, _notifications_v1_NotificationsClient> & { service: _notifications_v1_NotificationsDefinition }
      PublishResponse: MessageTypeDefinition
      WatchRequest: MessageTypeDefinition
    }
  }
}

