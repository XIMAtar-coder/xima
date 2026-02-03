/**
 * Shared Input Validation Utilities for Edge Functions
 * 
 * Provides consistent validation patterns across all edge functions
 * to prevent injection attacks and ensure data integrity.
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID v4
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Validates UUID and throws descriptive error if invalid
 */
export function validateUUID(value: unknown, fieldName: string): string {
  if (!isValidUUID(value)) {
    throw new ValidationError(`Invalid ${fieldName}: must be a valid UUID`);
  }
  return value;
}

/**
 * Validates a required string field with optional length constraints
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number; pattern?: RegExp }
): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  
  const trimmed = value.trim();
  
  if (options?.minLength !== undefined && trimmed.length < options.minLength) {
    throw new ValidationError(`${fieldName} must be at least ${options.minLength} characters`);
  }
  
  if (options?.maxLength !== undefined && trimmed.length > options.maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${options.maxLength} characters`);
  }
  
  if (options?.pattern && !options.pattern.test(trimmed)) {
    throw new ValidationError(`${fieldName} has invalid format`);
  }
  
  return trimmed;
}

/**
 * Validates an optional string field with length constraints
 */
export function validateOptionalString(
  value: unknown,
  fieldName: string,
  options?: { maxLength?: number; pattern?: RegExp }
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return validateString(value, fieldName, options);
}

/**
 * Validates an enum value against allowed values
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T {
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
  return value as T;
}

/**
 * Validates an optional enum value with default
 */
export function validateOptionalEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  defaultValue: T
): T {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    return defaultValue;
  }
  return value as T;
}

/**
 * Validates a required number field with optional range constraints
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number; integer?: boolean }
): number {
  const num = typeof value === 'number' ? value : Number(value);
  
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  
  if (options?.integer && !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer`);
  }
  
  if (options?.min !== undefined && num < options.min) {
    throw new ValidationError(`${fieldName} must be at least ${options.min}`);
  }
  
  if (options?.max !== undefined && num > options.max) {
    throw new ValidationError(`${fieldName} must be at most ${options.max}`);
  }
  
  return num;
}

/**
 * Validates an array of strings with length constraints
 */
export function validateStringArray(
  value: unknown,
  fieldName: string,
  options?: { maxItems?: number; maxItemLength?: number }
): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }
  
  const maxItems = options?.maxItems ?? 100;
  if (value.length > maxItems) {
    throw new ValidationError(`${fieldName} must have at most ${maxItems} items`);
  }
  
  const maxItemLength = options?.maxItemLength ?? 500;
  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new ValidationError(`${fieldName}[${index}] must be a string`);
    }
    if (item.length > maxItemLength) {
      throw new ValidationError(`${fieldName}[${index}] must be at most ${maxItemLength} characters`);
    }
    return item.trim();
  });
}

/**
 * Validates an optional array of strings
 */
export function validateOptionalStringArray(
  value: unknown,
  fieldName: string,
  options?: { maxItems?: number; maxItemLength?: number }
): string[] | null {
  if (value === null || value === undefined) {
    return null;
  }
  return validateStringArray(value, fieldName, options);
}

/**
 * Validates an email address format
 */
export function validateEmail(value: unknown, fieldName: string = 'email'): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = value.trim().toLowerCase();
  
  if (!emailRegex.test(trimmed)) {
    throw new ValidationError(`${fieldName} must be a valid email address`);
  }
  
  if (trimmed.length > 254) {
    throw new ValidationError(`${fieldName} is too long`);
  }
  
  return trimmed;
}

/**
 * Validates a URL format
 */
export function validateUrl(value: unknown, fieldName: string = 'url'): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }
    return value;
  } catch {
    throw new ValidationError(`${fieldName} must be a valid URL`);
  }
}

/**
 * Sanitizes text to prevent XSS in HTML contexts
 */
export function sanitizeForHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public readonly statusCode = 400;
  
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Handles validation errors and returns appropriate HTTP response
 */
export function handleValidationError(
  error: unknown,
  corsHeaders: Record<string, string>
): Response {
  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 200, // Keep 200 to not break flows
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
  
  // Re-throw unknown errors
  throw error;
}

/**
 * Schema-based validation for complex objects
 */
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'uuid' | 'email' | 'url' | 'array' | 'object';
    required?: boolean;
    maxLength?: number;
    minLength?: number;
    min?: number;
    max?: number;
    enum?: readonly string[];
    default?: unknown;
  };
}

/**
 * Validates an object against a schema
 */
export function validateSchema<T extends Record<string, unknown>>(
  data: unknown,
  schema: ValidationSchema
): T {
  if (typeof data !== 'object' || data === null) {
    throw new ValidationError('Request body must be an object');
  }
  
  const result: Record<string, unknown> = {};
  const input = data as Record<string, unknown>;
  
  for (const [fieldName, rules] of Object.entries(schema)) {
    const value = input[fieldName];
    
    // Handle missing required fields
    if (value === undefined || value === null || value === '') {
      if (rules.required) {
        throw new ValidationError(`${fieldName} is required`);
      }
      if (rules.default !== undefined) {
        result[fieldName] = rules.default;
      }
      continue;
    }
    
    // Type-specific validation
    switch (rules.type) {
      case 'uuid':
        result[fieldName] = validateUUID(value, fieldName);
        break;
      case 'email':
        result[fieldName] = validateEmail(value, fieldName);
        break;
      case 'url':
        result[fieldName] = validateUrl(value, fieldName);
        break;
      case 'string':
        if (rules.enum) {
          result[fieldName] = validateEnum(value, fieldName, rules.enum);
        } else {
          result[fieldName] = validateString(value, fieldName, {
            minLength: rules.minLength,
            maxLength: rules.maxLength,
          });
        }
        break;
      case 'number':
        result[fieldName] = validateNumber(value, fieldName, {
          min: rules.min,
          max: rules.max,
        });
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new ValidationError(`${fieldName} must be a boolean`);
        }
        result[fieldName] = value;
        break;
      case 'array':
        result[fieldName] = validateStringArray(value, fieldName, {
          maxItems: rules.max,
          maxItemLength: rules.maxLength,
        });
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new ValidationError(`${fieldName} must be an object`);
        }
        result[fieldName] = value;
        break;
    }
  }
  
  return result as T;
}
