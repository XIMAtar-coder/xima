import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getJobById, Job } from "@/services/jobFeed";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useJobInteractions } from "@/hooks/useJobInteractions";
import { useDynamicMatchScore } from "@/hooks/useDynamicMatchScore";
import { Check, Bookmark, Share2, ExternalLink } from "lucide-react";

const createCanonical = (href: string) => {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

export default function OpportunityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const { toast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const { match, loading: matchLoading } = useDynamicMatchScore(job);
  const { trackInteraction, hasStatus } = useJobInteractions(id);
  const [sentiment, setSentiment] = useState<{
    overallScore?: number;
    pros?: string[];
    cons?: string[];
    highlights?: { text: string; source?: string; timestamp?: string }[];
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      const j = await getJobById(id);
      if (!mounted) return;
      if (!j) {
        navigate("/", { replace: true });
        return;
      }
      setJob(j);

      // Track page view
      if (user?.id) {
        trackInteraction(id, 'viewed');
      }

      try {
        // Try edge function for community sentiment
        const { data, error } = await supabase.functions.invoke("sentiment-aggregator", {
          body: { company: j.company }
        });
        if (!error) setSentiment(data ?? null);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, user?.id]);

  // SEO: Title, meta description, canonical and JSON-LD
  useEffect(() => {
    if (!job) return;
    const title = `${job.title} at ${job.company} – XIMA`;
    document.title = title;

    const metaName = "description";
    let meta = document.querySelector(`meta[name="${metaName}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", metaName);
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      `${job.title} • ${job.location} • ${job.summary}`.slice(0, 155)
    );

    createCanonical(window.location.href);

    // JSON-LD for JobPosting
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      description: job.summary,
      hiringOrganization: {
        "@type": "Organization",
        name: job.company,
        sameAs: job.companyProfile?.website || undefined
      },
      jobLocation: job.location ? {
        "@type": "Place",
        address: { addressLocality: job.location }
      } : undefined,
      applicantLocationRequirements: undefined,
      employmentType: undefined,
      validThrough: undefined,
      directApply: false,
      url: window.location.href
    } as Record<string, any>;

    const scriptId = "jsonld-job-posting";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = scriptId;
      document.head.appendChild(script);
    }
    script.text = JSON.stringify(jsonLd);
  }, [job]);

  const handleApply = async () => {
    if (!job || !id) return;
    const success = await trackInteraction(id, 'applied');
    if (success) {
      window.open(job.sourceUrl, "_blank", "noopener,noreferrer");
      toast({ 
        title: t("opportunity.toasts.applied_title") || "Application tracked",
        description: t("opportunity.toasts.applied") || "Your application has been recorded"
      });
    }
  };

  const handleSave = async () => {
    if (!job || !user?.id || !id) return;
    const success = await trackInteraction(id, 'saved');
    if (success) {
      toast({ description: t("opportunity.toasts.saved") || "Opportunity saved!" });
    } else {
      toast({ 
        variant: "destructive",
        description: t("opportunity.toasts.save_failed") || "Failed to save opportunity"
      });
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: job?.title, url: window.location.href });
        toast({ description: t("opportunity.toasts.shared") });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ description: t("opportunity.toasts.shared") });
      }
    } catch {
      toast({ description: t("opportunity.toasts.share_failed") });
    }
  };

  const pillarName = (key: string) => t(`pillars.${key}.name`);
  const pillarDesc = (key: string) => t(`pillars.${key}.description`);

  if (!job) return null;

  const isSaved = id ? hasStatus(id, 'saved') : false;
  const isApplied = id ? hasStatus(id, 'applied') : false;

  return (
    <div className="container mx-auto px-4 py-8 animate-[fade-in_0.4s_ease-out]">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
          {job.title}
        </h1>
        <p className="text-[hsl(var(--xima-gray))] mt-1 flex items-center gap-2">
          <span className="font-medium">{job.company}</span>
          <span>•</span>
          <span>{job.location}</span>
        </p>
        {match && !matchLoading && (
          <div className="mt-4 p-4 bg-[hsl(var(--xima-accent))]/5 border border-[hsl(var(--xima-accent))]/20 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {t("opportunity.match_score")}
              </span>
              <span className="text-2xl font-bold text-[hsl(var(--xima-accent))]">
                {match.score}%
              </span>
            </div>
            <Progress 
              value={match.score} 
              className="h-2 bg-background"
            />
            <p className="text-xs text-[hsl(var(--xima-gray))] mt-2">
              XIMA fit based on your strengths and traits
            </p>
          </div>
        )}
      </header>

      <section aria-label="actions" className="mb-8">
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={handleApply}
            disabled={isApplied}
            className="bg-[hsl(var(--xima-accent))] hover:bg-[hsl(var(--xima-accent))]/90 text-white"
          >
            {isApplied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Applied
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("opportunity.actions.apply")}
              </>
            )}
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleSave}
            disabled={isSaved}
          >
            <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Saved' : t("opportunity.actions.save")}
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            {t("opportunity.actions.share")}
          </Button>
        </div>
      </section>

      <main className="grid gap-6 md:grid-cols-3">
        <article className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("opportunity.sections.role_fit")}</CardTitle>
            </CardHeader>
            <CardContent>
              {match && !matchLoading && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-3">{t("opportunity.role_fit.pillars_contribution")}</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {match.pillarContributions.map(p => (
                        <div 
                          key={p.pillar} 
                          className="rounded-lg border border-[hsl(var(--xima-accent))]/20 p-3 bg-gradient-to-br from-background to-[hsl(var(--xima-accent))]/5"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{pillarName(p.pillar)}</span>
                            <span className="text-sm font-bold text-[hsl(var(--xima-accent))]">
                              {Math.round(p.contribution)}%
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-[hsl(var(--xima-gray))]">
                              <span>Your score: {p.userScore}/10</span>
                              <span>Weight: {Math.round(p.weight)}%</span>
                            </div>
                            <Progress value={p.contribution} className="h-1.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">{t("opportunity.role_fit.ximatar_traits")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {(job.idealXimatar ?? []).map(x => (
                        <Badge key={x} variant={user?.avatar?.animal?.toLowerCase() === x ? "default" : "secondary"}>
                          {x}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">{t("opportunity.labels.required_skills")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map(s => (
                        <Badge key={s} variant="outline">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("opportunity.sections.community_sentiment")}</CardTitle>
            </CardHeader>
            <CardContent>
              {!sentiment || !sentiment.overallScore ? (
                <p className="text-muted-foreground">{t("opportunity.sentiment.empty")}</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t("opportunity.sentiment.overall")}</span>
                    <span>{Math.round((sentiment.overallScore ?? 0) * 100)}%</span>
                  </div>
                  {!!sentiment.pros?.length && (
                    <div>
                      <h4 className="font-medium">{t("opportunity.sentiment.pros")}</h4>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {sentiment.pros!.map((p, i) => (
                          <li key={`pro-${i}`}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!sentiment.cons?.length && (
                    <div>
                      <h4 className="font-medium">{t("opportunity.sentiment.cons")}</h4>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {sentiment.cons!.map((c, i) => (
                          <li key={`con-${i}`}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!sentiment.highlights?.length && (
                    <div>
                      <h4 className="font-medium">{t("opportunity.sentiment.recent_highlights")}</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {sentiment.highlights!.map((h, i) => (
                          <li key={`hi-${i}`}>{h.text} {h.source ? `(${h.source})` : ""} {h.timestamp ? `• ${new Date(h.timestamp).toLocaleDateString()}` : ""}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </article>

        <aside className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{t("opportunity.sections.company_profile")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <div className="text-foreground font-medium">{job.company}</div>
                {job.companyProfile?.description && (
                  <p className="text-muted-foreground mt-1">{job.companyProfile.description}</p>
                )}
              </div>
              {job.companyProfile?.industry && (
                <div className="flex justify-between"><span className="text-muted-foreground">{t("opportunity.company.industry")}</span><span>{job.companyProfile.industry}</span></div>
              )}
              {job.companyProfile?.size && (
                <div className="flex justify-between"><span className="text-muted-foreground">{t("opportunity.company.size")}</span><span>{job.companyProfile.size}</span></div>
              )}
              {job.companyProfile?.hq && (
                <div className="flex justify-between"><span className="text-muted-foreground">{t("opportunity.company.hq")}</span><span>{job.companyProfile.hq}</span></div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {job.companyProfile?.website && (
                  <Button asChild variant="outline" size="sm">
                    <a href={job.companyProfile.website} target="_blank" rel="noopener noreferrer">{t("opportunity.company.website")}</a>
                  </Button>
                )}
                {job.companyProfile?.careersUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={job.companyProfile.careersUrl} target="_blank" rel="noopener noreferrer">{t("opportunity.company.careers")}</a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
