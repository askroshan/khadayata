import { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { E2E_PASSWORD } from "@/test/helpers/e2e-accounts";

function env(name: string): string {
  return (process.env[name] ?? (import.meta as ImportMeta & { env: Record<string, string> }).env[name]) as string;
}

/** Isolated supabase client with in-memory auth storage (real network, no shared localStorage races). */
export function createIsolatedClient(): SupabaseClient {
  const mem: Record<string, string> = {};
  return createClient(env("VITE_SUPABASE_URL"), env("VITE_SUPABASE_ANON_KEY"), {
    auth: {
      storage: {
        getItem: (k) => mem[k] ?? null,
        setItem: (k, v) => {
          mem[k] = v;
        },
        removeItem: (k) => {
          delete mem[k];
        },
      },
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function signInIsolated(email: string, password = E2E_PASSWORD) {
  const client = createIsolatedClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`signInIsolated failed for ${email}: ${error?.message}`);
  }
  return { client, session: data.session, user: data.user };
}

function AllProviders({
  children,
  route = "/",
  pathPattern,
}: {
  children: ReactNode;
  route?: string;
  /** When set, wraps `children` in `<Routes><Route path={pathPattern} /></Routes>` so useParams works. */
  pathPattern?: string;
}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const routed = pathPattern ? (
    <Routes>
      <Route path={pathPattern} element={children} />
    </Routes>
  ) : (
    children
  );
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>{routed}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export function renderApp(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { route?: string; pathPattern?: string },
) {
  const route = options?.route ?? "/";
  const pathPattern = options?.pathPattern;
  const { route: _r, pathPattern: _p, ...rest } = options ?? {};
  return render(ui, {
    ...rest,
    wrapper: ({ children }) => (
      <AllProviders route={route} pathPattern={pathPattern}>
        {children}
      </AllProviders>
    ),
  });
}
