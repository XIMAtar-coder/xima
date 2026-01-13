/**
 * Job Post Text Normalization Utilities
 * Cleans and structures extracted PDF text into publish-ready job post content
 */

// ============= A) Normalize Whitespace & Punctuation =============

export function normalizeWhitespace(text: string): string {
  return text
    // Convert page separators to paragraph breaks
    .replace(/---\s*PAGE\s*---/gi, '\n\n')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Convert multiple spaces to single space (within lines)
    .split('\n')
    .map(line => line.replace(/  +/g, ' ').trim())
    .join('\n')
    // Convert 3+ newlines to double newline (paragraph break)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ============= B) Fix Bullets =============

const BULLET_MARKERS = [
  '•', '●', '○', '◦', '▪', '▫', '■', '□',  // Unicode bullets
  'l ', 'o ', '* ', '- ', '– ', '— ',       // Common substitutes (l = lowercase L often used)
  '► ', '▸ ', '→ ', '➤ ',                   // Arrows as bullets
];

export function fixBullets(text: string): string {
  const lines = text.split('\n');
  const fixedLines: string[] = [];

  for (const line of lines) {
    let workingLine = line.trim();
    if (!workingLine) {
      fixedLines.push('');
      continue;
    }

    // Check if line starts with a bullet marker
    let startsWithBullet = false;
    for (const marker of BULLET_MARKERS) {
      if (workingLine.startsWith(marker)) {
        workingLine = '• ' + workingLine.substring(marker.length).trim();
        startsWithBullet = true;
        break;
      }
    }

    // Check for numbered list items
    const numberedMatch = workingLine.match(/^(\d{1,2})[.)]\s+(.+)/);
    if (numberedMatch) {
      workingLine = '• ' + numberedMatch[2];
      startsWithBullet = true;
    }

    // Handle multiple bullets in one line (e.g., "• item1 • item2 • item3")
    if (startsWithBullet && workingLine.includes(' • ')) {
      const parts = workingLine.split(/\s*•\s*/).filter(p => p.trim());
      for (const part of parts) {
        if (part.trim()) {
          fixedLines.push('• ' + part.trim());
        }
      }
      continue;
    }

    // Handle lines with inline "l " bullets (common PDF extraction artifact)
    if (workingLine.includes(' l ') && workingLine.split(' l ').length > 2) {
      const parts = workingLine.split(/\s+l\s+/).filter(p => p.trim());
      for (const part of parts) {
        if (part.trim() && part.trim().length > 3) {
          fixedLines.push('• ' + part.trim());
        }
      }
      continue;
    }

    fixedLines.push(workingLine);
  }

  return fixedLines.join('\n');
}

// ============= C) Extract Header Metadata =============

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

  // Track which metadata lines to remove (first occurrence only)
  const extractedKeys = new Set<keyof JobMetadata>();
  const linesToRemove = new Set<number>();

  // First pass: extract metadata from first ~40 lines
  const headerLines = Math.min(40, lines.length);
  for (let i = 0; i < headerLines; i++) {
    const line = lines[i].trim();
    
    for (const { pattern, key } of metadataPatterns) {
      const match = line.match(pattern);
      if (match && !extractedKeys.has(key)) {
        metadata[key] = match[1].trim();
        extractedKeys.add(key);
        linesToRemove.add(i);
        break;
      }
    }
  }

  // Detect employment type from text if not explicitly found
  if (!metadata.employmentType) {
    const fullText = text.toLowerCase();
    if (fullText.includes('full-time') || fullText.includes('full time') || fullText.includes('tempo pieno')) {
      metadata.employmentType = 'full-time';
    } else if (fullText.includes('part-time') || fullText.includes('part time') || fullText.includes('tempo parziale')) {
      metadata.employmentType = 'part-time';
    } else if (fullText.includes('contract') || fullText.includes('tempo determinato')) {
      metadata.employmentType = 'contract';
    } else if (fullText.includes('internship') || fullText.includes('stage') || fullText.includes('tirocinio')) {
      metadata.employmentType = 'internship';
    }
  }

  // Second pass: remove duplicate metadata lines from rest of document
  const cleanedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    // Skip explicitly marked lines
    if (linesToRemove.has(i)) {
      continue;
    }

    // Check for duplicate metadata patterns in the rest of the document
    const line = lines[i].trim();
    let isDuplicateMetadata = false;
    
    for (const { pattern, key } of metadataPatterns) {
      if (pattern.test(line) && extractedKeys.has(key)) {
        isDuplicateMetadata = true;
        break;
      }
    }

    if (!isDuplicateMetadata) {
      cleanedLines.push(lines[i]);
    }
  }

  return {
    metadata,
    cleanedText: cleanedLines.join('\n'),
  };
}

// ============= D) Section Parsing =============

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
  
  // Detect title from first substantial line (before any sections)
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    if (line.length >= 5 && line.length <= 100) {
      // Check it's not a section heading
      const isHeading = SECTION_PATTERNS.some(sp => 
        sp.patterns.some(p => p.test(line))
      );
      // Check it's not metadata
      const isMetadata = /^(company|location|department|contract|employment|reporting|salary|experience)[\s:]/i.test(line);
      
      if (!isHeading && !isMetadata) {
        sections.title = line;
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
    
    // Check if this is a section heading
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
      // Skip the title from content
      if (trimmedLine !== sections.title) {
        currentContent.push(trimmedLine);
      }
    } else if (!currentSection && trimmedLine && trimmedLine !== sections.title) {
      // Before any section, add to companyOverview
      sections.companyOverview += (sections.companyOverview ? '\n' : '') + trimmedLine;
    }
  }

  // Save last section
  saveSection();

  return sections;
}

// ============= E) Deduplication =============

function normalizeForComparison(text: string): string {
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
  
  // If shorter is contained in longer, high similarity
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  // Simple word overlap similarity
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
  const seenNormalized = new Map<string, number>(); // normalized -> first line index
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Keep empty lines for formatting
    if (!trimmed) {
      result.push(line);
      continue;
    }

    // Skip very short lines that might be artifacts
    if (trimmed.length < 3) {
      continue;
    }

    const normalized = normalizeForComparison(trimmed);
    
    // Skip if we've seen an identical or near-identical line
    let isDuplicate = false;
    for (const [seen, _] of seenNormalized) {
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

// ============= F) Field Mapping =============

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
  extracted_text_length: number;
}

function countBulletPoints(text: string): number {
  if (!text) return 0;
  return (text.match(/^•/gm) || []).length;
}

function formatAsBulletList(text: string): string {
  if (!text) return '';
  
  const lines = text.split('\n').filter(l => l.trim());
  const formatted = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('• ')) return trimmed;
    if (trimmed.startsWith('•')) return '• ' + trimmed.substring(1).trim();
    return '• ' + trimmed;
  });
  
  return formatted.join('\n');
}

export function normalizeJobPostText(rawText: string): {
  jobPost: NormalizedJobPost;
  preview: CleanedPreview;
} {
  // Step 1: Normalize whitespace
  let text = normalizeWhitespace(rawText);
  
  // Step 2: Fix bullets
  text = fixBullets(text);
  
  // Step 3: Extract metadata and clean duplicates
  const { metadata, cleanedText } = extractMetadata(text);
  
  // Step 4: Deduplicate content
  const dedupedText = deduplicateContent(cleanedText);
  
  // Step 5: Parse sections
  const sections = parseSections(dedupedText);
  
  // Step 6: Build description
  let description = '';
  if (sections.companyOverview) {
    description = sections.companyOverview;
  }
  if (sections.positionSummary) {
    description += (description ? '\n\n' : '') + sections.positionSummary;
  }
  
  // Fallback: if no description but we have text, use first portion
  if (!description && dedupedText.length > 0) {
    const lines = dedupedText.split('\n').filter(l => l.trim() && l.trim() !== sections.title);
    description = lines.slice(0, 10).join('\n');
  }
  
  // Step 7: Format bullet lists
  const responsibilities = sections.responsibilities ? formatAsBulletList(sections.responsibilities) : null;
  
  let requirementsMust = sections.requirementsMust ? formatAsBulletList(sections.requirementsMust) : null;
  // Merge competencies into requirements if no separate must-haves
  if (sections.competencies) {
    if (requirementsMust) {
      requirementsMust += '\n' + formatAsBulletList(sections.competencies);
    } else {
      requirementsMust = formatAsBulletList(sections.competencies);
    }
  }
  
  const requirementsNice = sections.requirementsNice ? formatAsBulletList(sections.requirementsNice) : null;
  const benefits = sections.benefits ? formatAsBulletList(sections.benefits) : null;
  
  // Step 8: Extract seniority from requirements if not in metadata
  let seniority = metadata.seniority;
  if (!seniority && requirementsMust) {
    const yearsMatch = requirementsMust.match(/(\d+)[-–](\d+)\s*years?/i) 
      || requirementsMust.match(/(\d+)\+?\s*years?/i)
      || requirementsMust.match(/(\d+)[-–](\d+)\s*anni/i);
    if (yearsMatch) {
      seniority = yearsMatch[0];
    }
  }
  
  // Build result
  const jobPost: NormalizedJobPost = {
    title: sections.title || 'Imported Job Position',
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
      responsibilities_count: countBulletPoints(responsibilities || ''),
      must_count: countBulletPoints(requirementsMust || ''),
      nice_count: countBulletPoints(requirementsNice || ''),
      benefits_count: countBulletPoints(benefits || ''),
    },
    extracted_text_length: rawText.length,
  };
  
  return { jobPost, preview };
}
