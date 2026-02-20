'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  ALERT_EVENT_LABELS,
  ALERT_EVENT_TYPES,
  ALERT_RULE_TEMPLATE_CONDITIONS,
  NOTIFICATION_CHANNEL_VALUES,
  type AlertEventType,
  type AlertRuleRecord,
  type NotificationChannelValue,
} from '@/types/alerts';

type AlertRuleDialogPayload = {
  ad: string;
  aktif: boolean;
  eventTipi: AlertEventType;
  kosul: Record<string, number>;
  hedefRol: 'ADMIN' | 'YETKILI' | null;
  hedefUserId: string | null;
  kanal: NotificationChannelValue;
};

type UserOption = {
  id: string;
  ad: string;
  email: string;
  role: 'ADMIN' | 'YETKILI';
};

type AlertRuleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserOption[];
  initialValue?: AlertRuleRecord | null;
  submitting?: boolean;
  onSubmit: (payload: AlertRuleDialogPayload) => Promise<void> | void;
};

const EVENT_CONDITION_CONFIG: Record<
  AlertEventType,
  { key: string; label: string; min: number; max: number }
> = {
  APPOINTMENT_UNCONFIRMED_24H: {
    key: 'thresholdHours',
    label: 'Esik saat (randevuya kalan)',
    min: 1,
    max: 240,
  },
  LEAD_FOLLOWUP_OVERDUE: {
    key: 'overdueMinutes',
    label: 'Gecikme dakikasi',
    min: 0,
    max: 43200,
  },
  APPOINTMENT_OVERLAP_DETECTED: {
    key: 'lookaheadDays',
    label: 'Ileriye donuk tarama gunu',
    min: 1,
    max: 30,
  },
};

function defaultConditionValue(eventTipi: AlertEventType): number {
  const config = EVENT_CONDITION_CONFIG[eventTipi];
  const defaults = ALERT_RULE_TEMPLATE_CONDITIONS[eventTipi];
  const raw = defaults[config.key];
  return Number.isFinite(raw) ? raw : config.min;
}

function normalizeNumber(value: string, eventTipi: AlertEventType): number {
  const config = EVENT_CONDITION_CONFIG[eventTipi];
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return defaultConditionValue(eventTipi);
  return Math.max(config.min, Math.min(config.max, Math.trunc(parsed)));
}

export function AlertRuleDialog({
  open,
  onOpenChange,
  users,
  initialValue,
  submitting,
  onSubmit,
}: AlertRuleDialogProps) {
  const [ad, setAd] = useState('');
  const [aktif, setAktif] = useState(true);
  const [eventTipi, setEventTipi] = useState<AlertEventType>('APPOINTMENT_UNCONFIRMED_24H');
  const [conditionValue, setConditionValue] = useState('24');
  const [hedefRol, setHedefRol] = useState<'ADMIN' | 'YETKILI' | null>('YETKILI');
  const [hedefUserId, setHedefUserId] = useState<string | null>(null);
  const [kanal, setKanal] = useState<NotificationChannelValue>('IN_APP');

  const editing = Boolean(initialValue);

  const conditionConfig = useMemo(() => EVENT_CONDITION_CONFIG[eventTipi], [eventTipi]);

  useEffect(() => {
    if (!open) return;

    if (initialValue) {
      setAd(initialValue.ad);
      setAktif(initialValue.aktif);
      setEventTipi(initialValue.eventTipi);
      const config = EVENT_CONDITION_CONFIG[initialValue.eventTipi];
      const raw = Number(initialValue.kosul?.[config.key] ?? defaultConditionValue(initialValue.eventTipi));
      setConditionValue(String(Number.isFinite(raw) ? raw : defaultConditionValue(initialValue.eventTipi)));
      setHedefRol(initialValue.hedefRol ?? null);
      setHedefUserId(initialValue.hedefUserId ?? null);
      setKanal(initialValue.kanal);
      return;
    }

    setAd('');
    setAktif(true);
    setEventTipi('APPOINTMENT_UNCONFIRMED_24H');
    setConditionValue(String(defaultConditionValue('APPOINTMENT_UNCONFIRMED_24H')));
    setHedefRol('YETKILI');
    setHedefUserId(null);
    setKanal('IN_APP');
  }, [initialValue, open]);

  const handleEventChange = (next: AlertEventType) => {
    setEventTipi(next);
    setConditionValue(String(defaultConditionValue(next)));
  };

  const handleSubmit = async () => {
    const trimmedName = ad.trim();
    if (trimmedName.length < 3) {
      toast.error('Kural adi en az 3 karakter olmalidir');
      return;
    }

    if (!hedefRol && !hedefUserId) {
      toast.error('Hedef rol veya hedef kullanici seciniz');
      return;
    }

    if (hedefRol && hedefUserId) {
      toast.error('Ayni anda rol ve tekil kullanici secilemez');
      return;
    }

    const numericCondition = normalizeNumber(conditionValue, eventTipi);

    await onSubmit({
      ad: trimmedName,
      aktif,
      eventTipi,
      kosul: {
        [conditionConfig.key]: numericCondition,
      },
      hedefRol,
      hedefUserId,
      kanal,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]" data-testid="alert-rule-dialog">
        <DialogHeader>
          <DialogTitle>{editing ? 'Alert Rule Duzenle' : 'Alert Rule Ekle'}</DialogTitle>
          <DialogDescription>
            ServiceTitan pattern kritik uyarilarini hedef role veya hedef kullaniciya yonlendirin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="alert-rule-name">Kural adi</Label>
            <Input
              id="alert-rule-name"
              value={ad}
              onChange={(event) => setAd(event.target.value)}
              placeholder="Orn: 24 saat kala onaysiz randevular"
              data-testid="alert-rule-name-input"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Event tipi</Label>
              <Select value={eventTipi} onValueChange={(value) => handleEventChange(value as AlertEventType)}>
                <SelectTrigger data-testid="alert-rule-event-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_EVENT_TYPES.map((event) => (
                    <SelectItem key={event} value={event}>
                      {ALERT_EVENT_LABELS[event]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{conditionConfig.label}</Label>
              <Input
                type="number"
                min={conditionConfig.min}
                max={conditionConfig.max}
                value={conditionValue}
                onChange={(event) => setConditionValue(event.target.value)}
                data-testid="alert-rule-condition-input"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Hedef rol</Label>
              <Select
                value={hedefRol ?? 'NONE'}
                onValueChange={(value) => {
                  if (value === 'NONE') {
                    setHedefRol(null);
                    return;
                  }
                  setHedefRol(value as 'ADMIN' | 'YETKILI');
                  setHedefUserId(null);
                }}
              >
                <SelectTrigger data-testid="alert-rule-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Secili degil</SelectItem>
                  <SelectItem value="YETKILI">Yetkili</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hedef kullanici</Label>
              <Select
                value={hedefUserId ?? 'NONE'}
                onValueChange={(value) => {
                  if (value === 'NONE') {
                    setHedefUserId(null);
                    return;
                  }
                  setHedefUserId(value);
                  setHedefRol(null);
                }}
              >
                <SelectTrigger data-testid="alert-rule-user-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Secili degil</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.ad} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Kanal</Label>
              <Select
                value={kanal}
                onValueChange={(value) => setKanal(value as NotificationChannelValue)}
              >
                <SelectTrigger data-testid="alert-rule-channel-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_CHANNEL_VALUES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
              <div>
                <p className="text-sm font-medium">Aktif</p>
                <p className="text-xs text-muted-foreground">Pasif kurallar evaluate sirasinda islenmez</p>
              </div>
              <Switch checked={aktif} onCheckedChange={setAktif} data-testid="alert-rule-active-switch" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Iptal
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting} data-testid="alert-rule-submit">
            {submitting ? 'Kaydediliyor...' : editing ? 'Guncelle' : 'Olustur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { AlertRuleDialogPayload, UserOption };
export default AlertRuleDialog;
