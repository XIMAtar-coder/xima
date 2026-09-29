import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Tab title for the pages that do not set their own: the private areas of
 * candidates and companies. Without it they kept the English default of
 * index.html ("XIMA — Discover Your Professional Potential"). Pages that
 * render <Seo> mount later and win.
 */
const ROUTES: Array<[string, string, string]> = [
  ['/business/dashboard', 'page_title.business_overview', 'Overview'],
  ['/business/hiring-goals', 'page_title.hiring_goals', 'Hiring goals'],
  ['/business/candidates', 'page_title.candidate_pool', 'Candidate pool'],
  ['/business/challenges', 'page_title.challenges', 'Challenges'],
  ['/business/jobs', 'page_title.job_posts', 'Job posts'],
  ['/business/evaluations', 'page_title.evaluations', 'Evaluations'],
  ['/business/messages', 'page_title.messages', 'Messages'],
  ['/business/settings', 'page_title.settings', 'Settings'],
  ['/profile', 'page_title.dashboard', 'Your space'],
  ['/dashboard', 'page_title.dashboard', 'Your space'],
  ['/development-plan', 'page_title.growth_hub', 'Growth Hub'],
  ['/jobs', 'page_title.opportunities', 'Your opportunities'],
  ['/my-offers', 'page_title.offers', 'Offers received'],
  ['/messages', 'page_title.messages', 'Messages'],
  ['/xima-chat', 'page_title.feed', 'Your feed'],
  ['/settings', 'page_title.settings', 'Settings'],
  ['/ximatar-journey', 'page_title.journey', 'Your XIMAtar'],
  ['/register', 'page_title.register', 'Create your account'],
  ['/login', 'page_title.login', 'Log in'],
];

export const RouteTitle = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const hit = ROUTES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!hit) return null;
  return (
    <Helmet>
      <title>{`${t(hit[1], hit[2])} — XIMA`}</title>
    </Helmet>
  );
};

export default RouteTitle;
