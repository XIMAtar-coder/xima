import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Briefcase, Clock, Building2, CheckCircle2, AlertTriangle, Bug } from 'lucide-react';

interface ContentBlock {
  type: 'intro' | 'section';
  title: string;
  body?: string[];
  bullets?: string[];
}

interface ValidationResult {
  valid: boolean;
  reasons: string[];
}

interface JobContentBlocks {
  hero: {
    title: string | null;
    company: string | null;
    location: string | null;
    employmentType: string | null;
    seniority: string | null;
    department: string | null;
  };
  blocks: ContentBlock[];
  validation?: ValidationResult;
  needs_manual_review?: boolean;
  invalid_structure?: boolean;
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

// Debug panel for ?debug=1 mode
function DebugPanel({ job, contentBlocks }: { job: JobPost; contentBlocks: JobContentBlocks | null }) {
  const hasContentJson = !!job.content_json;
  const blocksCount = contentBlocks?.blocks?.length || 0;
  const blockTitles = contentBlocks?.blocks?.map(b => b.title) || [];
  const validation = contentBlocks?.validation;
  
  return (
    <div className="p-3 rounded-lg border border-dashed border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-xs font-mono space-y-2">
      <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
        <Bug className="h-4 w-4" />
        Debug Mode
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
        <span>content_json exists:</span>
        <span className={hasContentJson ? 'text-green-600' : 'text-red-600'}>
          {hasContentJson ? 'YES ✓' : 'NO ✗'}
        </span>
        <span>Number of blocks:</span>
        <span>{blocksCount}</span>
        <span>Block titles:</span>
        <span className="col-span-1 truncate">{blockTitles.join(', ') || 'none'}</span>
        <span>Has description:</span>
        <span className={job.description ? 'text-green-600' : 'text-muted-foreground'}>
          {job.description ? `YES (${job.description.length} chars)` : 'NO'}
        </span>
        <span>Has responsibilities:</span>
        <span className={job.responsibilities ? 'text-green-600' : 'text-muted-foreground'}>
          {job.responsibilities ? 'YES' : 'NO'}
        </span>
        <span>Source PDF:</span>
        <span className={job.source_pdf_path ? 'text-green-600' : 'text-muted-foreground'}>
          {job.source_pdf_path ? 'YES' : 'NO'}
        </span>
        <span>Pipeline validation:</span>
        <span className={validation?.valid ? 'text-green-600' : 'text-red-600'}>
          {validation ? (validation.valid ? 'PASSED ✓' : 'FAILED ✗') : 'N/A'}
        </span>
        <span>Needs manual review:</span>
        <span className={contentBlocks?.needs_manual_review ? 'text-amber-600' : 'text-muted-foreground'}>
          {contentBlocks?.needs_manual_review ? 'YES ⚠' : 'NO'}
        </span>
        <span>Invalid structure:</span>
        <span className={contentBlocks?.invalid_structure ? 'text-red-600' : 'text-muted-foreground'}>
          {contentBlocks?.invalid_structure ? 'YES ✗' : 'NO'}
        </span>
      </div>
      {validation && !validation.valid && validation.reasons.length > 0 && (
        <div className="mt-2 pt-2 border-t border-amber-300 dark:border-amber-700">
          <span className="text-amber-700 dark:text-amber-400 font-medium">Validation issues:</span>
          <ul className="mt-1 space-y-0.5">
            {validation.reasons.map((reason, idx) => (
              <li key={idx} className="text-red-600 dark:text-red-400">• {reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PublishReadinessIndicator({ job, contentBlocks }: PublishReadinessProps) {
  const { t } = useTranslation();
  
  // Evaluate based on content_json blocks (as per requirements)
  const hasIntro = contentBlocks?.blocks.some(b => b.type === 'intro' && b.body && b.body.length > 0);
  const introLength = contentBlocks?.blocks.find(b => b.type === 'intro')?.body?.join(' ').length || 0;
  const hasGoodIntro = hasIntro && introLength > 200;
  
  const responsibilitiesBlock = contentBlocks?.blocks.find(b => 
    b.title.toLowerCase().includes('do') || b.title.toLowerCase().includes('responsibil')
  );
  const hasResponsibilities = responsibilitiesBlock?.bullets && responsibilitiesBlock.bullets.length >= 3;
  
  const requirementsBlock = contentBlocks?.blocks.find(b => 
    b.title.toLowerCase().includes('bring') || b.title.toLowerCase().includes('requir') || b.title.toLowerCase().includes('qualif')
  );
  const hasRequirements = requirementsBlock?.bullets && requirementsBlock.bullets.length >= 3;
  
  const checks = [
    { key: 'title', ok: !!contentBlocks?.hero.title && contentBlocks.hero.title !== 'Imported Job Position', label: t('jobs.preview.has_title', 'Clear title') },
    { key: 'intro', ok: hasGoodIntro, label: t('jobs.preview.has_intro', 'Role introduction (200+ chars)') },
    { key: 'responsibilities', ok: hasResponsibilities, label: t('jobs.preview.has_responsibilities', 'Responsibilities (3+ items)') },
    { key: 'requirements', ok: hasRequirements, label: t('jobs.preview.has_requirements', 'Requirements (3+ items)') },
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
  const [searchParams] = useSearchParams();
  const isDebugMode = searchParams.get('debug') === '1';
  
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

  // ENHANCED FALLBACK: Build content blocks from legacy fields if content_json is missing or empty
  if (!contentBlocks || !contentBlocks.blocks || contentBlocks.blocks.length === 0) {
    // Check if we have ANY content to work with
    const hasAnyContent = job.description || job.responsibilities || job.requirements_must || job.requirements_nice || job.benefits;
    
    if (hasAnyContent) {
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
        const bullets = job.responsibilities.split('\n')
          .filter(l => l.trim().startsWith('•'))
          .map(l => l.replace(/^•\s*/, '').trim())
          .filter(b => b.length > 3);
        if (bullets.length > 0) {
          contentBlocks.blocks.push({
            type: 'section',
            title: "What You'll Do",
            bullets,
          });
        }
      }
      
      if (job.requirements_must) {
        const bullets = job.requirements_must.split('\n')
          .filter(l => l.trim().startsWith('•'))
          .map(l => l.replace(/^•\s*/, '').trim())
          .filter(b => b.length > 3);
        if (bullets.length > 0) {
          contentBlocks.blocks.push({
            type: 'section',
            title: 'What You Bring',
            bullets,
          });
        }
      }
      
      if (job.requirements_nice) {
        const bullets = job.requirements_nice.split('\n')
          .filter(l => l.trim().startsWith('•'))
          .map(l => l.replace(/^•\s*/, '').trim())
          .filter(b => b.length > 3);
        if (bullets.length > 0) {
          contentBlocks.blocks.push({
            type: 'section',
            title: 'Nice to Have',
            bullets,
          });
        }
      }
      
      if (job.benefits) {
        const bullets = job.benefits.split('\n')
          .filter(l => l.trim().startsWith('•'))
          .map(l => l.replace(/^•\s*/, '').trim())
          .filter(b => b.length > 3);
        if (bullets.length > 0) {
          contentBlocks.blocks.push({
            type: 'section',
            title: 'What We Offer',
            bullets,
          });
        }
      }
    }
  }

  const hero = contentBlocks?.hero;
  const blocks = contentBlocks?.blocks || [];

  return (
    <div className="space-y-6">
      {/* Debug Panel (only shown with ?debug=1) */}
      {isDebugMode && (
        <DebugPanel job={job} contentBlocks={contentBlocks} />
      )}

      {/* Validation Status Banner (for pipeline validation failures) */}
      {contentBlocks?.needs_manual_review && (
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="font-medium text-red-700 dark:text-red-300">
              {t('jobs.preview.manual_review_needed', 'Manual review required')}
            </span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">
            {t('jobs.preview.structure_issues', 'The job post could not be fully processed. Please review and edit manually.')}
          </p>
          {contentBlocks?.validation?.reasons && contentBlocks.validation.reasons.length > 0 && (
            <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
              {contentBlocks.validation.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Publish Readiness (only if validation passed or no validation) */}
      {job.source_pdf_path && !contentBlocks?.needs_manual_review && (
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
