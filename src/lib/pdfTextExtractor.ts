import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  pageCount: number;
  error?: string;
}

/**
 * Extract text from a PDF file using PDF.js (client-side)
 */
export async function extractTextFromPdf(file: File): Promise<PdfExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const textParts: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Join text items with spaces, preserving structure
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (pageText) {
        textParts.push(pageText);
      }
    }
    
    const fullText = textParts.join('\n\n--- PAGE ---\n\n');
    
    return {
      success: true,
      text: fullText,
      pageCount: pdf.numPages,
    };
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: error.message || 'Failed to extract text from PDF',
    };
  }
}

/**
 * Check if extracted text appears to be valid content (not PDF internals)
 */
export function validateExtractedText(text: string): { valid: boolean; reason?: string } {
  // Check minimum length
  if (text.length < 100) {
    return { 
      valid: false, 
      reason: 'Extracted text is too short. The PDF may be a scan or image-based document.' 
    };
  }
  
  // Check for PDF internal markers that indicate garbage extraction
  const pdfMarkers = ['%PDF', 'xref', 'endobj', 'endstream', '/Font', '/Resources', '/Type', 'obj', 'stream'];
  let markerCount = 0;
  
  for (const marker of pdfMarkers) {
    const regex = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = text.match(regex);
    if (matches) {
      markerCount += matches.length;
    }
  }
  
  // If many markers found, it's likely garbage
  if (markerCount > 10) {
    return { 
      valid: false, 
      reason: 'PDF internal data detected. The text could not be properly extracted.' 
    };
  }
  
  // Check printable character ratio
  let printableCount = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code > 127) {
      printableCount++;
    }
  }
  
  const printableRatio = printableCount / text.length;
  if (printableRatio < 0.85) {
    return { 
      valid: false, 
      reason: 'The extracted text contains too many non-printable characters.' 
    };
  }
  
  return { valid: true };
}

/**
 * Get a preview of the extracted text for debugging
 */
export function getTextPreview(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Detect headings in extracted text
 */
export function detectHeadings(text: string): string[] {
  const headingPatterns = [
    /^(company overview|about|chi siamo)/im,
    /^(position summary|job summary|role overview)/im,
    /^(key responsibilities|responsibilities|duties|mansioni)/im,
    /^(required qualifications|requirements|requisiti|must have)/im,
    /^(preferred qualifications|nice to have|preferred)/im,
    /^(professional competencies|competencies|skills)/im,
    /^(what we offer|benefits|perks|vantaggi)/im,
    /^(location|sede)/im,
    /^(contract type|employment type|tipo contratto)/im,
    /^(department|team|division)/im,
  ];
  
  const detected: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    for (const pattern of headingPatterns) {
      if (pattern.test(line.trim())) {
        detected.push(line.trim());
        break;
      }
    }
  }
  
  return detected;
}
