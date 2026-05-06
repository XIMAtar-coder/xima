import React from 'react';
import { useTranslation } from 'react-i18next';


export const LandingProblem: React.FC = () => {
  const { t } = useTranslation();

  const bodyParas = t('landing.problem.body', { returnObjects: true }) as string[] | string;
  const paras = Array.isArray(bodyParas) ? bodyParas : [bodyParas];

  return (
    <section
      className="py-24 px-6 lg:px-10"
      style={{
        background:
          'linear-gradient(180deg, var(--xima-bg) 0%, var(--xima-surface-soft, #EEF5FF) 100%)',
      }}
    >
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Text */}
        <div>
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
            {t('landing.problem.label')}
          </p>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 800,
              color: 'var(--xima-text)',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              marginBottom: 28,
            }}
            dangerouslySetInnerHTML={{ __html: t('landing.problem.headline_html') }}
          />
          <div className="space-y-4 mb-8">
            {paras.map((p, i) => (
              <p
                key={i}
                style={{
                  fontSize: 17,
                  color: 'var(--xima-text-muted)',
                  lineHeight: 1.7,
                }}
              >
                {p}
              </p>
            ))}
          </div>
          <p
            style={{
              fontSize: 20,
              color: 'var(--xima-blue)',
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {t('landing.problem.quote')}
          </p>
        </div>

        {/* Visual */}
        <div className="flex justify-center lg:justify-end">
          <img src="/images/problem-cv-breaking.png" alt="" className="w-full max-w-lg" />
        </div>
      </div>
    </section>
  );
};

export default LandingProblem;
