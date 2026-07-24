import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeVerificationStatus } from "../verificationGuard";

// Mock supabase client BEFORE importing the module that uses it
vi.mock("@/integrations/supabase/client", () => {
  const getUser = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    supabase: {
      auth: { getUser },
      from,
      __mocks: { getUser, maybeSingle },
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { supabase } = (await import("@/integrations/supabase/client")) as any;
const { canPerformSensitiveAction, getCurrentVerificationStatus } = await import("../verificationGuard");

describe("computeVerificationStatus (pure)", () => {
  it("verified when email_verified_at is set", () => {
    const s = computeVerificationStatus("2026-01-01T00:00:00Z", null);
    expect(s.verified).toBe(true);
    expect(s.expired).toBe(false);
  });

  it("not verified, no deadline → not expired", () => {
    const s = computeVerificationStatus(null, null);
    expect(s.verified).toBe(false);
    expect(s.expired).toBe(false);
    expect(s.deadline).toBeNull();
  });

  it("not verified within grace → not expired, hoursLeft > 0", () => {
    const future = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
    const s = computeVerificationStatus(null, future);
    expect(s.expired).toBe(false);
    expect(s.hoursLeft).toBeGreaterThan(0);
  });

  it("not verified past deadline → expired, hoursLeft 0", () => {
    const past = new Date(Date.now() - 3600 * 1000).toISOString();
    const s = computeVerificationStatus(null, past);
    expect(s.expired).toBe(true);
    expect(s.hoursLeft).toBe(0);
  });
});

describe("canPerformSensitiveAction (supabase-mocked)", () => {
  beforeEach(() => {
    supabase.__mocks.getUser.mockReset();
    supabase.__mocks.maybeSingle.mockReset();
  });

  it("allows action for anonymous sessions (no user)", async () => {
    supabase.__mocks.getUser.mockResolvedValue({ data: { user: null } });
    const r = await canPerformSensitiveAction();
    expect(r.allowed).toBe(true);
  });

  it("allows verified user", async () => {
    supabase.__mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    supabase.__mocks.maybeSingle.mockResolvedValue({
      data: { email_verified_at: "2026-01-01T00:00:00Z", verification_required_until: null },
    });
    const r = await canPerformSensitiveAction();
    expect(r.allowed).toBe(true);
  });

  it("allows unverified user within grace window", async () => {
    supabase.__mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    supabase.__mocks.maybeSingle.mockResolvedValue({
      data: {
        email_verified_at: null,
        verification_required_until: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    });
    const r = await canPerformSensitiveAction();
    expect(r.allowed).toBe(true);
  });

  it("blocks unverified user past deadline with a reason", async () => {
    supabase.__mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    supabase.__mocks.maybeSingle.mockResolvedValue({
      data: {
        email_verified_at: null,
        verification_required_until: new Date(Date.now() - 3600 * 1000).toISOString(),
      },
    });
    const r = await canPerformSensitiveAction();
    expect(r.allowed).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it("getCurrentVerificationStatus surfaces expired flag from db shape", async () => {
    supabase.__mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    supabase.__mocks.maybeSingle.mockResolvedValue({
      data: {
        email_verified_at: null,
        verification_required_until: new Date(Date.now() - 1000).toISOString(),
      },
    });
    const s = await getCurrentVerificationStatus();
    expect(s.verified).toBe(false);
    expect(s.expired).toBe(true);
  });
});
