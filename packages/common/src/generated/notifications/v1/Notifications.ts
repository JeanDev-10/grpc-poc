// Original file: proto/notifications/v1/notifications.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { Event as _notifications_v1_Event, Event__Output as _notifications_v1_Event__Output } from '../../notifications/v1/Event';
import type { PublishResponse as _notifications_v1_PublishResponse, PublishResponse__Output as _notifications_v1_PublishResponse__Output } from '../../notifications/v1/PublishResponse';
import type { WatchRequest as _notifications_v1_WatchRequest, WatchRequest__Output as _notifications_v1_WatchRequest__Output } from '../../notifications/v1/WatchRequest';

export interface NotificationsClient extends grpc.Client {
  Publish(argument: _notifications_v1_Event, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_notifications_v1_PublishResponse__Output>): grpc.ClientUnaryCall;
  Publish(argument: _notifications_v1_Event, metadata: grpc.Metadata, callback: grpc.requestCallback<_notifications_v1_PublishResponse__Output>): grpc.ClientUnaryCall;
  Publish(argument: _notifications_v1_Event, options: grpc.CallOptions, callback: grpc.requestCallback<_notifications_v1_PublishResponse__Output>): grpc.ClientUnaryCall;
  Publish(argument: _notifications_v1_Event, callback: grpc.requestCallback<_notifications_v1_PublishResponse__Output>): grpc.ClientUnaryCall;
  publish(argument: _notifications_v1_Event, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_notifications_v1_PublishResponse__Output>): grpc.ClientUnaryCall;
  publish(argument: _notifications_v1_Event, metadata: grpc.Metadata, callback: grpc.requestCallback<_notifications_v1_PublishResponse__Output>): grpc.ClientUnaryCall;
  publish(argument: _notifications_v1_Event, options: grpc.CallOptions, callback: grpc.requestCallback<_notifications_v1_PublishResponse__Output>): grpc.ClientUnaryCall;
  publish(argument: _notifications_v1_Event, callback: grpc.requestCallback<_notifications_v1_PublishResponse__Output>): grpc.ClientUnaryCall;
  
  Watch(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_notifications_v1_WatchRequest, _notifications_v1_Event__Output>;
  Watch(options?: grpc.CallOptions): grpc.ClientDuplexStream<_notifications_v1_WatchRequest, _notifications_v1_Event__Output>;
  watch(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_notifications_v1_WatchRequest, _notifications_v1_Event__Output>;
  watch(options?: grpc.CallOptions): grpc.ClientDuplexStream<_notifications_v1_WatchRequest, _notifications_v1_Event__Output>;
  
}

export interface NotificationsHandlers extends grpc.UntypedServiceImplementation {
  Publish: grpc.handleUnaryCall<_notifications_v1_Event__Output, _notifications_v1_PublishResponse>;
  
  Watch: grpc.handleBidiStreamingCall<_notifications_v1_WatchRequest__Output, _notifications_v1_Event>;
  
}

export interface NotificationsDefinition extends grpc.ServiceDefinition {
  Publish: MethodDefinition<_notifications_v1_Event, _notifications_v1_PublishResponse, _notifications_v1_Event__Output, _notifications_v1_PublishResponse__Output>
  Watch: MethodDefinition<_notifications_v1_WatchRequest, _notifications_v1_Event, _notifications_v1_WatchRequest__Output, _notifications_v1_Event__Output>
}
