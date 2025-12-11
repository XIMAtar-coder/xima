import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { field_key } = await req.json();

    if (!field_key) {
      return new Response(
        JSON.stringify({ error: 'Missing field_key parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all scores for this field, grouped by open_key
    const { data: responses, error } = await supabase
      .from('assessment_open_responses')
      .select('open_key, score, rubric')
      .eq('field_key', field_key);

    if (error) {
      console.error('Error fetching responses:', error);
      throw error;
    }

    if (!responses || responses.length === 0) {
      // Return defaults if no data
      return new Response(
        JSON.stringify({
          open1: { avg_score: 65, count: 0, rubric_averages: null },
          open2: { avg_score: 65, count: 0, rubric_averages: null }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate averages for open1 and open2
    const open1Responses = responses.filter(r => r.open_key === 'open1');
    const open2Responses = responses.filter(r => r.open_key === 'open2');

    const calculateAverages = (items: typeof responses) => {
      if (items.length === 0) {
        return { avg_score: 65, count: 0, rubric_averages: null };
      }

      const avgScore = Math.round(items.reduce((sum, r) => sum + (r.score || 0), 0) / items.length);
      
      // Calculate rubric averages
      const rubricTotals: Record<string, number> = {};
      const rubricCounts: Record<string, number> = {};
      
      items.forEach(r => {
        const rubric = r.rubric as Record<string, number> | null;
        if (rubric) {
          ['length', 'relevance', 'structure', 'specificity', 'action'].forEach(key => {
            if (typeof rubric[key] === 'number') {
              rubricTotals[key] = (rubricTotals[key] || 0) + rubric[key];
              rubricCounts[key] = (rubricCounts[key] || 0) + 1;
            }
          });
        }
      });

      const rubricAverages: Record<string, number> = {};
      Object.keys(rubricTotals).forEach(key => {
        rubricAverages[key] = Math.round(rubricTotals[key] / rubricCounts[key]);
      });

      return {
        avg_score: avgScore,
        count: items.length,
        rubric_averages: Object.keys(rubricAverages).length > 0 ? rubricAverages : null
      };
    };

    const result = {
      open1: calculateAverages(open1Responses),
      open2: calculateAverages(open2Responses),
      total_responses: responses.length
    };

    console.log('Field averages calculated:', { field_key, ...result });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-field-averages:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
