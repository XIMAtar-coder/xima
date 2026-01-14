/**
 * Job Post Text Normalization - Strict 3-Phase Pipeline
 * PHASE 1: Hard Structure Extraction (no rewrite)
 * PHASE 2: Structure Validation (blocker)
 * PHASE 3: Candidate-Friendly Rewrite (only if valid)
 */

// ============= Constants =============

const MAX_BULLET_LENGTH = 140;
const MIN_BULLET_COUNT = 3;
const METADATA_SCAN_LINES = 30;

// ============= Types =============

export interface JobMetadata {
  company: string | null;
  location: string | null;
  contractType: string | null;
  department: string | null;
  reportingLine: string | null;
  employmentType: string | null;
  seniority: string | null;
  salaryRange: string | null;
}

export interface RawSections {
  companyOverview: string[];
  positionSummary: string[];
  responsibilities: string[];
  requirementsMust: string[];
  requirementsNice: string[];
  competencies: string[];
  benefits: string[];
  unclassified: string[];
}

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
  needsManualReview: boolean;
}

export interface ContentBlock {
  type: 'intro' | 'section';
  title: string;
  body?: string[];
  bullets?: string[];
}

export interface JobContentBlocks {
  hero: {
    title: string | null;
    company: string | null;
    location: string | null;
    employmentType: string | null;
    seniority: string | null;
    department: string | null;
  };
  blocks: ContentBlock[];
  validation: ValidationResult;
}

export interface NormalizedJobPost {
  title: string;
  description: string;
  responsibilities: string | null;
  requirements_must: string | null;
  requirements_nice: string | null;
  benefits: string | null;
  location: string | null;
  employment_type: string | null;
  seniority: string | null;
  department: string | null;
  salary_range: string | null;
  content_json: JobContentBlocks;
  content_html: string;
}

export interface CleanedPreview {
  title: string | null;
  meta: {
    company: string | null;
    location: string | null;
    contract_type: string | null;
    department: string | null;
  };
  sections: {
    has_overview: boolean;
    has_summary: boolean;
    responsibilities_count: number;
    must_count: number;
    nice_count: number;
    benefits_count: number;
  };
  blocks_count: number;
  extracted_text_length: number;
  quality_check: ValidationResult;
}

// ============= PHASE 1: HARD STRUCTURE EXTRACTION =============

/**
 * Step 1.1: Basic text cleanup (NO rewriting, just normalization)
 */
function cleanRawText(text: string): string {
  return text
    // Remove page markers
    .replace(/---\s*PAGE\s*---/gi, '\n')
    // Remove PDF artifacts
    .replace(/%\s*PDF[^\n]*/gi, '')
    .replace(/<<[^>]*>>/g, '')
    .replace(/\/[A-Z][a-z]*\s+\d+/g, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Fix double bullets
    .replace(/•\s*•/g, '•')
    // Normalize spaces within lines
    .split('\n')
    .map(line => line.replace(/\s{2,}/g, ' ').trim())
    .join('\n')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Step 1.2: TITLE EXTRACTION (MANDATORY - strict rules)
 */
interface TitleExtractionResult {
  title: string | null;
  titleLine: number;
  textWithoutTitle: string;
}

function extractTitle(text: string): TitleExtractionResult {
  const lines = text.split('\n');
  let extractedTitle: string | null = null;
  let titleLineIndex = -1;

  console.log('[extractTitle] Scanning', lines.length, 'lines for title');

  // Rule 1: Standalone ALL CAPS line ≤ 6 words (most reliable)
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Skip metadata lines
    if (/^(company|location|department|contract|employment|reporting|sede|azienda)[\s:]/i.test(line)) {
      continue;
    }
    
    // Check for ALL CAPS title
    const words = line.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 1 && words.length <= 6) {
      const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line);
      const hasNoColons = !line.includes(':');
      
      if (isAllCaps && hasNoColons && line.length >= 5 && line.length <= 80) {
        extractedTitle = line;
        titleLineIndex = i;
        console.log('[extractTitle] Rule 1 match (ALL CAPS):', extractedTitle);
        break;
      }
    }
  }

  // Rule 2: Line starting with "Job Title:" or similar
  if (!extractedTitle) {
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].trim();
      const match = line.match(/^(?:job\s*title|position|role|titolo|posizione)\s*[:：]\s*(.+)/i);
      if (match && match[1]) {
        extractedTitle = match[1].trim();
        titleLineIndex = i;
        console.log('[extractTitle] Rule 2 match (labeled):', extractedTitle);
        break;
      }
    }
  }

  // Rule 3: First strong noun phrase before metadata
  if (!extractedTitle) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Skip if this looks like metadata
      if (/^(company|location|department|contract|employment|sede|azienda)[\s:]/i.test(line)) {
        continue;
      }
      
      // Skip if it's a section header
      if (/^(about|overview|summary|responsibilities|requirements|qualifications)/i.test(line)) {
        continue;
      }
      
      // Accept as title if it's a short, capitalized phrase
      const words = line.split(/\s+/);
      if (words.length >= 1 && words.length <= 8 && line.length >= 5 && line.length <= 100) {
        const startsWithCap = /^[A-Z]/.test(line);
        const noColon = !line.includes(':');
        const noBullet = !line.startsWith('•') && !line.startsWith('-');
        
        if (startsWithCap && noColon && noBullet) {
          extractedTitle = line;
          titleLineIndex = i;
          console.log('[extractTitle] Rule 3 match (noun phrase):', extractedTitle);
          break;
        }
      }
    }
  }

  // Normalize title to Title Case if ALL CAPS
  if (extractedTitle && extractedTitle === extractedTitle.toUpperCase()) {
    extractedTitle = toTitleCase(extractedTitle);
  }

  // Remove title line from text
  let textWithoutTitle = text;
  if (titleLineIndex >= 0) {
    const resultLines = [...lines];
    resultLines.splice(titleLineIndex, 1);
    textWithoutTitle = resultLines.join('\n').trim();
  }

  return {
    title: extractedTitle,
    titleLine: titleLineIndex,
    textWithoutTitle,
  };
}

function toTitleCase(str: string): string {
  const minorWords = ['and', 'or', 'the', 'a', 'an', 'of', 'for', 'to', 'in', 'on', 'at', 'by'];
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index > 0 && minorWords.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Step 1.3: METADATA EXTRACTION (from first N lines only)
 */
interface MetadataExtractionResult {
  metadata: JobMetadata;
  textWithoutMetadata: string;
  extractedLineSignatures: Set<string>;
}

function extractMetadata(text: string): MetadataExtractionResult {
  const lines = text.split('\n');
  const metadata: JobMetadata = {
    company: null,
    location: null,
    contractType: null,
    department: null,
    reportingLine: null,
    employmentType: null,
    seniority: null,
    salaryRange: null,
  };

  const patterns: { regex: RegExp; key: keyof JobMetadata }[] = [
    { regex: /^company\s*[:：]\s*(.+)/i, key: 'company' },
    { regex: /^azienda\s*[:：]\s*(.+)/i, key: 'company' },
    { regex: /^location\s*[:：]\s*(.+)/i, key: 'location' },
    { regex: /^sede\s*[:：]\s*(.+)/i, key: 'location' },
    { regex: /^contract\s*type\s*[:：]\s*(.+)/i, key: 'contractType' },
    { regex: /^tipo\s*contratto\s*[:：]\s*(.+)/i, key: 'contractType' },
    { regex: /^employment\s*type\s*[:：]\s*(.+)/i, key: 'employmentType' },
    { regex: /^department\s*[:：]\s*(.+)/i, key: 'department' },
    { regex: /^team\s*[:：]\s*(.+)/i, key: 'department' },
    { regex: /^area\s*[:：]\s*(.+)/i, key: 'department' },
    { regex: /^reporting\s*(?:line|to)\s*[:：]\s*(.+)/i, key: 'reportingLine' },
    { regex: /^reports\s*to\s*[:：]\s*(.+)/i, key: 'reportingLine' },
    { regex: /^seniority\s*[:：]\s*(.+)/i, key: 'seniority' },
    { regex: /^experience\s*(?:level)?\s*[:：]\s*(.+)/i, key: 'seniority' },
    { regex: /^esperienza\s*[:：]\s*(.+)/i, key: 'seniority' },
    { regex: /^salary\s*(?:range)?\s*[:：]\s*(.+)/i, key: 'salaryRange' },
    { regex: /^compensation\s*[:：]\s*(.+)/i, key: 'salaryRange' },
    { regex: /^ral\s*[:：]\s*(.+)/i, key: 'salaryRange' },
  ];

  const extractedLineSignatures = new Set<string>();
  const linesToRemove = new Set<number>();

  // Extract from first N lines only
  const scanLimit = Math.min(METADATA_SCAN_LINES, lines.length);
  for (let i = 0; i < scanLimit; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (const { regex, key } of patterns) {
      const match = line.match(regex);
      if (match && match[1] && !metadata[key]) {
        metadata[key] = match[1].trim();
        linesToRemove.add(i);
        extractedLineSignatures.add(normalizeForMatch(line));
        console.log(`[extractMetadata] Found ${key}:`, metadata[key]);
        break;
      }
    }
  }

  // Detect employment type from text patterns
  if (!metadata.employmentType) {
    const fullText = text.toLowerCase();
    if (fullText.includes('full-time') || fullText.includes('full time') || fullText.includes('tempo pieno')) {
      metadata.employmentType = 'Full-Time';
    } else if (fullText.includes('part-time') || fullText.includes('part time')) {
      metadata.employmentType = 'Part-Time';
    }
  }

  // Remove metadata lines AND any later occurrences
  const cleanedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalized = normalizeForMatch(line.trim());
    
    // Remove if marked for removal or if it's a duplicate metadata line
    if (linesToRemove.has(i) || extractedLineSignatures.has(normalized)) {
      continue;
    }
    
    // Also remove later metadata-pattern matches
    let isMetadataLine = false;
    for (const { regex, key } of patterns) {
      if (regex.test(line.trim()) && metadata[key]) {
        isMetadataLine = true;
        break;
      }
    }
    
    if (!isMetadataLine) {
      cleanedLines.push(line);
    }
  }

  return {
    metadata,
    textWithoutMetadata: cleanedLines.join('\n').trim(),
    extractedLineSignatures,
  };
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Step 1.4: SECTION ISOLATION (NO rewriting)
 */
type SectionKey = keyof RawSections;

interface SectionPattern {
  key: SectionKey;
  patterns: RegExp[];
}

const SECTION_PATTERNS: SectionPattern[] = [
  {
    key: 'companyOverview',
    patterns: [
      /^company\s*overview$/i,
      /^about\s*(us|the\s*company)$/i,
      /^chi\s*siamo$/i,
      /^l[']?azienda$/i,
      /^our\s*company$/i,
    ]
  },
  {
    key: 'positionSummary',
    patterns: [
      /^position\s*summary$/i,
      /^job\s*summary$/i,
      /^role\s*(summary|overview|description)$/i,
      /^overview$/i,
      /^summary$/i,
      /^the\s*role$/i,
      /^about\s*the\s*(role|position)$/i,
      /^descrizione\s*(del\s*)?(ruolo|posizione)$/i,
    ]
  },
  {
    key: 'responsibilities',
    patterns: [
      /^(key\s*)?responsibilities$/i,
      /^duties$/i,
      /^what\s*you.ll\s*do$/i,
      /^your\s*responsibilities$/i,
      /^mansioni$/i,
      /^compiti$/i,
      /^attivit[aà]$/i,
      /^cosa\s*farai$/i,
    ]
  },
  {
    key: 'requirementsMust',
    patterns: [
      /^required\s*qualifications$/i,
      /^requirements$/i,
      /^must\s*have$/i,
      /^qualifications$/i,
      /^what\s*we\s*(need|require|look\s*for)$/i,
      /^your\s*(profile|qualifications)$/i,
      /^requisiti\s*(richiesti|obbligatori)?$/i,
      /^profilo\s*ricercato$/i,
    ]
  },
  {
    key: 'requirementsNice',
    patterns: [
      /^preferred\s*qualifications$/i,
      /^nice\s*to\s*have$/i,
      /^preferred$/i,
      /^bonus\s*(qualifications)?$/i,
      /^plus$/i,
      /^desirable$/i,
      /^requisiti\s*preferenziali$/i,
      /^graditi$/i,
    ]
  },
  {
    key: 'competencies',
    patterns: [
      /^(professional\s*)?competencies$/i,
      /^skills$/i,
      /^key\s*skills$/i,
      /^competenze$/i,
    ]
  },
  {
    key: 'benefits',
    patterns: [
      /^what\s*we\s*offer$/i,
      /^benefits$/i,
      /^perks$/i,
      /^our\s*offer$/i,
      /^we\s*offer$/i,
      /^offriamo$/i,
      /^vantaggi$/i,
      /^cosa\s*offriamo$/i,
    ]
  },
];

function detectSectionHeader(line: string): SectionKey | null {
  const trimmed = line.trim();
  for (const { key, patterns } of SECTION_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return key;
      }
    }
  }
  return null;
}

function isolateSections(text: string, title: string | null): RawSections {
  const sections: RawSections = {
    companyOverview: [],
    positionSummary: [],
    responsibilities: [],
    requirementsMust: [],
    requirementsNice: [],
    competencies: [],
    benefits: [],
    unclassified: [],
  };

  const lines = text.split('\n');
  let currentSection: SectionKey = 'unclassified';
  
  console.log('[isolateSections] Processing', lines.length, 'lines');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines (but keep structure)
    if (!trimmed) continue;
    
    // Skip if this is the title
    if (title && normalizeForMatch(trimmed) === normalizeForMatch(title)) {
      continue;
    }

    // Check if this line is a section header
    const detectedSection = detectSectionHeader(trimmed);
    if (detectedSection) {
      currentSection = detectedSection;
      console.log('[isolateSections] Switched to section:', currentSection);
      continue; // Don't include header in content
    }

    // Add line to current section
    sections[currentSection].push(trimmed);
  }

  // Log section sizes
  console.log('[isolateSections] Section sizes:', {
    companyOverview: sections.companyOverview.length,
    positionSummary: sections.positionSummary.length,
    responsibilities: sections.responsibilities.length,
    requirementsMust: sections.requirementsMust.length,
    requirementsNice: sections.requirementsNice.length,
    competencies: sections.competencies.length,
    benefits: sections.benefits.length,
    unclassified: sections.unclassified.length,
  });

  return sections;
}

// ============= PHASE 2: STRUCTURE VALIDATION =============

function validateStructure(
  title: string | null,
  metadata: JobMetadata,
  sections: RawSections
): ValidationResult {
  const reasons: string[] = [];

  // Rule 1: Title must exist
  if (!title) {
    reasons.push('Missing job title - could not extract from document');
  }

  // Rule 2: Check for metadata pollution in intro sections
  if (metadata.company) {
    const companyNorm = normalizeForMatch(metadata.company);
    const introText = [...sections.companyOverview, ...sections.positionSummary].join(' ');
    const introNorm = normalizeForMatch(introText);
    
    // Count occurrences (allow 1 mention, flag if more)
    const occurrences = (introNorm.match(new RegExp(companyNorm, 'g')) || []).length;
    if (occurrences > 1) {
      reasons.push(`Company name "${metadata.company}" appears ${occurrences} times in intro`);
    }
  }

  if (metadata.location) {
    const locationNorm = normalizeForMatch(metadata.location);
    const introText = [...sections.companyOverview, ...sections.positionSummary].join(' ');
    if (normalizeForMatch(introText).includes(locationNorm)) {
      // This is just a warning, not a blocker
      console.log('[validateStructure] Warning: Location appears in intro text');
    }
  }

  // Rule 3: Responsibilities must have minimum bullets
  const respBullets = countBulletCandidates(sections.responsibilities);
  if (respBullets < MIN_BULLET_COUNT) {
    reasons.push(`Responsibilities has only ${respBullets} bullets (need ${MIN_BULLET_COUNT}+)`);
  }

  // Rule 4: Requirements must have minimum bullets
  const mustBullets = countBulletCandidates(sections.requirementsMust);
  const compBullets = countBulletCandidates(sections.competencies);
  const totalMust = mustBullets + compBullets;
  if (totalMust < MIN_BULLET_COUNT) {
    reasons.push(`Requirements has only ${totalMust} bullets (need ${MIN_BULLET_COUNT}+)`);
  }

  const valid = reasons.length === 0;
  
  console.log('[validateStructure] Validation result:', { valid, reasons });

  return {
    valid,
    reasons,
    needsManualReview: !valid,
  };
}

function countBulletCandidates(lines: string[]): number {
  return lines.filter(line => {
    const trimmed = line.trim();
    // Count lines that look like bullets or could become bullets
    return trimmed.startsWith('•') || 
           trimmed.startsWith('-') || 
           trimmed.startsWith('*') ||
           /^\d+[.)]\s/.test(trimmed) ||
           (trimmed.length >= 10 && trimmed.length <= 200);
  }).length;
}

// ============= PHASE 3: CANDIDATE-FRIENDLY REWRITE (only if valid) =============

function rewriteIntroSection(
  companyOverview: string[],
  positionSummary: string[],
  metadata: JobMetadata
): string[] {
  const paragraphs: string[] = [];

  // Remove metadata pollution from text
  const cleanLine = (line: string): string => {
    let clean = line;
    if (metadata.company) {
      // Remove company name if it's just repeated
      const companyPattern = new RegExp(`^${escapeRegex(metadata.company)}[.,:;]?\s*`, 'i');
      clean = clean.replace(companyPattern, '');
    }
    return clean.trim();
  };

  // Process company overview
  if (companyOverview.length > 0) {
    const cleaned = companyOverview
      .map(cleanLine)
      .filter(l => l.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleaned.length > 0) {
      paragraphs.push(cleaned);
    }
  }

  // Process position summary with candidate-friendly rewrite
  if (positionSummary.length > 0) {
    let summary = positionSummary
      .map(cleanLine)
      .filter(l => l.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Convert corporate speak to direct language
    summary = summary
      .replace(/The\s+(successful\s+)?(candidate|employee|hire|person|applicant)\s+will/gi, 'You will')
      .replace(/The\s+(successful\s+)?(candidate|applicant)\s+is\s+responsible\s+for/gi, "You'll be responsible for")
      .replace(/This\s+(role|position)\s+is\s+responsible\s+for/gi, "You'll be responsible for")
      .replace(/This\s+role\s+requires/gi, "You'll need")
      .replace(/The\s+role\s+involves/gi, "You'll")
      .replace(/is\s+a\s+key\s+contributor\s+within/gi, 'play a key role in')
      .replace(/\bHe\s*\/\s*She\s+will/gi, 'You will')
      .replace(/\bHe\s+or\s+she\s+will/gi, 'You will');

    if (summary.length > 0) {
      paragraphs.push(summary);
    }
  }

  // Limit paragraphs and length
  return paragraphs.slice(0, 3).map(p => {
    if (p.length > 500) {
      // Split at sentence boundary
      const sentences = p.match(/[^.!?]+[.!?]+/g) || [p];
      let result = '';
      for (const s of sentences) {
        if ((result + s).length <= 450) {
          result += s;
        } else {
          break;
        }
      }
      return result.trim() || p.substring(0, 450) + '...';
    }
    return p;
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatBullets(lines: string[]): string[] {
  const bullets: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    let bullet = line.trim();
    
    // Remove existing bullet markers
    bullet = bullet.replace(/^[•●○◦▪▫■□►▸→➤\-–—*]\s*/, '');
    bullet = bullet.replace(/^\d+[.)]\s*/, '');
    
    if (bullet.length < 5) continue;

    // Capitalize first letter
    bullet = bullet.charAt(0).toUpperCase() + bullet.slice(1);

    // Truncate if too long
    if (bullet.length > MAX_BULLET_LENGTH) {
      const lastSpace = bullet.lastIndexOf(' ', MAX_BULLET_LENGTH - 3);
      bullet = bullet.substring(0, lastSpace > 80 ? lastSpace : MAX_BULLET_LENGTH - 3) + '...';
    }

    // Deduplicate
    const normalized = normalizeForMatch(bullet);
    if (normalized.length > 3 && !seen.has(normalized)) {
      seen.add(normalized);
      bullets.push(bullet);
    }
  }

  return bullets;
}

function formatResponsibilitiesWithVerbs(lines: string[]): string[] {
  const bullets = formatBullets(lines);
  
  // Ensure bullets start with action verbs where possible
  return bullets.map(bullet => {
    if (bullet.toLowerCase().startsWith('responsibility for ')) {
      return 'Manage ' + bullet.substring(19);
    }
    if (bullet.toLowerCase().startsWith('management of ')) {
      return 'Manage ' + bullet.substring(14);
    }
    if (bullet.toLowerCase().startsWith('development of ')) {
      return 'Develop ' + bullet.substring(15);
    }
    if (bullet.toLowerCase().startsWith('coordination of ')) {
      return 'Coordinate ' + bullet.substring(16);
    }
    return bullet;
  });
}

// ============= BUILD CONTENT BLOCKS =============

function buildContentBlocks(
  title: string | null,
  metadata: JobMetadata,
  sections: RawSections,
  validation: ValidationResult
): JobContentBlocks {
  const blocks: ContentBlock[] = [];

  // Only rewrite if structure is valid
  const shouldRewrite = validation.valid;
  
  console.log('[buildContentBlocks] Building blocks, shouldRewrite:', shouldRewrite);

  // About the role (intro)
  if (sections.companyOverview.length > 0 || sections.positionSummary.length > 0) {
    let body: string[];
    
    if (shouldRewrite) {
      body = rewriteIntroSection(sections.companyOverview, sections.positionSummary, metadata);
    } else {
      // Keep raw content without rewriting
      body = [
        ...sections.companyOverview,
        ...sections.positionSummary,
      ].filter(l => l.trim().length > 0);
    }
    
    if (body.length > 0) {
      blocks.push({
        type: 'intro',
        title: 'About the role',
        body,
      });
    }
  }

  // What you'll do (responsibilities)
  if (sections.responsibilities.length > 0) {
    const bullets = shouldRewrite
      ? formatResponsibilitiesWithVerbs(sections.responsibilities)
      : formatBullets(sections.responsibilities);
    
    if (bullets.length > 0) {
      blocks.push({
        type: 'section',
        title: "What you'll do",
        bullets,
      });
    }
  }

  // What you bring (must-have + competencies)
  const mustHaveLines = [...sections.requirementsMust, ...sections.competencies];
  if (mustHaveLines.length > 0) {
    const bullets = formatBullets(mustHaveLines);
    
    if (bullets.length > 0) {
      blocks.push({
        type: 'section',
        title: 'What you bring',
        bullets,
      });
    }
  }

  // Nice to have (preferred qualifications)
  if (sections.requirementsNice.length > 0) {
    const bullets = formatBullets(sections.requirementsNice);
    
    if (bullets.length > 0) {
      blocks.push({
        type: 'section',
        title: 'Nice to have',
        bullets,
      });
    }
  }

  // What we offer (benefits)
  if (sections.benefits.length > 0) {
    const bullets = formatBullets(sections.benefits);
    
    if (bullets.length > 0) {
      blocks.push({
        type: 'section',
        title: 'What we offer',
        bullets,
      });
    }
  }

  // Handle unclassified content if no other sections
  if (blocks.length === 0 && sections.unclassified.length > 0) {
    console.log('[buildContentBlocks] Using unclassified content as fallback');
    
    // Try to split unclassified into intro and bullets
    const paragraphs: string[] = [];
    const bullets: string[] = [];
    
    for (const line of sections.unclassified) {
      if (line.startsWith('•') || line.startsWith('-') || /^\d+[.)]/.test(line)) {
        bullets.push(line);
      } else if (line.length > 50) {
        paragraphs.push(line);
      }
    }
    
    if (paragraphs.length > 0) {
      blocks.push({
        type: 'intro',
        title: 'About the role',
        body: paragraphs.slice(0, 3),
      });
    }
    
    if (bullets.length > 0) {
      blocks.push({
        type: 'section',
        title: 'Job Description',
        bullets: formatBullets(bullets),
      });
    }
  }

  return {
    hero: {
      title,
      company: metadata.company,
      location: metadata.location,
      employmentType: metadata.employmentType || metadata.contractType,
      seniority: metadata.seniority,
      department: metadata.department,
    },
    blocks,
    validation,
  };
}

// ============= HTML GENERATION =============

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderHtmlFromBlocks(content: JobContentBlocks): string {
  const parts: string[] = [];

  for (const block of content.blocks) {
    parts.push(`<section class="job-section">`);
    parts.push(`<h2>${escapeHtml(block.title)}</h2>`);
    
    if (block.body && block.body.length > 0) {
      for (const paragraph of block.body) {
        parts.push(`<p>${escapeHtml(paragraph)}</p>`);
      }
    }
    
    if (block.bullets && block.bullets.length > 0) {
      parts.push('<ul>');
      for (const bullet of block.bullets) {
        parts.push(`<li>${escapeHtml(bullet)}</li>`);
      }
      parts.push('</ul>');
    }
    
    parts.push('</section>');
  }

  return parts.join('\n');
}

// ============= MAIN PIPELINE =============

export function normalizeJobPostText(rawText: string): {
  jobPost: NormalizedJobPost;
  preview: CleanedPreview;
} {
  console.log('============================================');
  console.log('[normalizeJobPostText] PHASE 1: STRUCTURE EXTRACTION');
  console.log('============================================');
  console.log('[normalizeJobPostText] Input length:', rawText.length);

  // Step 1.1: Basic cleanup
  const cleanedText = cleanRawText(rawText);
  console.log('[normalizeJobPostText] After cleanup:', cleanedText.length, 'chars');

  // Step 1.2: Title extraction (MANDATORY)
  const { title, textWithoutTitle } = extractTitle(cleanedText);
  console.log('[normalizeJobPostText] Extracted title:', title);

  // Step 1.3: Metadata extraction
  const { metadata, textWithoutMetadata } = extractMetadata(textWithoutTitle);
  console.log('[normalizeJobPostText] Extracted metadata:', JSON.stringify(metadata));

  // Step 1.4: Section isolation
  const sections = isolateSections(textWithoutMetadata, title);

  console.log('============================================');
  console.log('[normalizeJobPostText] PHASE 2: VALIDATION');
  console.log('============================================');

  // Phase 2: Validate structure
  const validation = validateStructure(title, metadata, sections);

  console.log('============================================');
  console.log('[normalizeJobPostText] PHASE 3: BUILD CONTENT');
  console.log('============================================');

  // Phase 3: Build content blocks (rewrite only if valid)
  const contentBlocks = buildContentBlocks(title, metadata, sections, validation);
  console.log('[normalizeJobPostText] Built', contentBlocks.blocks.length, 'blocks');

  // Generate HTML
  const contentHtml = renderHtmlFromBlocks(contentBlocks);

  // Build legacy fields
  const introBlock = contentBlocks.blocks.find(b => b.type === 'intro');
  const respBlock = contentBlocks.blocks.find(b => b.title === "What you'll do");
  const mustBlock = contentBlocks.blocks.find(b => b.title === 'What you bring');
  const niceBlock = contentBlocks.blocks.find(b => b.title === 'Nice to have');
  const benefitsBlock = contentBlocks.blocks.find(b => b.title === 'What we offer');

  const formatLegacyBullets = (bullets?: string[]): string | null => {
    if (!bullets || bullets.length === 0) return null;
    return bullets.map(b => '• ' + b).join('\n');
  };

  const description = introBlock?.body?.join('\n\n') || '';
  
  // Extract seniority from requirements if not in metadata
  let seniority = metadata.seniority;
  if (!seniority) {
    const allText = [...sections.requirementsMust, ...sections.competencies].join(' ');
    const yearsMatch = allText.match(/(\d+)[-–](\d+)\s*years?/i) || 
                       allText.match(/(\d+)\+?\s*years?/i) ||
                       allText.match(/(\d+)[-–](\d+)\s*anni/i);
    if (yearsMatch) {
      seniority = yearsMatch[0];
    }
  }

  const finalTitle = title || 'Imported Job Position';

  const jobPost: NormalizedJobPost = {
    title: finalTitle,
    description,
    responsibilities: formatLegacyBullets(respBlock?.bullets),
    requirements_must: formatLegacyBullets(mustBlock?.bullets),
    requirements_nice: formatLegacyBullets(niceBlock?.bullets),
    benefits: formatLegacyBullets(benefitsBlock?.bullets),
    location: metadata.location,
    employment_type: metadata.employmentType || metadata.contractType,
    seniority,
    department: metadata.department,
    salary_range: metadata.salaryRange,
    content_json: contentBlocks,
    content_html: contentHtml,
  };

  const preview: CleanedPreview = {
    title,
    meta: {
      company: metadata.company,
      location: metadata.location,
      contract_type: metadata.contractType,
      department: metadata.department,
    },
    sections: {
      has_overview: sections.companyOverview.length > 0,
      has_summary: sections.positionSummary.length > 0,
      responsibilities_count: respBlock?.bullets?.length || 0,
      must_count: mustBlock?.bullets?.length || 0,
      nice_count: niceBlock?.bullets?.length || 0,
      benefits_count: benefitsBlock?.bullets?.length || 0,
    },
    blocks_count: contentBlocks.blocks.length,
    extracted_text_length: rawText.length,
    quality_check: validation,
  };

  console.log('============================================');
  console.log('[normalizeJobPostText] COMPLETE');
  console.log('[normalizeJobPostText] Title:', finalTitle);
  console.log('[normalizeJobPostText] Blocks:', contentBlocks.blocks.length);
  console.log('[normalizeJobPostText] Valid:', validation.valid);
  console.log('============================================');

  return { jobPost, preview };
}
