import React from 'react';
import { useTranslation } from 'react-i18next';

const NAVY = '#071E3A';
const MUTED = '#607089';
const BLUE = '#0B6BFF';

export const LandingProblem: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 px-6 lg:px-10" style={{ background: '#FFFFFF' }}>
      <div className="max-w-[820px] mx-auto text-center">
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 2,
            color: BLUE,
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
            color: NAVY,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            marginBottom: 28,
            whiteSpace: 'pre-line',
          }}
        >
          {t('home.problem_headline')}
        </h2>
        <p style={{ fontSize: 18, color: MUTED, lineHeight: 1.7, marginBottom: 32 }}>
          {t('home.problem_body')}
        </p>
        <p
          style={{
            fontSize: 22,
            color: BLUE,
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
