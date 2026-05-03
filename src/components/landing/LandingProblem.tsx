import React from 'react';
import { useTranslation } from 'react-i18next';

export const LandingProblem: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 px-6 lg:px-10" style={{ background: 'var(--xima-surface)' }}>
      <div className="max-w-[820px] mx-auto text-center">
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 2,
            color: 'var(--xima-blue)',
            textTransform: 'uppercase',
            marginBottom: 18,
          }}
        >
          {t('home.problem_label')}
        </p>
        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 700,
            color: 'var(--xima-text)',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            marginBottom: 28,
            whiteSpace: 'pre-line',
          }}
        >
          {t('home.problem_headline')}
        </h2>
        <p style={{ fontSize: 18, color: 'var(--xima-text-muted)', lineHeight: 1.7, marginBottom: 32 }}>
          {t('home.problem_body')}
        </p>
        <p
          style={{
            fontSize: 22,
            color: 'var(--xima-blue)',
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          {t('home.problem_pullquote')}
        </p>
      </div>
    </section>
  );
};

export default LandingProblem;
