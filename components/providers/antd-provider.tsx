'use client';

import type { ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import trTR from 'antd/locale/tr_TR';

export default function AntdProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider locale={trTR}>{children}</ConfigProvider>;
}
