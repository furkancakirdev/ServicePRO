export type DashboardWidgetId =
  | 'stats'
  | 'operations'
  | 'technicians'
  | 'alerts'
  | 'weather';

export type DashboardWidgetDefinition = {
  id: DashboardWidgetId;
  title: string;
  description: string;
  gridClassName: string;
};

export const DASHBOARD_WIDGET_DEFINITIONS: DashboardWidgetDefinition[] = [
  {
    id: 'stats',
    title: 'Operasyon KPI',
    description: 'Günlük operasyon ve aktif iş özeti',
    gridClassName: 'lg:col-span-2',
  },
  {
    id: 'operations',
    title: 'Bugünün Operasyonları',
    description: 'Gün içi servis planı ve öncelikler',
    gridClassName: 'lg:col-span-2',
  },
  {
    id: 'technicians',
    title: 'Teknisyen Durumu',
    description: 'Saha ekip iş yükü dağılımı',
    gridClassName: 'lg:col-span-1',
  },
  {
    id: 'alerts',
    title: 'Proaktif Bakım Uyarıları',
    description: 'Yaklaşan ve geciken bakım sinyalleri',
    gridClassName: 'lg:col-span-1',
  },
  {
    id: 'weather',
    title: 'Hava Durumu',
    description: 'Planlama için deniz ve hava görünümü',
    gridClassName: 'lg:col-span-1',
  },
];

export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetId[] = [
  'stats',
  'operations',
  'technicians',
  'alerts',
];

export function getWidgetById(id: DashboardWidgetId): DashboardWidgetDefinition {
  const definition = DASHBOARD_WIDGET_DEFINITIONS.find((item) => item.id === id);
  if (!definition) {
    return {
      id: 'stats',
      title: 'Operasyon KPI',
      description: 'Günlük operasyon ve aktif iş özeti',
      gridClassName: 'lg:col-span-2',
    };
  }
  return definition;
}

export function isDashboardWidgetId(value: string): value is DashboardWidgetId {
  return DASHBOARD_WIDGET_DEFINITIONS.some((item) => item.id === value);
}

