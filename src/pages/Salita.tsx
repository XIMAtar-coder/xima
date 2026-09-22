import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import { Panel } from '@/components/layout/PageHeader';
import Seo from '@/components/Seo';
import { SalitaGame } from '@/components/salita/SalitaGame';

/**
 * La Salita on its own page, for whoever comes back to it after the result.
 * The trial itself lives in SalitaGame, so it is the same climb the
 * questionnaire ends with.
 */
const Salita: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const back = () => navigate(-1);

  return (
    <MainLayout>
      <Seo title={`${t('salita.title')} — XIMA`} description={t('salita.intro_body')} path="/salita" />
      <div className="mx-auto w-full max-w-[760px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <Panel className="p-6 sm:p-8">
          <SalitaGame onBack={back} onDone={back} />
        </Panel>
      </div>
    </MainLayout>
  );
};

export default Salita;
