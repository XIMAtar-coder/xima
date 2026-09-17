import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const signUp = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key),
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { signUp: (...args: unknown[]) => signUp(...args) },
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useConsentRecording', () => ({ recordUserConsents: vi.fn() }));
vi.mock('@/components/auth/ConsentCheckboxes', () => ({
  ConsentCheckboxes: ({ onPrivacyChange, onTermsChange }: { onPrivacyChange: (v: boolean) => void; onTermsChange: (v: boolean) => void }) => (
    <button type="button" onClick={() => { onPrivacyChange(true); onTermsChange(true); }}>accept-consents</button>
  ),
}));

import BusinessRegister from '../Register';

const renderPage = () =>
  render(
    <MemoryRouter>
      <BusinessRegister />
    </MemoryRouter>,
  );

const fillStep1 = (password: string) => {
  fireEvent.change(screen.getByLabelText('Company Name'), { target: { value: 'Acme Srl' } });
  fireEvent.change(screen.getByLabelText('Business Email'), { target: { value: 'hr@acme.it' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
};

describe('BusinessRegister password step', () => {
  beforeEach(() => signUp.mockReset());

  it('blocks Continue for a weak password and allows it for a strong one', () => {
    renderPage();
    fillStep1('password123');
    const cont = screen.getByRole('button', { name: /Continue/ });
    expect(cont).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Tavolo-verde-42' } });
    expect(cont).not.toBeDisabled();
  });

  it('toggles password visibility', () => {
    renderPage();
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');
  });

  it('gives the step 2 dropdowns accessible names', () => {
    renderPage();
    fillStep1('Tavolo-verde-42');
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByRole('combobox', { name: /Industry Sector/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Company Size/ })).toBeInTheDocument();
  });

  it('returns to step 1 with the password focused when Supabase rejects it, keeping other data', async () => {
    signUp.mockResolvedValue({
      data: { user: null },
      error: { code: 'weak_password', message: 'Password is known to be weak and easy to guess' },
    });
    renderPage();
    fillStep1('Tavolo-verde-42');
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Torino' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    fireEvent.click(screen.getByText('accept-consents'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Business Account' }));

    await waitFor(() => expect(screen.getByLabelText('Password')).toHaveFocus());
    expect(screen.getByLabelText('Company Name')).toHaveValue('Acme Srl');
    expect(screen.getByRole('alert')).toHaveTextContent('businessRegistration.password_rejected_inline');
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled();

    // Step 2 data survived the round trip.
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Another-strong-77' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByLabelText('City')).toHaveValue('Torino');
  });
});
