import { supabase } from '@/integrations/supabase/client';

export type Pillars = {
  comp_power: number;
  communication: number;
  knowledge: number;
  creativity: number;
  drive: number;
};

export type XimatarRow = {
  id: string;
  label: string;
  image_url: string | null;
  vector: Pillars;
};

function cosine(a: Pillars, b: Pillars): number {
  const ax = [a.comp_power, a.communication, a.knowledge, a.creativity, a.drive];
  const bx = [b.comp_power, b.communication, b.knowledge, b.creativity, b.drive];
  const dot = ax.reduce((s, v, i) => s + v * bx[i], 0);
  const na = Math.sqrt(ax.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(bx.reduce((s, v) => s + v * v, 0));
  return na && nb ? dot / (na * nb) : 0;
}

export function rankXimatars(user: Pillars, types: XimatarRow[]) {
  const scored = types.map(t => ({ ...t, similarity: cosine(user, t.vector) }));
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored;
}

export function pickXimatar(user: Pillars, types: XimatarRow[]) {
  const ranked = rankXimatars(user, types);
  const best = ranked[0];
  const top3 = ranked.slice(0, 3).map(r => ({ label: r.label, score: Number(r.similarity.toFixed(4)) }));
  return { best, top3 };
}

export async function assignAndPersistXimatar({
  userId,
  fieldKey,
  language,
  pillars
}: {
  userId: string;
  fieldKey: 'science_tech' | 'business_leadership' | 'arts_creative' | 'service_ops';
  language: 'it' | 'en' | 'es';
  pillars: Pillars;
}) {
  // 1) Fetch XIMAtar archetypes
  const { data: types, error: typesErr } = await supabase
    .from('ximatars')
    .select('id, label, image_url, vector');
  
  if (typesErr || !types || !types.length) {
    throw new Error('XIMAtar types missing');
  }

  // 2) Pick best match and top 3
  const { best, top3 } = pickXimatar(pillars, types.map(t => ({ ...t, vector: t.vector as Pillars })));

  // 3) Write assessment result history
  const { data: resRow, error: resErr } = await supabase
    .from('assessment_results')
    .insert([{
      user_id: userId,
      assessment_id: null, // Legacy field, can be null
      field_key: fieldKey,
      language,
      pillars,
      top3,
      ximatar_id: best.id,
      total_score: Object.values(pillars).reduce((sum, v) => sum + v, 0),
      rationale: { algorithm: 'cosine_similarity', version: '1.0' }
    }])
    .select()
    .single();

  if (resErr) {
    console.warn('Failed to save assessment result:', resErr);
  }

  // 4) Set permanent assignment on profile if not already assigned
  const { data: profile } = await supabase
    .from('profiles')
    .select('ximatar')
    .eq('user_id', userId)
    .single();

  if (!profile?.ximatar) {
    await supabase
      .from('profiles')
      .update({
        ximatar: best.label as any,
        ximatar_assigned_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  }

  return { assigned: best, top3, resultId: resRow?.id };
}
