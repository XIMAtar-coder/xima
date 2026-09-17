/**
 * Client-side password policy for sign-up forms.
 *
 * Supabase Auth is the final authority. supabase/config.toml has no [auth]
 * section, so the length floor is Supabase's default (6); the hosted project
 * additionally rejects leaked / easily guessed passwords with a `weak_password`
 * error ("Password is known to be weak and easy to guess"). That check runs
 * against a breach corpus we cannot replicate locally, so this policy is
 * deliberately stricter than the floor — 8+ characters mixing letters and
 * digits, not on a list of the most common passwords, not built from the
 * user's own email or company name — to catch the realistic failures before
 * the user has filled in two more steps.
 */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleId = 'length' | 'letter' | 'number' | 'not_common' | 'not_personal';

export interface PasswordRuleResult {
  id: PasswordRuleId;
  ok: boolean;
}

export interface PasswordCheck {
  valid: boolean;
  rules: PasswordRuleResult[];
}

// Most frequent passwords in public breach corpora (and their obvious
// variants). Compared case-insensitively, and also after stripping trailing
// digits/symbols so "Password123!" is caught.
const COMMON_PASSWORDS = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890', '0123456789', '987654321',
  '111111', '11111111', '000000', '00000000', '121212', '123123', '123123123', '112233',
  '654321', '666666', '696969', '777777', '888888', '99999999', '147258369', '159753',
  'password', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'pass', 'passpass', 'password1',
  'qwerty', 'qwertyuiop', 'qwerty123', 'qwertz', 'azerty', 'asdfgh', 'asdfghjkl', 'zxcvbnm',
  '1q2w3e4r', '1q2w3e4r5t', '1qaz2wsx', 'qazwsx', 'q1w2e3r4', 'abc123', 'abcd1234', 'abcdef',
  'a1b2c3d4', 'aa123456', 'iloveyou', 'letmein', 'welcome', 'welcome1', 'admin', 'administrator',
  'root', 'login', 'master', 'secret', 'changeme', 'default', 'guest', 'test', 'test1234',
  'monkey', 'dragon', 'football', 'baseball', 'soccer', 'hockey', 'superman', 'batman',
  'princess', 'sunshine', 'shadow', 'michael', 'jordan', 'charlie', 'trustno1', 'starwars',
  'whatever', 'freedom', 'hello', 'hello123', 'computer', 'internet', 'samsung', 'google',
  'mustang', 'ferrari', 'juventus', 'forzainter', 'milan', 'napoli', 'roma', 'lazio',
  'ciao', 'ciaociao', 'amore', 'tiamo', 'andrea', 'francesco', 'giuseppe', 'alessandro',
  'barcelona', 'realmadrid', 'contraseña', 'contrasena', 'hola', 'holahola', 'teamo',
  'company', 'business', 'office', 'summer', 'winter', 'spring', 'autumn', 'january',
  'xima', 'ximatar', 'xima123', 'changeit', 'temp', 'temporary', 'demo', 'user', 'username',
]);

function stripDecorations(value: string): string {
  return value.toLowerCase().replace(/[^a-zà-ÿñ]+$/i, '').replace(/^[^a-zà-ÿñ]+/i, '');
}

export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return true;
  const core = stripDecorations(lower);
  if (core && COMMON_PASSWORDS.has(core)) return true;
  // One character repeated, or a straight run like "abcdefgh"/"12345678".
  if (/^(.)\1+$/.test(lower)) return true;
  const sequences = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiopasdfghjklzxcvbnm'];
  return sequences.some((seq) => lower.length >= 6 && seq.includes(lower));
}

function personalTokens(context: { email?: string; companyName?: string }): string[] {
  const tokens: string[] = [];
  const local = context.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (local && local.length >= 4) tokens.push(local);
  const company = context.companyName?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (company && company.length >= 4) tokens.push(company);
  return tokens;
}

export function checkPassword(
  password: string,
  context: { email?: string; companyName?: string } = {},
): PasswordCheck {
  const normalized = password.toLowerCase().replace(/[^a-z0-9]/g, '');
  const rules: PasswordRuleResult[] = [
    { id: 'length', ok: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'letter', ok: /\p{L}/u.test(password) },
    { id: 'number', ok: /\d/.test(password) },
    { id: 'not_common', ok: password.length > 0 && !isCommonPassword(password) },
    {
      id: 'not_personal',
      ok: password.length > 0 && !personalTokens(context).some((tok) => normalized.includes(tok)),
    },
  ];
  return { valid: rules.every((r) => r.ok), rules };
}

/** True when a Supabase sign-up error is about the password itself. */
export function isPasswordAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; name?: string };
  if (e.code === 'weak_password') return true;
  if (e.name === 'AuthWeakPasswordError') return true;
  return typeof e.message === 'string' && /password/i.test(e.message);
}
