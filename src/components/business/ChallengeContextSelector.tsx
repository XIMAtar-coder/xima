import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { Target, FileText, Sparkles, Loader2, ExternalLink } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GoalOption {
  id: string;
  role_title: string | null;
  status: string;
  created_at: string;
}

interface JobPostOption {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

const ChallengeContextSelector = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useUser();

  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPostOption[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [selectedJobPost, setSelectedJobPost] = useState<string>('');

  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      setLoading(true);
      const [{ data: goalData }, { data: jobData }] = await Promise.all([
        supabase
          .from('hiring_goal_drafts')
          .select('id, role_title, status, created_at')
          .eq('business_id', user.id)
          .in('status', ['active', 'draft'])
          .order('created_at', { ascending: false }),
        supabase
          .from('job_posts')
          .select('id, title, status, created_at')
          .eq('business_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      setGoals(goalData || []);
      setJobPosts((jobData || []) as JobPostOption[]);
      setLoading(false);
    })();
  }, [open, user?.id]);

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), 'dd/MM/yyyy');
    } catch {
      return '';
    }
  };

  const statusLabel = (status: string) =>
    status === 'active'
      ? t('business.challenges.context_selector.status_active')
      : t('business.challenges.context_selector.status_draft');

  const goalOptions = useMemo(
    () =>
      goals.map((g) => ({
        value: g.id,
        label: `${g.role_title || t('business.challenges.context_selector.untitled')} · ${formatDate(g.created_at)} (${statusLabel(g.status)})`,
      })),
    [goals, t]
  );

  const jobOptions = useMemo(
    () =>
      jobPosts.map((j) => ({
        value: j.id,
        label: `${j.title || t('business.challenges.context_selector.untitled')} · ${formatDate(j.created_at)} (${statusLabel(j.status)})`,
      })),
    [jobPosts, t]
  );

  const handleContinueGoal = () => {
    if (!selectedGoal) return;
    onOpenChange(false);
    navigate(`/business/challenges/select?goal=${selectedGoal}`);
  };

  const handleContinueJobPost = () => {
    if (!selectedJobPost) return;
    onOpenChange(false);
    navigate(`/business/challenges/select?from_listing=${selectedJobPost}`);
  };

  const handleContinueNoContext = () => {
    onOpenChange(false);
    navigate(`/business/challenges/select?no_context=1`);
  };

  const handleImportNew = () => {
    onOpenChange(false);
    navigate('/business/jobs/import');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Target className="h-6 w-6 text-primary" />
            {t('business.challenges.context_selector.title')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t('business.challenges.context_selector.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Option A: From Hiring Goal */}
          <Card className="border-2 hover:border-primary/40 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">
                    {t('business.challenges.context_selector.from_goal.title')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('business.challenges.context_selector.from_goal.description')}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pl-12">
                <Select value={selectedGoal} onValueChange={setSelectedGoal} disabled={loading || goals.length === 0}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={
                      loading
                        ? t('common.loading')
                        : goals.length === 0
                        ? t('business.challenges.context_selector.from_goal.empty')
                        : t('business.challenges.context_selector.from_goal.select_placeholder')
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {goalOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleContinueGoal} disabled={!selectedGoal}>
                  {t('business.challenges.context_selector.from_goal.continue')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Option B: From Job Post */}
          <Card className="border-2 hover:border-primary/40 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">
                    {t('business.challenges.context_selector.from_listing.title')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('business.challenges.context_selector.from_listing.description')}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pl-12">
                <Select value={selectedJobPost} onValueChange={setSelectedJobPost} disabled={loading || jobPosts.length === 0}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={
                      loading
                        ? t('common.loading')
                        : jobPosts.length === 0
                        ? t('business.challenges.context_selector.from_listing.empty')
                        : t('business.challenges.context_selector.from_listing.select_placeholder')
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {jobOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleImportNew} className="gap-1">
                  <ExternalLink className="h-4 w-4" />
                  {t('business.challenges.context_selector.from_listing.import_new')}
                </Button>
                <Button onClick={handleContinueJobPost} disabled={!selectedJobPost}>
                  {t('business.challenges.context_selector.from_listing.continue')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Option C: No Context */}
          <Card className="border-2 border-dashed hover:border-primary/40 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2 mt-0.5">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">
                    {t('business.challenges.context_selector.no_context.title')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('business.challenges.context_selector.no_context.description')}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pl-12">
                <Button variant="outline" onClick={handleContinueNoContext}>
                  {t('business.challenges.context_selector.no_context.continue')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="flex items-center justify-center py-2 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading')}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('business.challenges.context_selector.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeContextSelector;
