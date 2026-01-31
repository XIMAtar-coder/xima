import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, UserX, ArrowRight, GraduationCap, Users, Calendar } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

export default function NotAMentor() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card className="text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <UserX className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">
              {t('mentor.not_a_mentor_title', 'You don\'t have mentor access')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              {t('mentor.not_a_mentor_explanation', 
                'The Mentor Portal is for approved XIMA mentors who guide candidates on their professional growth journey.'
              )}
            </p>
            
            {/* What mentors can do */}
            <div className="bg-muted/30 rounded-lg p-4 text-left space-y-3">
              <h3 className="font-semibold text-sm">{t('mentor.what_mentors_do', 'What mentors can do:')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                  {t('mentor.mentor_benefit_1', 'Guide candidates based on their XIMAtar profile')}
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary flex-shrink-0" />
                  {t('mentor.mentor_benefit_2', 'Appear in candidate mentor recommendations')}
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                  {t('mentor.mentor_benefit_3', 'Manage coaching sessions and availability')}
                </li>
              </ul>
            </div>
            
            {/* CTA to candidate dashboard */}
            <div className="pt-4 space-y-4">
              <Button 
                onClick={() => navigate('/profile')} 
                className="gap-2"
              >
                {t('mentor.go_to_dashboard', 'Go to Candidate Dashboard')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Contact section */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                {t('mentor.interested_in_mentoring', 'Interested in becoming a mentor?')}
              </p>
              <a 
                href="mailto:info@xima.app" 
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-sm"
              >
                <Mail className="h-4 w-4" />
                {t('mentor.contact_us', 'Contact us at info@xima.app')}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
