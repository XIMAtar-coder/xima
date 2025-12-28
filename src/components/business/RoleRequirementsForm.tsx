import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useHiringGoalRequirements, HiringGoalRequirements } from '@/hooks/useHiringGoalRequirements';
import { GraduationCap, Award, Languages, Shield, Save, X, Plus, Loader2 } from 'lucide-react';

interface RoleRequirementsFormProps {
  hiringGoalId: string;
}

const EDUCATION_LEVELS = ['none', 'bachelor', 'master', 'phd'] as const;
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const RoleRequirementsForm: React.FC<RoleRequirementsFormProps> = ({ hiringGoalId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { requirements, loading, saveRequirements } = useHiringGoalRequirements(hiringGoalId);
  
  const [saving, setSaving] = useState(false);
  const [newCertificate, setNewCertificate] = useState('');
  
  const [formData, setFormData] = useState({
    education_required: false,
    min_education_level: 'none' as string,
    education_field: '',
    certificates_required: false,
    required_certificates: [] as string[],
    language_required: false,
    language: '',
    language_level: 'B1' as string,
    allow_override: false,
    override_reason_required: true
  });

  useEffect(() => {
    if (requirements) {
      setFormData({
        education_required: requirements.education_required || false,
        min_education_level: requirements.min_education_level || 'none',
        education_field: requirements.education_field || '',
        certificates_required: requirements.certificates_required || false,
        required_certificates: requirements.required_certificates || [],
        language_required: requirements.language_required || false,
        language: requirements.language || '',
        language_level: requirements.language_level || 'B1',
        allow_override: requirements.allow_override || false,
        override_reason_required: requirements.override_reason_required ?? true
      });
    }
  }, [requirements]);

  const addCertificate = () => {
    if (newCertificate.trim() && !formData.required_certificates.includes(newCertificate.trim())) {
      setFormData(prev => ({
        ...prev,
        required_certificates: [...prev.required_certificates, newCertificate.trim()]
      }));
      setNewCertificate('');
    }
  };

  const removeCertificate = (cert: string) => {
    setFormData(prev => ({
      ...prev,
      required_certificates: prev.required_certificates.filter(c => c !== cert)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRequirements(formData);
      toast({
        title: t('eligibility.requirements.saved_title'),
        description: t('eligibility.requirements.saved_desc')
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {t('eligibility.requirements.title')}
        </CardTitle>
        <CardDescription>
          {t('eligibility.requirements.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Education Requirements */}
        <div className="space-y-4 p-4 rounded-lg border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-500" />
              <Label className="font-medium">{t('eligibility.requirements.education_required')}</Label>
            </div>
            <Switch
              checked={formData.education_required}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, education_required: checked }))}
            />
          </div>
          
          {formData.education_required && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>{t('eligibility.requirements.min_education_level')}</Label>
                <Select
                  value={formData.min_education_level}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, min_education_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>
                        {t(`eligibility.education_levels.${level}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('eligibility.requirements.education_field')}</Label>
                <Input
                  placeholder={t('eligibility.requirements.education_field_placeholder')}
                  value={formData.education_field}
                  onChange={(e) => setFormData(prev => ({ ...prev, education_field: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Certificate Requirements */}
        <div className="space-y-4 p-4 rounded-lg border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <Label className="font-medium">{t('eligibility.requirements.certificates_required')}</Label>
            </div>
            <Switch
              checked={formData.certificates_required}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, certificates_required: checked }))}
            />
          </div>
          
          {formData.certificates_required && (
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <Input
                  placeholder={t('eligibility.requirements.add_certificate_placeholder')}
                  value={newCertificate}
                  onChange={(e) => setNewCertificate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCertificate())}
                />
                <Button type="button" variant="outline" onClick={addCertificate}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.required_certificates.map(cert => (
                  <Badge key={cert} variant="secondary" className="gap-1">
                    {cert}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeCertificate(cert)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Language Requirements */}
        <div className="space-y-4 p-4 rounded-lg border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-green-500" />
              <Label className="font-medium">{t('eligibility.requirements.language_required')}</Label>
            </div>
            <Switch
              checked={formData.language_required}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, language_required: checked }))}
            />
          </div>
          
          {formData.language_required && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>{t('eligibility.requirements.language')}</Label>
                <Input
                  placeholder={t('eligibility.requirements.language_placeholder')}
                  value={formData.language}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('eligibility.requirements.language_level')}</Label>
                <Select
                  value={formData.language_level}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, language_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CEFR_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Override Settings */}
        <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">{t('eligibility.requirements.allow_override')}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t('eligibility.requirements.allow_override_desc')}
              </p>
            </div>
            <Switch
              checked={formData.allow_override}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_override: checked }))}
            />
          </div>
          
          {formData.allow_override && (
            <div className="flex items-center justify-between pt-2">
              <Label className="text-sm">{t('eligibility.requirements.override_reason_required')}</Label>
              <Switch
                checked={formData.override_reason_required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, override_reason_required: checked }))}
              />
            </div>
          )}
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t('eligibility.requirements.save')}
        </Button>
      </CardContent>
    </Card>
  );
};
