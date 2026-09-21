import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * One settings block. `flat` renders it as a heading + body inside a larger
 * panel (candidate settings, redesign); otherwise it is its own Card
 * (business settings, unchanged).
 */
interface SettingShellProps {
  flat?: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right side of the heading row (a badge, a status). */
  aside?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export const SettingShell: React.FC<SettingShellProps> = ({ flat, title, description, aside, className, titleClassName, contentClassName, children }) => {
  if (flat) {
    return (
      <div className={className}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={cn('flex items-center gap-2 text-[16px] font-semibold text-foreground', titleClassName)}>{title}</h3>
            {description && <p className="mt-1 text-[14px] text-muted-foreground">{description}</p>}
          </div>
          {aside}
        </div>
        <div className={cn('mt-4 space-y-4', contentClassName)}>{children}</div>
      </div>
    );
  }
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className={cn('flex items-center gap-2 text-lg', titleClassName)}>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {aside}
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-4', contentClassName)}>{children}</CardContent>
    </Card>
  );
};

export default SettingShell;
