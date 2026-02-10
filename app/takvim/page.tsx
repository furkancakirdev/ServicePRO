'use client';

// Calendar/Schedule Page - Geliştirilmiş Versiyon
// ServicePro ERP - Marlin Yatçılık
// Lokasyon filtreleri, tarih aralığı, sürükle-bırak düzenleme

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr';
import { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { DURUM_CONFIG, type ServisDurumu } from '@/types';
import { MinimumRole } from '@/components/auth/ProtectedComponents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Calendar, MapPin, Filter, Ship, Clock, X, Check, GripVertical, RefreshCw, CalendarDays } from 'lucide-react';
import { toDateOnlyISO } from '@/lib/date-utils';

// Lokasyon seçenekleri
const LOKASYONLAR = [
  { value: 'TUMU', label: 'Tüm Lokasyonlar' },
  { value: 'YATMARIN', label: 'Yatmarin' },
  { value: 'NETSEL', label: 'Netsel' },
  { value: 'DIS_SERVIS', label: 'Dış Servis' },
];

interface EventItem {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    tekneId: string;
    tekneAdi: string;
    durum: ServisDurumu;
    adres: string;
    yer: string;
    isTuru: string;
    servisAciklamasi: string;
    personeller?: Array<{ personelAd: string; rol: string }>;
  };
}

interface ServiceApiItem {
  id: string;
  tarih?: string | null;
  saat?: string | null;
  tekneId: string;
  tekneAdi: string;
  durum: ServisDurumu;
  adres: string;
  yer?: string | null;
  isTuru: string;
  servisAciklamasi: string;
  personeller?: Array<{ personelAd: string; rol: string }>;
}

interface ServicesResponse {
  services: ServiceApiItem[];
}

export default function CalendarPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // State'ler
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtreler
  const [lokasyonFiltre, setLokasyonFiltre] = useState('TUMU');
  const [durumFiltre, setDurumFiltre] = useState('TUMU');

  // Event detay popup
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [eventPopupAcik, setEventPopupAcik] = useState(false);

  // Sürükle-bırak onay dialogu
  const [dragDialogAcik, setDragDialogAcik] = useState(false);
  const [dragInfo, setDragInfo] = useState<{ eventId: string; yeniTarih: string; eskiTarih: string } | null>(null);

  // İlk yükleme kontrolü için ref
  const hasInitializedRef = useRef(false);

  // Auth kontrolü
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    // Sadece bir kez fetch yap
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchEvents();
    }
  }, [isAuthenticated]);

  // Filtreleme efekti
  useEffect(() => {
    let filtered = [...events];

    // Lokasyon filtresi
    if (lokasyonFiltre !== 'TUMU') {
      filtered = filtered.filter((e) => {
        const yer = e.extendedProps.yer?.toUpperCase() || '';
        const adres = e.extendedProps.adres?.toUpperCase() || '';
        const filtre = lokasyonFiltre.toUpperCase().replace('_', ' ');
        return yer.includes(filtre) || adres.includes(filtre);
      });
    }

    // Durum filtresi
    if (durumFiltre !== 'TUMU') {
      filtered = filtered.filter((e) => e.extendedProps.durum === durumFiltre);
    }

    setFilteredEvents(filtered);
  }, [events, lokasyonFiltre, durumFiltre]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services?limit=3000');
      if (!res.ok) throw new Error('Servisler getirilemedi');

      const data = (await res.json()) as ServicesResponse;
      const sortedServices = [...data.services].sort((a, b) => {
        const dateA = String(a.tarih || '');
        const dateB = String(b.tarih || '');
        if (dateA !== dateB) return dateA.localeCompare(dateB);

        const hasTimeA = Boolean(a.saat);
        const hasTimeB = Boolean(b.saat);
        if (hasTimeA && hasTimeB) return String(a.saat).localeCompare(String(b.saat), 'tr');
        if (hasTimeA && !hasTimeB) return -1;
        if (!hasTimeA && hasTimeB) return 1;
        return a.tekneAdi.localeCompare(b.tekneAdi, 'tr');
      });

      const calendarEvents: EventItem[] = sortedServices.map((s) => ({
        id: s.id,
        title: s.tekneAdi,
        start: toDateOnlyISO(s.tarih) || new Date().toISOString().slice(0, 10),
        backgroundColor: DURUM_CONFIG[s.durum as ServisDurumu]?.color || '#6b7280',
        borderColor: DURUM_CONFIG[s.durum as ServisDurumu]?.color || '#6b7280',
        extendedProps: {
          tekneId: s.tekneId,
          tekneAdi: s.tekneAdi,
          durum: s.durum,
          adres: s.adres,
          yer: s.yer || '',
          isTuru: s.isTuru,
          servisAciklamasi: s.servisAciklamasi,
          personeller: s.personeller || [],
        },
      }));

      setEvents(calendarEvents);
      setFilteredEvents(calendarEvents);
    } catch (err: unknown) {
      console.error('Servisler yüklenemedi:', err);
      toast.error('Servisler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Event tıklama - detay popup
  const handleEventClick = useCallback((info: EventClickArg) => {
    const event = info.event;
    const extendedProps = event.extendedProps as EventItem['extendedProps'];
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.startStr,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      extendedProps,
    });
    setEventPopupAcik(true);
  }, []);

  // Tarih seçimi - yeni servis
  const handleDateSelect = useCallback((info: DateSelectArg) => {
    const date = info.startStr;
    router.push(`/servisler/yeni?tarih=${date}`);
  }, [router]);

  // Sürükle-bırak - tarih değiştirme
  const handleEventDrop = useCallback((info: EventDropArg) => {
    const { event, oldEvent } = info;

    // Değişiklik onayı iste
    setDragInfo({
      eventId: event.id,
      yeniTarih: event.startStr,
      eskiTarih: oldEvent.startStr,
    });
    setDragDialogAcik(true);

    // Değişikliği geri al (onay bekle)
    info.revert();
  }, []);

  // Tarih değişikliğini onayla
  const confirmDateChange = async () => {
    if (!dragInfo) return;

    try {
      const response = await fetch(`/api/services/${dragInfo.eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarih: dragInfo.yeniTarih }),
      });

      if (response.ok) {
        toast.success('Randevu tarihi güncellendi');
        fetchEvents(); // Verileri yenile
      } else {
        toast.error('Tarih güncellenemedi');
      }
    } catch {
      toast.error('Hata oluştu');
    } finally {
      setDragDialogAcik(false);
      setDragInfo(null);
    }
  };

  // Servise git
  const goToService = () => {
    if (selectedEvent) {
      router.push(`/servisler/${selectedEvent.id}`);
    }
  };

  const toplamRandevu = events.length;
  const buHaftaRandevu = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return filteredEvents.filter((event) => {
      const date = new Date(event.start);
      return date >= startOfWeek && date < endOfWeek;
    }).length;
  }, [filteredEvents]);
  const aktifFiltreSayisi = Number(lokasyonFiltre !== 'TUMU') + Number(durumFiltre !== 'TUMU');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="hero-panel">
        <h1 className="page-title flex items-center gap-2">
          <Calendar className="w-6 h-6 text-cyan-200" />
          Servis Takvimi
        </h1>
        <p className="page-subtitle mt-1">
          Randevuları görüntüleyin, sürükleyerek tarih değiştirin
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="bg-black/20 border-white/15 text-white">
            <CardContent className="pt-4">
              <div className="text-xs uppercase tracking-wide text-cyan-200">Toplam</div>
              <div className="text-2xl font-semibold">{toplamRandevu}</div>
            </CardContent>
          </Card>
          <Card className="bg-black/20 border-white/15 text-white">
            <CardContent className="pt-4">
              <div className="text-xs uppercase tracking-wide text-cyan-200">Bu Hafta</div>
              <div className="text-2xl font-semibold">{buHaftaRandevu}</div>
            </CardContent>
          </Card>
          <Card className="bg-black/20 border-white/15 text-white">
            <CardContent className="pt-4">
              <div className="text-xs uppercase tracking-wide text-cyan-200">Filtreli Sonuç</div>
              <div className="text-2xl font-semibold">{filteredEvents.length}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtreler */}
      <Card className="surface-panel">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-sm font-medium">Filtreler:</span>
            </div>

            {/* Lokasyon filtresi */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <Select value={lokasyonFiltre} onValueChange={setLokasyonFiltre}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lokasyon" />
                </SelectTrigger>
                <SelectContent>
                  {LOKASYONLAR.map((lok) => (
                    <SelectItem key={lok.value} value={lok.value}>
                      {lok.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Durum filtresi */}
            <div className="flex items-center gap-2">
              <Select value={durumFiltre} onValueChange={setDurumFiltre}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TUMU">Tüm Durumlar</SelectItem>
                  {Object.entries(DURUM_CONFIG).map(([key, { label, icon }]) => (
                    <SelectItem key={key} value={key}>
                      {icon} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sonuç sayısı */}
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline">{filteredEvents.length} randevu</Badge>
              {aktifFiltreSayisi > 0 && <Badge variant="secondary">{aktifFiltreSayisi} aktif filtre</Badge>}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setLokasyonFiltre('TUMU');
                  setDurumFiltre('TUMU');
                }}
              >
                Filtreleri Sıfırla
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={fetchEvents}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Yenile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Takvim */}
      <Card className="calendar-shell">
        <CardContent className="pt-6">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="listWeek"
            locale={trLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'listWeek,timeGridDay,dayGridMonth',
            }}
            buttonText={{
              today: 'Bugün',
              month: 'Ay',
              week: 'Hafta',
              day: 'Gün',
              list: 'Liste',
            }}
            nowIndicator
            stickyHeaderDates
            dayMaxEventRows={3}
            events={filteredEvents}
            eventClick={handleEventClick}
            selectable={true}
            selectMirror={true}
            select={handleDateSelect}
            editable={true}
            droppable={true}
            eventDrop={handleEventDrop}
            height="auto"
            eventColor="#3b82f6"
            eventBorderColor="#2563eb"
            eventDidMount={(info) => {
              // Tooltip styling
              info.el.title = `${info.event.extendedProps.tekneAdi}\n${info.event.extendedProps.yer}\n${info.event.extendedProps.servisAciklamasi}`;
            }}
          />
        </CardContent>
      </Card>

      {/* Durum Legend */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground pr-1">
          <CalendarDays className="h-4 w-4" />
          Durum renkleri:
        </div>
        {Object.entries(DURUM_CONFIG).map(([key, { label, color, icon }]) => (
          <div
            key={key}
            className="chip"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm">
              {icon} {label}
            </span>
          </div>
        ))}
      </div>

      {/* Yeni Servis Butonu */}
      <MinimumRole minimumRole="YETKILI" fallback={<div></div>}>
        <Button
          onClick={() => router.push('/servisler/yeni')}
          className="mt-2"
          size="lg"
        >
          + Yeni Servis Ekle
        </Button>
      </MinimumRole>

      {/* Event Detay Popup */}
      <Dialog open={eventPopupAcik} onOpenChange={setEventPopupAcik}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              {selectedEvent?.extendedProps.tekneAdi}
            </DialogTitle>
            <DialogDescription>Servis Detayları</DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Tarih</span>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(selectedEvent.start).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Lokasyon</span>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedEvent.extendedProps.yer || selectedEvent.extendedProps.adres}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Durum</span>
                <Badge
                  style={{
                    backgroundColor: DURUM_CONFIG[selectedEvent.extendedProps.durum]?.bgColor,
                    color: DURUM_CONFIG[selectedEvent.extendedProps.durum]?.color,
                  }}
                  className="ml-2"
                >
                  {DURUM_CONFIG[selectedEvent.extendedProps.durum]?.icon}{' '}
                  {DURUM_CONFIG[selectedEvent.extendedProps.durum]?.label}
                </Badge>
              </div>

              <div>
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Açıklama</span>
                <p className="mt-1">{selectedEvent.extendedProps.servisAciklamasi}</p>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEventPopupAcik(false)}>
                  Kapat
                </Button>
                <Button onClick={goToService}>
                  Detaya Git
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sürükle-Bırak Onay Dialogu */}
      <Dialog open={dragDialogAcik} onOpenChange={setDragDialogAcik}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-orange-500" />
              Tarih Değişikliği Onayı
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p style={{ color: 'var(--color-text-muted)' }}>
              Randevu tarihini değiştirmek istediğinizden emin misiniz?
            </p>
            {dragInfo && (
              <div className="mt-4 p-3 rounded-lg space-y-2" style={{ background: 'var(--color-surface-elevated)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Eski Tarih:</span>
                  <span className="font-medium">
                    {new Date(dragInfo.eskiTarih).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Yeni Tarih:</span>
                  <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
                    {new Date(dragInfo.yeniTarih).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDragDialogAcik(false)}>
              <X className="w-4 h-4 mr-1" />
              İptal
            </Button>
            <Button onClick={confirmDateChange}>
              <Check className="w-4 h-4 mr-1" />
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


