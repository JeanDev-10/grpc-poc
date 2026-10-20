import type { ProtoGrpcType } from './generated/notifications.js';
import { loadProto } from './load.js';

export type { NotificationsClient, NotificationsHandlers } from './generated/notifications/v1/Notifications.js';
export type { Event } from './generated/notifications/v1/Event.js';

export const NotificationsService = loadProto<ProtoGrpcType>('notifications/v1/notifications.proto').notifications.v1.Notifications;
