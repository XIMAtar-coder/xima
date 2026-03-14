
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';

const AvatarExplanation = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-12">
      <Card className="p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4 text-foreground">{t('avatar_explanation.title')}</h2>
          <p className="text-lg text-muted-foreground mb-6 max-w-3xl mx-auto">
            {t('avatar_explanation.description')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted/40 rounded-full flex items-center justify-center mx-auto mb-3 ring-1 ring-border/40">
                <img src="/ximatars/owl.png" alt="XIMAtar Owl" className="h-11 w-11 rounded-full object-cover" />
              </div>
              <h3 className="font-semibold text-foreground">{t('avatar_explanation.eagle.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('avatar_explanation.eagle.description')}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-muted/40 rounded-full flex items-center justify-center mx-auto mb-3 ring-1 ring-border/40">
                <img src="/ximatars/fox.png" alt="XIMAtar Fox" className="h-11 w-11 rounded-full object-cover" />
              </div>
              <h3 className="font-semibold text-foreground">{t('avatar_explanation.fox.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('avatar_explanation.fox.description')}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-muted/40 rounded-full flex items-center justify-center mx-auto mb-3 ring-1 ring-border/40">
                <img src="/ximatars/wolf.png" alt="XIMAtar Wolf" className="h-11 w-11 rounded-full object-cover" />
              </div>
              <h3 className="font-semibold text-foreground">{t('avatar_explanation.wolf.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('avatar_explanation.wolf.description')}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AvatarExplanation;
