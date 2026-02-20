import { Prisma } from '@prisma/client';

export const JOB_AUDIT_EVENTS = {
  JOB_CREATED: 'JOB_CREATED',
  JOB_UPDATED: 'JOB_UPDATED',
  JOB_COMPLETED: 'JOB_COMPLETED',
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
  APPOINTMENT_DELETED: 'APPOINTMENT_DELETED',
  APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_UNCONFIRMED: 'APPOINTMENT_UNCONFIRMED',
  APPOINTMENT_LOCKED: 'APPOINTMENT_LOCKED',
  APPOINTMENT_UNLOCKED: 'APPOINTMENT_UNLOCKED',
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_UPDATED: 'BOOKING_UPDATED',
  BOOKING_CONVERTED_TO_JOB: 'BOOKING_CONVERTED_TO_JOB',
  BOOKING_CONVERTED_TO_LEAD: 'BOOKING_CONVERTED_TO_LEAD',
  BOOKING_DISMISSED: 'BOOKING_DISMISSED',
  LEAD_CREATED: 'LEAD_CREATED',
  LEAD_UPDATED: 'LEAD_UPDATED',
  LEAD_CONVERTED_TO_JOB: 'LEAD_CONVERTED_TO_JOB',
  ALERT_RULE_CREATED: 'ALERT_RULE_CREATED',
  ALERT_RULE_UPDATED: 'ALERT_RULE_UPDATED',
  ALERT_RULE_DELETED: 'ALERT_RULE_DELETED',
  ALERTS_EVALUATED: 'ALERTS_EVALUATED',
  NOTIFICATION_MARKED_READ: 'NOTIFICATION_MARKED_READ',
  NOTIFICATION_ARCHIVED: 'NOTIFICATION_ARCHIVED',
  NOTIFICATIONS_MARKED_READ_ALL: 'NOTIFICATIONS_MARKED_READ_ALL',
  PRICEBOOK_CATEGORY_CREATED: 'PRICEBOOK_CATEGORY_CREATED',
  PRICEBOOK_CATEGORY_UPDATED: 'PRICEBOOK_CATEGORY_UPDATED',
  PRICEBOOK_ITEM_CREATED: 'PRICEBOOK_ITEM_CREATED',
  PRICEBOOK_ITEM_UPDATED: 'PRICEBOOK_ITEM_UPDATED',
  LINE_ITEM_ADDED: 'LINE_ITEM_ADDED',
  LINE_ITEM_UPDATED: 'LINE_ITEM_UPDATED',
  LINE_ITEM_REMOVED: 'LINE_ITEM_REMOVED',
  TEMPLATE_CREATED: 'TEMPLATE_CREATED',
  TEMPLATE_UPDATED: 'TEMPLATE_UPDATED',
  TEMPLATE_APPLIED_TO_JOB: 'TEMPLATE_APPLIED_TO_JOB',
  TEMPLATE_CREATED_JOB: 'TEMPLATE_CREATED_JOB',
} as const;

export type JobAuditEventType = (typeof JOB_AUDIT_EVENTS)[keyof typeof JOB_AUDIT_EVENTS];

type AuditClient = {
  auditLog: {
    create: (args: Prisma.AuditLogCreateArgs) => Promise<unknown>;
  };
};

export async function writeAuditEvent(
  client: AuditClient,
  input: {
    organizationId?: string | null;
    userId?: string | null;
    userEmail?: string | null;
    islemTuru: JobAuditEventType | string;
    entityTipi:
      | 'Job'
      | 'Appointment'
      | 'Service'
      | 'Booking'
      | 'Lead'
      | 'AlertRule'
      | 'Notification'
      | 'PricebookCategory'
      | 'PricebookItem'
      | 'JobLineItem'
      | 'JobTemplate';
    entityId?: string | null;
    detay?: string | null;
  }
) {
  await client.auditLog.create({
    data: {
      organizationId: input.organizationId ?? 'org_default',
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      islemTuru: input.islemTuru,
      entityTipi: input.entityTipi,
      entityId: input.entityId ?? null,
      detay: input.detay ?? null,
    },
  });
}
