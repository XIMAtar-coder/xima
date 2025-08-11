import { User } from "@/types";

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  skills: string[];
  sourceUrl: string;
  summary: string;
  idealXimatar?: string[]; // ids like 'owl', 'lion'
  companyProfile?: {
    description?: string;
    size?: string;
    industry?: string;
    hq?: string;
    website?: string;
    careersUrl?: string;
  };
};

// Simple skill → pillar mapping used for pillar fit weighting
const skillToPillar: Record<string, keyof NonNullable<User["pillars"]>> = {
  "data": "computational",
  "analysis": "computational",
  "analytics": "computational",
  "python": "computational",
  "sql": "computational",
  "presentation": "communication",
  "communication": "communication",
  "storytelling": "communication",
  "research": "knowledge",
  "domain": "knowledge",
  "strategy": "knowledge",
  "design": "creativity",
  "creativity": "creativity",
  "innovation": "creativity",
  "initiative": "drive",
  "leadership": "drive",
  "ownership": "drive"
};

const inMemoryJobs: Job[] = [
  {
    id: "1",
    title: "Data Analyst",
    company: "Aurora Insights",
    location: "Milan, IT",
    skills: ["data", "analysis", "sql", "presentation"],
    sourceUrl: "https://example.com/jobs/1",
    summary: "Analyze datasets to deliver insights for business teams and stakeholders.",
    idealXimatar: ["owl", "elephant"],
    companyProfile: {
      description: "Aurora Insights provides data-driven decision support for European enterprises.",
      size: "200-500",
      industry: "Analytics",
      hq: "Milan, IT",
      website: "https://aurora.example.com",
      careersUrl: "https://aurora.example.com/careers"
    }
  },
  {
    id: "2",
    title: "Product Marketing Manager",
    company: "NovaTech",
    location: "Remote",
    skills: ["communication", "storytelling", "strategy", "ownership"],
    sourceUrl: "https://example.com/jobs/2",
    summary: "Own product positioning and go-to-market narratives across channels.",
    idealXimatar: ["parrot", "fox"],
    companyProfile: {
      description: "NovaTech builds tools that help teams collaborate effectively.",
      size: "500-1000",
      industry: "Software",
      hq: "Berlin, DE",
      website: "https://novatech.example.com",
      careersUrl: "https://novatech.example.com/careers"
    }
  },
  {
    id: "3",
    title: "UX Designer",
    company: "BlueWave Studio",
    location: "Rome, IT",
    skills: ["design", "creativity", "research", "communication"],
    sourceUrl: "https://example.com/jobs/3",
    summary: "Design intuitive experiences backed by research and rapid iteration.",
    idealXimatar: ["cat", "dolphin"],
    companyProfile: {
      description: "BlueWave is a boutique design studio focused on user-centered products.",
      size: "50-100",
      industry: "Design",
      hq: "Rome, IT",
      website: "https://bluewave.example.com",
      careersUrl: "https://bluewave.example.com/careers"
    }
  }
];

async function loadJobsFromJSON(): Promise<Job[] | null> {
  try {
    const res = await fetch("/jobs.json", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as Job[];
    return data;
  } catch {
    return null;
  }
}

export async function getJobs(): Promise<Job[]> {
  const fromJson = await loadJobsFromJSON();
  return fromJson ?? inMemoryJobs;
}

export async function getJobById(id: string): Promise<Job | undefined> {
  const jobs = await getJobs();
  return jobs.find(j => j.id === id);
}

export type MatchBreakdown = {
  score: number; // 0-100
  weights: { pillar: number; ximatar: number; keywords: number };
  pillars: Array<{ key: keyof NonNullable<User["pillars"]>; contribution: number }>;
};

function extractUserKeywords(user: User | null): string[] {
  const kws: string[] = [];
  if (!user) return kws;
  if (user.avatar?.features) {
    for (const f of user.avatar.features) {
      kws.push(f.name.toLowerCase());
      f.description && kws.push(...f.description.toLowerCase().split(/[^a-z]+/).filter(Boolean));
    }
  }
  // If CV text were available, we would parse here.
  return Array.from(new Set(kws));
}

function pillarFit(user: User | null, job: Job): number {
  if (!user?.pillars) return 0.5; // neutral when unknown
  // Aggregate required pillars from skills
  const requirements: Partial<Record<keyof NonNullable<User["pillars"]>, number>> = {};
  for (const skill of job.skills) {
    const key = skillToPillar[skill.toLowerCase()];
    if (!key) continue;
    requirements[key] = (requirements[key] ?? 0) + 1;
  }
  const total = Object.values(requirements).reduce((a, b) => a + b, 0) || 1;
  let sum = 0;
  for (const [pillar, weight] of Object.entries(requirements) as Array<[
    keyof NonNullable<User["pillars"]>,
    number
  ]>) {
    const userScore = user.pillars[pillar] / 10; // normalize 0-1
    const w = weight / total;
    sum += userScore * w;
  }
  return sum; // 0-1
}

function ximatarFit(user: User | null, job: Job): number {
  if (!user?.avatar?.animal) return 0.5;
  const userType = user.avatar.animal.toLowerCase();
  if (!job.idealXimatar?.length) return 0.5;
  return job.idealXimatar.includes(userType) ? 1 : 0.4; // partial if not ideal
}

function keywordOverlap(user: User | null, job: Job): number {
  const userKws = extractUserKeywords(user);
  if (!userKws.length) return 0.5;
  const jobKws = new Set(job.skills.map(s => s.toLowerCase()));
  const overlap = userKws.filter(k => jobKws.has(k)).length;
  return Math.min(1, overlap / Math.max(1, jobKws.size));
}

export function computeMatch(user: User | null, job: Job): MatchBreakdown {
  const p = pillarFit(user, job);
  const x = ximatarFit(user, job);
  const k = keywordOverlap(user, job);
  const score = Math.round((p * 0.4 + x * 0.35 + k * 0.25) * 100);

  // Pillar contribution details for UI
  const req: Partial<Record<keyof NonNullable<User["pillars"]>, number>> = {};
  for (const s of job.skills) {
    const key = skillToPillar[s.toLowerCase()];
    if (key) req[key] = (req[key] ?? 0) + 1;
  }
  const total = Object.values(req).reduce((a, b) => a + b, 0) || 1;
  const pillars = (Object.keys(req) as Array<keyof NonNullable<User["pillars"]>>).map(k => ({
    key: k,
    contribution: (req[k]! / total) * 100
  }));

  return {
    score,
    weights: { pillar: 40, ximatar: 35, keywords: 25 },
    pillars
  };
}
