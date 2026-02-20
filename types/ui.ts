export type UiDensityMode = 'comfortable' | 'compact';

export interface UiHintConfig {
  id: string;
  title: string;
  description: string;
  steps?: string[];
}

export interface PageActionModel {
  id: string;
  label: string;
  href?: string;
}
