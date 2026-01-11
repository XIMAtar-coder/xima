/**
 * Synonym Map for Skill/Keyword Matching
 * 
 * Maps variations to canonical terms for better matching accuracy.
 * All keys and values should be lowercase.
 */

export const SYNONYM_MAP: Record<string, string[]> = {
  // CRM & Sales
  'crm': ['salesforce', 'hubspot', 'pipedrive', 'zoho', 'customer relationship'],
  'sales': ['selling', 'revenue', 'deals', 'closing', 'business development', 'bd'],
  'account management': ['account exec', 'account executive', 'am', 'client management'],
  
  // Data & Analytics
  'data engineering': ['etl', 'data pipeline', 'data warehouse', 'airflow', 'spark', 'hadoop'],
  'data analysis': ['analytics', 'bi', 'business intelligence', 'tableau', 'power bi', 'looker'],
  'data science': ['machine learning', 'ml', 'ai', 'predictive', 'modeling'],
  'sql': ['database', 'postgres', 'mysql', 'oracle', 'query'],
  
  // Engineering & Development
  'software engineering': ['software development', 'programming', 'coding', 'developer'],
  'frontend': ['front-end', 'ui', 'user interface', 'react', 'vue', 'angular', 'javascript'],
  'backend': ['back-end', 'server', 'api', 'node', 'python', 'java', 'go'],
  'fullstack': ['full-stack', 'full stack', 'end-to-end'],
  'devops': ['sre', 'site reliability', 'infrastructure', 'ci/cd', 'kubernetes', 'docker'],
  'cloud': ['aws', 'azure', 'gcp', 'google cloud', 'cloud computing'],
  
  // Product & Design
  'product management': ['product owner', 'pm', 'product lead', 'product strategy'],
  'ux': ['user experience', 'usability', 'ux design', 'user research'],
  'ui design': ['visual design', 'graphic design', 'interface design'],
  'design': ['creative', 'visual', 'graphics', 'brand design'],
  
  // Marketing
  'marketing': ['growth', 'demand generation', 'acquisition', 'brand'],
  'content': ['copywriting', 'content marketing', 'blog', 'editorial'],
  'seo': ['search optimization', 'organic', 'search engine'],
  'paid media': ['ppc', 'paid advertising', 'google ads', 'facebook ads', 'sem'],
  'social media': ['social', 'community', 'instagram', 'linkedin', 'twitter'],
  
  // Leadership & Management
  'leadership': ['lead', 'leader', 'management', 'director', 'head of'],
  'team management': ['people management', 'team lead', 'managing', 'supervisor'],
  'strategy': ['strategic', 'planning', 'roadmap', 'vision'],
  'executive': ['c-level', 'ceo', 'cto', 'cfo', 'coo', 'vp', 'vice president'],
  
  // Operations & Process
  'operations': ['ops', 'operational', 'processes', 'efficiency'],
  'project management': ['pm', 'pmp', 'scrum', 'agile', 'jira', 'project lead'],
  'process improvement': ['lean', 'six sigma', 'optimization', 'kaizen'],
  'supply chain': ['logistics', 'procurement', 'inventory', 'sourcing'],
  
  // Finance & Compliance
  'finance': ['financial', 'accounting', 'fp&a', 'budgeting'],
  'compliance': ['regulatory', 'audit', 'governance', 'risk management'],
  'legal': ['contracts', 'legal counsel', 'attorney', 'law'],
  
  // HR & People
  'hr': ['human resources', 'people ops', 'talent', 'recruiting'],
  'recruiting': ['talent acquisition', 'hiring', 'sourcing candidates'],
  'training': ['learning', 'development', 'l&d', 'coaching'],
  
  // Customer Success
  'customer success': ['cs', 'client success', 'customer experience', 'cx'],
  'support': ['customer support', 'help desk', 'service desk', 'customer service'],
  
  // Industry Terms
  'saas': ['software as a service', 'cloud software', 'subscription'],
  'b2b': ['business to business', 'enterprise', 'corporate'],
  'b2c': ['consumer', 'retail', 'direct to consumer', 'dtc'],
  'fintech': ['financial technology', 'payments', 'banking tech'],
  'healthtech': ['healthcare technology', 'medtech', 'digital health'],
  'edtech': ['education technology', 'elearning', 'e-learning'],
  'ecommerce': ['e-commerce', 'online retail', 'digital commerce'],
  
  // Soft Skills
  'communication': ['verbal', 'written', 'presentation', 'public speaking'],
  'collaboration': ['teamwork', 'cross-functional', 'cooperative'],
  'problem solving': ['analytical', 'critical thinking', 'troubleshooting'],
  'adaptability': ['flexible', 'agile mindset', 'change management'],
};

/**
 * Expand a term to include all synonyms
 */
export function expandWithSynonyms(term: string): string[] {
  const normalized = term.toLowerCase().trim();
  const results = [normalized];
  
  // Check if term is a canonical key
  if (SYNONYM_MAP[normalized]) {
    results.push(...SYNONYM_MAP[normalized]);
  }
  
  // Check if term is a synonym value
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    if (synonyms.some(s => s.includes(normalized) || normalized.includes(s))) {
      results.push(canonical, ...synonyms);
    }
  }
  
  return [...new Set(results)];
}

/**
 * Tokenize text into normalized terms
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s\-\/]/g, ' ') // Keep hyphens and slashes
    .split(/\s+/)
    .filter(t => t.length > 2) // Skip very short tokens
    .filter(t => !STOP_WORDS.has(t));
}

/**
 * Tokenize and expand with synonyms
 */
export function tokenizeAndExpand(text: string): string[] {
  const tokens = tokenize(text);
  const expanded: string[] = [];
  
  for (const token of tokens) {
    expanded.push(...expandWithSynonyms(token));
  }
  
  return [...new Set(expanded)];
}

/**
 * Common stop words to filter out
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
  'now', 'here', 'there', 'then', 'once', 'any', 'our', 'your', 'their',
  'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
]);
