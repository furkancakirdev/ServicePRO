'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AppointmentsTab } from '@/components/appointments/appointments-tab';
import { EstimateTab } from '@/components/jobs/job-detail/EstimateTab';
import { normalizeRole } from '@/lib/auth/role';
import { getStatusConfig } from '@/lib/config/status-config';
import { formatDateDdmmyyyShortMonth } from '@/lib/date-utils';
import { decodeToken } from '@/lib/utils/auth';
import type { JobAppointment } from '@/types/job-appointment';
import type { JobLineItemRecord } from '@/types/pricebook';

type PersonelRol = 'SORUMLU' | 'DESTEK';
type PersonelUnvan = 'USTA' | 'CIRAK' | 'YONETICI' | 'OFIS';

type WorkOrderPart = {
  id: string;
  parcaAdi: string;
  miktar: number;
  birim: string | null;
  tedarikci: string | null;
  beklenenTarih: string | null;
  aciklama: string | null;
  tamamlandi: boolean;
};

type WorkOrderAssignee = {
  id: string;
  personelId: string;
  rol: PersonelRol;
  personel: {
    id: string;
    ad: string;
    unvan: PersonelUnvan;
  };
};

type WorkOrderNote = {
  id: string;
  text: string;
  createdAt: string;
  authorEmail: string | null;
  authorName: string | null;
};

type WorkOrderAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  authorEmail: string | null;
  authorName: string | null;
};

type WorkOrderDetailData = {
  id: string;
  tekneAdi: string;
  servisAciklamasi: string;
  isTuru: string;
  durum: string;
  oncelik: 'YUKSEK' | 'ORTA' | 'DUSUK';
  lokasyon: string;
  adres: string;
  tarih: string | null;
  saat: string | null;
  tahminiBitisTarihi: string | null;
  irtibatKisi: string | null;
  telefon: string | null;
  taseronNotlari: string | null;
  zorlukSeviyesi: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
  createdAt: string;
  updatedAt: string;
  personeller: WorkOrderAssignee[];
  bekleyenParcalar: WorkOrderPart[];
  appointments?: JobAppointment[];
  lineItems?: JobLineItemRecord[];
  notlar?: WorkOrderNote[];
  ekler?: WorkOrderAttachment[];
};

type TimelineEntry = {
  id: string;
  createdAt: string;
  islemTuru: string;
  detay: string | null;
  userEmail: string | null;
};

type PersonelOption = {
  id: string;
  ad: string;
  unvan: PersonelUnvan;
};

type BlockingReasonOption = {
  key: string;
  label: string;
  durumKey: string;
};

type WorkOrderDictionaryResponse = {
  blockingReasons: BlockingReasonOption[];
};

type WorkOrderDetailViewProps = {
  initialService: WorkOrderDetailData;
  timeline: TimelineEntry[];
  defaultTab?: 'genel' | 'appointments' | 'estimate' | 'plan' | 'notlar' | 'gecmis';
};

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return formatDateDdmmyyyShortMonth(value);
}

function getPriorityLabel(priority: WorkOrderDetailData['oncelik']): string {
  if (priority === 'YUKSEK') return 'Yuksek';
  if (priority === 'ORTA') return 'Orta';
  return 'Dusuk';
}

function getPriorityClass(priority: WorkOrderDetailData['oncelik']): string {
  if (priority === 'YUKSEK') return 'bg-rose-500/15 text-rose-600 border-rose-300/60';
  if (priority === 'ORTA') return 'bg-amber-500/15 text-amber-700 border-amber-300/60';
  return 'bg-emerald-500/15 text-emerald-700 border-emerald-300/60';
}

function formatFileSize(fileSize: number): string {
  if (!Number.isFinite(fileSize) || fileSize <= 0) return '-';
  if (fileSize < 1024) return `${fileSize} B`;
  if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(1)} KB`;
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

export function WorkOrderDetailView({
  initialService,
  timeline,
  defaultTab = 'genel',
}: WorkOrderDetailViewProps) {
  const router = useRouter();
  const [service, setService] = React.useState(initialService);
  const [notes, setNotes] = React.useState<WorkOrderNote[]>(initialService.notlar ?? []);
  const [attachments, setAttachments] = React.useState<WorkOrderAttachment[]>(initialService.ekler ?? []);
  const [personelOptions, setPersonelOptions] = React.useState<PersonelOption[]>([]);
  const [personelLoading, setPersonelLoading] = React.useState(true);
  const [blockingReasonOptions, setBlockingReasonOptions] = React.useState<BlockingReasonOption[]>([]);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  const [noteLoading, setNoteLoading] = React.useState(false);
  const [selectedAttachment, setSelectedAttachment] = React.useState<File | null>(null);
  const [attachmentLoading, setAttachmentLoading] = React.useState(false);
  const [attachmentDeletingId, setAttachmentDeletingId] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<'ADMIN' | 'YETKILI' | null>(null);
  const attachmentInputRef = React.useRef<HTMLInputElement | null>(null);

  const [assignOpen, setAssignOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);
  const [closeOpen, setCloseOpen] = React.useState(false);

  const [selectedPersonelId, setSelectedPersonelId] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<PersonelRol>('DESTEK');

  const [plannedDate, setPlannedDate] = React.useState(service.tarih ?? '');
  const [plannedTime, setPlannedTime] = React.useState(service.saat ?? '');

  const [blockingReason, setBlockingReason] = React.useState('');
  const [blockingNote, setBlockingNote] = React.useState('');

  const [qualityChecks, setQualityChecks] = React.useState({
    uniteModelVar: true,
    uniteSaatiVar: true,
    uniteSeriNoVar: true,
    aciklamaYeterli: true,
    adamSaatVar: true,
    fotograflarVar: true,
  });
  const [zorlukOverride, setZorlukOverride] = React.useState<'AUTO' | 'RUTIN' | 'ARIZA' | 'PROJE'>('AUTO');
  const canDeleteAttachment = role === 'ADMIN';

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { role?: string; rol?: string };
        const normalized = normalizeRole(parsed.role ?? parsed.rol ?? null);
        setRole(normalized);
        if (normalized) return;
      } catch {
        // Continue with token fallback.
      }
    }

    const token = window.localStorage.getItem('token');
    const payload = token ? decodeToken(token) : null;
    setRole(normalizeRole(payload?.role ?? null));
  }, []);

  React.useEffect(() => {
    const loadPersonel = async () => {
      setPersonelLoading(true);
      try {
        const response = await fetch('/api/personel?aktif=true', { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Personel listesi yuklenemedi');
        const payload = (await response.json()) as Array<{ id: string; ad: string; unvan: string }>;
        const mapped: PersonelOption[] = payload.map((personel) => ({
          id: personel.id,
          ad: personel.ad,
          unvan:
            personel.unvan === 'usta'
              ? 'USTA'
              : personel.unvan === 'cirak'
                ? 'CIRAK'
                : personel.unvan === 'yonetici'
                  ? 'YONETICI'
                  : 'OFIS',
        }));
        setPersonelOptions(mapped);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Personel listesi yuklenemedi');
      } finally {
        setPersonelLoading(false);
      }
    };

    void loadPersonel();
  }, []);

  React.useEffect(() => {
    const loadBlockingReasons = async () => {
      try {
        const response = await fetch('/api/dictionaries/work-order', {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Blokaj nedenleri yuklenemedi');
        const payload = (await response.json()) as WorkOrderDictionaryResponse;
        setBlockingReasonOptions(payload.blockingReasons ?? []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Blokaj nedenleri yuklenemedi');
      }
    };

    void loadBlockingReasons();
  }, []);

  const updateService = React.useCallback(
    async (payload: Record<string, unknown>) => {
      setActionLoading(true);
      try {
        const response = await fetch(`/api/services/${service.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });
        const body = (await response.json().catch(() => null)) as WorkOrderDetailData | { error?: string } | null;
        if (!response.ok) {
          throw new Error((body as { error?: string } | null)?.error || 'Is emri guncellenemedi');
        }
        setService(body as WorkOrderDetailData);
        router.refresh();
        return body as WorkOrderDetailData;
      } finally {
        setActionLoading(false);
      }
    },
    [router, service.id]
  );

  const handleAssign = async () => {
    if (!selectedPersonelId) {
      toast.error('Teknisyen secin.');
      return;
    }

    const nextAssignments = service.personeller
      .filter((item) => item.personelId !== selectedPersonelId)
      .map((item) => ({ personelId: item.personelId, rol: item.rol }));
    nextAssignments.push({ personelId: selectedPersonelId, rol: selectedRole });

    try {
      await updateService({ personeller: nextAssignments });
      toast.success('Atama guncellendi.');
      setAssignOpen(false);
      setSelectedPersonelId('');
      setSelectedRole('DESTEK');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Atama kaydedilemedi');
    }
  };

  const handleSchedule = async () => {
    if (!plannedDate) {
      toast.error('Plan tarihi secin.');
      return;
    }
    try {
      await updateService({
        tarih: plannedDate,
        saat: plannedTime || null,
      });
      toast.success('Plan bilgisi guncellendi.');
      setScheduleOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Planlama kaydedilemedi');
    }
  };

  const handleBlock = async () => {
    if (!blockingReason) {
      toast.error('Blokaj nedeni secmeden kaydedemezsiniz.');
      return;
    }

    const selected = blockingReasonOptions.find((option) => option.key === blockingReason);
    if (!selected) {
      toast.error('Gecerli bir blokaj nedeni secin.');
      return;
    }

    const noteLines = [`BLOKAJ: ${selected.label}`];
    if (blockingNote.trim()) {
      noteLines.push(`Not: ${blockingNote.trim()}`);
    }

    try {
      await updateService({
        durum: selected.durumKey,
        taseronNotlari: noteLines.join('\n'),
      });
      toast.success('Is emri blokaja alindi.');
      setBlockOpen(false);
      setBlockingReason('');
      setBlockingNote('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Blokaj kaydedilemedi');
    }
  };

  const handleCloseWorkOrder = async () => {
    if (service.personeller.length === 0) {
      toast.error('Kapanis icin en az bir teknisyen atamasi gerekli.');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/services/${service.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          personeller: service.personeller.map((item) => ({
            personelId: item.personelId,
            rol: item.rol,
          })),
          bonusPersonelIds: [],
          kaliteKontrol: {
            ...qualityChecks,
            uniteSaatiExcludeFromScoring: false,
            adamSaatExcludeFromScoring: false,
          },
          zorlukOverride: zorlukOverride === 'AUTO' ? null : zorlukOverride,
        }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error || 'Is emri kapatilamadi');
      }
      toast.success('Is emri kapatildi.', {
        action: {
          label: 'Sablon olustur',
          onClick: () => router.push(`/raporlar/whatsapp?serviceId=${service.id}`),
        },
      });
      setService((prev) => ({
        ...prev,
        durum: 'TAMAMLANDI',
      }));
      setCloseOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Is emri kapatilamadi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    const text = noteText.trim();
    if (!text) {
      toast.error('Not metni bos olamaz.');
      return;
    }

    setNoteLoading(true);
    try {
      const response = await fetch(`/api/services/${service.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ text }),
      });

      const body = (await response.json().catch(() => null)) as WorkOrderNote | { error?: string } | null;
      if (!response.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Not eklenemedi');
      }

      setNotes((prev) => [body as WorkOrderNote, ...prev]);
      setNoteText('');
      toast.success('Not eklendi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Not eklenemedi');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleUploadAttachment = async () => {
    if (!selectedAttachment) {
      toast.error('Yuklemek icin dosya secin.');
      return;
    }

    setAttachmentLoading(true);
    try {
      const formData = new FormData();
      formData.set('file', selectedAttachment);

      const response = await fetch(`/api/services/${service.id}/attachments`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });

      const body = (await response.json().catch(() => null)) as
        | WorkOrderAttachment
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Ek dosyasi yuklenemedi');
      }

      setAttachments((prev) => [body as WorkOrderAttachment, ...prev]);
      setSelectedAttachment(null);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
      toast.success('Ek dosyasi yuklendi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ek dosyasi yuklenemedi');
    } finally {
      setAttachmentLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachment: WorkOrderAttachment) => {
    try {
      const response = await fetch(`/api/services/${service.id}/attachments/${attachment.id}`, {
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Dosya indirilemedi');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Dosya indirilemedi');
    }
  };

  const handleDeleteAttachment = async (attachment: WorkOrderAttachment) => {
    if (!canDeleteAttachment) {
      toast.error('Ek silme islemi icin admin yetkisi gerekir.');
      return;
    }

    setAttachmentDeletingId(attachment.id);
    try {
      const response = await fetch(`/api/services/${service.id}/attachments/${attachment.id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | { success?: boolean } | null;
      if (!response.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Ek dosyasi silinemedi');
      }

      setAttachments((prev) => prev.filter((item) => item.id !== attachment.id));
      toast.success('Ek dosyasi silindi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ek dosyasi silinemedi');
    } finally {
      setAttachmentDeletingId(null);
    }
  };

  const waitingParts = service.bekleyenParcalar.filter((item) => !item.tamamlandi);
  const statusConfig = getStatusConfig(service.durum);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-4">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="h-auto flex-wrap gap-1 p-1">
            <TabsTrigger value="genel">Genel</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="estimate">Estimate</TabsTrigger>
            <TabsTrigger value="plan">Plan / Checklist</TabsTrigger>
            <TabsTrigger value="notlar">Notlar & Ekler</TabsTrigger>
            <TabsTrigger value="gecmis">Gecmis</TabsTrigger>
          </TabsList>

          <TabsContent value="genel" className="space-y-4">
            <Card className="surface-panel">
              <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Baslik / Ozet</p>
                  <p className="mt-1 font-medium text-foreground">{service.servisAciklamasi}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lokasyon</p>
                  <p className="mt-1 text-foreground">{service.lokasyon || service.adres}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tarih / Saat</p>
                  <p className="mt-1 text-foreground">
                    {formatDate(service.tarih)} {service.saat || '--:--'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Irtibat</p>
                  <p className="mt-1 text-foreground">{service.irtibatKisi || '-'} / {service.telefon || '-'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plan" className="space-y-4">
            <Card className="surface-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Planlama ve Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Plan Tarihi</p>
                  <p className="text-sm text-foreground">
                    {formatDate(service.tarih)} {service.saat || '--:--'}
                  </p>
                </div>
                <div className="rounded-md border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Atanan Teknisyenler</p>
                  {service.personeller.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Atama yapilmadi.</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                      {service.personeller.map((item) => (
                        <li key={item.id}>
                          {item.personel.ad} - {item.rol}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <AppointmentsTab jobId={service.id} initialAppointments={service.appointments ?? []} />
          </TabsContent>

          <TabsContent value="estimate" className="space-y-4">
            <EstimateTab jobId={service.id} initialLineItems={service.lineItems ?? []} />
          </TabsContent>

          <TabsContent value="notlar" className="space-y-4">
            <Card className="surface-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Notlar ve Ekler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Servis Notu (Legacy)</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {service.taseronNotlari || 'Not bulunmuyor.'}
                  </p>
                </div>

                <div className="space-y-2 rounded-md border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Yeni Not Ekle</p>
                  <Textarea
                    rows={3}
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="Kisa operasyon notu..."
                    data-testid="work-order-note-input"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => void handleAddNote()}
                      disabled={noteLoading}
                      data-testid="work-order-note-submit"
                    >
                      {noteLoading ? 'Ekleniyor...' : 'Not Ekle'}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Not Gecmisi</p>
                  {notes.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">Henuz not eklenmedi.</p>
                  ) : (
                    <ul className="mt-2 space-y-2" data-testid="work-order-notes-list">
                      {notes.map((note) => (
                        <li key={note.id} className="rounded-md border border-border/70 p-2 text-sm">
                          <p className="whitespace-pre-wrap text-foreground">{note.text}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleString('tr-TR')}
                            {note.authorName ? ` - ${note.authorName}` : ''}
                            {!note.authorName && note.authorEmail ? ` - ${note.authorEmail}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2 rounded-md border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Ek Dosya Yukle</p>
                  <Input
                    ref={attachmentInputRef}
                    type="file"
                    onChange={(event) => setSelectedAttachment(event.target.files?.[0] ?? null)}
                    data-testid="work-order-attachment-input"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Maksimum dosya boyutu: 10 MB
                    </p>
                    <Button
                      size="sm"
                      onClick={() => void handleUploadAttachment()}
                      disabled={!selectedAttachment || attachmentLoading}
                      data-testid="work-order-attachment-upload"
                    >
                      {attachmentLoading ? 'Yukleniyor...' : 'Dosya Yukle'}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Ekler</p>
                  {attachments.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">Ekli dosya bulunmuyor.</p>
                  ) : (
                    <ul className="mt-2 space-y-2" data-testid="work-order-attachments-list">
                      {attachments.map((attachment) => (
                        <li key={attachment.id} className="rounded-md border border-border/70 p-2 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-foreground">{attachment.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.fileSize)} - {new Date(attachment.createdAt).toLocaleString('tr-TR')}
                                {attachment.authorName ? ` - ${attachment.authorName}` : ''}
                                {!attachment.authorName && attachment.authorEmail ? ` - ${attachment.authorEmail}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleDownloadAttachment(attachment)}
                                data-testid={`work-order-attachment-download-${attachment.id}`}
                              >
                                Indir
                              </Button>
                              {canDeleteAttachment ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void handleDeleteAttachment(attachment)}
                                  disabled={attachmentDeletingId === attachment.id}
                                  data-testid={`work-order-attachment-delete-${attachment.id}`}
                                >
                                  {attachmentDeletingId === attachment.id ? 'Siliniyor...' : 'Sil'}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Parca Bekleme Listesi</p>
                  {service.bekleyenParcalar.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">Ekli parca kaydi bulunmuyor.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {service.bekleyenParcalar.map((part) => (
                        <li key={part.id} className="rounded-md border border-border/70 p-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{part.parcaAdi}</span>
                            <Badge variant={part.tamamlandi ? 'default' : 'outline'}>
                              {part.tamamlandi ? 'Tamamlandi' : 'Beklemede'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {part.tedarikci || 'Tedarikci yok'} - ETA: {formatDate(part.beklenenTarih)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gecmis" className="space-y-4">
            <Card className="surface-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Gecmis / Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Timeline kaydi bulunmuyor.</p>
                ) : (
                  <ol className="space-y-3">
                    {timeline.map((item) => (
                      <li key={item.id} className="rounded-md border border-border/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{item.islemTuru}</p>
                          <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('tr-TR')}</p>
                        </div>
                        <p className="mt-1 text-sm text-foreground">{item.detay || '-'}</p>
                        {item.userEmail ? (
                          <p className="mt-1 text-xs text-muted-foreground">{item.userEmail}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <aside className="space-y-4">
        <Card className="surface-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hizli Aksiyonlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => setAssignOpen(true)}>
              Teknisyen Ata
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => setScheduleOpen(true)}>
              Planlama Yap
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => setBlockOpen(true)}>
              Blokaj Ekle
            </Button>
            <Button
              className="w-full justify-start"
              onClick={() => setCloseOpen(true)}
              disabled={service.durum === 'TAMAMLANDI'}
            >
              Is Emrini Kapat
            </Button>
          </CardContent>
        </Card>

        <Card className="surface-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ozet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Durum</span>
              <Badge className={statusConfig.bgColor}>{statusConfig.label}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Oncelik</span>
              <Badge className={getPriorityClass(service.oncelik)}>{getPriorityLabel(service.oncelik)}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Atanan</span>
              <span>{service.personeller.length}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Bekleyen Parca</span>
              <span>{waitingParts.length}</span>
            </div>
          </CardContent>
        </Card>
      </aside>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teknisyen Ata</DialogTitle>
            <DialogDescription>Atama ve rol bilgisini kaydedin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Teknisyen</Label>
              <Select value={selectedPersonelId} onValueChange={setSelectedPersonelId} disabled={personelLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={personelLoading ? 'Yukleniyor...' : 'Teknisyen secin'} />
                </SelectTrigger>
                <SelectContent>
                  {personelOptions.map((personel) => (
                    <SelectItem key={personel.id} value={personel.id}>
                      {personel.ad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as PersonelRol)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SORUMLU">Sorumlu</SelectItem>
                  <SelectItem value="DESTEK">Destek</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Iptal</Button>
            <Button onClick={() => void handleAssign()} disabled={actionLoading}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planlama Yap</DialogTitle>
            <DialogDescription>Tarih ve saat bilgisini guncelleyin.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tarih</Label>
              <Input type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Saat</Label>
              <Input type="time" value={plannedTime} onChange={(event) => setPlannedTime(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Iptal</Button>
            <Button onClick={() => void handleSchedule()} disabled={actionLoading}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blokaj Nedenini Kaydet</DialogTitle>
            <DialogDescription>Blokaja alma islemi icin neden secimi zorunludur.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Neden</Label>
              <Select value={blockingReason} onValueChange={setBlockingReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Neden secin" />
                </SelectTrigger>
                <SelectContent>
                  {blockingReasonOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Not</Label>
              <Textarea
                rows={3}
                value={blockingNote}
                onChange={(event) => setBlockingNote(event.target.value)}
                placeholder="Opsiyonel aciklama"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockOpen(false)}>Iptal</Button>
            <Button onClick={() => void handleBlock()} disabled={actionLoading}>Blokaja Al</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Is Emrini Kapat</DialogTitle>
            <DialogDescription>
              Kapanis icin zorunlu checklist alanlarini isaretleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  ['uniteModelVar', 'Unite model bilgisi'],
                  ['uniteSaatiVar', 'Unite saati bilgisi'],
                  ['uniteSeriNoVar', 'Unite seri no bilgisi'],
                  ['aciklamaYeterli', 'Aciklama yeterli'],
                  ['adamSaatVar', 'Adam/saat bilgisi'],
                  ['fotograflarVar', 'Fotograf eklendi'],
                ] as Array<[keyof typeof qualityChecks, string]>
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={qualityChecks[key]}
                    onCheckedChange={(value) =>
                      setQualityChecks((prev) => ({
                        ...prev,
                        [key]: Boolean(value),
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1">
              <Label>Zorluk Override (Opsiyonel)</Label>
              <Select
                value={zorlukOverride}
                onValueChange={(value) => setZorlukOverride(value as typeof zorlukOverride)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">Otomatik</SelectItem>
                  <SelectItem value="RUTIN">Rutin</SelectItem>
                  <SelectItem value="ARIZA">Ariza</SelectItem>
                  <SelectItem value="PROJE">Proje</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Iptal</Button>
            <Button onClick={() => void handleCloseWorkOrder()} disabled={actionLoading}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
