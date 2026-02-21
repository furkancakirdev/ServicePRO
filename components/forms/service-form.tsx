'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ServisKapanisModal from '@/components/ServisKapanisModal';
import { normalizeServisDurumuForApp, normalizeServisDurumuForDb } from '@/lib/domain-mappers';
import { cn } from '@/lib/utils';

const serviceFormSchema = z.object({
  boatName: z.string().trim().min(1, 'Tekne adı zorunlu'),
  tarih: z.string().optional(),
  tahminiBitisTarihi: z.string().optional(),
  saat: z.string().optional(),
  isTuru: z.enum(['PAKET', 'ARIZA', 'PROJE']),
  adres: z.string().min(1, 'Adres giriniz'),
  yer: z.string().min(1, 'Lokasyon giriniz'),
  servisAciklamasi: z.string().min(5, 'Servis açıklaması en az 5 karakter olmalı'),
  irtibatKisi: z.string().optional(),
  telefon: z.string().optional(),
  durum: z.string().min(1, 'Durum seciniz'),
  taseronNotlari: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;
type PersonelRol = 'SORUMLU' | 'DESTEK';

type PersonelUnvan = 'USTA' | 'CIRAK' | 'YONETICI' | 'OFIS';

interface PersonelOption {
  id: string;
  ad: string;
  unvan: PersonelUnvan;
  aktif: boolean;
  aktifIsSayisi?: number;
  guncelDurum?: 'PASIF' | 'MUSAIT' | 'PLANLI' | 'YOGUN';
}

type PartCategory = 'TASERON_BEKLEYEN' | 'SIPARIS_EDILEN_YEDEK';

interface ServicePart {
  id?: string;
  parcaAdi: string;
  miktar: number;
  kategori: PartCategory;
  tedarikci: string;
  beklenenTarih: string;
  aciklama: string;
  tamamlandi: boolean;
  etaGun?: number;
}

interface FormGuardSettings {
  requireStartDate: boolean;
  requireAssignedPersonnel: boolean;
  requireEtaForWaitingParts: boolean;
  requireEtaForOrderedParts: boolean;
  requireSupplierForWaitingParts: boolean;
  warnOnMissingContactInfo: boolean;
}

interface PartsEtaSettings {
  enabled: boolean;
  minHistoryRecords: number;
  historyLookbackDays: number;
  defaultWaitingEtaDays: number;
  defaultOrderedEtaDays: number;
  maxEtaDays: number;
}

interface RuntimeSettings {
  formGuards: FormGuardSettings;
  partsEta: PartsEtaSettings;
}

interface WorkOrderDictionariesResponse {
  statuses: Array<{
    key: string;
    label: string;
  }>;
  locations: Array<{
    key: string;
    label: string;
  }>;
}

interface ServiceDetail {
  id: string;
  tarih: string | null;
  tahminiBitisTarihi: string | null;
  saat: string | null;
  isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
  tekneAdi: string;
  adres: string;
  yer: string;
  servisAciklamasi: string;
  irtibatKisi: string | null;
  telefon: string | null;
  durum: string;
  taseronNotlari: string | null;
  zorlukSeviyesi?: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
  personeller: Array<{
    personelId: string;
    rol: PersonelRol;
    personel: {
      ad: string;
      unvan: PersonelUnvan;
    };
  }>;
  bekleyenParcalar?: Array<{
    id: string;
    parcaAdi: string;
    miktar: number;
    birim: string | null;
    tedarikci: string | null;
    beklenenTarih: string | null;
    aciklama: string | null;
    tamamlandi: boolean;
  }>;
}

interface ScoringServiceData {
  servisId: string;
  tekneAdi: string;
  isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
  servisAciklamasi: string;
  yer: string;
  personeller: Array<{
    personelId: string;
    personelAd: string;
    rol: PersonelRol;
    unvan: PersonelUnvan;
  }>;
  zorlukSeviyesi?: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
}

interface CompletePayload {
  personeller: Array<{ personelId: string; rol: PersonelRol }>;
  bonusPersonelIds: string[];
  kaliteKontrol: {
    uniteModelVar: boolean;
    uniteSaatiVar: boolean;
    uniteSaatiExcludeFromScoring: boolean;
    uniteSeriNoVar: boolean;
    aciklamaYeterli: boolean;
    adamSaatVar: boolean;
    adamSaatExcludeFromScoring: boolean;
    // legacy aliases for backward compatibility
    uniteSaatiMuaf?: boolean;
    adamSaatMuaf?: boolean;
    fotograflarVar: boolean;
  };
  zorlukOverride: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
  kapanisOzeti: string;
}

export interface ServiceFormProps {
  mode: 'create' | 'edit';
  serviceId?: string;
}

const ROLE_LABELS: Record<PersonelRol, string> = {
  SORUMLU: 'Sorumlu',
  DESTEK: 'Destek',
};

const UNVAN_LABELS: Record<PersonelUnvan, string> = {
  USTA: 'Usta',
  CIRAK: 'Çırak',
  YONETICI: 'Yönetici',
  OFIS: 'Ofis',
};

const PERSONEL_DURUM_LABELS: Record<NonNullable<PersonelOption['guncelDurum']>, string> = {
  PASIF: 'Pasif',
  MUSAIT: 'Musait',
  PLANLI: 'Planli',
  YOGUN: 'Yogun',
};

const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = {
  formGuards: {
    requireStartDate: false,
    requireAssignedPersonnel: false,
    requireEtaForWaitingParts: true,
    requireEtaForOrderedParts: true,
    requireSupplierForWaitingParts: false,
    warnOnMissingContactInfo: true,
  },
  partsEta: {
    enabled: true,
    minHistoryRecords: 2,
    historyLookbackDays: 365,
    defaultWaitingEtaDays: 5,
    defaultOrderedEtaDays: 3,
    maxEtaDays: 30,
  },
};

function createEmptyPart(kategori: PartCategory): ServicePart {
  return {
    parcaAdi: '',
    miktar: 1,
    kategori,
    tedarikci: '',
    beklenenTarih: '',
    aciklama: '',
    tamamlandi: false,
  };
}

function normalizePartCategory(value: string | null | undefined): PartCategory {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_');
  return normalized === 'TASERON_BEKLEYEN' ? 'TASERON_BEKLEYEN' : 'SIPARIS_EDILEN_YEDEK';
}

function normalizeRuntimeSettings(value: unknown): RuntimeSettings {
  const raw = (value ?? {}) as {
    formGuards?: Partial<FormGuardSettings>;
    partsEta?: Partial<PartsEtaSettings>;
  };

  return {
    formGuards: {
      ...DEFAULT_RUNTIME_SETTINGS.formGuards,
      ...(raw.formGuards ?? {}),
    },
    partsEta: {
      ...DEFAULT_RUNTIME_SETTINGS.partsEta,
      ...(raw.partsEta ?? {}),
    },
  };
}

function toEtaDays(value: string): number | undefined {
  if (!value) return undefined;
  const targetDate = new Date(value);
  if (Number.isNaN(targetDate.getTime())) return undefined;
  const diffMs = targetDate.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return Number.isFinite(diffDays) ? Math.max(1, diffDays) : undefined;
}

function splitPartsByCategory(parts: ServiceDetail['bekleyenParcalar']): {
  waiting: ServicePart[];
  ordered: ServicePart[];
} {
  const waiting: ServicePart[] = [];
  const ordered: ServicePart[] = [];

  for (const part of parts ?? []) {
    const category = normalizePartCategory(part.birim);
    const normalized: ServicePart = {
      id: part.id,
      parcaAdi: part.parcaAdi,
      miktar: part.miktar,
      kategori: category,
      tedarikci: part.tedarikci ?? '',
      beklenenTarih: toDateInput(part.beklenenTarih),
      aciklama: part.aciklama ?? '',
      tamamlandi: part.tamamlandi,
      etaGun: toEtaDays(toDateInput(part.beklenenTarih)),
    };

    if (category === 'TASERON_BEKLEYEN') {
      waiting.push(normalized);
    } else {
      ordered.push(normalized);
    }
  }

  return {
    waiting: waiting.length > 0 ? waiting : [createEmptyPart('TASERON_BEKLEYEN')],
    ordered: ordered.length > 0 ? ordered : [createEmptyPart('SIPARIS_EDILEN_YEDEK')],
  };
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function authorizedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const authHeaders = getAuthHeaders();
  const firstHeaders = new Headers(init?.headers ?? {});
  if (authHeaders.Authorization) {
    firstHeaders.set('Authorization', authHeaders.Authorization);
  }

  let response = await fetch(input, {
    ...init,
    headers: firstHeaders,
  });

  if (response.status === 401 && authHeaders.Authorization) {
    response = await fetch(input, {
      ...init,
      headers: init?.headers,
    });
  }

  return response;
}

function toDateInput(value: string | null): string {
  if (!value) return '';
  return value.split('T')[0] ?? '';
}

function toOptionalDate(value?: string | null): string | null {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function mergePersonnelOptions(current: PersonelOption[], extras: PersonelOption[]): PersonelOption[] {
  const map = new Map<string, PersonelOption>();

  for (const item of [...current, ...extras]) {
    map.set(item.id, item);
  }

  return Array.from(map.values()).sort((left, right) => left.ad.localeCompare(right.ad, 'tr'));
}

function mapServiceToScoringData(service: ServiceDetail): ScoringServiceData {
  return {
    servisId: service.id,
    tekneAdi: service.tekneAdi,
    isTuru: service.isTuru,
    servisAciklamasi: service.servisAciklamasi,
    yer: service.yer,
    zorlukSeviyesi: service.zorlukSeviyesi ?? null,
    personeller: service.personeller.map((personel) => ({
      personelId: personel.personelId,
      personelAd: personel.personel.ad,
      rol: personel.rol,
      unvan: personel.personel.unvan,
    })),
  };
}

export function ServiceForm({ mode, serviceId }: ServiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(mode === 'edit');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showScoring, setShowScoring] = React.useState(false);
  const [isScored, setIsScored] = React.useState(false);
  const [currentService, setCurrentService] = React.useState<ServiceDetail | null>(null);
  const [scoringService, setScoringService] = React.useState<ScoringServiceData | null>(null);
  const [personnelOptions, setPersonnelOptions] = React.useState<PersonelOption[]>([]);
  const [personnelLoading, setPersonnelLoading] = React.useState(true);
  const [assignments, setAssignments] = React.useState<Record<string, PersonelRol>>({});
  const [runtimeSettings, setRuntimeSettings] = React.useState<RuntimeSettings>(DEFAULT_RUNTIME_SETTINGS);
  const [statusOptions, setStatusOptions] = React.useState<Array<{ key: string; label: string }>>([]);
  const [locationOptions, setLocationOptions] = React.useState<Array<{ key: string; label: string }>>([]);
  const [subcontractorParts, setSubcontractorParts] = React.useState<ServicePart[]>([
    createEmptyPart('TASERON_BEKLEYEN'),
  ]);
  const [orderedSpareParts, setOrderedSpareParts] = React.useState<ServicePart[]>([
    createEmptyPart('SIPARIS_EDILEN_YEDEK'),
  ]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      boatName: '',
      tarih: new Date().toISOString().split('T')[0],
      tahminiBitisTarihi: '',
      saat: '',
      isTuru: 'PAKET',
      adres: '',
      yer: '',
      servisAciklamasi: '',
      irtibatKisi: '',
      telefon: '',
      durum: 'RANDEVU_VERILDI',
      taseronNotlari: '',
    },
  });

  const selectedStatus = watch('durum');
  const selectedLocation = watch('yer');

  const visibleStatusOptions = React.useMemo(() => {
    const options = [...statusOptions];
    if (selectedStatus && !options.some((item) => item.key === selectedStatus)) {
      options.push({ key: selectedStatus, label: selectedStatus });
    }
    if (options.length === 0) {
      options.push({ key: 'RANDEVU_VERILDI', label: 'Randevu Verildi' });
    }
    return options;
  }, [selectedStatus, statusOptions]);

  const visibleLocationOptions = React.useMemo(() => {
    const options = [...locationOptions];
    if (selectedLocation && !options.some((item) => item.key === selectedLocation)) {
      options.push({ key: selectedLocation, label: selectedLocation });
    }
    return options;
  }, [locationOptions, selectedLocation]);

  const selectedAssignments = React.useMemo(
    () =>
      Object.entries(assignments).map(([personelId, rol]) => ({
        personelId,
        rol,
      })),
    [assignments]
  );

  const allParts = React.useMemo(
    () => [...subcontractorParts, ...orderedSpareParts],
    [orderedSpareParts, subcontractorParts]
  );

  const normalizedPartsPayload = React.useMemo(
    () =>
      allParts
        .filter((part) => part.parcaAdi.trim().length > 0)
        .map((part) => ({
          parcaAdi: part.parcaAdi.trim(),
          miktar: Number.isFinite(part.miktar) ? Math.max(1, Math.round(part.miktar)) : 1,
          kategori: part.kategori,
          tedarikci: part.tedarikci.trim() || null,
          beklenenTarih: toOptionalDate(part.beklenenTarih),
          aciklama: part.aciklama.trim() || null,
          tamamlandi: part.tamamlandi,
          etaGun: toEtaDays(part.beklenenTarih),
        })),
    [allParts]
  );

  const validateFormGuards = React.useCallback(
    (values: ServiceFormValues) => {
      const guards = runtimeSettings.formGuards;

      if (guards.requireStartDate && !toOptionalDate(values.tarih)) {
        throw new Error('Başlangıç tarihi zorunlu ayarı açık.');
      }

      if (guards.requireAssignedPersonnel && selectedAssignments.length === 0) {
        throw new Error('En az bir personel ataması zorunlu.');
      }

      const waitingParts = normalizedPartsPayload.filter((part) => part.kategori === 'TASERON_BEKLEYEN');
      const orderedParts = normalizedPartsPayload.filter(
        (part) => part.kategori === 'SIPARIS_EDILEN_YEDEK'
      );

      if (guards.requireEtaForWaitingParts) {
        const missing = waitingParts.find((part) => !part.beklenenTarih);
        if (missing) {
          throw new Error('Taşeron firmada bekleyen parçalar için ETA/Tahmini varış tarihi zorunlu.');
        }
      }

      if (guards.requireEtaForOrderedParts) {
        const missing = orderedParts.find((part) => !part.beklenenTarih);
        if (missing) {
          throw new Error('Sipariş edilen yedek parçalar için ETA/Tahmini varış tarihi zorunlu.');
        }
      }

      if (guards.requireSupplierForWaitingParts) {
        const missing = waitingParts.find((part) => !part.tedarikci);
        if (missing) {
          throw new Error('Taşeron firma alanı bekleyen parçalar için zorunlu.');
        }
      }

      if (guards.warnOnMissingContactInfo && !values.irtibatKisi?.trim() && !values.telefon?.trim()) {
        toast.warning('İrtibat bilgisi boş: işlem kaydedilecek ama iletişim riski artar.');
      }
    },
    [normalizedPartsPayload, runtimeSettings.formGuards, selectedAssignments.length]
  );

  const upsertPart = React.useCallback(
    (
      category: PartCategory,
      index: number,
      field: keyof ServicePart,
      value: string | number | boolean | undefined
    ) => {
      const setter =
        category === 'TASERON_BEKLEYEN' ? setSubcontractorParts : setOrderedSpareParts;
      setter((prev) =>
        prev.map((part, partIndex) =>
          partIndex === index
            ? {
                ...part,
                [field]: value,
              }
            : part
        )
      );
    },
    []
  );

  const addPartRow = React.useCallback((category: PartCategory) => {
    const setter =
      category === 'TASERON_BEKLEYEN' ? setSubcontractorParts : setOrderedSpareParts;
    setter((prev) => [...prev, createEmptyPart(category)]);
  }, []);

  const removePartRow = React.useCallback((category: PartCategory, index: number) => {
    const setter =
      category === 'TASERON_BEKLEYEN' ? setSubcontractorParts : setOrderedSpareParts;
    setter((prev) => {
      const next = prev.filter((_, rowIndex) => rowIndex !== index);
      if (next.length === 0) return [createEmptyPart(category)];
      return next;
    });
  }, []);

  const suggestPartEta = React.useCallback(
    async (category: PartCategory, index: number) => {
      const source = category === 'TASERON_BEKLEYEN' ? subcontractorParts : orderedSpareParts;
      const part = source[index];
      if (!part) return;

      const supplier = part.tedarikci.trim();
      const partName = part.parcaAdi.trim();
      const params = new URLSearchParams({
        category,
      });

      if (supplier) params.set('supplier', supplier);
      if (partName) params.set('partName', partName);

      try {
        const response = await authorizedFetch(`/api/parts/eta-suggestion?${params.toString()}`);
        if (!response.ok) {
          throw new Error('ETA önerisi alınamadı');
        }

        const payload = (await response.json()) as {
          etaDays?: number;
          estimatedArrivalDate?: string;
          source?: string;
          sampleSize?: number;
        };

        const suggestedDate = toDateInput(payload.estimatedArrivalDate ?? '');
        if (!suggestedDate) {
          throw new Error('ETA sonucu boş döndü');
        }

        upsertPart(category, index, 'beklenenTarih', suggestedDate);
        upsertPart(category, index, 'etaGun', payload.etaDays);

        const sourceLabel = payload.source === 'history' ? 'geçmiş tedarikçi verisi' : 'varsayılan ayar';
        toast.success(
          `ETA güncellendi (${payload.etaDays ?? '-'} gün, ${sourceLabel}, örnek: ${payload.sampleSize ?? 0})`
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'ETA tahmini alınamadı');
      }
    },
    [orderedSpareParts, subcontractorParts, upsertPart]
  );

  const fetchServiceDetail = React.useCallback(async (id: string): Promise<ServiceDetail> => {
    const response = await authorizedFetch(`/api/services/${id}`);

    if (!response.ok) {
      throw new Error('Servis detayları alınamadı');
    }

    return (await response.json()) as ServiceDetail;
  }, []);

  React.useEffect(() => {
    const loadPersonnel = async () => {
      setPersonnelLoading(true);
      try {
        const response = await authorizedFetch('/api/personel?aktif=true');
        if (!response.ok) throw new Error();

        const payload = (await response.json()) as Array<{
          id: string;
          ad: string;
          unvan: 'usta' | 'cirak' | 'yonetici' | 'ofis';
          aktif: boolean;
          aktifIsSayisi?: number;
          guncelDurum?: 'PASIF' | 'MUSAIT' | 'PLANLI' | 'YOGUN';
        }>;

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
          aktif: personel.aktif,
          aktifIsSayisi: personel.aktifIsSayisi ?? 0,
          guncelDurum: personel.guncelDurum,
        }));

        setPersonnelOptions((prev) => mergePersonnelOptions(prev, mapped));
      } catch {
        toast.error('Personel listesi yüklenemedi');
      } finally {
        setPersonnelLoading(false);
      }
    };

    void loadPersonnel();
  }, []);

  React.useEffect(() => {
    const loadRuntimeSettings = async () => {
      try {
        const response = await authorizedFetch('/api/settings');
        if (!response.ok) return;
        const payload = (await response.json()) as unknown;
        setRuntimeSettings(normalizeRuntimeSettings(payload));
      } catch {
        // Settings erişimi bu rolde kapalı olabilir; form default guard'larla çalışır.
      }
    };

    void loadRuntimeSettings();
  }, []);

  React.useEffect(() => {
    const loadDictionaries = async () => {
      try {
        const response = await authorizedFetch('/api/dictionaries/work-order');
        if (!response.ok) {
          throw new Error('Sozluk verileri yuklenemedi');
        }

        const payload = (await response.json()) as WorkOrderDictionariesResponse;
        setStatusOptions(payload.statuses ?? []);
        setLocationOptions(payload.locations ?? []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Sozluk verileri yuklenemedi');
      }
    };

    void loadDictionaries();
  }, []);

  React.useEffect(() => {
    if (mode !== 'edit' || !serviceId) return;

    const load = async () => {
      try {
        setLoading(true);
        const service = await fetchServiceDetail(serviceId);
        setCurrentService(service);

        setValue('boatName', service.tekneAdi || '');
        setValue('tarih', toDateInput(service.tarih));
        setValue('tahminiBitisTarihi', toDateInput(service.tahminiBitisTarihi));
        setValue('saat', service.saat || '');
        setValue('isTuru', service.isTuru);
        setValue('adres', service.adres);
        setValue('yer', service.yer);
        setValue('servisAciklamasi', service.servisAciklamasi);
        setValue('irtibatKisi', service.irtibatKisi || '');
        setValue('telefon', service.telefon || '');
        setValue('durum', normalizeServisDurumuForApp(service.durum) as ServiceFormValues['durum']);
        setValue('taseronNotlari', service.taseronNotlari || '');

        const splitParts = splitPartsByCategory(service.bekleyenParcalar);
        setSubcontractorParts(splitParts.waiting);
        setOrderedSpareParts(splitParts.ordered);

        const assignmentMap: Record<string, PersonelRol> = {};
        const assigneeOptions: PersonelOption[] = [];

        for (const personelAtama of service.personeller) {
          assignmentMap[personelAtama.personelId] = personelAtama.rol;
          assigneeOptions.push({
            id: personelAtama.personelId,
            ad: personelAtama.personel.ad,
            unvan: personelAtama.personel.unvan,
            aktif: true,
          });
        }

        setAssignments(assignmentMap);
        setPersonnelOptions((prev) => mergePersonnelOptions(prev, assigneeOptions));
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Servis verisi yüklenemedi';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fetchServiceDetail, mode, serviceId, setValue]);

  const saveService = React.useCallback(
    async (
      values: ServiceFormValues,
      options?: { overrideDurum?: ServiceFormValues['durum'] }
    ): Promise<ServiceDetail> => {
      const payload = {
        tarih: toOptionalDate(values.tarih),
        tahminiBitisTarihi: toOptionalDate(values.tahminiBitisTarihi),
        saat: values.saat || null,
        isTuru: values.isTuru,
        adres: values.adres,
        yer: values.yer,
        servisAciklamasi: values.servisAciklamasi,
        irtibatKisi: values.irtibatKisi || null,
        telefon: values.telefon || null,
        durum: normalizeServisDurumuForDb(options?.overrideDurum ?? values.durum),
        taseronNotlari: values.taseronNotlari || null,
        boatName: values.boatName.trim(),
        personeller: selectedAssignments,
        bekleyenParcalar: normalizedPartsPayload,
      };

      const endpoint = mode === 'edit' && serviceId ? `/api/services/${serviceId}` : '/api/services';
      const method = mode === 'edit' && serviceId ? 'PUT' : 'POST';

      const response = await authorizedFetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = (await response.json().catch(() => null)) as ServiceDetail | { error?: string } | null;
      if (!response.ok) {
        const message =
          responseBody && typeof responseBody === 'object' && 'error' in responseBody
            ? responseBody.error
            : 'Servis kaydı başarısız';
        throw new Error(message || 'Servis kaydı başarısız');
      }

      return responseBody as ServiceDetail;
    },
    [mode, normalizedPartsPayload, selectedAssignments, serviceId]
  );

  const openScoringGuard = React.useCallback(
    async (values: ServiceFormValues) => {
      const fallbackStatus =
        mode === 'edit'
          ? (normalizeServisDurumuForApp(currentService?.durum ?? 'DEVAM_EDIYOR') as ServiceFormValues['durum'])
          : 'RANDEVU_VERILDI';

      const persisted = await saveService(values, {
        overrideDurum: fallbackStatus,
      });

      const detailed = await fetchServiceDetail(persisted.id);
      setCurrentService(detailed);
      setScoringService(mapServiceToScoringData(detailed));
      setShowScoring(true);
      toast.info('Tamamlandı durumu için önce puanlama yapılmalıdır.');
    },
    [currentService?.durum, fetchServiceDetail, mode, saveService]
  );

  const handleScoringSave = React.useCallback(
    async (servisId: string, payload: CompletePayload) => {
      const response = await authorizedFetch(`/api/services/${servisId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Puanlama kaydedilemedi');
      }

      setIsScored(true);
      setShowScoring(false);
      toast.success('Puanlama kaydedildi, servis tamamlandı.', {
        action: {
          label: 'Sablon olustur',
          onClick: () => router.push(`/raporlar/whatsapp?serviceId=${servisId}`),
        },
      });
      router.push(`/is-emirleri/${servisId}/duzenle`);
      router.refresh();
    },
    [router]
  );

  const onSubmit = async (values: ServiceFormValues) => {
    setError('');
    setSubmitting(true);

    try {
      validateFormGuards(values);

      if (values.durum === 'TAMAMLANDI' && !isScored) {
        await openScoringGuard(values);
        return;
      }

      const saved = await saveService(values);
      setCurrentService(saved);

      toast.success(mode === 'create' ? 'Servis oluşturuldu.' : 'Servis güncellendi.');
      router.push(`/is-emirleri/${saved.id}/duzenle`);
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'İşlem başarısız';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssignment = React.useCallback((personelId: string, checked: boolean) => {
    setAssignments((prev) => {
      const next = { ...prev };
      if (checked) {
        next[personelId] = next[personelId] ?? 'DESTEK';
      } else {
        delete next[personelId];
      }
      return next;
    });
  }, []);

  const setAssignmentRole = React.useCallback((personelId: string, role: PersonelRol) => {
    setAssignments((prev) => ({
      ...prev,
      [personelId]: role,
    }));
  }, []);

  if (loading) {
    return <div className="p-10 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="surface-panel">
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Yeni Servis' : 'Servis Düzenle'}</CardTitle>
          <CardDescription>
            Tekne adı serbest metin olarak girilir. Tamamlandı statüsüne geçişte puanlama zorunludur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Tekne Adı</Label>
              <Input {...register('boatName')} placeholder="Örn: Moonlight (Eski)" />
              {errors.boatName && <p className="text-sm text-destructive">{errors.boatName.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Başlangıç Tarihi</Label>
                <Input type="date" {...register('tarih')} />
                <p className="text-xs text-muted-foreground">Boş bırakılırsa iş tarihsiz olarak takip edilir.</p>
              </div>
              <div className="space-y-2">
                <Label>Tahmini Bitiş Tarihi</Label>
                <Input type="date" {...register('tahminiBitisTarihi')} />
                <p className="text-xs text-muted-foreground">Gecikme takibi bu tarihe göre yapılır.</p>
              </div>
              <div className="space-y-2">
                <Label>Saat</Label>
                <Input type="time" {...register('saat')} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>İş Türü</Label>
                <select
                  {...register('isTuru')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PAKET">Paket İş</option>
                  <option value="ARIZA">Arıza / Keşif</option>
                  <option value="PROJE">Proje / Refit</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Durum</Label>
                <select
                  {...register('durum')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {visibleStatusOptions.map((statusOption) => (
                    <option key={statusOption.key} value={statusOption.key}>
                      {statusOption.label}
                    </option>
                  ))}
                </select>
                {selectedStatus === 'TAMAMLANDI' && (
                  <p className="text-xs text-amber-400">
                    Kaydet sırasında puanlama sidebar&apos;ı açılır. Puanlama tamamlanmadan servis kapanmaz.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>Adres</Label>
                <Input {...register('adres')} />
                {errors.adres && <p className="text-sm text-destructive">{errors.adres.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Lokasyon</Label>
                <select
                  {...register('yer')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Lokasyon secin</option>
                  {visibleLocationOptions.map((locationOption) => (
                    <option key={locationOption.key} value={locationOption.key}>
                      {locationOption.label}
                    </option>
                  ))}
                </select>
                {errors.yer && <p className="text-sm text-destructive">{errors.yer.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Servis Açıklaması</Label>
              <Textarea rows={4} {...register('servisAciklamasi')} />
              {errors.servisAciklamasi && (
                <p className="text-sm text-destructive">{errors.servisAciklamasi.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>İrtibat Kişi</Label>
                <Input {...register('irtibatKisi')} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input type="tel" {...register('telefon')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Beklenen Malzeme Notları</Label>
              <Textarea rows={2} {...register('taseronNotlari')} />
            </div>

            <div className="space-y-4 rounded-lg border border-[var(--color-border)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Parça Bekleme ve ETA Planı</h3>
                  <p className="text-xs text-muted-foreground">
                    Parçaları kategori bazlı yönetin, ETA tahmini ile bekleme süresini görünür kılın.
                  </p>
                </div>
                <Badge variant="secondary">{normalizedPartsPayload.length} kayıtlı parça</Badge>
              </div>

              <div className="space-y-3 rounded-lg border border-[var(--color-border)]/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Taşeron firmada bekleyen parça</h4>
                    <p className="text-xs text-muted-foreground">
                      Dış firmada bekleyen işlemler için beklenen varış tarihini zorunlu tutabilirsiniz.
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => addPartRow('TASERON_BEKLEYEN')}>
                    + Parça Ekle
                  </Button>
                </div>

                <div className="space-y-2">
                  {subcontractorParts.map((part, index) => (
                    <div
                      key={`subcontractor-part-${index}`}
                      className="rounded-md border border-[var(--color-border)]/60 p-3"
                    >
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                        <Input
                          value={part.parcaAdi}
                          onChange={(event) =>
                            upsertPart('TASERON_BEKLEYEN', index, 'parcaAdi', event.target.value)
                          }
                          placeholder="Parça adı"
                        />
                        <Input
                          type="number"
                          min={1}
                          value={part.miktar}
                          onChange={(event) =>
                            upsertPart(
                              'TASERON_BEKLEYEN',
                              index,
                              'miktar',
                              Math.max(1, Number(event.target.value) || 1)
                            )
                          }
                          placeholder="Miktar"
                        />
                        <Input
                          value={part.tedarikci}
                          onChange={(event) =>
                            upsertPart('TASERON_BEKLEYEN', index, 'tedarikci', event.target.value)
                          }
                          placeholder="Taşeron firma"
                        />
                        <Input
                          type="date"
                          value={part.beklenenTarih}
                          onChange={(event) =>
                            upsertPart('TASERON_BEKLEYEN', index, 'beklenenTarih', event.target.value)
                          }
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
                        <Input
                          value={part.aciklama}
                          onChange={(event) =>
                            upsertPart('TASERON_BEKLEYEN', index, 'aciklama', event.target.value)
                          }
                          placeholder="Açıklama (opsiyonel)"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void suggestPartEta('TASERON_BEKLEYEN', index)}
                          disabled={!runtimeSettings.partsEta.enabled}
                        >
                          ETA Tahminle
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removePartRow('TASERON_BEKLEYEN', index)}
                        >
                          Kaldır
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-[var(--color-border)]/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Sipariş edilen yedek parça</h4>
                    <p className="text-xs text-muted-foreground">
                      Tedarik edilen yedek parçalar için ETA girişi ile termin takibi yapın.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addPartRow('SIPARIS_EDILEN_YEDEK')}
                  >
                    + Parça Ekle
                  </Button>
                </div>

                <div className="space-y-2">
                  {orderedSpareParts.map((part, index) => (
                    <div key={`ordered-part-${index}`} className="rounded-md border border-[var(--color-border)]/60 p-3">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                        <Input
                          value={part.parcaAdi}
                          onChange={(event) =>
                            upsertPart('SIPARIS_EDILEN_YEDEK', index, 'parcaAdi', event.target.value)
                          }
                          placeholder="Parça adı"
                        />
                        <Input
                          type="number"
                          min={1}
                          value={part.miktar}
                          onChange={(event) =>
                            upsertPart(
                              'SIPARIS_EDILEN_YEDEK',
                              index,
                              'miktar',
                              Math.max(1, Number(event.target.value) || 1)
                            )
                          }
                          placeholder="Miktar"
                        />
                        <Input
                          value={part.tedarikci}
                          onChange={(event) =>
                            upsertPart('SIPARIS_EDILEN_YEDEK', index, 'tedarikci', event.target.value)
                          }
                          placeholder="Tedarikçi"
                        />
                        <Input
                          type="date"
                          value={part.beklenenTarih}
                          onChange={(event) =>
                            upsertPart('SIPARIS_EDILEN_YEDEK', index, 'beklenenTarih', event.target.value)
                          }
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
                        <Input
                          value={part.aciklama}
                          onChange={(event) =>
                            upsertPart('SIPARIS_EDILEN_YEDEK', index, 'aciklama', event.target.value)
                          }
                          placeholder="Açıklama (opsiyonel)"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void suggestPartEta('SIPARIS_EDILEN_YEDEK', index)}
                          disabled={!runtimeSettings.partsEta.enabled}
                        >
                          ETA Tahminle
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removePartRow('SIPARIS_EDILEN_YEDEK', index)}
                        >
                          Kaldır
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                ETA tahmini geçmiş tedarikçi süreleriyle hesaplanır. Yeterli geçmiş yoksa varsayılan gün ayarı kullanılır.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Personel Atamaları</h3>
                  <p className="text-xs text-muted-foreground">
                    Servis tamamlanmadan da ekip ataması yapabilirsiniz.
                  </p>
                </div>
                <Badge variant="secondary">{selectedAssignments.length} kişi</Badge>
              </div>

              {personnelLoading ? (
                <p className="text-sm text-muted-foreground">Aktif personel listesi yükleniyor...</p>
              ) : personnelOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aktif personel kaydı bulunamadı.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {personnelOptions.map((personel) => {
                    const selected = Boolean(assignments[personel.id]);
                    const selectedRole = assignments[personel.id] ?? 'DESTEK';

                    return (
                      <div key={personel.id} className="rounded-lg border border-[var(--color-border)]/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={selected}
                              onCheckedChange={(value) => toggleAssignment(personel.id, Boolean(value))}
                            />
                            <span className="text-sm font-medium">{personel.ad}</span>
                          </label>
                          <Badge variant="outline">{UNVAN_LABELS[personel.unvan]}</Badge>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Acik is: {personel.aktifIsSayisi ?? 0} -{' '}
                          {PERSONEL_DURUM_LABELS[personel.guncelDurum ?? (personel.aktif ? 'MUSAIT' : 'PASIF')]}
                        </p>

                        {selected && (
                          <div className="mt-2 flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={selectedRole === 'SORUMLU' ? 'default' : 'outline'}
                              onClick={() => setAssignmentRole(personel.id, 'SORUMLU')}
                              className={cn(selectedRole === 'SORUMLU' && 'shadow-none')}
                            >
                              {ROLE_LABELS.SORUMLU}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={selectedRole === 'DESTEK' ? 'default' : 'outline'}
                              onClick={() => setAssignmentRole(personel.id, 'DESTEK')}
                              className={cn(selectedRole === 'DESTEK' && 'shadow-none')}
                            >
                              {ROLE_LABELS.DESTEK}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={() => router.back()} disabled={submitting}>
                İptal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Kaydediliyor...' : mode === 'create' ? 'Servis Oluştur' : 'Değişiklikleri Kaydet'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ServisKapanisModal
        acik={showScoring}
        onKapat={() => setShowScoring(false)}
        servis={scoringService}
        onPuanlamaKaydet={handleScoringSave}
      />
    </div>
  );
}
