import { NotificationStatus, Prisma, UserRole } from '@prisma/client';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { prisma } from '@/lib/prisma';
import { formatDateTimeForUi } from '@/lib/timezone';
import {
  ALERT_EVENT_TYPES,
  ALERT_RULE_TEMPLATE_CONDITIONS,
  type AlertEvaluationStatus,
  type AlertEventType,
  type AlertRuleEvaluationDetail,
} from '@/types/alerts';

const ALERT_STATUS_SETTING_KEY = 'alerts_last_status';
const OPEN_NOTIFICATION_STATUSES: NotificationStatus[] = ['YENI', 'OKUNDU'];

type AlertRuleRow = {
  id: string;
  organizationId: string;
  ad: string;
  eventTipi: string;
  kosulJson: string;
  hedefRol: UserRole | null;
  hedefUserId: string | null;
};

type AppointmentRuleCandidate = {
  id: string;
  personelId: string | null;
  servisId: string;
  baslangicAt: Date;
  bitisAt: Date;
  servis: {
    id: string;
    tekneAdi: string;
    servisAciklamasi: string;
  };
  personel: {
    ad: string;
  } | null;
};

type LeadRuleCandidate = {
  id: string;
  ad: string | null;
  konu: string | null;
  takipAt: Date | null;
};

type EvaluateAlertsInput = {
  source: 'manual' | 'cron';
  triggeredByUserId?: string | null;
  triggeredByEmail?: string | null;
  specificRuleId?: string | null;
  now?: Date;
};

type NotificationSeed = {
  entityTipi: string;
  entityId: string;
  baslik: string;
  mesaj: string;
  actionUrl?: string | null;
};

function isAlertEventType(value: string): value is AlertEventType {
  return (ALERT_EVENT_TYPES as readonly string[]).includes(value);
}

export function parseRuleConditionJson(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function stringifyRuleCondition(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '{}';
  }
  return JSON.stringify(value);
}

function pickNumber(
  source: Record<string, unknown>,
  keys: string[],
  fallback: number,
  min: number,
  max: number
): number {
  for (const key of keys) {
    const raw = source[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
    const normalized = Math.trunc(raw);
    if (normalized < min || normalized > max) continue;
    return normalized;
  }
  return fallback;
}

async function resolveRecipientUserIds(
  tx: Prisma.TransactionClient,
  rule: AlertRuleRow
): Promise<string[]> {
  if (rule.hedefUserId) {
    const user = await tx.user.findUnique({
      where: { id: rule.hedefUserId },
      select: { id: true, aktif: true },
    });
    if (!user || !user.aktif) return [];
    return [user.id];
  }

  if (!rule.hedefRol) {
    return [];
  }

  const users = await tx.user.findMany({
    where: {
      role: rule.hedefRol,
      aktif: true,
    },
    select: { id: true },
  });

  return users.map((row) => row.id);
}

async function createNotifications(
  tx: Prisma.TransactionClient,
  organizationId: string,
  recipientUserIds: string[],
  seeds: NotificationSeed[]
): Promise<number> {
  if (!recipientUserIds.length || !seeds.length) {
    return 0;
  }

  const entityTipi = seeds[0]?.entityTipi ?? null;
  const baslik = seeds[0]?.baslik ?? null;
  const entityIds = Array.from(new Set(seeds.map((seed) => seed.entityId).filter(Boolean)));

  const existing =
    entityTipi && baslik && entityIds.length
      ? await tx.notification.findMany({
          where: {
            userId: { in: recipientUserIds },
            status: { in: OPEN_NOTIFICATION_STATUSES },
            baslik,
            entityTipi,
            entityId: { in: entityIds },
          },
          select: {
            userId: true,
            entityId: true,
          },
        })
      : [];

  const existingKeySet = new Set(existing.map((row) => `${row.userId}:${row.entityId ?? ''}`));
  const rows: Prisma.NotificationCreateManyInput[] = [];

  for (const seed of seeds) {
    for (const userId of recipientUserIds) {
      const key = `${userId}:${seed.entityId}`;
      if (existingKeySet.has(key)) continue;

      rows.push({
        organizationId,
        userId,
        baslik: seed.baslik,
        mesaj: seed.mesaj,
        entityTipi: seed.entityTipi,
        entityId: seed.entityId,
        actionUrl: seed.actionUrl ?? null,
        status: 'YENI',
      });
      existingKeySet.add(key);
    }
  }

  if (!rows.length) {
    return 0;
  }

  await tx.notification.createMany({ data: rows });
  return rows.length;
}

async function archiveResolvedNotifications(
  tx: Prisma.TransactionClient,
  input: {
    baslik: string;
    entityTipi: string;
    activeEntityIds: string[];
    recipientUserIds: string[];
    now: Date;
  }
): Promise<number> {
  const where: Prisma.NotificationWhereInput = {
    baslik: input.baslik,
    entityTipi: input.entityTipi,
    status: { in: OPEN_NOTIFICATION_STATUSES },
    ...(input.recipientUserIds.length > 0 ? { userId: { in: input.recipientUserIds } } : {}),
  };

  if (input.activeEntityIds.length > 0) {
    where.OR = [
      { entityId: { notIn: input.activeEntityIds } },
      { entityId: null },
    ];
  }

  const updated = await tx.notification.updateMany({
    where,
    data: {
      status: 'ARSIV',
      readAt: input.now,
    },
  });

  return updated.count;
}

async function evaluateAppointmentUnconfirmedRule(
  tx: Prisma.TransactionClient,
  rule: AlertRuleRow,
  recipientUserIds: string[],
  now: Date
): Promise<AlertRuleEvaluationDetail> {
  const kosul = parseRuleConditionJson(rule.kosulJson);
  const thresholdHours = pickNumber(
    kosul,
    ['thresholdHours', 'hours'],
    ALERT_RULE_TEMPLATE_CONDITIONS.APPOINTMENT_UNCONFIRMED_24H.thresholdHours,
    1,
    240
  );

  const windowEnd = new Date(now.getTime() + thresholdHours * 60 * 60 * 1000);

  const candidates = await tx.appointment.findMany({
    where: {
      deletedAt: null,
      confirmedAt: null,
      status: { in: ['PLANLANDI', 'ONAY_BEKLIYOR'] },
      baslangicAt: {
        gte: now,
        lte: windowEnd,
      },
    },
    include: {
      personel: {
        select: { ad: true },
      },
      servis: {
        select: {
          id: true,
          tekneAdi: true,
          servisAciklamasi: true,
        },
      },
    },
    orderBy: [{ baslangicAt: 'asc' }],
  });

  const mapped: AppointmentRuleCandidate[] = candidates.map((row) => ({
    id: row.id,
    personelId: row.personelId,
    servisId: row.servisId,
    baslangicAt: row.baslangicAt,
    bitisAt: row.bitisAt,
    servis: row.servis,
    personel: row.personel,
  }));

  const seeds: NotificationSeed[] = mapped.map((row) => {
    const personelText = row.personel?.ad ? `${row.personel.ad} - ` : '';
    return {
      entityTipi: 'APPOINTMENT',
      entityId: row.id,
      baslik: rule.ad,
      mesaj: `${personelText}${row.servis.tekneAdi} randevusu ${formatDateTimeForUi(row.baslangicAt)} icin hala onay bekliyor.`,
      actionUrl: `/jobs/${row.servisId}`,
    };
  });

  const createdCount = await createNotifications(tx, rule.organizationId, recipientUserIds, seeds);
  const archivedCount = await archiveResolvedNotifications(tx, {
    baslik: rule.ad,
    entityTipi: 'APPOINTMENT',
    activeEntityIds: mapped.map((row) => row.id),
    recipientUserIds,
    now,
  });

  return {
    ruleId: rule.id,
    eventTipi: 'APPOINTMENT_UNCONFIRMED_24H',
    matchedCount: mapped.length,
    createdCount,
    archivedCount,
  };
}

async function evaluateLeadOverdueRule(
  tx: Prisma.TransactionClient,
  rule: AlertRuleRow,
  recipientUserIds: string[],
  now: Date
): Promise<AlertRuleEvaluationDetail> {
  const kosul = parseRuleConditionJson(rule.kosulJson);
  const overdueMinutes = pickNumber(
    kosul,
    ['overdueMinutes', 'thresholdMinutes'],
    ALERT_RULE_TEMPLATE_CONDITIONS.LEAD_FOLLOWUP_OVERDUE.overdueMinutes,
    0,
    60 * 24 * 30
  );

  const overdueAt = new Date(now.getTime() - overdueMinutes * 60 * 1000);

  const candidates = await tx.lead.findMany({
    where: {
      takipAt: { not: null, lt: overdueAt },
      status: { in: ['YENI', 'TAKIPTE', 'TEKLIF_BEKLIYOR'] },
    },
    select: {
      id: true,
      ad: true,
      konu: true,
      takipAt: true,
    },
    orderBy: [{ takipAt: 'asc' }],
  });

  const mapped: LeadRuleCandidate[] = candidates;
  const seeds: NotificationSeed[] = mapped.map((row) => {
    const personName = row.ad?.trim() || 'Musteri';
    const subject = row.konu?.trim() || 'Lead takibi';
    const followUp = row.takipAt ? formatDateTimeForUi(row.takipAt) : '-';
    return {
      entityTipi: 'LEAD',
      entityId: row.id,
      baslik: rule.ad,
      mesaj: `${personName} - ${subject} icin takip zamani gecmis (${followUp}).`,
      actionUrl: `/leads/${row.id}`,
    };
  });

  const createdCount = await createNotifications(tx, rule.organizationId, recipientUserIds, seeds);
  const archivedCount = await archiveResolvedNotifications(tx, {
    baslik: rule.ad,
    entityTipi: 'LEAD',
    activeEntityIds: mapped.map((row) => row.id),
    recipientUserIds,
    now,
  });

  return {
    ruleId: rule.id,
    eventTipi: 'LEAD_FOLLOWUP_OVERDUE',
    matchedCount: mapped.length,
    createdCount,
    archivedCount,
  };
}

function buildOverlapMap(candidates: AppointmentRuleCandidate[]): Map<string, AppointmentRuleCandidate[]> {
  const byPersonel = new Map<string, AppointmentRuleCandidate[]>();
  for (const appointment of candidates) {
    if (!appointment.personelId) continue;
    const key = appointment.personelId;
    const bucket = byPersonel.get(key) ?? [];
    bucket.push(appointment);
    byPersonel.set(key, bucket);
  }

  const overlapMap = new Map<string, AppointmentRuleCandidate[]>();

  for (const appointments of Array.from(byPersonel.values())) {
    const sorted = [...appointments].sort(
      (left, right) => left.baslangicAt.getTime() - right.baslangicAt.getTime()
    );

    const active: AppointmentRuleCandidate[] = [];
    for (const current of sorted) {
      while (active.length > 0 && active[0]!.bitisAt <= current.baslangicAt) {
        active.shift();
      }

      for (const overlap of active) {
        const currentList = overlapMap.get(current.id) ?? [];
        currentList.push(overlap);
        overlapMap.set(current.id, currentList);

        const overlapList = overlapMap.get(overlap.id) ?? [];
        overlapList.push(current);
        overlapMap.set(overlap.id, overlapList);
      }

      active.push(current);
      active.sort((left, right) => left.bitisAt.getTime() - right.bitisAt.getTime());
    }
  }

  return overlapMap;
}

async function evaluateAppointmentOverlapRule(
  tx: Prisma.TransactionClient,
  rule: AlertRuleRow,
  recipientUserIds: string[],
  now: Date
): Promise<AlertRuleEvaluationDetail> {
  const kosul = parseRuleConditionJson(rule.kosulJson);
  const lookaheadDays = pickNumber(
    kosul,
    ['lookaheadDays', 'days'],
    ALERT_RULE_TEMPLATE_CONDITIONS.APPOINTMENT_OVERLAP_DETECTED.lookaheadDays,
    1,
    30
  );

  const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

  const candidates = await tx.appointment.findMany({
    where: {
      deletedAt: null,
      personelId: { not: null },
      status: { not: 'IPTAL' },
      baslangicAt: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    include: {
      personel: {
        select: { ad: true },
      },
      servis: {
        select: {
          id: true,
          tekneAdi: true,
          servisAciklamasi: true,
        },
      },
    },
    orderBy: [{ personelId: 'asc' }, { baslangicAt: 'asc' }],
  });

  const mapped: AppointmentRuleCandidate[] = candidates.map((row) => ({
    id: row.id,
    personelId: row.personelId,
    servisId: row.servisId,
    baslangicAt: row.baslangicAt,
    bitisAt: row.bitisAt,
    servis: row.servis,
    personel: row.personel,
  }));

  const overlapMap = buildOverlapMap(mapped);
  const seeds: NotificationSeed[] = [];

  for (const appointment of mapped) {
    const overlaps = overlapMap.get(appointment.id);
    if (!overlaps || overlaps.length === 0) continue;

    const overlapText = overlaps
      .slice(0, 2)
      .map((row) => row.servis.tekneAdi)
      .join(', ');

    seeds.push({
      entityTipi: 'APPOINTMENT',
      entityId: appointment.id,
      baslik: rule.ad,
      mesaj: `${appointment.personel?.ad ?? 'Teknisyen'} icin cakisan randevu bulundu (${overlapText}).`,
      actionUrl: '/dispatch',
    });
  }

  const activeIds = seeds.map((seed) => seed.entityId);
  const createdCount = await createNotifications(tx, rule.organizationId, recipientUserIds, seeds);
  const archivedCount = await archiveResolvedNotifications(tx, {
    baslik: rule.ad,
    entityTipi: 'APPOINTMENT',
    activeEntityIds: activeIds,
    recipientUserIds,
    now,
  });

  return {
    ruleId: rule.id,
    eventTipi: 'APPOINTMENT_OVERLAP_DETECTED',
    matchedCount: activeIds.length,
    createdCount,
    archivedCount,
  };
}

async function upsertEvaluationStatus(status: AlertEvaluationStatus, actor: string | null | undefined) {
  const existing = await prisma.setting.findFirst({
    where: { anahtar: ALERT_STATUS_SETTING_KEY },
    select: { id: true },
  });

  if (existing) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: {
        deger: JSON.stringify(status),
        kategori: 'alerts',
        aciklama: 'Alert evaluator son calisma ozeti',
        guncelleyen: actor ?? null,
      },
    });
    return;
  }

  await prisma.setting.create({
    data: {
      organizationId: 'org_default',
      anahtar: ALERT_STATUS_SETTING_KEY,
      deger: JSON.stringify(status),
      kategori: 'alerts',
      aciklama: 'Alert evaluator son calisma ozeti',
      guncelleyen: actor ?? null,
    },
  });
}

export async function evaluateAlerts(input: EvaluateAlertsInput): Promise<AlertEvaluationStatus> {
  const now = input.now ?? new Date();

  const activeRules = await prisma.alertRule.findMany({
    where: {
      aktif: true,
      kanal: 'IN_APP',
      ...(input.specificRuleId ? { id: input.specificRuleId } : {}),
    },
    orderBy: [{ createdAt: 'asc' }],
    select: {
      id: true,
      organizationId: true,
      ad: true,
      eventTipi: true,
      kosulJson: true,
      hedefRol: true,
      hedefUserId: true,
    },
  });

  const details: AlertRuleEvaluationDetail[] = [];
  let createdCount = 0;
  let archivedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const rule of activeRules) {
      if (!isAlertEventType(rule.eventTipi)) {
        continue;
      }

      const recipients = await resolveRecipientUserIds(tx, rule);
      if (recipients.length === 0) {
        details.push({
          ruleId: rule.id,
          eventTipi: rule.eventTipi,
          matchedCount: 0,
          createdCount: 0,
          archivedCount: 0,
        });
        continue;
      }

      let detail: AlertRuleEvaluationDetail;
      switch (rule.eventTipi) {
        case 'APPOINTMENT_UNCONFIRMED_24H':
          detail = await evaluateAppointmentUnconfirmedRule(tx, rule, recipients, now);
          break;
        case 'LEAD_FOLLOWUP_OVERDUE':
          detail = await evaluateLeadOverdueRule(tx, rule, recipients, now);
          break;
        case 'APPOINTMENT_OVERLAP_DETECTED':
          detail = await evaluateAppointmentOverlapRule(tx, rule, recipients, now);
          break;
        default:
          continue;
      }

      createdCount += detail.createdCount;
      archivedCount += detail.archivedCount;
      details.push(detail);
    }
  });

  const status: AlertEvaluationStatus = {
    ranAt: now.toISOString(),
    source: input.source,
    totalRules: activeRules.length,
    activeRules: activeRules.length,
    createdCount,
    archivedCount,
    details,
  };

  await upsertEvaluationStatus(status, input.triggeredByEmail);

  await writeAuditEvent(prisma, {
    organizationId: 'org_default',
    userId: input.triggeredByUserId ?? null,
    userEmail: input.triggeredByEmail ?? null,
    islemTuru: JOB_AUDIT_EVENTS.ALERTS_EVALUATED,
    entityTipi: 'AlertRule',
    entityId: input.specificRuleId ?? null,
    detay: `Alert evaluate (${input.source}) created=${createdCount} archived=${archivedCount} rules=${activeRules.length}`,
  });

  return status;
}

export async function getLatestAlertStatus(): Promise<AlertEvaluationStatus | null> {
  const row = await prisma.setting.findUnique({
    where: { anahtar: ALERT_STATUS_SETTING_KEY },
    select: { deger: true },
  });

  if (!row?.deger) return null;

  try {
    const parsed = JSON.parse(row.deger) as AlertEvaluationStatus;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}
