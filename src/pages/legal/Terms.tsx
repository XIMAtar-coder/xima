import React from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, AlertTriangle, Scale, Ban, RefreshCw } from 'lucide-react';

const Terms = () => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: CheckCircle,
      title: t('legal.terms.acceptance_title'),
      content: t('legal.terms.acceptance_content')
    },
    {
      icon: FileText,
      title: t('legal.terms.services_title'),
      content: t('legal.terms.services_content')
    },
    {
      icon: AlertTriangle,
      title: t('legal.terms.user_obligations_title'),
      content: t('legal.terms.user_obligations_content')
    },
    {
      icon: Scale,
      title: t('legal.terms.liability_title'),
      content: t('legal.terms.liability_content')
    },
    {
      icon: Ban,
      title: t('legal.terms.termination_title'),
      content: t('legal.terms.termination_content')
    },
    {
      icon: RefreshCw,
      title: t('legal.terms.changes_title'),
      content: t('legal.terms.changes_content')
    }
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('legal.terms.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('legal.terms.last_updated')}: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card className="mb-8 bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardContent className="pt-6">
            <p className="text-muted-foreground leading-relaxed">
              {t('legal.terms.intro')}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card key={index} className="bg-gradient-to-br from-card to-card/80 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Terms;
