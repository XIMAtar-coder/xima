import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Salary benchmarks by country and experience level (simplified dataset)
const benchmarks: Record<string, Record<string, { min: number; max: number; median: number; currency: string }>> = {
  IT: {
    first_time: { min: 25000, max: 35000, median: 30000, currency: 'EUR' },
    independent: { min: 35000, max: 55000, median: 45000, currency: 'EUR' },
    led_others: { min: 55000, max: 85000, median: 70000, currency: 'EUR' },
  },
  DE: {
    first_time: { min: 35000, max: 50000, median: 42000, currency: 'EUR' },
    independent: { min: 50000, max: 75000, median: 62000, currency: 'EUR' },
    led_others: { min: 75000, max: 110000, median: 90000, currency: 'EUR' },
  },
  FR: {
    first_time: { min: 30000, max: 42000, median: 36000, currency: 'EUR' },
    independent: { min: 42000, max: 65000, median: 52000, currency: 'EUR' },
    led_others: { min: 65000, max: 95000, median: 78000, currency: 'EUR' },
  },
  ES: {
    first_time: { min: 22000, max: 32000, median: 27000, currency: 'EUR' },
    independent: { min: 32000, max: 50000, median: 40000, currency: 'EUR' },
    led_others: { min: 50000, max: 75000, median: 62000, currency: 'EUR' },
  },
  UK: {
    first_time: { min: 28000, max: 40000, median: 34000, currency: 'GBP' },
    independent: { min: 40000, max: 65000, median: 52000, currency: 'GBP' },
    led_others: { min: 65000, max: 100000, median: 80000, currency: 'GBP' },
  },
  US: {
    first_time: { min: 50000, max: 75000, median: 62000, currency: 'USD' },
    independent: { min: 75000, max: 120000, median: 95000, currency: 'USD' },
    led_others: { min: 120000, max: 180000, median: 145000, currency: 'USD' },
  },
};

// EU average fallback
const euAverage: Record<string, { min: number; max: number; median: number; currency: string }> = {
  first_time: { min: 28000, max: 40000, median: 34000, currency: 'EUR' },
  independent: { min: 40000, max: 62000, median: 50000, currency: 'EUR' },
  led_others: { min: 62000, max: 92000, median: 75000, currency: 'EUR' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, experience_level } = await req.json();

    console.log(`Fetching salary benchmark for country: ${country}, experience: ${experience_level}`);

    if (!experience_level) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Experience level is required'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const countryCode = country?.toUpperCase();
    let benchmark = benchmarks[countryCode]?.[experience_level];
    let source = 'country';
    let confidence: 'high' | 'medium' | 'low' = 'high';

    if (!benchmark) {
      // Fall back to EU average
      benchmark = euAverage[experience_level];
      source = 'eu_average';
      confidence = 'medium';
    }

    if (!benchmark) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No benchmark data available'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Add some variance based on country data availability
    if (source === 'eu_average') {
      confidence = country ? 'low' : 'medium';
    }

    return new Response(JSON.stringify({
      success: true,
      benchmark: {
        min: benchmark.min,
        max: benchmark.max,
        median: benchmark.median,
        currency: benchmark.currency,
        source,
        confidence,
        country_name: countryCode || 'EU'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in get-salary-benchmark:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch benchmark'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
