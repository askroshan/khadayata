import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * SSO token relay across chapter subdomains.
 * 
 * When a user navigates between subdomains (e.g., ahmedabad-gj-in.khadayataonline.com 
 * to mumbai-mh-in.khadayataonline.com), session is preserved via:
 * 1. On outbound: encodes a short-lived relay token in the URL hash
 * 2. On inbound: detects the relay token and exchanges it for a session
 * 
 * Uses Supabase's built-in refresh token mechanism for secure relay.
 */

const RELAY_PARAM = "sso_relay";
const RELAY_TTL_MS = 60_000; // 1 minute

interface RelayPayload {
  refreshToken: string;
  timestamp: number;
  origin: string;
}

function encodeRelay(payload: RelayPayload): string {
  return btoa(JSON.stringify(payload));
}

function decodeRelay(encoded: string): RelayPayload | null {
  try {
    const payload = JSON.parse(atob(encoded)) as RelayPayload;
    if (Date.now() - payload.timestamp > RELAY_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Build a cross-subdomain URL with SSO relay token embedded.
 */
export async function buildSSOUrl(targetSubdomain: string, path = "/"): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.refresh_token) return null;

  const relay = encodeRelay({
    refreshToken: session.refresh_token,
    timestamp: Date.now(),
    origin: window.location.hostname,
  });

  const hostname = window.location.hostname;
  if (hostname.includes("khadayataonline.com")) {
    return `https://${targetSubdomain}.khadayataonline.com${path}#${RELAY_PARAM}=${relay}`;
  }
  // Dev fallback — just use same domain with query param
  return `${path}?chapter=${targetSubdomain}&${RELAY_PARAM}=${relay}`;
}

/**
 * Hook to handle inbound SSO relay tokens on page load.
 * Place this in your root layout component.
 */
export function useSubdomainSSO() {
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(new RegExp(`${RELAY_PARAM}=([^&]+)`));
    if (!match) return;

    const payload = decodeRelay(match[1]);
    if (!payload) {
      // Expired or invalid relay — clean up hash
      window.location.hash = "";
      return;
    }

    // Exchange refresh token for new session on this subdomain
    supabase.auth.refreshSession({ refresh_token: payload.refreshToken }).then(({ error }) => {
      if (error) {
        console.error("SSO relay failed:", error.message);
      }
      // Clean up hash regardless
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    });
  }, []);
}
