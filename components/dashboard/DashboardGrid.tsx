'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { DashboardStats } from '@/lib/api/dashboard-service';
import {
  DASHBOARD_WIDGET_DEFINITIONS,
  DEFAULT_DASHBOARD_LAYOUT,
  getWidgetById,
  isDashboardWidgetId,
  type DashboardWidgetId,
} from '@/lib/dashboard/widget-registry';
import DashboardWidget from '@/components/dashboard/DashboardWidget';
import WidgetLibrary from '@/components/dashboard/WidgetLibrary';
import StatsCards from '@/components/dashboard/stats-cards';
import OperationsList from '@/components/dashboard/operations-list';
import TechnicianStatus from '@/components/dashboard/technician-status';
import ProactiveMaintenanceAlerts from '@/components/dashboard/proactive-maintenance-alerts';
import WeatherWidget from '@/components/dashboard/weather-widget';

type DashboardGridProps = {
  stats: DashboardStats | null;
  loading: boolean;
};

type DashboardLayoutResponse = {
  widgets: string[];
};

function diziSirala(
  liste: DashboardWidgetId[],
  suruklenenId: DashboardWidgetId,
  hedefId: DashboardWidgetId
): DashboardWidgetId[] {
  if (suruklenenId === hedefId) return liste;

  const onceki = [...liste];
  const suruklenenIndex = onceki.indexOf(suruklenenId);
  const hedefIndex = onceki.indexOf(hedefId);
  if (suruklenenIndex < 0 || hedefIndex < 0) return liste;

  onceki.splice(suruklenenIndex, 1);
  onceki.splice(hedefIndex, 0, suruklenenId);
  return onceki;
}

function benzersizWidgetIds(ids: DashboardWidgetId[]): DashboardWidgetId[] {
  return Array.from(new Set(ids));
}

function widgetKonumuDegistir(
  liste: DashboardWidgetId[],
  kaynakIndex: number,
  hedefIndex: number
): DashboardWidgetId[] {
  if (kaynakIndex < 0 || hedefIndex < 0) return liste;
  if (kaynakIndex >= liste.length || hedefIndex >= liste.length) return liste;
  if (kaynakIndex === hedefIndex) return liste;

  const sonraki = [...liste];
  const [tasinan] = sonraki.splice(kaynakIndex, 1);
  if (!tasinan) return liste;
  sonraki.splice(hedefIndex, 0, tasinan);
  return sonraki;
}

export default function DashboardGrid({ stats, loading }: DashboardGridProps) {
  const [widgetIds, setWidgetIds] = useState<DashboardWidgetId[]>(DEFAULT_DASHBOARD_LAYOUT);
  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [suruklenenId, setSuruklenenId] = useState<DashboardWidgetId | null>(null);
  const [kutuphaneAcik, setKutuphaneAcik] = useState(false);
  const [kayitYukleniyor, setKayitYukleniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const layoutYukle = useCallback(async () => {
    setKayitYukleniyor(true);
    try {
      const response = await fetch('/api/dashboard/layout');
      if (!response.ok) {
        throw new Error('Dashboard yerlesimi yuklenemedi');
      }

      const body = (await response.json()) as DashboardLayoutResponse;
      const ids = Array.isArray(body.widgets)
        ? body.widgets.filter(isDashboardWidgetId)
        : [];
      if (ids.length > 0) {
        setWidgetIds(benzersizWidgetIds(ids));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Dashboard yerlesimi yuklenemedi';
      toast.error(message);
    } finally {
      setKayitYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void layoutYukle();
  }, [layoutYukle]);

  const kaydet = async () => {
    setKaydediliyor(true);
    try {
      const response = await fetch('/api/dashboard/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets: widgetIds }),
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error || 'Dashboard yerlesimi kaydedilemedi');
      }

      setDuzenlemeModu(false);
      setKutuphaneAcik(false);
      toast.success('Dashboard yerlesimi kaydedildi');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Dashboard yerlesimi kaydedilemedi';
      toast.error(message);
    } finally {
      setKaydediliyor(false);
    }
  };

  const eklenebilirWidgetlar = useMemo(
    () => DASHBOARD_WIDGET_DEFINITIONS.filter((widget) => !widgetIds.includes(widget.id)),
    [widgetIds]
  );

  const renderWidgetIcerigi = (widgetId: DashboardWidgetId) => {
    switch (widgetId) {
      case 'stats':
        return (
          <StatsCards
            bugunToplamOperasyon={stats?.bugunToplamOperasyon ?? 0}
            aktifServisler={stats?.aktifServisler ?? 0}
            bugunTamamlanan={stats?.bugunTamamlanan ?? 0}
            gecikenServisler={stats?.gecikenServisler ?? 0}
            loading={loading}
          />
        );
      case 'operations':
        return <OperationsList operations={stats?.bugununOperasyonlari ?? []} loading={loading} />;
      case 'technicians':
        return <TechnicianStatus technicians={stats?.teknisyenDurumu ?? []} loading={loading} />;
      case 'alerts':
        return <ProactiveMaintenanceAlerts alerts={stats?.proaktifBakimUyarilari ?? []} />;
      case 'weather':
        return <WeatherWidget />;
      default:
        return null;
    }
  };

  return (
    <section className="space-y-4" data-testid="dashboard-grid-container">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-semibold text-navy-900">Dashboard</h3>
          <p className="text-sm text-slate-500">Widgetleri düzenle, kaydet</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={duzenlemeModu ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setDuzenlemeModu((prev) => !prev);
              setKutuphaneAcik(false);
            }}
            data-testid="dashboard-edit-button"
          >
            <Pencil className="mr-1 h-4 w-4" />
            {duzenlemeModu ? 'Düzenlemeyi Bitir' : 'Düzenle'}
          </Button>

          {duzenlemeModu ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setKutuphaneAcik((prev) => !prev)}
                data-testid="dashboard-add-widget-button"
              >
                <Plus className="mr-1 h-4 w-4" />
                Widget Ekle
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => void kaydet()}
                disabled={kaydediliyor}
                data-testid="dashboard-save-button"
              >
                {kaydediliyor ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Kaydet
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <WidgetLibrary
        open={kutuphaneAcik}
        availableWidgets={eklenebilirWidgetlar}
        onClose={() => setKutuphaneAcik(false)}
        onAdd={(id) => {
          if (!isDashboardWidgetId(id)) return;
          setWidgetIds((prev) => benzersizWidgetIds([...prev, id]));
        }}
      />

      {kayitYukleniyor ? (
        <div className="rounded-lg border border-cream-200 bg-cream-50 p-4 text-sm text-slate-500">
          Dashboard düzeni yükleniyor...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" data-testid="dashboard-grid">
          {widgetIds.map((widgetId, index) => {
            const tanim = getWidgetById(widgetId);
            return (
              <DashboardWidget
                key={widgetId}
                id={widgetId}
                title={tanim.title}
                description={tanim.description}
                editMode={duzenlemeModu}
                gridClassName={tanim.gridClassName}
                canMoveUp={index > 0}
                canMoveDown={index < widgetIds.length - 1}
                onMoveUp={(id) => {
                  if (!isDashboardWidgetId(id)) return;
                  const mevcutIndex = widgetIds.indexOf(id);
                  if (mevcutIndex <= 0) return;
                  setWidgetIds((prev) => widgetKonumuDegistir(prev, mevcutIndex, mevcutIndex - 1));
                }}
                onMoveDown={(id) => {
                  if (!isDashboardWidgetId(id)) return;
                  const mevcutIndex = widgetIds.indexOf(id);
                  if (mevcutIndex < 0 || mevcutIndex >= widgetIds.length - 1) return;
                  setWidgetIds((prev) => widgetKonumuDegistir(prev, mevcutIndex, mevcutIndex + 1));
                }}
                onDragStart={(id) => {
                  if (!isDashboardWidgetId(id)) return;
                  setSuruklenenId(id);
                }}
                onDrop={(id, draggedId) => {
                  if (!duzenlemeModu) return;
                  if (!isDashboardWidgetId(id)) return;
                  const etkinSuruklenen =
                    draggedId && isDashboardWidgetId(draggedId) ? draggedId : suruklenenId;
                  if (!etkinSuruklenen) return;
                  setWidgetIds((prev) => diziSirala(prev, etkinSuruklenen, id));
                  setSuruklenenId(null);
                }}
                onRemove={(id) => {
                  if (!duzenlemeModu) return;
                  setWidgetIds((prev) => prev.filter((widget) => widget !== id));
                }}
              >
                {renderWidgetIcerigi(widgetId)}
              </DashboardWidget>
            );
          })}
        </div>
      )}
    </section>
  );
}

