import React from 'react';
import { useTranslation } from 'react-i18next';
import LandingLayout from '@/components/landing/LandingLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Database, Eye, Lock, UserCheck, Mail } from 'lucide-react';

const PrivacyPolicy = () => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: Database,
      title: t('legal.privacy.data_collection_title'),
      content: t('legal.privacy.data_collection_content')
    },
    {
      icon: Eye,
      title: t('legal.privacy.data_usage_title'),
      content: t('legal.privacy.data_usage_content')
    },
    {
      icon: Lock,
      title: t('legal.privacy.data_security_title'),
      content: t('legal.privacy.data_security_content')
    },
    {
      icon: UserCheck,
      title: t('legal.privacy.your_rights_title'),
      content: t('legal.privacy.your_rights_content')
    },
    {
      icon: Mail,
      title: t('legal.privacy.contact_title'),
      content: t('legal.privacy.contact_content')
    }
  ];

  return (
    <LandingLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('legal.privacy.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('legal.privacy.last_updated')}: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card className="mb-8 bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardContent className="pt-6">
            <p className="text-muted-foreground leading-relaxed">
              {t('legal.privacy.intro')}
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
    </LandingLayout>
  );
};

export default PrivacyPolicy;
