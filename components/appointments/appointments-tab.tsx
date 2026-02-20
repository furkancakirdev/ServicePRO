'use client';

import * as React from 'react';
import { CalendarClock, CheckCircle2, Lock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import type { JobAppointment, JobAppointmentStatus } from '@/types/job-appointment';
import { formatDateTimeForUi, parseDateTimeInputInTimeZone, toDateTimeInputInTimeZone } from '@/lib/timezone';

const APPOINTMENT_STATUS_OPTIONS: Array<{
  value: JobAppointmentStatus;
  label: string;
}> = [
  { value: 'PLANLANDI', label: 'Planlandı' },
  { value: 'ONAY_BEKLIYOR', label: 'Onay Bekliyor' },
  { value: 'ONAYLANDI', label: 'Onaylandı' },
  { value: 'YOLDA', label: 'Yolda' },
  { value: 'VARIS', label: 'Varış' },
  { value: 'BASLADI', label: 'Başladı' },
  { value: 'TAMAMLANDI', label: 'Tamamlandı' },
  { value: 'IPTAL', label: 'İptal' },
  { value: 'ERTELENDI', label: 'Ertelendi' },
];

type PersonelOption = {
  id: string;
  ad: string;
  unvan: string;
};

type AppointmentFormState = {
  baslangicAt: string;
  bitisAt: string;
  personelId: string;
  status: JobAppointmentStatus;
  notlar: string;
  kilitli: boolean;
};

const EMPTY_FORM: AppointmentFormState = {
  baslangicAt: '',
  bitisAt: '',
  personelId: '',
  status: 'PLANLANDI',
  notlar: '',
  kilitli: false,
};

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function sortAppointments(items: JobAppointment[]): JobAppointment[] {
  return [...items].sort((left, right) => {
    if (left.sira !== right.sira) return left.sira - right.sira;
    return new Date(left.baslangicAt).getTime() - new Date(right.baslangicAt).getTime();
  });
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
}

function toOptimisticDate(value: string, fallback: string): string {
  const parsed = parseDateTimeInputInTimeZone(value);
  return parsed ? parsed.toISOString() : fallback;
}

function buildDefaultForm(): AppointmentFormState {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    ...EMPTY_FORM,
    baslangicAt: toDateTimeInputInTimeZone(now),
    bitisAt: toDateTimeInputInTimeZone(oneHourLater),
  };
}

export function AppointmentsTab({
  jobId,
  initialAppointments,
}: {
  jobId: string;
  initialAppointments: JobAppointment[];
}) {
  const [appointments, setAppointments] = React.useState<JobAppointment[]>(sortAppointments(initialAppointments));
  const [personelOptions, setPersonelOptions] = React.useState<PersonelOption[]>([]);
  const [personelLoading, setPersonelLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<AppointmentFormState>(buildDefaultForm());

  React.useEffect(() => {
    setAppointments(sortAppointments(initialAppointments));
  }, [initialAppointments]);

  React.useEffect(() => {
    const loadPersonel = async () => {
      setPersonelLoading(true);
      try {
        const response = await fetch('/api/personel?aktif=true', {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error('Personel listesi yüklenemedi');
        }
        const payload = (await response.json()) as Array<{
          id: string;
          ad: string;
          unvan: string;
        }>;
        setPersonelOptions(
          payload.map((item) => ({
            id: item.id,
            ad: item.ad,
            unvan: item.unvan,
          }))
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Personel listesi yüklenemedi');
      } finally {
        setPersonelLoading(false);
      }
    };

    void loadPersonel();
  }, []);

  const openCreateDialog = () => {
    setEditingAppointmentId(null);
    setForm(buildDefaultForm());
    setDialogOpen(true);
  };

  const openEditDialog = (appointment: JobAppointment) => {
    setEditingAppointmentId(appointment.id);
    setForm({
      baslangicAt: toDateTimeInputInTimeZone(appointment.baslangicAt),
      bitisAt: toDateTimeInputInTimeZone(appointment.bitisAt),
      personelId: appointment.personelId ?? '',
      status: appointment.status,
      notlar: appointment.notlar ?? '',
      kilitli: appointment.kilitli,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      baslangicAt: form.baslangicAt,
      bitisAt: form.bitisAt,
      personelId: form.personelId ? form.personelId : null,
      status: form.status,
      notlar: form.notlar.trim() ? form.notlar.trim() : null,
      kilitli: form.kilitli,
    };

    if (!payload.baslangicAt || !payload.bitisAt) {
      toast.error('Başlangıç ve bitiş bilgisi zorunludur');
      return;
    }

    setSaving(true);
    try {
      if (editingAppointmentId) {
        const previous = appointments;
        const target = previous.find((item) => item.id === editingAppointmentId);
        if (!target) return;

        const optimistic: JobAppointment = {
          ...target,
          personelId: payload.personelId,
          personelAd:
            personelOptions.find((item) => item.id === payload.personelId)?.ad ?? target.personelAd,
          baslangicAt: toOptimisticDate(payload.baslangicAt, target.baslangicAt),
          bitisAt: toOptimisticDate(payload.bitisAt, target.bitisAt),
          status: payload.status,
          notlar: payload.notlar,
          kilitli: payload.kilitli,
        };

        setAppointments(
          sortAppointments(
            previous.map((item) => (item.id === editingAppointmentId ? optimistic : item))
          )
        );

        const response = await fetch(`/api/appointments/${editingAppointmentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          setAppointments(previous);
          const message = await parseErrorMessage(response, 'Randevu güncellenemedi');
          toast.error(message);
          return;
        }

        const updated = (await response.json()) as JobAppointment;
        setAppointments(
          sortAppointments(
            previous.map((item) => (item.id === updated.id ? updated : item))
          )
        );
        toast.success('Randevu güncellendi');
        setDialogOpen(false);
        return;
      }

      const temporaryId = `temp-${Date.now()}`;
      const optimisticStart = parseDateTimeInputInTimeZone(payload.baslangicAt);
      const optimisticEnd = parseDateTimeInputInTimeZone(payload.bitisAt);
      const optimisticAppointment: JobAppointment = {
        id: temporaryId,
        servisId: jobId,
        personelId: payload.personelId,
        personelAd: personelOptions.find((item) => item.id === payload.personelId)?.ad ?? null,
        personelUnvan:
          personelOptions.find((item) => item.id === payload.personelId)?.unvan ?? null,
        baslangicAt: optimisticStart ? optimisticStart.toISOString() : new Date().toISOString(),
        bitisAt: optimisticEnd
          ? optimisticEnd.toISOString()
          : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: payload.status,
        confirmedAt: null,
        confirmedByEmail: null,
        notlar: payload.notlar,
        sira: appointments.length,
        kilitli: payload.kilitli,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setAppointments(sortAppointments([...appointments, optimisticAppointment]));

      const response = await fetch(`/api/jobs/${jobId}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setAppointments((prev) => prev.filter((item) => item.id !== temporaryId));
        const message = await parseErrorMessage(response, 'Randevu oluşturulamadı');
        toast.error(message);
        return;
      }

      const created = (await response.json()) as JobAppointment;
      setAppointments((prev) =>
        sortAppointments(prev.map((item) => (item.id === temporaryId ? created : item)))
      );
      toast.success('Randevu oluşturuldu');
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Randevu kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleConfirmation = async (appointment: JobAppointment) => {
    const shouldConfirm = !appointment.confirmedAt;
    const previous = appointments;

    setConfirmingId(appointment.id);
    setAppointments((current) =>
      sortAppointments(
        current.map((item) =>
          item.id === appointment.id
            ? {
                ...item,
                confirmedAt: shouldConfirm ? new Date().toISOString() : null,
                status: shouldConfirm && item.status === 'PLANLANDI' ? 'ONAYLANDI' : item.status,
              }
            : item
        )
      )
    );

    try {
      const response = await fetch(`/api/appointments/${appointment.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ confirmed: shouldConfirm }),
      });

      if (!response.ok) {
        setAppointments(previous);
        const message = await parseErrorMessage(response, 'Randevu onayı kaydedilemedi');
        toast.error(message);
        return;
      }

      const updated = (await response.json()) as JobAppointment;
      setAppointments((current) =>
        sortAppointments(current.map((item) => (item.id === updated.id ? updated : item)))
      );
      toast.success(shouldConfirm ? 'Randevu onaylandı' : 'Randevu onayı kaldırıldı');
    } catch (error) {
      setAppointments(previous);
      toast.error(error instanceof Error ? error.message : 'Randevu onayı kaydedilemedi');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDelete = async (appointment: JobAppointment) => {
    const previous = appointments;
    setDeletingId(appointment.id);
    setAppointments((current) => current.filter((item) => item.id !== appointment.id));

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        setAppointments(previous);
        const message = await parseErrorMessage(response, 'Randevu silinemedi');
        toast.error(message);
        return;
      }

      toast.success('Randevu silindi');
    } catch (error) {
      setAppointments(previous);
      toast.error(error instanceof Error ? error.message : 'Randevu silinemedi');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="surface-panel" data-testid="job-appointments-tab">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Appointments</CardTitle>
          <Button onClick={openCreateDialog} size="sm" data-testid="job-appointment-create">
            <Plus className="mr-1 h-4 w-4" />
            Randevu Ekle
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Toplam {appointments.length} randevu • Saatler Türkiye saati (TR) ile gösterilir.
        </div>

        {appointments.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Henüz randevu yok.
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-md border border-border/70 p-3"
                data-testid={`job-appointment-item-${appointment.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">
                        {formatDateTimeForUi(appointment.baslangicAt)} -{' '}
                        {formatDateTimeForUi(appointment.bitisAt)}
                      </span>
                      <Badge variant="outline">{appointment.status}</Badge>
                      {appointment.kilitli ? (
                        <Badge variant="secondary">
                          <Lock className="mr-1 h-3 w-3" /> Kilitli
                        </Badge>
                      ) : null}
                      {appointment.confirmedAt ? (
                        <Badge className="bg-emerald-600/20 text-emerald-300">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Onaylı
                        </Badge>
                      ) : (
                        <Badge variant="outline">Onaysız</Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {appointment.personelAd ? `Teknisyen: ${appointment.personelAd}` : 'Teknisyen atanmadı'}
                    </div>

                    {appointment.notlar ? (
                      <p className="text-sm text-foreground">{appointment.notlar}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(appointment)}
                      data-testid={`job-appointment-edit-${appointment.id}`}
                    >
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleToggleConfirmation(appointment)}
                      disabled={confirmingId === appointment.id}
                      data-testid={`job-appointment-confirm-${appointment.id}`}
                    >
                      {confirmingId === appointment.id
                        ? 'Kaydediliyor...'
                        : appointment.confirmedAt
                          ? 'Onayı Kaldır'
                          : 'Onayla'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleDelete(appointment)}
                      disabled={deletingId === appointment.id}
                      data-testid={`job-appointment-delete-${appointment.id}`}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      {deletingId === appointment.id ? 'Siliniyor...' : 'Sil'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingAppointmentId ? 'Randevu Düzenle' : 'Yeni Randevu'}</DialogTitle>
            <DialogDescription>
              <CalendarClock className="mr-1 inline h-4 w-4" />
              Saatler Türkiye saati (TR) üzerinden girilir, veritabanında UTC tutulur.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="appointment-start">Başlangıç</Label>
              <Input
                id="appointment-start"
                type="datetime-local"
                value={form.baslangicAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, baslangicAt: event.target.value }))
                }
                data-testid="job-appointment-start"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="appointment-end">Bitiş</Label>
              <Input
                id="appointment-end"
                type="datetime-local"
                value={form.bitisAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bitisAt: event.target.value }))
                }
                data-testid="job-appointment-end"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Teknisyen</Label>
              <Select
                value={form.personelId || '__none__'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    personelId: value === '__none__' ? '' : value,
                  }))
                }
                disabled={personelLoading}
              >
                <SelectTrigger data-testid="job-appointment-personel">
                  <SelectValue placeholder={personelLoading ? 'Yükleniyor...' : 'Teknisyen seçin'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Atama yok</SelectItem>
                  {personelOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.ad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Durum</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as JobAppointmentStatus,
                  }))
                }
              >
                <SelectTrigger data-testid="job-appointment-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="appointment-note">Not</Label>
            <Textarea
              id="appointment-note"
              rows={3}
              value={form.notlar}
              onChange={(event) =>
                setForm((current) => ({ ...current, notlar: event.target.value }))
              }
              placeholder="Opsiyonel operasyon notu..."
              data-testid="job-appointment-note"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.kilitli}
              onCheckedChange={(value) =>
                setForm((current) => ({ ...current, kilitli: Boolean(value) }))
              }
              data-testid="job-appointment-locked"
            />
            Dispatch için kilitle
          </label>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={saving} data-testid="job-appointment-save">
              {saving ? 'Kaydediliyor...' : editingAppointmentId ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default AppointmentsTab;
