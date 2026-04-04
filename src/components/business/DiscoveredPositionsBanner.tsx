import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

interface DiscoveredPositionsBannerProps {
  businessId: string | undefined;
}

export const DiscoveredPositionsBanner: React.FC<DiscoveredPositionsBannerProps> = ({ businessId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: jobDrafts } = useQuery({
    queryKey: ['jobDrafts', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data } = await supabase
        .from('job_post_drafts' as any)
        .select('id, role_title, location, department, employment_type, description, source_url')
        .eq('business_id', businessId)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!businessId,
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['jobDrafts', businessId] });

  const importDraft = async (draft: any) => {
    const { data, error } = await supabase.from('job_posts').insert({
      business_id: businessId,
      role_title: draft.role_title,
      location: draft.location,
      department: draft.department,
      employment_type: draft.employment_type,
      description: draft.description,
      import_source: 'website_scan',
      import_source_url: draft.source_url,
      imported_at: new Date().toISOString(),
      is_active: true,
    } as any).select('id').single();

    if (!error && data) {
      await supabase
        .from('job_post_drafts' as any)
        .update({ status: 'imported', imported_job_id: (data as any).id } as any)
        .eq('id', draft.id);
      toast.success(t('import_job.draft_imported', { title: draft.role_title }));
      refetch();
    } else {
      toast.error(t('import_job.draft_import_failed', 'Failed to import position'));
    }
  };

  const dismissDraft = async (id: string) => {
    await supabase
      .from('job_post_drafts' as any)
      .update({ status: 'dismissed' } as any)
      .eq('id', id);
    refetch();
  };

  if (!jobDrafts || jobDrafts.length === 0) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium flex items-center gap-2 text-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            {t('import_job.positions_discovered', { count: jobDrafts.length })}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {t('import_job.positions_discovered_desc', 'XIMA found these positions on your careers page. Import them to start building your challenge pipeline.')}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {jobDrafts.map((draft: any) => (
          <div key={draft.id} className="flex items-center justify-between p-2 rounded-lg bg-background">
            <div>
              <p className="text-sm font-medium text-foreground">{draft.role_title}</p>
              <p className="text-xs text-muted-foreground">
                {draft.location && `${draft.location} · `}{draft.employment_type || 'full-time'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => importDraft(draft)}>
                {t('import_job.import_button', 'Import')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => dismissDraft(draft.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
