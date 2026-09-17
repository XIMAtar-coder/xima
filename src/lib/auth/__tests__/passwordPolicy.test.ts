import { describe, expect, it } from 'vitest';
import { checkPassword, isCommonPassword, isPasswordAuthError } from '../passwordPolicy';

const failing = (pw: string, ctx = {}) =>
  checkPassword(pw, ctx).rules.filter((r) => !r.ok).map((r) => r.id);

describe('passwordPolicy', () => {
  it('accepts a reasonable password', () => {
    expect(checkPassword('Tavolo-verde-42').valid).toBe(true);
  });

  it('requires length, a letter and a number', () => {
    expect(failing('abc1')).toContain('length');
    expect(failing('12345678901')).toContain('letter');
    expect(failing('tavoloverde')).toContain('number');
  });

  it('rejects common passwords and decorated variants', () => {
    expect(isCommonPassword('password')).toBe(true);
    expect(isCommonPassword('Password123!')).toBe(true);
    expect(isCommonPassword('qwerty123')).toBe(true);
    expect(isCommonPassword('aaaaaaaa')).toBe(true);
    expect(isCommonPassword('12345678')).toBe(true);
    expect(failing('Welcome1')).toContain('not_common');
  });

  it('rejects passwords built from the email or company name', () => {
    expect(failing('mariorossi2026', { email: 'mario.rossi@acme.com' })).toContain('not_personal');
    expect(failing('Acmecorp99', { companyName: 'Acme Corp' })).toContain('not_personal');
  });

  it('recognises Supabase password errors', () => {
    expect(isPasswordAuthError({ code: 'weak_password', message: 'x' })).toBe(true);
    expect(isPasswordAuthError({ message: 'Password is known to be weak and easy to guess, please choose a different one.' })).toBe(true);
    expect(isPasswordAuthError({ message: 'User already registered' })).toBe(false);
  });
});
