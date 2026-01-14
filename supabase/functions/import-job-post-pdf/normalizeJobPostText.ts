/**
 * Job Post Text Normalization Utilities
 * Transforms corporate job descriptions into candidate-friendly, publish-ready content
 * Following XIMA values: clarity, structure, transparency, professionalism
 */

// ============= Constants =============

const MAX_BULLET_LENGTH = 140;
const MAX_PARAGRAPH_LINES = 4;
const MIN_INTRO_LENGTH = 200;
const MIN_BULLET_COUNT = 3;

const BULLET_MARKERS = [
  '•', '●', '○', '◦', '▪', '▫', '■', '□',
  'l ', 'o ', '* ', '- ', '– ', '— ',
  '► ', '▸ ', '→ ', '➤ ',
];

// ============= STEP 1: Title Normalization =============

/**
 * Clean job title: remove company name, location, contract type
 * Max 4-5 words, professional format
 */
export function normalizeTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  
  let title = rawTitle.trim();
  
  // Remove common suffixes with metadata
  title = title
    .replace(/\s*[-–—|]\s*(full[- ]?time|part[- ]?time|contract|remote|hybrid|on[- ]?site)/gi, '')
    .replace(/\s*[-–—|]\s*(ltd|llc|inc|gmbh|s\.?r\.?l\.?|s\.?p\.?a\.?|plc)\.?\s*$/gi, '')
    .replace(/\s*[-–—|]\s*[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*$/g, '') // Remove trailing company name pattern
    .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing parentheses
    .replace(/\s*,\s*[A-Z][a-z]+.*$/, '') // Remove location after comma
    .trim();
  
  // Title case conversion for ALL CAPS titles
  if (title === title.toUpperCase() && title.length > 3) {
    title = title
      .toLowerCase()
      .split(' ')
      .map(word => {
        // Keep some words lowercase
        if (['and', 'or', 'the', 'a', 'an', 'of', 'for', 'to', 'in', 'on'].includes(word)) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
    // Capitalize first word
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  
  return title.substring(0, 80);
}

// ============= STEP 2: Text Cleanup =============

export function normalizeWhitespace(text: string): string {
  return text
    // Remove page separators completely
    .replace(/---\s*PAGE\s*---/gi, '\n\n')
    // Remove PDF artifacts
    .replace(/%\s*PDF[^\n]*/gi, '')
    .replace(/<<[^>]*>>/g, '')
    .replace(/\/[A-Z][a-z]*\s+\d+/g, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Clean up spaces
    .split('\n')
    .map(line => line.replace(/  +/g, ' ').trim())
    .join('\n')
    // Normalize paragraph breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function fixBullets(text: string): string {
  const lines = text.split('\n');
  const fixedLines: string[] = [];

  for (const line of lines) {
    let workingLine = line.trim();
    if (!workingLine) {
      fixedLines.push('');
      continue;
    }

    // Fix double bullets ("• • " -> "• ")
    workingLine = workingLine.replace(/•\s*•/g, '•');
    workingLine = workingLine.replace(/^\s*•\s*$/, '');
    
    if (!workingLine) continue;

    // Convert various bullet markers to standard bullet
    let startsWithBullet = false;
    for (const marker of BULLET_MARKERS) {
      if (workingLine.startsWith(marker)) {
        workingLine = '• ' + workingLine.substring(marker.length).trim();
        startsWithBullet = true;
        break;
      }
    }

    // Convert numbered lists
    const numberedMatch = workingLine.match(/^(\d{1,2})[.)]\s+(.+)/);
    if (numberedMatch) {
      workingLine = '• ' + numberedMatch[2];
      startsWithBullet = true;
    }

    // Split multiple bullets in one line
    if (startsWithBullet && workingLine.includes(' • ')) {
      const parts = workingLine.split(/\s*•\s*/).filter(p => p.trim());
      for (const part of parts) {
        if (part.trim().length > 3) {
          fixedLines.push('• ' + part.trim());
        }
      }
      continue;
    }

    // Handle inline "l " bullets (PDF artifact)
    if (workingLine.includes(' l ') && workingLine.split(' l ').length > 2) {
      const parts = workingLine.split(/\s+l\s+/).filter(p => p.trim());
      for (const part of parts) {
        if (part.trim().length > 3) {
          fixedLines.push('• ' + part.trim());
        }
      }
      continue;
    }

    fixedLines.push(workingLine);
  }

  // Ensure headings are separated with blank lines
  const result: string[] = [];
  for (let i = 0; i < fixedLines.length; i++) {
    const line = fixedLines[i];
    const prevLine = i > 0 ? fixedLines[i - 1] : '';
    
    if (isLikelyHeading(line) && prevLine && !prevLine.startsWith('•')) {
      if (result[result.length - 1] !== '') {
        result.push('');
      }
    }
    
    result.push(line);
    
    if (isLikelyHeading(line) && i < fixedLines.length - 1 && fixedLines[i + 1] !== '') {
      result.push('');
    }
  }

  return result.join('\n');
}

function isLikelyHeading(line: string): boolean {
  if (!line || line.startsWith('•')) return false;
  const headingPatterns = [
    /^(company|position|key|required|preferred|professional|what\s+we|about)/i,
    /^(responsibilities|qualifications|competencies|requirements|overview|summary|benefits)/i,
    /^(what\s+you|your\s+profile|our\s+offer|perks)/i,
    /^(chi\s+siamo|cosa\s+farai|requisiti|offriamo|vantaggi)/i,
  ];
  return headingPatterns.some(p => p.test(line));
}

// ============= STEP 3: Metadata Extraction =============

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

export function extractMetadata(text: string): { metadata: JobMetadata; cleanedText: string } {
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

  const metadataPatterns: { pattern: RegExp; key: keyof JobMetadata }[] = [
    { pattern: /^company\s*[:：]\s*(.+)/i, key: 'company' },
    { pattern: /^location\s*[:：]\s*(.+)/i, key: 'location' },
    { pattern: /^sede\s*[:：]\s*(.+)/i, key: 'location' },
    { pattern: /^contract\s*type\s*[:：]\s*(.+)/i, key: 'contractType' },
    { pattern: /^tipo\s*contratto\s*[:：]\s*(.+)/i, key: 'contractType' },
    { pattern: /^employment\s*type\s*[:：]\s*(.+)/i, key: 'employmentType' },
    { pattern: /^department\s*[:：]\s*(.+)/i, key: 'department' },
    { pattern: /^team\s*[:：]\s*(.+)/i, key: 'department' },
    { pattern: /^area\s*[:：]\s*(.+)/i, key: 'department' },
    { pattern: /^reporting\s*(?:line|to)\s*[:：]\s*(.+)/i, key: 'reportingLine' },
    { pattern: /^reports\s*to\s*[:：]\s*(.+)/i, key: 'reportingLine' },
    { pattern: /^seniority\s*[:：]\s*(.+)/i, key: 'seniority' },
    { pattern: /^experience\s*(?:level)?\s*[:：]\s*(.+)/i, key: 'seniority' },
    { pattern: /^salary\s*(?:range)?\s*[:：]\s*(.+)/i, key: 'salaryRange' },
    { pattern: /^compensation\s*[:：]\s*(.+)/i, key: 'salaryRange' },
    { pattern: /^ral\s*[:：]\s*(.+)/i, key: 'salaryRange' },
  ];

  const extractedKeys = new Set<keyof JobMetadata>();
  const metadataLineSignatures = new Set<string>();

  // Extract from first ~40 lines
  const headerLines = Math.min(40, lines.length);
  for (let i = 0; i < headerLines; i++) {
    const line = lines[i].trim();
    
    for (const { pattern, key } of metadataPatterns) {
      const match = line.match(pattern);
      if (match && !extractedKeys.has(key)) {
        metadata[key] = match[1].trim();
        extractedKeys.add(key);
        metadataLineSignatures.add(normalizeForDedup(line));
        break;
      }
    }
  }

  // Detect employment type from text
  if (!metadata.employmentType) {
    const fullText = text.toLowerCase();
    if (fullText.includes('full-time') || fullText.includes('full time') || fullText.includes('tempo pieno')) {
      metadata.employmentType = 'Full-Time';
    } else if (fullText.includes('part-time') || fullText.includes('part time') || fullText.includes('tempo parziale')) {
      metadata.employmentType = 'Part-Time';
    } else if (fullText.includes('tempo determinato')) {
      metadata.employmentType = 'Contract';
    } else if (fullText.includes('internship') || fullText.includes('stage') || fullText.includes('tirocinio')) {
      metadata.employmentType = 'Internship';
    }
  }

  // Remove metadata lines from content
  const cleanedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const normalized = normalizeForDedup(line);
    
    let isMetadata = metadataLineSignatures.has(normalized);
    
    if (!isMetadata) {
      for (const { pattern, key } of metadataPatterns) {
        if (pattern.test(line) && extractedKeys.has(key)) {
          isMetadata = true;
          break;
        }
      }
    }

    if (!isMetadata) {
      cleanedLines.push(lines[i]);
    }
  }

  return {
    metadata,
    cleanedText: cleanedLines.join('\n'),
  };
}

// ============= STEP 4: Section Parsing =============

export interface ParsedSections {
  title: string;
  companyOverview: string;
  positionSummary: string;
  responsibilities: string;
  requirementsMust: string;
  requirementsNice: string;
  competencies: string;
  benefits: string;
}

interface SectionPattern {
  key: keyof Omit<ParsedSections, 'title'>;
  patterns: RegExp[];
}

const SECTION_PATTERNS: SectionPattern[] = [
  {
    key: 'companyOverview',
    patterns: [
      /^company\s*overview/i,
      /^about\s*(us|the\s*company)?$/i,
      /^chi\s*siamo/i,
      /^l[']?azienda/i,
      /^our\s*company/i,
    ]
  },
  {
    key: 'positionSummary',
    patterns: [
      /^position\s*summary/i,
      /^job\s*summary/i,
      /^role\s*(summary|overview|description)/i,
      /^overview$/i,
      /^summary$/i,
      /^the\s*role/i,
      /^about\s*the\s*(role|position)/i,
      /^descrizione\s*(del\s*)?(ruolo|posizione)/i,
    ]
  },
  {
    key: 'responsibilities',
    patterns: [
      /^(key\s*)?responsibilities/i,
      /^duties/i,
      /^what\s*you.ll\s*do/i,
      /^your\s*responsibilities/i,
      /^mansioni/i,
      /^compiti/i,
      /^attivit[aà]/i,
      /^cosa\s*farai/i,
    ]
  },
  {
    key: 'requirementsMust',
    patterns: [
      /^required\s*qualifications/i,
      /^requirements$/i,
      /^must\s*have/i,
      /^qualifications$/i,
      /^what\s*we\s*(need|require|look\s*for)/i,
      /^your\s*(profile|qualifications)/i,
      /^requisiti\s*(richiesti|obbligatori)?/i,
      /^profilo\s*ricercato/i,
    ]
  },
  {
    key: 'requirementsNice',
    patterns: [
      /^preferred\s*qualifications/i,
      /^nice\s*to\s*have/i,
      /^preferred$/i,
      /^bonus\s*(qualifications)?/i,
      /^plus$/i,
      /^desirable/i,
      /^requisiti\s*preferenziali/i,
      /^graditi/i,
    ]
  },
  {
    key: 'competencies',
    patterns: [
      /^(professional\s*)?competencies/i,
      /^skills$/i,
      /^key\s*skills/i,
      /^competenze/i,
    ]
  },
  {
    key: 'benefits',
    patterns: [
      /^what\s*we\s*offer/i,
      /^benefits$/i,
      /^perks$/i,
      /^our\s*offer/i,
      /^we\s*offer/i,
      /^offriamo/i,
      /^vantaggi/i,
      /^cosa\s*offriamo/i,
    ]
  },
];

export function parseSections(text: string): ParsedSections {
  const sections: ParsedSections = {
    title: '',
    companyOverview: '',
    positionSummary: '',
    responsibilities: '',
    requirementsMust: '',
    requirementsNice: '',
    competencies: '',
    benefits: '',
  };

  const lines = text.split('\n');
  
  // Detect title from first substantial line
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    if (line.length >= 5 && line.length <= 100) {
      const isHeading = SECTION_PATTERNS.some(sp => 
        sp.patterns.some(p => p.test(line))
      );
      const isMetadata = /^(company|location|department|contract|employment|reporting|salary|experience)[\s:]/i.test(line);
      
      if (!isHeading && !isMetadata) {
        sections.title = line.replace(/\s*[|•]\s*.*$/, '').trim();
        break;
      }
    }
  }

  // Parse sections
  let currentSection: keyof Omit<ParsedSections, 'title'> | null = null;
  let currentContent: string[] = [];

  const saveSection = () => {
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }
    currentContent = [];
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    let matchedSection: keyof Omit<ParsedSections, 'title'> | null = null;
    for (const { key, patterns } of SECTION_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(trimmedLine)) {
          matchedSection = key;
          break;
        }
      }
      if (matchedSection) break;
    }

    if (matchedSection) {
      saveSection();
      currentSection = matchedSection;
    } else if (currentSection && trimmedLine) {
      if (trimmedLine !== sections.title) {
        currentContent.push(trimmedLine);
      }
    } else if (!currentSection && trimmedLine && trimmedLine !== sections.title) {
      if (!sections.companyOverview) {
        sections.companyOverview = trimmedLine;
      } else {
        sections.companyOverview += '\n' + trimmedLine;
      }
    }
  }

  saveSection();
  return sections;
}

// ============= STEP 5: Deduplication =============

function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(b.split(' ').filter(w => w.length > 2));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }
  
  return (2 * overlap) / (wordsA.size + wordsB.size);
}

export function deduplicateContent(text: string): string {
  const lines = text.split('\n');
  const seenNormalized = new Map<string, number>();
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      const lastLine = result[result.length - 1];
      if (lastLine !== undefined && lastLine.trim() !== '') {
        result.push('');
      }
      continue;
    }

    if (trimmed.length < 3) continue;

    const normalized = normalizeForDedup(trimmed);
    
    let isDuplicate = false;
    for (const [seen] of seenNormalized) {
      if (similarity(normalized, seen) >= 0.9) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seenNormalized.set(normalized, i);
      result.push(line);
    }
  }

  return result.join('\n');
}

// ============= STEP 6: Candidate-Friendly Rewriting =============

/**
 * Rewrite intro paragraphs with direct, candidate-friendly language
 * Uses "You will...", "You'll be responsible for..." style
 */
function rewriteIntro(companyOverview: string, positionSummary: string): string[] {
  const paragraphs: string[] = [];
  
  // Process company overview
  if (companyOverview) {
    const cleanedOverview = companyOverview
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleanedOverview.length > 0) {
      paragraphs.push(cleanedOverview);
    }
  }
  
  // Process position summary - rewrite to be more direct
  if (positionSummary) {
    let summary = positionSummary
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Convert third-person corporate speak to second-person
    summary = summary
      .replace(/The\s+(candidate|employee|hire|person)\s+will/gi, 'You will')
      .replace(/The\s+(successful\s+)?(candidate|applicant)\s+is\s+responsible\s+for/gi, 'You\'ll be responsible for')
      .replace(/The\s+role\s+involves/gi, 'You\'ll')
      .replace(/This\s+position\s+is\s+responsible\s+for/gi, 'You\'ll be responsible for')
      .replace(/This\s+role\s+requires/gi, 'You\'ll need')
      .replace(/is\s+a\s+key\s+contributor\s+within/gi, 'play a key role in')
      .replace(/will\s+be\s+responsible\s+for/gi, 'will be responsible for')
      .replace(/\bHe\s*\/\s*She\s+will/gi, 'You will')
      .replace(/\bHe\s+or\s+she\s+will/gi, 'You will');
    
    if (summary.length > 0) {
      paragraphs.push(summary);
    }
  }
  
  // Limit to 3 paragraphs, each max 4 lines
  return paragraphs
    .slice(0, 3)
    .map(p => {
      // Split long paragraphs
      if (p.length > 500) {
        const sentences = p.match(/[^.!?]+[.!?]+/g) || [p];
        const chunks: string[] = [];
        let current = '';
        
        for (const sentence of sentences) {
          if ((current + sentence).length > 400) {
            if (current) chunks.push(current.trim());
            current = sentence;
          } else {
            current += sentence;
          }
        }
        if (current) chunks.push(current.trim());
        
        return chunks.slice(0, MAX_PARAGRAPH_LINES).join(' ');
      }
      return p;
    });
}

/**
 * Clean and format bullet points
 * - Starts with action verb
 * - Max 140 characters
 * - No duplicates
 */
function formatBulletList(text: string): string[] {
  if (!text) return [];
  
  const bullets: string[] = [];
  const seenNormalized = new Set<string>();
  
  const lines = text.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    let bullet = line.trim();
    
    // Remove bullet marker
    bullet = bullet.replace(/^[•●○◦▪▫■□►▸→➤\-–—*]\s*/, '');
    
    if (bullet.length < 5) continue;
    
    // Clean up redundant phrasing
    bullet = bullet
      .replace(/^(Strong|Solid|Advanced|Excellent|Good|Proven)\s+/i, '')
      .replace(/^(Knowledge|Understanding|Experience)\s+(of|in|with)\s+/i, '')
      .replace(/\s+$/, '')
      .trim();
    
    // Capitalize first letter
    bullet = bullet.charAt(0).toUpperCase() + bullet.slice(1);
    
    // Truncate if too long
    if (bullet.length > MAX_BULLET_LENGTH) {
      const lastSpace = bullet.lastIndexOf(' ', MAX_BULLET_LENGTH - 3);
      bullet = bullet.substring(0, lastSpace > 80 ? lastSpace : MAX_BULLET_LENGTH - 3) + '...';
    }
    
    // Deduplicate
    const normalized = normalizeForDedup(bullet);
    if (!seenNormalized.has(normalized)) {
      seenNormalized.add(normalized);
      bullets.push(bullet);
    }
  }
  
  return bullets;
}

/**
 * Format responsibilities with action verbs
 */
function formatResponsibilities(text: string): string[] {
  if (!text) return [];
  
  const bullets = formatBulletList(text);
  
  // Ensure each bullet starts with an action verb
  const actionVerbs = ['Manage', 'Lead', 'Develop', 'Create', 'Implement', 'Design', 'Analyze', 'Support', 
    'Coordinate', 'Maintain', 'Monitor', 'Oversee', 'Execute', 'Drive', 'Deliver', 'Build', 'Ensure'];
  
  return bullets.map(bullet => {
    // Check if starts with a verb (simple heuristic: ends with -e, -s, -ing, etc.)
    const firstWord = bullet.split(' ')[0];
    const looksLikeVerb = /^[A-Z][a-z]+(e|s|ing|ize|ate|ify)?\b/.test(firstWord) || 
                          actionVerbs.some(v => firstWord.toLowerCase() === v.toLowerCase());
    
    if (!looksLikeVerb) {
      // Try to convert noun phrases to verb phrases
      if (bullet.toLowerCase().startsWith('responsibility for')) {
        bullet = 'Manage ' + bullet.substring(18);
      } else if (bullet.toLowerCase().startsWith('management of')) {
        bullet = 'Manage ' + bullet.substring(13);
      } else if (bullet.toLowerCase().startsWith('development of')) {
        bullet = 'Develop ' + bullet.substring(14);
      }
    }
    
    return bullet;
  });
}

// ============= Content Block Builder =============

export interface ContentBlock {
  type: 'intro' | 'section';
  title: string;
  body?: string[];
  bullets?: string[];
}

export interface JobContentBlocks {
  hero: {
    title: string;
    company: string | null;
    location: string | null;
    employmentType: string | null;
    seniority: string | null;
    department: string | null;
  };
  blocks: ContentBlock[];
}

export function buildJobPostContentBlocks(
  sections: ParsedSections,
  metadata: JobMetadata
): JobContentBlocks {
  const blocks: ContentBlock[] = [];

  // About the role - rewritten intro
  const introBody = rewriteIntro(sections.companyOverview, sections.positionSummary);
  if (introBody.length > 0) {
    blocks.push({
      type: 'intro',
      title: 'About the role',
      body: introBody,
    });
  }

  // What you'll do - responsibilities with action verbs
  const responsibilityBullets = formatResponsibilities(sections.responsibilities);
  if (responsibilityBullets.length > 0) {
    blocks.push({
      type: 'section',
      title: "What you'll do",
      bullets: responsibilityBullets,
    });
  }

  // What you bring - must-have requirements + competencies
  const mustBullets = formatBulletList(sections.requirementsMust);
  const competencyBullets = formatBulletList(sections.competencies);
  const allMustHave = [...mustBullets, ...competencyBullets];
  
  // Dedupe combined list
  const seenMust = new Set<string>();
  const dedupedMustHave = allMustHave.filter(b => {
    const norm = normalizeForDedup(b);
    if (seenMust.has(norm)) return false;
    seenMust.add(norm);
    return true;
  });
  
  if (dedupedMustHave.length > 0) {
    blocks.push({
      type: 'section',
      title: 'What you bring',
      bullets: dedupedMustHave,
    });
  }

  // Nice to have - only if explicitly present
  const niceBullets = formatBulletList(sections.requirementsNice);
  if (niceBullets.length > 0) {
    blocks.push({
      type: 'section',
      title: 'Nice to have',
      bullets: niceBullets,
    });
  }

  // What we offer - benefits (no invented content)
  const benefitBullets = formatBulletList(sections.benefits);
  if (benefitBullets.length > 0) {
    blocks.push({
      type: 'section',
      title: 'What we offer',
      bullets: benefitBullets,
    });
  }

  return {
    hero: {
      title: normalizeTitle(sections.title),
      company: metadata.company,
      location: metadata.location,
      employmentType: metadata.employmentType || metadata.contractType,
      seniority: metadata.seniority,
      department: metadata.department,
    },
    blocks,
  };
}

// ============= HTML Generator =============

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

// ============= Quality Check =============

interface QualityCheckResult {
  passed: boolean;
  issues: string[];
}

function runQualityCheck(content: JobContentBlocks): QualityCheckResult {
  const issues: string[] = [];
  
  // Check title
  if (!content.hero.title || content.hero.title.length < 3) {
    issues.push('Missing or too short title');
  }
  if (content.hero.title && content.hero.title.split(' ').length > 7) {
    issues.push('Title too long (should be 4-5 words)');
  }
  
  // Check intro
  const introBlock = content.blocks.find(b => b.type === 'intro');
  if (!introBlock || !introBlock.body || introBlock.body.length === 0) {
    issues.push('Missing "About the role" section');
  } else {
    const introLength = introBlock.body.join(' ').length;
    if (introLength < MIN_INTRO_LENGTH) {
      issues.push(`Intro too short (${introLength} chars, need ${MIN_INTRO_LENGTH}+)`);
    }
  }
  
  // Check responsibilities
  const respBlock = content.blocks.find(b => b.title === "What you'll do");
  if (!respBlock || !respBlock.bullets || respBlock.bullets.length < MIN_BULLET_COUNT) {
    issues.push(`Need at least ${MIN_BULLET_COUNT} responsibilities`);
  }
  
  // Check requirements
  const reqBlock = content.blocks.find(b => b.title === 'What you bring');
  if (!reqBlock || !reqBlock.bullets || reqBlock.bullets.length < MIN_BULLET_COUNT) {
    issues.push(`Need at least ${MIN_BULLET_COUNT} requirements`);
  }
  
  // Check bullet length
  for (const block of content.blocks) {
    if (block.bullets) {
      for (const bullet of block.bullets) {
        if (bullet.length > MAX_BULLET_LENGTH) {
          issues.push(`Bullet too long in "${block.title}"`);
        }
      }
    }
  }
  
  return {
    passed: issues.length === 0,
    issues,
  };
}

// ============= Field Mapping =============

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
  content_json: JobContentBlocks | null;
  content_html: string | null;
}

export interface CleanedPreview {
  title: string;
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
  quality_check: QualityCheckResult;
}

export function normalizeJobPostText(rawText: string): {
  jobPost: NormalizedJobPost;
  preview: CleanedPreview;
} {
  console.log('[normalizeJobPostText] Starting normalization of', rawText.length, 'chars');
  
  // Step 1: Normalize whitespace
  let text = normalizeWhitespace(rawText);
  console.log('[normalizeJobPostText] After whitespace normalization:', text.length, 'chars');
  
  // Step 2: Fix bullets
  text = fixBullets(text);
  console.log('[normalizeJobPostText] After bullet fix:', text.length, 'chars');
  
  // Step 3: Extract metadata
  const { metadata, cleanedText } = extractMetadata(text);
  console.log('[normalizeJobPostText] Metadata extracted:', JSON.stringify(metadata));
  
  // Step 4: Deduplicate content
  const dedupedText = deduplicateContent(cleanedText);
  console.log('[normalizeJobPostText] After dedup:', dedupedText.length, 'chars');
  
  // Step 5: Parse sections
  const sections = parseSections(dedupedText);
  console.log('[normalizeJobPostText] Parsed sections:', {
    title: sections.title,
    hasOverview: !!sections.companyOverview,
    hasSummary: !!sections.positionSummary,
    hasResponsibilities: !!sections.responsibilities,
    hasRequirementsMust: !!sections.requirementsMust,
    hasRequirementsNice: !!sections.requirementsNice,
    hasBenefits: !!sections.benefits,
  });
  
  // Step 6: Build candidate-friendly content blocks
  let contentBlocks = buildJobPostContentBlocks(sections, metadata);
  console.log('[normalizeJobPostText] Content blocks built:', contentBlocks.blocks.length, 'blocks');
  
  // Step 7: Run quality check
  const qualityCheck = runQualityCheck(contentBlocks);
  console.log('[normalizeJobPostText] Quality check:', qualityCheck);
  
  // Step 8: Generate HTML
  let contentHtml = renderHtmlFromBlocks(contentBlocks);
  
  // Build description from intro blocks
  let description = '';
  const introBlock = contentBlocks.blocks.find(b => b.type === 'intro');
  if (introBlock && introBlock.body) {
    description = introBlock.body.join('\n\n');
  }
  
  // Fallback if no description
  if (!description && dedupedText.length > 0) {
    const lines = dedupedText.split('\n').filter(l => 
      l.trim() && l.trim() !== sections.title && !l.startsWith('•')
    );
    description = lines.slice(0, 5).join('\n\n');
  }
  
  // Format bullet lists for legacy fields
  const formatLegacyBullets = (bullets: string[]): string => {
    return bullets.map(b => '• ' + b).join('\n');
  };
  
  const respBlock = contentBlocks.blocks.find(b => b.title === "What you'll do");
  const mustBlock = contentBlocks.blocks.find(b => b.title === 'What you bring');
  const niceBlock = contentBlocks.blocks.find(b => b.title === 'Nice to have');
  const benefitsBlock = contentBlocks.blocks.find(b => b.title === 'What we offer');
  
  const responsibilities = respBlock?.bullets ? formatLegacyBullets(respBlock.bullets) : null;
  const requirementsMust = mustBlock?.bullets ? formatLegacyBullets(mustBlock.bullets) : null;
  const requirementsNice = niceBlock?.bullets ? formatLegacyBullets(niceBlock.bullets) : null;
  const benefits = benefitsBlock?.bullets ? formatLegacyBullets(benefitsBlock.bullets) : null;
  
  // Extract seniority from requirements if not in metadata
  let seniority = metadata.seniority;
  if (!seniority && requirementsMust) {
    const yearsMatch = requirementsMust.match(/(\d+)[-–](\d+)\s*years?/i) 
      || requirementsMust.match(/(\d+)\+?\s*years?/i)
      || requirementsMust.match(/(\d+)[-–](\d+)\s*anni/i);
    if (yearsMatch) {
      seniority = yearsMatch[0];
    }
  }

  const finalTitle = contentBlocks.hero.title || normalizeTitle(sections.title) || 'Imported Job Position';
  
  // Ensure content_json is NEVER null
  if (!contentBlocks || contentBlocks.blocks.length === 0) {
    console.log('[normalizeJobPostText] No blocks generated, creating fallback');
    
    const fallbackBlocks: ContentBlock[] = [];
    
    if (description) {
      fallbackBlocks.push({
        type: 'intro',
        title: 'About the role',
        body: description.split(/\n\n+/).filter(p => p.trim()).slice(0, 3),
      });
    }
    
    if (responsibilities) {
      const bullets = responsibilities.split('\n')
        .filter(l => l.trim().startsWith('•'))
        .map(l => l.replace(/^•\s*/, '').trim())
        .filter(b => b.length > 3);
      if (bullets.length > 0) {
        fallbackBlocks.push({
          type: 'section',
          title: "What you'll do",
          bullets,
        });
      }
    }
    
    if (requirementsMust) {
      const bullets = requirementsMust.split('\n')
        .filter(l => l.trim().startsWith('•'))
        .map(l => l.replace(/^•\s*/, '').trim())
        .filter(b => b.length > 3);
      if (bullets.length > 0) {
        fallbackBlocks.push({
          type: 'section',
          title: 'What you bring',
          bullets,
        });
      }
    }
    
    if (fallbackBlocks.length === 0 && dedupedText.length > 0) {
      const paragraphs = dedupedText.split(/\n\n+/)
        .filter(p => p.trim() && p.trim() !== finalTitle)
        .slice(0, 4);
      fallbackBlocks.push({
        type: 'section',
        title: 'Job description',
        body: paragraphs,
      });
    }
    
    contentBlocks = {
      hero: {
        title: finalTitle,
        company: metadata.company,
        location: metadata.location,
        employmentType: metadata.employmentType || metadata.contractType,
        seniority: seniority,
        department: metadata.department,
      },
      blocks: fallbackBlocks,
    };
    
    contentHtml = renderHtmlFromBlocks(contentBlocks);
  }
  
  console.log('[normalizeJobPostText] FINAL content_json blocks:', contentBlocks.blocks.length);
  console.log('[normalizeJobPostText] FINAL block titles:', contentBlocks.blocks.map(b => b.title));
  
  const jobPost: NormalizedJobPost = {
    title: finalTitle,
    description: description.trim().substring(0, 5000),
    responsibilities: responsibilities?.substring(0, 5000) || null,
    requirements_must: requirementsMust?.substring(0, 5000) || null,
    requirements_nice: requirementsNice?.substring(0, 3000) || null,
    benefits: benefits?.substring(0, 3000) || null,
    location: metadata.location,
    employment_type: metadata.employmentType || metadata.contractType,
    seniority: seniority,
    department: metadata.department,
    salary_range: metadata.salaryRange,
    content_json: contentBlocks,
    content_html: contentHtml,
  };
  
  const preview: CleanedPreview = {
    title: jobPost.title,
    meta: {
      company: metadata.company,
      location: metadata.location,
      contract_type: metadata.contractType || metadata.employmentType,
      department: metadata.department,
    },
    sections: {
      has_overview: !!sections.companyOverview,
      has_summary: !!sections.positionSummary,
      responsibilities_count: respBlock?.bullets?.length || 0,
      must_count: mustBlock?.bullets?.length || 0,
      nice_count: niceBlock?.bullets?.length || 0,
      benefits_count: benefitsBlock?.bullets?.length || 0,
    },
    blocks_count: contentBlocks.blocks.length,
    extracted_text_length: rawText.length,
    quality_check: qualityCheck,
  };
  
  return { jobPost, preview };
}
