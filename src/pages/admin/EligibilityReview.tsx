import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, CheckCircle2, XCircle, FileText, Eye, 
  Loader2, ExternalLink, Clock, User, Building2
} from 'lucide-react';

interface EligibilityReviewItem {
  id: string;
  candidate_profile_id: string;
  business_id: string;
  hiring_goal_id: string;
  status: string;
  education_level: string | null;
  education_field: string | null;
  certificates_list: string[];
  language_level: string | null;
  language_notes: string | null;
  notes: string | null;
  created_at: string;
  candidate_name: string | null;
  candidate_email: string | null;
  company_name: string | null;
  role_title: string | null;
  documents: {
    id: string;
    doc_type: string;
    label: string;
    storage_path: string;
  }[];
}

const EligibilityReview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isOperator, loading: roleLoading } = useAdminRole();
  
  const [items, setItems] = useState<EligibilityReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<EligibilityReviewItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const hasAccess = isAdmin || isOperator;

  const fetchPendingReviews = async () => {
    setLoading(true);
    try {
      // Fetch pending eligibility records
      const { data: eligibilityData, error } = await supabase
        .from('candidate_eligibility')
        .select('*')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Enrich with related data
      const enrichedItems = await Promise.all((eligibilityData || []).map(async (item) => {
        // Get candidate info
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', item.candidate_profile_id)
          .single();

        // Get business info
        const { data: business } = await supabase
          .from('business_profiles')
          .select('company_name')
          .eq('user_id', item.business_id)
          .single();

        // Get hiring goal info
        const { data: goal } = await supabase
          .from('hiring_goal_drafts')
          .select('role_title')
          .eq('id', item.hiring_goal_id)
          .single();

        // Get documents
        const { data: docs } = await supabase
          .from('eligibility_documents')
          .select('id, doc_type, label, storage_path')
          .eq('eligibility_id', item.id);

        return {
          ...item,
          candidate_name: profile?.full_name || 'Unknown',
          candidate_email: profile?.email || null,
          company_name: business?.company_name || 'Unknown',
          role_title: goal?.role_title || 'Unknown',
          documents: docs || []
        } as EligibilityReviewItem;
      }));

      setItems(enrichedItems);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: 'Error loading reviews',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchPendingReviews();
    }
  }, [hasAccess]);

  const handleApprove = async () => {
    if (!selectedItem) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('candidate_eligibility')
        .update({
          status: 'eligible',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          notes: reviewNotes || null
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: t('eligibility.review.approved_title'),
        description: t('eligibility.review.approved_desc')
      });

      setSelectedItem(null);
      setReviewNotes('');
      await fetchPendingReviews();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    if (!reviewNotes.trim()) {
      toast({
        title: t('eligibility.review.notes_required'),
        variant: 'destructive'
      });
      return;
    }
    
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('candidate_eligibility')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          notes: reviewNotes
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: t('eligibility.review.rejected_title'),
        description: t('eligibility.review.rejected_desc')
      });

      setSelectedItem(null);
      setReviewNotes('');
      await fetchPendingReviews();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getDocumentUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('eligibility_docs')
      .createSignedUrl(path, 3600);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('eligibility.review.access_denied')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('eligibility.review.access_denied_desc')}
            </p>
            <Button onClick={() => navigate('/')}>
              {t('common.back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              {t('eligibility.review.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('eligibility.review.subtitle')}
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {items.length} {t('eligibility.review.pending')}
          </Badge>
        </div>

        {/* Review Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('eligibility.review.pending_reviews')}</CardTitle>
            <CardDescription>
              {t('eligibility.review.pending_reviews_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="font-medium text-lg">{t('eligibility.review.all_clear')}</h3>
                <p className="text-muted-foreground">
                  {t('eligibility.review.all_clear_desc')}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('eligibility.review.candidate')}</TableHead>
                    <TableHead>{t('eligibility.review.company')}</TableHead>
                    <TableHead>{t('eligibility.review.role')}</TableHead>
                    <TableHead>{t('eligibility.review.documents')}</TableHead>
                    <TableHead>{t('eligibility.review.submitted')}</TableHead>
                    <TableHead className="text-right">{t('eligibility.review.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{item.candidate_name}</div>
                            {item.candidate_email && (
                              <div className="text-xs text-muted-foreground">{item.candidate_email}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {item.company_name}
                        </div>
                      </TableCell>
                      <TableCell>{item.role_title}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.documents.map(doc => (
                            <Badge 
                              key={doc.id} 
                              variant="secondary" 
                              className="cursor-pointer hover:bg-primary/20"
                              onClick={() => getDocumentUrl(doc.storage_path)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {doc.doc_type}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('eligibility.review.review')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('eligibility.review.review_application')}</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              {/* Candidate Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('eligibility.review.candidate')}</div>
                  <div className="font-medium">{selectedItem.candidate_name}</div>
                  {selectedItem.candidate_email && (
                    <div className="text-sm text-muted-foreground">{selectedItem.candidate_email}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">{t('eligibility.review.company')}</div>
                  <div className="font-medium">{selectedItem.company_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedItem.role_title}</div>
                </div>
              </div>

              {/* Submitted Info */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                <h4 className="font-medium">{t('eligibility.review.submitted_info')}</h4>
                
                {selectedItem.education_level && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('eligibility.review.education')}</span>
                    <span>{selectedItem.education_level} {selectedItem.education_field && `- ${selectedItem.education_field}`}</span>
                  </div>
                )}
                
                {selectedItem.language_level && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('eligibility.review.language_level')}</span>
                    <span>{selectedItem.language_level}</span>
                  </div>
                )}
                
                {selectedItem.language_notes && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">{t('eligibility.review.language_sample')}</div>
                    <p className="text-sm p-2 bg-background rounded border">{selectedItem.language_notes}</p>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="space-y-3">
                <h4 className="font-medium">{t('eligibility.review.documents')}</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.documents.map(doc => (
                    <Button
                      key={doc.id}
                      variant="outline"
                      size="sm"
                      onClick={() => getDocumentUrl(doc.storage_path)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {doc.label || doc.doc_type}
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  ))}
                </div>
              </div>

              {/* Review Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('eligibility.review.notes')}
                  <span className="text-muted-foreground ml-1">
                    ({t('eligibility.review.notes_required_for_reject')})
                  </span>
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={t('eligibility.review.notes_placeholder')}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedItem(null)}
              disabled={processing}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {t('eligibility.review.reject')}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {t('eligibility.review.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EligibilityReview;
