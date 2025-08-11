import { useEffect, useMemo, useState } from "react";
import { User } from "@/types";
import { getJobs, computeMatch, Job } from "@/services/jobFeed";

export type JobMatch = {
  job: Job;
  score: number;
};

type CacheRecord = {
  ts: number;
  pillarsJson: string | null;
  matches: JobMatch[];
};

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function key(userId?: string) {
  return userId ? `jobMatches:${userId}` : `jobMatches:guest`;
}

export function useJobMatches(user: User | null) {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = user?.id;
  const pillarsJson = useMemo(() => (user?.pillars ? JSON.stringify(user.pillars) : null), [user?.pillars]);

  const compute = async () => {
    setLoading(true);
    const jobs = await getJobs();
    const scored = jobs.map((job) => ({ job, score: computeMatch(user, job).score }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 6);
    setMatches(top);

    try {
      const rec: CacheRecord = { ts: Date.now(), pillarsJson, matches: top };
      localStorage.setItem(key(userId), JSON.stringify(rec));
    } catch { }
    setLoading(false);
  };

  const refresh = async () => {
    await compute();
  };

  useEffect(() => {
    // Try cache first
    try {
      const raw = localStorage.getItem(key(userId));
      if (raw) {
        const rec = JSON.parse(raw) as CacheRecord;
        const fresh = Date.now() - rec.ts < TTL_MS;
        const samePillars = rec.pillarsJson === pillarsJson;
        if (fresh && samePillars) {
          setMatches(rec.matches);
          return;
        }
      }
    } catch { }
    // Otherwise compute
    compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, pillarsJson]);

  return { matches, loading, refresh };
}
