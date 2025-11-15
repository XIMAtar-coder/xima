import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, Globe, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const BusinessRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    website: '',
    hrContactEmail: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate website URL
    if (!formData.website || !formData.website.match(/^https?:\/\/.+/)) {
      toast({
        title: 'Invalid Website',
        description: 'Please enter a valid website URL starting with http:// or https://',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/business/dashboard`,
          data: {
            name: formData.companyName,
            user_type: 'business'
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Assign business role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'business'
          });

        if (roleError) throw roleError;

        // Create business profile
        const { error: profileError } = await supabase
          .from('business_profiles')
          .insert({
            user_id: authData.user.id,
            company_name: formData.companyName,
            website: formData.website,
            hr_contact_email: formData.hrContactEmail || formData.email
          });

        if (profileError) throw profileError;

        // Ensure a company_profiles row exists with website
        const { error: cpError } = await supabase
          .from('company_profiles')
          .upsert(
            {
              company_id: authData.user.id,
              website: formData.website
            },
            { onConflict: 'company_id' }
          );
        if (cpError) console.warn('company_profiles upsert warning:', cpError);

        // Trigger company profile generation (async, don't wait)
        supabase.functions.invoke('generate-company-profile', {
          body: {
            company_id: authData.user.id,
            company_name: formData.companyName,
            website: formData.website
          }
        }).then(({ data, error }) => {
          if (error) {
            console.error('Error generating company profile:', error);
          } else {
            console.log('Company profile generation initiated:', data);
          }
        });

        toast({
          title: 'Success!',
          description: 'Business account created successfully. Your company profile is being generated. Please check your email to verify your account.',
        });

        setTimeout(() => {
          navigate('/business/login');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An error occurred during registration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-[#3A9FFF]/10 border border-[#3A9FFF]/20 w-fit">
            <Building2 className="text-[#3A9FFF]" size={32} />
          </div>
          <CardTitle className="text-3xl font-bold">Business Portal</CardTitle>
          <CardDescription>
            Create your XIMA business account to access top talent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Acme Corporation"
                  className="pl-10"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Business Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  id="email"
                  type="email"
                  placeholder="hr@company.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Company Website (Required)</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  id="website"
                  type="url"
                  placeholder="https://company.com"
                  className="pl-10"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  required
                  pattern="https?://.*"
                  title="Please enter a valid URL starting with http:// or https://"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your company profile will be automatically generated from this website
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hrContactEmail">HR Contact Email (Optional)</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  id="hrContactEmail"
                  type="email"
                  placeholder="recruiter@company.com"
                  className="pl-10"
                  value={formData.hrContactEmail}
                  onChange={(e) => setFormData({ ...formData, hrContactEmail: e.target.value })}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#3A9FFF] hover:bg-[#3A9FFF]/90"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Business Account'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/business/login" className="text-[#3A9FFF] hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessRegister;
