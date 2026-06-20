import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, Sparkles, Database, Search, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Mode = "rerank" | "discovery";
type Row = { candidate_user_id: string; similarity?: number; total_score?: number };

async function md5Hex(input: string): Promise<string> {
  // Lightweight ref hash (not crypto): xmur3 + cyrb53 isn't necessary; we
  // just need a stable short token for the CSV. Use SubtleCrypto SHA-256
  // truncated.
  const buf = new TextEncoder().encode(input);
  const dig = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(dig)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function PocRagTab() {
  const [goals, setGoals] = useState<Array<{ id: string; role_title: string; status: string }>>([]);
  const [goalId, setGoalId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("rerank");
  const [k, setK] = useState(10);
  const [sampleSize, setSampleSize] = useState(80);

  const [busy, setBusy] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<Row[]>([]);
  const [semantic, setSemantic] = useState<Row[]>([]);
  const [overlap, setOverlap] = useState<number | null>(null);
  const [novelty, setNovelty] = useState<number | null>(null);
  const [embeddedCount, setEmbeddedCount] = useState<number | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("poc-embed", {
        body: { scope: "list_goals" },
      });
      if (error) { toast.error(`Goals: ${error.message}`); return; }
      const list = ((data?.goals || []) as any[]).map((g) => ({
        id: g.id,
        role_title: g.role_title,
        status: g.status,
      }));
      setGoals(list);
      if (!goalId && list.length) setGoalId(list[0].id);
    })();
    refreshEmbedded();
  }, []);

  async function refreshEmbedded() {
    const { count } = await supabase
      .from("poc_candidate_embeddings")
      .select("id", { head: true, count: "exact" });
    setEmbeddedCount(count ?? 0);
  }

  async function embedSample() {
    setBusy("embed-candidates");
    const { data, error } = await supabase.functions.invoke("poc-embed", {
      body: { scope: "candidates", candidate_limit: sampleSize },
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Sample embedded: ${data?.results?.embedded ?? 0} new, ${data?.results?.skipped ?? 0} cached`);
    refreshEmbedded();
  }

  async function embedGoal() {
    if (!goalId) return;
    setBusy("embed-goal");
    const { data, error } = await supabase.functions.invoke("poc-embed", {
      body: { scope: "goals", goal_ids: [goalId] },
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    if (data?.results?.errors?.length) toast.warning(data.results.errors[0].error);
    else toast.success(`Goal embedded`);
  }

  async function runCompare() {
    if (!goalId) return;
    setBusy("run");
    setBaseline([]); setSemantic([]); setOverlap(null); setNovelty(null);

    try {
      // 1) Baseline dry_run
      const { data: bData, error: bErr } = await supabase.functions.invoke("generate-shortlist", {
        body: { hiring_goal_id: goalId, dry_run: true, filters: { limit: Math.max(k, 20) } },
      });
      if (bErr) throw new Error(`baseline: ${bErr.message}`);
      const bList: Row[] = (bData?.shortlist || []).map((r: any) => ({
        candidate_user_id: r.candidate_user_id,
        total_score: r.total_score,
      }));
      setBaseline(bList);

      // 2) Make sure goal is embedded
      await supabase.functions.invoke("poc-embed", { body: { scope: "goals", goal_ids: [goalId] } });

      // 3) In rerank: ensure every baseline candidate is embedded.
      let candidateIds: string[] | null = null;
      if (mode === "rerank") {
        candidateIds = bList.map((r) => r.candidate_user_id);
        if (candidateIds.length) {
          const { data: existing } = await supabase
            .from("poc_candidate_embeddings")
            .select("candidate_user_id")
            .in("candidate_user_id", candidateIds);
          const have = new Set((existing || []).map((r: any) => r.candidate_user_id));
          const missing = candidateIds.filter((id) => !have.has(id));
          if (missing.length) {
            toast.info(`Embedding ${missing.length} missing candidates from baseline…`);
            await supabase.functions.invoke("poc-embed", {
              body: { scope: "candidates", candidate_ids: missing },
            });
          }
        }
      }

      // 4) Semantic match
      const { data: sData, error: sErr } = await supabase.functions.invoke("poc-match", {
        body: {
          hiring_goal_id: goalId,
          mode,
          k,
          candidate_ids: mode === "rerank" ? candidateIds : null,
          baseline_results: bList,
        },
      });
      if (sErr) throw new Error(`semantic: ${sErr.message}`);
      const sList: Row[] = (sData?.results || []) as Row[];
      setSemantic(sList);
      setOverlap(sData?.overlap_count ?? null);
      setNovelty(sData?.novelty_count ?? null);

      // 5) Build display refs
      const refMap: Record<string, string> = {};
      for (const r of [...bList, ...sList]) {
        if (!refMap[r.candidate_user_id]) refMap[r.candidate_user_id] = await md5Hex(r.candidate_user_id);
      }
      setRefs(refMap);
      refreshEmbedded();
    } catch (err: any) {
      toast.error(err?.message || String(err));
    } finally {
      setBusy(null);
    }
  }

  const baselineIds = useMemo(() => new Set(baseline.map((r) => r.candidate_user_id)), [baseline]);
  const semanticIds = useMemo(() => new Set(semantic.map((r) => r.candidate_user_id)), [semantic]);

  function exportCsv() {
    const rows: string[] = ["rank,baseline_ref,baseline_score,semantic_ref,similarity,is_new"];
    const maxN = Math.max(baseline.length, semantic.length);
    for (let i = 0; i < maxN; i++) {
      const b = baseline[i];
      const s = semantic[i];
      const isNew = s ? (!baselineIds.has(s.candidate_user_id) ? "1" : "0") : "";
      rows.push([
        i + 1,
        b ? refs[b.candidate_user_id] : "",
        b?.total_score ?? "",
        s ? refs[s.candidate_user_id] : "",
        s?.similarity != null ? s.similarity.toFixed(4) : "",
        isNew,
      ].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poc-rag-${goalId}-${mode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            PoC RAG matching
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs">Hiring goal</Label>
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger><SelectValue placeholder="Select a goal" /></SelectTrigger>
                <SelectContent>
                  {goals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.role_title || g.id.slice(0, 8)} <span className="opacity-50 ml-2">[{g.status}]</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Modalità</Label>
              <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as Mode)} className="justify-start">
                <ToggleGroupItem value="rerank">Re-rank</ToggleGroupItem>
                <ToggleGroupItem value="discovery">Discovery</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div>
              <Label className="text-xs">K</Label>
              <Input type="number" min={1} max={50} value={k} onChange={(e) => setK(Number(e.target.value) || 10)} />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Sample size (candidati)</Label>
              <Input type="number" min={1} max={500} value={sampleSize} onChange={(e) => setSampleSize(Number(e.target.value) || 80)} className="w-32" />
            </div>
            <Button variant="outline" onClick={embedSample} disabled={!!busy}>
              {busy === "embed-candidates" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              Embed sample
            </Button>
            <Button variant="outline" onClick={embedGoal} disabled={!!busy || !goalId}>
              {busy === "embed-goal" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              Embed goal
            </Button>
            <Button onClick={runCompare} disabled={!!busy || !goalId}>
              {busy === "run" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Run compare
            </Button>
            <Button variant="ghost" onClick={exportCsv} disabled={!baseline.length && !semantic.length}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <div className="ml-auto text-xs text-muted-foreground">
              Pool embeddato: <span className="font-mono">{embeddedCount ?? "…"}</span>
            </div>
          </div>

          {(overlap !== null || novelty !== null) && (
            <div className="flex gap-2 flex-wrap">
              {overlap !== null && <Badge variant="secondary">Overlap top-K: {overlap}</Badge>}
              {mode === "discovery" && novelty !== null && <Badge variant="default">Novelty (NUOVI in semantic): {novelty}</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Shortlist attuale (baseline)</CardTitle></CardHeader>
          <CardContent>
            {baseline.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Nessun risultato. Run compare.</p>
            ) : (
              <ol className="space-y-1 text-sm font-mono">
                {baseline.slice(0, k).map((r, i) => (
                  <li key={r.candidate_user_id} className="flex items-center justify-between">
                    <span>
                      <span className="text-muted-foreground">#{i + 1}</span> {refs[r.candidate_user_id] || "…"}
                    </span>
                    <span className="text-xs text-muted-foreground">score {r.total_score?.toFixed(1)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Shortlist semantica ({mode})</CardTitle></CardHeader>
          <CardContent>
            {semantic.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Nessun risultato.</p>
            ) : (
              <ol className="space-y-1 text-sm font-mono">
                {semantic.map((r, i) => {
                  const isNew = mode === "discovery" && !baselineIds.has(r.candidate_user_id);
                  return (
                    <li key={r.candidate_user_id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="text-muted-foreground">#{i + 1}</span> {refs[r.candidate_user_id] || "…"}
                        {isNew && <Badge variant="default" className="ml-2 text-[10px] py-0">NUOVO</Badge>}
                      </span>
                      <span className="text-xs text-muted-foreground">sim {r.similarity?.toFixed(3)}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
