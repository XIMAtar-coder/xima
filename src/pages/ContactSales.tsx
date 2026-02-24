import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { Mail, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

const ContactSales: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const desiredTier = (location.state as any)?.desiredTier || '';

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: '',
    tier: desiredTier,
    seats: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const session = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('contact-sales', {
        body: {
          requester_name: form.name,
          requester_email: form.email,
          company_name: form.company,
          desired_tier: form.tier,
          desired_seats: form.seats ? parseInt(form.seats) : null,
          message: form.message,
        },
        headers: session.data.session
          ? { Authorization: `Bearer ${session.data.session.access_token}` }
          : undefined,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Submission failed');

      setSubmitted(true);
    } catch (err: any) {
      console.error('[ContactSales] Error:', err);
      toast({
        title: t('common.error', 'Error'),
        description: err.message || t('contact_sales.submit_failed', 'Failed to submit. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {t('contact_sales.success_title', 'Thank you!')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('contact_sales.success_message', "We've received your request. Our team will contact you within 2 business days.")}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back_home', 'Back to Home')}
            </Button>
            <Button onClick={() => navigate('/pricing')}>
              {t('pricing.view_plans', 'View Plans')}
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('contact_sales.title', 'Contact Sales')}
          </h1>
          <p className="text-muted-foreground">
            {t('contact_sales.subtitle', "Tell us about your needs and we'll create a tailored plan for your organization.")}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('contact_sales.name', 'Your name')} *</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('contact_sales.email', 'Work email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">{t('contact_sales.company', 'Company name')}</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('contact_sales.plan', 'Interested in')}</Label>
                  <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('contact_sales.select_plan', 'Select a plan')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seats">{t('contact_sales.seats', 'Team size')}</Label>
                  <Input
                    id="seats"
                    type="number"
                    min="1"
                    placeholder="e.g. 10"
                    value={form.seats}
                    onChange={(e) => setForm({ ...form, seats: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">{t('contact_sales.message', 'Anything else?')}</Label>
                <Textarea
                  id="message"
                  rows={4}
                  maxLength={2000}
                  placeholder={t('contact_sales.message_placeholder', 'Tell us about your hiring needs...')}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.submitting', 'Submitting...')}
                  </>
                ) : (
                  t('contact_sales.submit', 'Submit Request')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ContactSales;
