import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, UserX } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

export default function NotAMentor() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card className="text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <UserX className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">
              {t('mentor.not_a_mentor_title', 'You are not a mentor on XIMA yet')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              {t('mentor.not_a_mentor_explanation', 
                'Mentors on XIMA are selected and activated by the platform. If you believe you should be a mentor, please contact us.'
              )}
            </p>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                {t('mentor.contact_us', 'Contact us')}
              </p>
              <a 
                href="mailto:info@xima.app" 
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <Mail className="h-4 w-4" />
                info@xima.app
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
