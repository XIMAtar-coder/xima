import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useSupabaseQuery } from "../useSupabaseQuery";
import { useSupabaseMutation } from "../useSupabaseMutation";

const wrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    qc,
    Wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    ),
  };
};

describe("useSupabaseQuery", () => {
  it("returns unwrapped data on success", async () => {
    const { Wrapper } = wrapper();
    const fetcher = vi.fn().mockResolvedValue({ data: { id: 1, name: "row" }, error: null });
    const { result } = renderHook(() => useSupabaseQuery(["k"], fetcher), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 1, name: "row" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("returns null when supabase returns no data and no error", async () => {
    const { Wrapper } = wrapper();
    const fetcher = vi.fn().mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useSupabaseQuery(["k2"], fetcher), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("throws on supabase error so react-query exposes it", async () => {
    const { Wrapper } = wrapper();
    const fetcher = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const { result } = renderHook(() => useSupabaseQuery(["k3"], fetcher), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("boom");
  });

  it("respects enabled: false", async () => {
    const { Wrapper } = wrapper();
    const fetcher = vi.fn().mockResolvedValue({ data: 1, error: null });
    renderHook(() => useSupabaseQuery(["k4"], fetcher, { enabled: false }), { wrapper: Wrapper });
    // give react-query a tick
    await new Promise((r) => setTimeout(r, 20));
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("useSupabaseMutation", () => {
  it("returns data on success and invalidates listed keys", async () => {
    const { qc, Wrapper } = wrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const fn = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
    const { result } = renderHook(
      () => useSupabaseMutation(fn, { invalidate: [["foo"], ["bar", 1]] }),
      { wrapper: Wrapper }
    );
    const data = await result.current.mutateAsync({ x: 1 });
    expect(data).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledWith({ x: 1 });
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it("throws on supabase error", async () => {
    const { Wrapper } = wrapper();
    const fn = vi.fn().mockResolvedValue({ data: null, error: { message: "nope" } });
    const { result } = renderHook(() => useSupabaseMutation(fn), { wrapper: Wrapper });
    await expect(result.current.mutateAsync({})).rejects.toThrow("nope");
  });
});
