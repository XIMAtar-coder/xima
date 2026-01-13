/**
 * Job Post Text Normalization Utilities
 * Cleans and structures extracted PDF text into publish-ready job post content
 */

// ============= A) Normalize Whitespace & Punctuation =============

export function normalizeWhitespace(text: string): string {
  return text
    // Remove page separators completely
    .replace(/---\s*PAGE\s*---/gi, '\n\n')
    // Remove any leftover PDF markers
    .replace(/%\s*PDF[^\n]*/gi, '')
    .replace(/<<[^>]*>>/g, '')
    .replace(/\/[A-Z][a-z]*\s+\d+/g, '')
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
  '•', '●', '○', '◦', '▪', '▫', '■', '□',
  'l ', 'o ', '* ', '- ', '– ', '— ',
  '► ', '▸ ', '→ ', '➤ ',
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

    // Fix double bullets ("• • " -> "• ")
    workingLine = workingLine.replace(/•\s*•/g, '•');
    workingLine = workingLine.replace(/^\s*•\s*$/, ''); // Remove orphan bullets
    
    if (!workingLine) continue;

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
        if (part.trim() && part.trim().length > 3) {
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

  // Ensure headings are separated with blank lines
  const result: string[] = [];
  for (let i = 0; i < fixedLines.length; i++) {
    const line = fixedLines[i];
    const prevLine = i > 0 ? fixedLines[i - 1] : '';
    
    // If current line looks like a heading and previous line is not empty
    if (isLikelyHeading(line) && prevLine && !prevLine.startsWith('•')) {
      if (result[result.length - 1] !== '') {
        result.push('');
      }
    }
    
    result.push(line);
    
    // Add blank line after headings
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

  // Track which metadata lines to remove
  const extractedKeys = new Set<keyof JobMetadata>();
  const metadataLineSignatures = new Set<string>();

  // First pass: extract metadata from first ~40 lines
  const headerLines = Math.min(40, lines.length);
  for (let i = 0; i < headerLines; i++) {
    const line = lines[i].trim();
    
    for (const { pattern, key } of metadataPatterns) {
      const match = line.match(pattern);
      if (match && !extractedKeys.has(key)) {
        metadata[key] = match[1].trim();
        extractedKeys.add(key);
        // Store normalized signature for dedup
        metadataLineSignatures.add(normalizeForDedup(line));
        break;
      }
    }
  }

  // Detect employment type from text if not explicitly found
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

  // Second pass: remove ALL occurrences of metadata lines (not just first)
  const cleanedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const normalized = normalizeForDedup(line);
    
    // Check if this matches any metadata pattern
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
        // Clean up title - remove any trailing metadata-like content
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
      // Before any section, add to positionSummary (more useful than overview for intros)
      if (!sections.companyOverview) {
        sections.companyOverview = trimmedLine;
      } else {
        sections.companyOverview += '\n' + trimmedLine;
      }
    }
  }

  // Save last section
  saveSection();

  return sections;
}

// ============= E) Deduplication =============

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
  const seenNormalized = new Map<string, number>();
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Keep empty lines for formatting
    if (!trimmed) {
      const lastLine = result[result.length - 1];
      if (lastLine !== undefined && lastLine.trim() !== '') {
        result.push('');
      }
      continue;
    }

    // Skip very short lines that might be artifacts
    if (trimmed.length < 3) {
      continue;
    }

    const normalized = normalizeForDedup(trimmed);
    
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

// ============= F) Content Block Builder =============

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

function extractBullets(text: string): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .filter(l => l.trim().startsWith('•'))
    .map(l => l.trim().replace(/^•\s*/, '').trim())
    .filter(l => l.length > 3);
}

function extractParagraphs(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\n\n+/)
    .map(p => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 10 && !p.startsWith('•'));
}

export function buildJobPostContentBlocks(
  sections: ParsedSections,
  metadata: JobMetadata
): JobContentBlocks {
  const blocks: ContentBlock[] = [];

  // About the role - combine overview and summary
  const introBody: string[] = [];
  if (sections.companyOverview) {
    const paragraphs = extractParagraphs(sections.companyOverview);
    introBody.push(...paragraphs);
  }
  if (sections.positionSummary) {
    const paragraphs = extractParagraphs(sections.positionSummary);
    introBody.push(...paragraphs);
  }
  
  if (introBody.length > 0) {
    blocks.push({
      type: 'intro',
      title: 'About the Role',
      body: introBody.slice(0, 4), // Limit to 4 paragraphs
    });
  }

  // What you'll do
  const responsibilityBullets = extractBullets(sections.responsibilities);
  if (responsibilityBullets.length > 0) {
    blocks.push({
      type: 'section',
      title: "What You'll Do",
      bullets: responsibilityBullets,
    });
  }

  // What you bring
  const mustBullets = extractBullets(sections.requirementsMust);
  const competencyBullets = extractBullets(sections.competencies);
  const allMustHave = [...mustBullets, ...competencyBullets];
  if (allMustHave.length > 0) {
    blocks.push({
      type: 'section',
      title: 'What You Bring',
      bullets: allMustHave,
    });
  }

  // Nice to have
  const niceBullets = extractBullets(sections.requirementsNice);
  if (niceBullets.length > 0) {
    blocks.push({
      type: 'section',
      title: 'Nice to Have',
      bullets: niceBullets,
    });
  }

  // What we offer
  const benefitBullets = extractBullets(sections.benefits);
  if (benefitBullets.length > 0) {
    blocks.push({
      type: 'section',
      title: 'What We Offer',
      bullets: benefitBullets,
    });
  }

  return {
    hero: {
      title: sections.title,
      company: metadata.company,
      location: metadata.location,
      employmentType: metadata.employmentType || metadata.contractType,
      seniority: metadata.seniority,
      department: metadata.department,
    },
    blocks,
  };
}

// ============= G) HTML Generator =============

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

// ============= H) Field Mapping =============

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
    // Only add bullet if it looks like a list item (not a heading or paragraph)
    if (trimmed.length < 200 && !trimmed.endsWith('.') && !isLikelyHeading(trimmed)) {
      return '• ' + trimmed;
    }
    return trimmed;
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
  
  // Step 6: Build structured content blocks
  const contentBlocks = buildJobPostContentBlocks(sections, metadata);
  
  // Step 7: Generate HTML
  const contentHtml = renderHtmlFromBlocks(contentBlocks);
  
  // Step 8: Build description
  let description = '';
  if (sections.companyOverview) {
    description = sections.companyOverview.replace(/\n+/g, '\n\n').trim();
  }
  if (sections.positionSummary) {
    description += (description ? '\n\n' : '') + sections.positionSummary.replace(/\n+/g, '\n\n').trim();
  }
  
  // Fallback: if no description but we have text, use first portion
  if (!description && dedupedText.length > 0) {
    const lines = dedupedText.split('\n').filter(l => l.trim() && l.trim() !== sections.title && !l.startsWith('•'));
    description = lines.slice(0, 5).join('\n\n');
  }
  
  // Step 9: Format bullet lists
  const responsibilities = sections.responsibilities ? formatAsBulletList(sections.responsibilities) : null;
  
  let requirementsMust = sections.requirementsMust ? formatAsBulletList(sections.requirementsMust) : null;
  // Merge competencies into requirements
  if (sections.competencies) {
    const formatted = formatAsBulletList(sections.competencies);
    if (requirementsMust) {
      requirementsMust += '\n' + formatted;
    } else {
      requirementsMust = formatted;
    }
  }
  
  const requirementsNice = sections.requirementsNice ? formatAsBulletList(sections.requirementsNice) : null;
  const benefits = sections.benefits ? formatAsBulletList(sections.benefits) : null;
  
  // Step 10: Extract seniority from requirements if not in metadata
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
      responsibilities_count: countBulletPoints(responsibilities || ''),
      must_count: countBulletPoints(requirementsMust || ''),
      nice_count: countBulletPoints(requirementsNice || ''),
      benefits_count: countBulletPoints(benefits || ''),
    },
    blocks_count: contentBlocks.blocks.length,
    extracted_text_length: rawText.length,
  };
  
  return { jobPost, preview };
}
