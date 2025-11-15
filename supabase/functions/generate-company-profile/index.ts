import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanyData {
  company_id: string;
  company_name: string;
  website: string;
}

interface CompanyProfile {
  summary: string;
  values: string[];
  operating_style: string;
  communication_style: string;
  ideal_traits: string[];
  risk_areas: string[];
  pillar_vector: {
    drive: number;
    comp_power: number;
    communication: number;
    creativity: number;
    knowledge: number;
  };
  recommended_ximatars: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting company profile generation...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { company_id, company_name, website }: CompanyData = await req.json();
    
    if (!company_id || !company_name || !website) {
      throw new Error('Missing required fields: company_id, company_name, website');
    }

    console.log(`Generating profile for: ${company_name} (${website})`);

    // Fetch website content
    let websiteContent = '';
    try {
      const response = await fetch(website, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      websiteContent = await response.text();
      console.log(`Fetched ${websiteContent.length} characters from website`);
    } catch (error) {
      console.error('Error fetching website:', error);
      websiteContent = `Unable to fetch website content for ${website}`;
    }

    // Extract text content (simple HTML stripping)
    const textContent = websiteContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // Limit to first 5000 chars

    console.log(`Extracted ${textContent.length} characters of text content`);

    // Generate company profile using AI analysis
    const profile = await generateCompanyProfile(company_name, website, textContent);

    console.log('Generated profile:', JSON.stringify(profile, null, 2));

    // Store profile in database
    const { data, error } = await supabase
      .from('company_profiles')
      .upsert({
        company_id,
        website,
        summary: profile.summary,
        values: profile.values,
        operating_style: profile.operating_style,
        communication_style: profile.communication_style,
        ideal_traits: profile.ideal_traits,
        risk_areas: profile.risk_areas,
        pillar_vector: profile.pillar_vector,
        recommended_ximatars: profile.recommended_ximatars,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing profile:', error);
      throw error;
    }

    console.log('Successfully stored company profile');

    return new Response(
      JSON.stringify({
        success: true,
        profile: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in generate-company-profile:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});

/**
 * Generate company profile using AI-based analysis
 */
async function generateCompanyProfile(
  companyName: string,
  website: string,
  textContent: string
): Promise<CompanyProfile> {
  console.log('Analyzing company with AI...');

  // Analyze company characteristics from website content
  const analysis = analyzeCompanyContent(companyName, textContent);

  // Generate pillar vector based on company characteristics
  const pillarVector = generatePillarVector(analysis);

  // Determine recommended XIMAtars based on pillar vector
  const recommendedXimatars = determineRecommendedXimatars(pillarVector);

  return {
    summary: analysis.summary,
    values: analysis.values,
    operating_style: analysis.operating_style,
    communication_style: analysis.communication_style,
    ideal_traits: analysis.ideal_traits,
    risk_areas: analysis.risk_areas,
    pillar_vector: pillarVector,
    recommended_ximatars: recommendedXimatars
  };
}

/**
 * Analyze company content and extract key characteristics
 */
function analyzeCompanyContent(companyName: string, content: string): any {
  const lowerContent = content.toLowerCase();

  // Detect industry and sector
  const isTech = /technology|software|digital|ai|data|cloud|saas|platform/gi.test(content);
  const isConsulting = /consulting|advisory|strategy|professional services/gi.test(content);
  const isFinance = /finance|banking|investment|financial services/gi.test(content);
  const isCreative = /design|creative|marketing|advertising|brand/gi.test(content);
  const isManufacturing = /manufacturing|production|industrial|engineering/gi.test(content);

  // Detect company values
  const values: string[] = [];
  if (/innovation|innovative|cutting-edge/gi.test(content)) values.push('Innovation');
  if (/quality|excellence|precision/gi.test(content)) values.push('Quality Excellence');
  if (/team|collaboration|together/gi.test(content)) values.push('Collaboration');
  if (/customer|client|service/gi.test(content)) values.push('Customer Focus');
  if (/integrity|trust|honest/gi.test(content)) values.push('Integrity');
  if (/growth|learning|development/gi.test(content)) values.push('Continuous Learning');
  if (/sustainability|environment|green/gi.test(content)) values.push('Sustainability');

  // Generate summary based on detected characteristics
  let summary = `${companyName} is a `;
  if (isTech) summary += 'technology-driven company focusing on innovation and digital solutions. ';
  else if (isConsulting) summary += 'professional services firm providing strategic advisory and consulting. ';
  else if (isFinance) summary += 'financial services organization delivering value to clients through expertise. ';
  else if (isCreative) summary += 'creative organization focused on design, branding, and marketing excellence. ';
  else if (isManufacturing) summary += 'industrial company specializing in production and engineering. ';
  else summary += 'company dedicated to delivering exceptional results. ';

  summary += `The organization values ${values.slice(0, 3).join(', ')} and seeks professionals who align with these principles.`;

  // Determine operating style
  let operating_style = 'Dynamic and Adaptive';
  if (isTech) operating_style = 'Agile and Innovation-Driven';
  else if (isConsulting) operating_style = 'Strategic and Client-Focused';
  else if (isFinance) operating_style = 'Structured and Compliance-Oriented';
  else if (isCreative) operating_style = 'Creative and Collaborative';

  // Determine communication style
  let communication_style = 'Professional and Clear';
  if (isTech) communication_style = 'Direct and Data-Driven';
  else if (isConsulting) communication_style = 'Consultative and Persuasive';
  else if (isCreative) communication_style = 'Visual and Storytelling';

  // Generate ideal traits
  const ideal_traits: string[] = [];
  if (isTech) {
    ideal_traits.push('Technical proficiency', 'Problem-solving mindset', 'Continuous learner');
  } else if (isConsulting) {
    ideal_traits.push('Analytical thinking', 'Client relationship skills', 'Strategic mindset');
  } else if (isCreative) {
    ideal_traits.push('Creative thinking', 'Attention to detail', 'Collaborative spirit');
  } else {
    ideal_traits.push('Adaptability', 'Strong work ethic', 'Team player');
  }

  // Generate risk areas
  const risk_areas: string[] = [];
  if (isTech) risk_areas.push('May struggle with highly structured, non-technical roles');
  if (isConsulting) risk_areas.push('High-pressure environment may not suit all candidates');
  if (values.includes('Innovation')) risk_areas.push('Traditional, risk-averse candidates may not thrive');

  return {
    summary,
    values: values.length > 0 ? values : ['Excellence', 'Teamwork', 'Integrity'],
    operating_style,
    communication_style,
    ideal_traits: ideal_traits.length > 0 ? ideal_traits : ['Reliability', 'Communication', 'Adaptability'],
    risk_areas: risk_areas.length > 0 ? risk_areas : ['Fast-paced environment requires flexibility']
  };
}

/**
 * Generate pillar vector based on company analysis
 */
function generatePillarVector(analysis: any): {
  drive: number;
  comp_power: number;
  communication: number;
  creativity: number;
  knowledge: number;
} {
  const vector = {
    drive: 60,
    comp_power: 60,
    communication: 60,
    creativity: 60,
    knowledge: 60
  };

  // Adjust based on operating style
  const style = analysis.operating_style.toLowerCase();
  if (style.includes('agile') || style.includes('innovation')) {
    vector.drive += 15;
    vector.comp_power += 10;
    vector.creativity += 15;
  }
  if (style.includes('strategic')) {
    vector.knowledge += 15;
    vector.communication += 10;
  }
  if (style.includes('creative')) {
    vector.creativity += 20;
    vector.communication += 10;
  }
  if (style.includes('structured')) {
    vector.comp_power += 15;
    vector.knowledge += 10;
  }

  // Adjust based on values
  if (analysis.values.includes('Innovation')) {
    vector.creativity += 10;
    vector.comp_power += 5;
  }
  if (analysis.values.includes('Collaboration')) {
    vector.communication += 10;
    vector.drive += 5;
  }
  if (analysis.values.includes('Quality Excellence')) {
    vector.knowledge += 10;
    vector.comp_power += 5;
  }

  // Normalize to 0-100 range
  Object.keys(vector).forEach(key => {
    vector[key as keyof typeof vector] = Math.min(95, Math.max(40, vector[key as keyof typeof vector]));
  });

  return vector;
}

/**
 * Determine recommended XIMAtars based on pillar vector
 */
function determineRecommendedXimatars(pillarVector: any): string[] {
  const ximatars: { name: string; score: number }[] = [];

  // XIMAtar vectors (from the database)
  const ximatarVectors: Record<string, any> = {
    lion: { drive: 95, comp_power: 70, communication: 85, creativity: 60, knowledge: 65 },
    fox: { creativity: 95, communication: 88, drive: 70, comp_power: 60, knowledge: 55 },
    dolphin: { communication: 95, creativity: 80, drive: 60, comp_power: 50, knowledge: 50 },
    cat: { comp_power: 90, creativity: 85, communication: 55, drive: 65, knowledge: 75 },
    bear: { knowledge: 90, drive: 85, communication: 55, comp_power: 60, creativity: 40 },
    bee: { drive: 92, communication: 70, comp_power: 55, creativity: 35, knowledge: 65 },
    wolf: { comp_power: 75, drive: 88, knowledge: 70, communication: 60, creativity: 45 },
    owl: { knowledge: 98, comp_power: 90, communication: 55, creativity: 60, drive: 50 },
    parrot: { communication: 98, creativity: 75, drive: 55, comp_power: 50, knowledge: 45 },
    elephant: { knowledge: 95, communication: 65, drive: 60, comp_power: 55, creativity: 45 },
    horse: { drive: 90, knowledge: 60, communication: 70, comp_power: 55, creativity: 40 },
    chameleon: { creativity: 88, communication: 82, knowledge: 70, comp_power: 65, drive: 50 }
  };

  // Calculate distance to each XIMAtar
  for (const [name, vector] of Object.entries(ximatarVectors)) {
    const distance = Math.sqrt(
      Math.pow(pillarVector.drive - vector.drive, 2) +
      Math.pow(pillarVector.comp_power - vector.comp_power, 2) +
      Math.pow(pillarVector.communication - vector.communication, 2) +
      Math.pow(pillarVector.creativity - vector.creativity, 2) +
      Math.pow(pillarVector.knowledge - vector.knowledge, 2)
    );
    ximatars.push({ name, score: 100 - distance });
  }

  // Sort by score and return top 3
  ximatars.sort((a, b) => b.score - a.score);
  return ximatars.slice(0, 3).map(x => x.name);
}
