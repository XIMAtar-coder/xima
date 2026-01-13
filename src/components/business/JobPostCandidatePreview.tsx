import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Briefcase, Clock, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ContentBlock {
  type: 'intro' | 'section';
  title: string;
  body?: string[];
  bullets?: string[];
}

interface JobContentBlocks {
  hero: {
    title: string;
    company: string | null;
    location: string | null;
    employmentType: string | null;
    seniority: string | null;
    department: string | null;
  };
  blocks: ContentBlock[];
}

interface JobPost {
  id: string;
  title: string;
  status: string;
  description: string | null;
  responsibilities: string | null;
  requirements_must: string | null;
  requirements_nice: string | null;
  benefits: string | null;
  location: string | null;
  employment_type: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content_json?: any;
  seniority: string | null;
  department: string | null;
  salary_range: string | null;
  source_pdf_path?: string | null;
}

interface PublishReadinessProps {
  job: JobPost;
  contentBlocks: JobContentBlocks | null;
}

function PublishReadinessIndicator({ job, contentBlocks }: PublishReadinessProps) {
  const { t } = useTranslation();
  
  const hasIntro = contentBlocks?.blocks.some(b => b.type === 'intro' && b.body && b.body.length > 0);
  const hasResponsibilities = contentBlocks?.blocks.some(b => b.title.toLowerCase().includes('do') && b.bullets && b.bullets.length > 0);
  const hasRequirements = contentBlocks?.blocks.some(b => b.title.toLowerCase().includes('bring') && b.bullets && b.bullets.length > 0);
  const hasBenefits = contentBlocks?.blocks.some(b => b.title.toLowerCase().includes('offer') && b.bullets && b.bullets.length > 0);
  
  const checks = [
    { key: 'title', ok: !!contentBlocks?.hero.title && contentBlocks.hero.title !== 'Imported Job Position', label: t('jobs.preview.has_title', 'Clear title') },
    { key: 'intro', ok: hasIntro, label: t('jobs.preview.has_intro', 'Role introduction') },
    { key: 'responsibilities', ok: hasResponsibilities, label: t('jobs.preview.has_responsibilities', 'Responsibilities') },
    { key: 'requirements', ok: hasRequirements, label: t('jobs.preview.has_requirements', 'Requirements') },
  ];
  
  const passedCount = checks.filter(c => c.ok).length;
  const isReady = passedCount >= 3;
  
  return (
    <div className={`p-4 rounded-lg border ${isReady ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'}`}>
      <div className="flex items-center gap-2 mb-3">
        {isReady ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        )}
        <span className="font-medium">
          {isReady ? t('jobs.preview.ready_to_publish', 'Ready to publish') : t('jobs.preview.needs_review', 'Needs review')}
        </span>
        <Badge variant="secondary" className="ml-auto">
          {passedCount}/{checks.length}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {checks.map(check => (
          <div key={check.key} className="flex items-center gap-2 text-sm">
            {check.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
            )}
            <span className={check.ok ? 'text-foreground' : 'text-muted-foreground'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  job: JobPost;
}

export default function JobPostCandidatePreview({ job }: Props) {
  const { t } = useTranslation();
  
  // Try to parse content_json if it's a string
  let contentBlocks: JobContentBlocks | null = null;
  if (job.content_json) {
    if (typeof job.content_json === 'string') {
      try {
        contentBlocks = JSON.parse(job.content_json);
      } catch {
        contentBlocks = null;
      }
    } else {
      contentBlocks = job.content_json as JobContentBlocks;
    }
  }

  // Fallback: build content blocks from legacy fields if content_json is missing
  if (!contentBlocks && (job.description || job.responsibilities)) {
    contentBlocks = {
      hero: {
        title: job.title,
        company: null,
        location: job.location,
        employmentType: job.employment_type,
        seniority: job.seniority,
        department: job.department,
      },
      blocks: [],
    };
    
    if (job.description) {
      contentBlocks.blocks.push({
        type: 'intro',
        title: 'About the Role',
        body: job.description.split(/\n\n+/).filter(p => p.trim()),
      });
    }
    
    if (job.responsibilities) {
      contentBlocks.blocks.push({
        type: 'section',
        title: "What You'll Do",
        bullets: job.responsibilities.split('\n').filter(l => l.trim().startsWith('•')).map(l => l.replace(/^•\s*/, '').trim()),
      });
    }
    
    if (job.requirements_must) {
      contentBlocks.blocks.push({
        type: 'section',
        title: 'What You Bring',
        bullets: job.requirements_must.split('\n').filter(l => l.trim().startsWith('•')).map(l => l.replace(/^•\s*/, '').trim()),
      });
    }
    
    if (job.requirements_nice) {
      contentBlocks.blocks.push({
        type: 'section',
        title: 'Nice to Have',
        bullets: job.requirements_nice.split('\n').filter(l => l.trim().startsWith('•')).map(l => l.replace(/^•\s*/, '').trim()),
      });
    }
    
    if (job.benefits) {
      contentBlocks.blocks.push({
        type: 'section',
        title: 'What We Offer',
        bullets: job.benefits.split('\n').filter(l => l.trim().startsWith('•')).map(l => l.replace(/^•\s*/, '').trim()),
      });
    }
  }

  const hero = contentBlocks?.hero;
  const blocks = contentBlocks?.blocks || [];

  return (
    <div className="space-y-6">
      {/* Publish Readiness */}
      {job.source_pdf_path && (
        <PublishReadinessIndicator job={job} contentBlocks={contentBlocks} />
      )}

      {/* Hero Section */}
      <Card className="border-0 shadow-none bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {hero?.title || job.title}
          </h1>
          
          <div className="flex flex-wrap gap-2">
            {hero?.company && (
              <Badge variant="secondary" className="gap-1.5">
                <Building2 className="h-3 w-3" />
                {hero.company}
              </Badge>
            )}
            {(hero?.location || job.location) && (
              <Badge variant="secondary" className="gap-1.5">
                <MapPin className="h-3 w-3" />
                {hero?.location || job.location}
              </Badge>
            )}
            {(hero?.employmentType || job.employment_type) && (
              <Badge variant="secondary" className="gap-1.5">
                <Clock className="h-3 w-3" />
                {hero?.employmentType || job.employment_type}
              </Badge>
            )}
            {(hero?.seniority || job.seniority) && (
              <Badge variant="secondary" className="gap-1.5">
                <Briefcase className="h-3 w-3" />
                {hero?.seniority || job.seniority}
              </Badge>
            )}
            {(hero?.department || job.department) && (
              <Badge variant="outline" className="gap-1.5">
                {hero?.department || job.department}
              </Badge>
            )}
          </div>
          
          {job.salary_range && (
            <div className="mt-4 text-sm text-muted-foreground">
              <span className="font-medium">{t('jobs.salary')}:</span> {job.salary_range}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Blocks */}
      {blocks.length > 0 ? (
        <div className="space-y-6">
          {blocks.map((block, index) => (
            <Card key={index} className="border shadow-sm">
              <CardContent className="pt-5">
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  {block.type === 'intro' && <span className="text-primary">📋</span>}
                  {block.title.toLowerCase().includes('do') && <span className="text-primary">🎯</span>}
                  {block.title.toLowerCase().includes('bring') && <span className="text-primary">✅</span>}
                  {block.title.toLowerCase().includes('nice') && <span className="text-primary">⭐</span>}
                  {block.title.toLowerCase().includes('offer') && <span className="text-primary">🎁</span>}
                  {block.title}
                </h2>
                
                {block.body && block.body.length > 0 && (
                  <div className="space-y-3">
                    {block.body.map((paragraph, pIndex) => (
                      <p key={pIndex} className="text-sm text-muted-foreground leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}
                
                {block.bullets && block.bullets.length > 0 && (
                  <ul className="space-y-2">
                    {block.bullets.map((bullet, bIndex) => (
                      <li key={bIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1 shrink-0">•</span>
                        <span className="leading-relaxed">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>{t('jobs.preview.no_content', 'No structured content available. Switch to Editor view to add content.')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
