import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/integrations/supabase/types.ts",
        "src/vite-env.d.ts",
        "src/main.tsx",
        "**/*.d.ts",
      ],
      // Gate: pure libs except async supabase-bound event-notifications (~25% until
      // authenticated notify paths are E2E'd). Raise toward 100% in follow-up PRs.
      thresholds: {
        "src/lib/**": {
          lines: 80,
          statements: 80,
          functions: 90,
          branches: 70,
        },
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
