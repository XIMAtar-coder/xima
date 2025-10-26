import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface User {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  ximatar: string | null;
  created_at: string;
  profile_complete: boolean;
}

interface UserProfileModalProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, open, onClose }) => {
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAssessmentData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('assessment_results')
          .select('pillars, total_score, computed_at, ximatars(label, ximatar_translations(lang, title, core_traits))')
          .eq('user_id', user.user_id)
          .order('computed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setAssessmentData(data);
      } catch (error) {
        console.error('Error fetching assessment data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open && user) {
      fetchAssessmentData();
    }
  }, [open, user]);

  if (!user) return null;

  const ximatarData = assessmentData?.ximatars;
  const translation = ximatarData?.ximatar_translations?.find((t: any) => t.lang === 'en') 
    || ximatarData?.ximatar_translations?.[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">User Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registration Date</p>
                <p className="font-medium">{format(new Date(user.created_at), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profile Status</p>
                <Badge variant={user.profile_complete ? 'default' : 'secondary'}>
                  {user.profile_complete ? 'Complete' : 'Incomplete'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* XIMAtar Info */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : assessmentData ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">XIMAtar Assessment</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Assigned XIMAtar</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-base">
                      {translation?.title || ximatarData?.label || user.ximatar || 'Not assigned'}
                    </Badge>
                  </div>
                  {translation?.core_traits && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {translation.core_traits}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Total Score</p>
                  <p className="text-2xl font-bold">{assessmentData.total_score || 'N/A'}</p>
                </div>

                {assessmentData.pillars && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Pillar Scores</p>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(assessmentData.pillars as Record<string, number>).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                          <span className="font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Assessment Date</p>
                  <p className="font-medium">
                    {format(new Date(assessmentData.computed_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No assessment data available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
