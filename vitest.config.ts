import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      // Edge functions are Deno modules. Only the pure helpers in _shared (no Deno
      // globals at import time) run under Node; per-function tests such as
      // analyze-open-answer/index.test.ts are Deno integration tests (`deno test`)
      // that hit a live function URL and must stay out of this run.
      "supabase/functions/_shared/**/*.{test,spec}.ts",
    ],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Edge functions import supabase-js by URL (Deno style). Map it to the
      // installed package so their shared helpers are testable under Node.
      "https://esm.sh/@supabase/supabase-js@2": "@supabase/supabase-js",
    },
  },
});
