/**
 * AI Content Translation Cache
 * 
 * Caches translated AI content in localStorage to avoid repeated API calls.
 * Format: xima.ai.translation:<recordId>:<field>:<locale>
 */

import { supabase } from '@/integrations/supabase/client';
import { getBusinessLocale, type BusinessLocale } from '@/hooks/useBusinessLocale';

const CACHE_PREFIX = 'xima.ai.translation';
const CACHE_VERSION = 'v1';

interface CacheEntry {
  text: string;
  timestamp: number;
  version: string;
}

// Cache expiry: 7 days
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function getCacheKey(recordId: string, field: string, locale: string): string {
  return `${CACHE_PREFIX}:${recordId}:${field}:${locale}`;
}

export function getCachedTranslation(
  recordId: string,
  field: string,
  locale: BusinessLocale
): string | null {
  try {
    const key = getCacheKey(recordId, field, locale);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    
    // Check version and expiry
    if (entry.version !== CACHE_VERSION) return null;
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.text;
  } catch {
    return null;
  }
}

export function setCachedTranslation(
  recordId: string,
  field: string,
  locale: BusinessLocale,
  text: string
): void {
  try {
    const key = getCacheKey(recordId, field, locale);
    const entry: CacheEntry = {
      text,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Translate text with caching
 */
export async function translateWithCache(
  text: string,
  recordId: string,
  field: string,
  targetLocale?: BusinessLocale
): Promise<string> {
  const locale = targetLocale || getBusinessLocale();
  
  // If English, return original (AI content is typically generated in English)
  if (locale === 'en') {
    return text;
  }

  // Check cache first
  const cached = getCachedTranslation(recordId, field, locale);
  if (cached) {
    return cached;
  }

  // Call translation edge function
  try {
    const { data, error } = await supabase.functions.invoke('translate-content', {
      body: { text, targetLocale: locale }
    });

    if (error) {
      console.error('[translateWithCache] Error:', error);
      return text; // Fallback to original
    }

    const translatedText = data?.translatedText || text;
    
    // Cache the result
    setCachedTranslation(recordId, field, locale, translatedText);
    
    return translatedText;
  } catch (err) {
    console.error('[translateWithCache] Exception:', err);
    return text;
  }
}

/**
 * Clear all translation cache for a specific record
 */
export function clearTranslationCache(recordId: string): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${CACHE_PREFIX}:${recordId}:`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}

/**
 * Clear entire translation cache
 */
export function clearAllTranslationCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}
