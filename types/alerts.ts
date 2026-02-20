export const ALERT_EVENT_TYPES = [
  'APPOINTMENT_UNCONFIRMED_24H',
  'LEAD_FOLLOWUP_OVERDUE',
  'APPOINTMENT_OVERLAP_DETECTED',
] as const;

export type AlertEventType = (typeof ALERT_EVENT_TYPES)[number];

export const ALERT_EVENT_LABELS: Record<AlertEventType, string> = {
  APPOINTMENT_UNCONFIRMED_24H: 'Randevu onayi 24 saat kala yok',
  LEAD_FOLLOWUP_OVERDUE: 'Lead takip tarihi gecmis',
  APPOINTMENT_OVERLAP_DETECTED: 'Randevu cakisma tespiti',
};

export const ALERT_RULE_TEMPLATE_CONDITIONS: Record<AlertEventType, Record<string, number>> = {
  APPOINTMENT_UNCONFIRMED_24H: {
    thresholdHours: 24,
  },
  LEAD_FOLLOWUP_OVERDUE: {
    overdueMinutes: 0,
  },
  APPOINTMENT_OVERLAP_DETECTED: {
    lookaheadDays: 7,
  },
};

export const NOTIFICATION_CHANNEL_VALUES = ['IN_APP', 'EMAIL', 'SMS'] as const;
export type NotificationChannelValue = (typeof NOTIFICATION_CHANNEL_VALUES)[number];

export const NOTIFICATION_STATUS_VALUES = ['YENI', 'OKUNDU', 'ARSIV'] as const;
export type NotificationStatusValue = (typeof NOTIFICATION_STATUS_VALUES)[number];

export type AlertRuleRecord = {
  id: string;
  ad: string;
  aktif: boolean;
  eventTipi: AlertEventType;
  kosul: Record<string, unknown>;
  kosulJson: string;
  hedefRol: 'ADMIN' | 'YETKILI' | null;
  hedefUserId: string | null;
  kanal: NotificationChannelValue;
  createdAt: string;
  updatedAt: string;
  hedefUser?: {
    id: string;
    ad: string;
    email: string;
    role: 'ADMIN' | 'YETKILI';
  } | null;
};

export type NotificationRecord = {
  id: string;
  baslik: string;
  mesaj: string;
  entityTipi: string | null;
  entityId: string | null;
  actionUrl: string | null;
  status: NotificationStatusValue;
  createdAt: string;
  readAt: string | null;
};

export type NotificationSummary = {
  totalCount: number;
  unreadCount: number;
  readCount: number;
  archivedCount: number;
};

export type AlertRuleEvaluationDetail = {
  ruleId: string;
  eventTipi: AlertEventType;
  matchedCount: number;
  createdCount: number;
  archivedCount: number;
};

export type AlertEvaluationStatus = {
  ranAt: string;
  source: 'manual' | 'cron';
  totalRules: number;
  activeRules: number;
  createdCount: number;
  archivedCount: number;
  details: AlertRuleEvaluationDetail[];
};

export type AlertStatusResponse = {
  status: AlertEvaluationStatus | null;
};
