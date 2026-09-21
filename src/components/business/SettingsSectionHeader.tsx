import React from 'react';
import { Eyebrow } from '@/components/layout/PageHeader';

/** Numbered header of a settings panel ("01 / AZIENDA", title, one-line subtitle). */
export const SettingsSectionHeader = ({ index, eyebrow, title, subtitle, aside }: {
  index: string; eyebrow: string; title: string; subtitle?: string; aside?: React.ReactNode;
}) => (
  <header className="mb-5 flex items-start justify-between gap-4">
    <div className="min-w-0">
      <Eyebrow>{index} / {eyebrow}</Eyebrow>
      <h2 className="mt-1.5 text-[21px] font-semibold leading-tight tracking-[-0.5px] text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {aside}
  </header>
);

export default SettingsSectionHeader;
