import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to detect and resolve chapter from subdomain.
 * Format: city-state-country.khadayataonline.com
 * Example: ahmedabad-gj-in.khadayataonline.com
 */
export function useChapterSubdomain() {
  const subdomain = useMemo(() => {
    const hostname = window.location.hostname;
    // Match pattern: xxx.khadayataonline.com or xxx.khadayataonline.lovable.app
    const match = hostname.match(/^([^.]+)\.(?:khadayataonline\.com|.*\.lovable\.app)$/);
    if (match && match[1] !== "www" && match[1] !== "app") {
      return match[1];
    }
    return null;
  }, []);

  const { data: chapter, isPending, error } = useQuery({
    queryKey: ["chapter-subdomain", subdomain],
    queryFn: async () => {
      if (!subdomain) return null;
      const { data, error } = await supabase
        .from("chapters")
        .select("*, countries(name, iso2), states(name, code), cities(name, code)")
        .eq("subdomain", subdomain)
        .maybeSingle();
      if (error) {
        console.error("Chapter subdomain query error:", error);
        throw error;
      }
      return data;
    },
    enabled: !!subdomain,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  return {
    subdomain,
    chapter,
    isChapterSite: !!subdomain,
    isLoading: !!subdomain && isPending,
    error: !!subdomain ? error : null,
  };
}

/**
 * Builds a subdomain URL for a chapter.
 * Returns null in dev/preview environments.
 */
export function buildChapterUrl(chapter: {
  subdomain: string;
}): string {
  const hostname = window.location.hostname;
  if (hostname.includes("khadayataonline.com")) {
    return `https://${chapter.subdomain}.khadayataonline.com`;
  }
  // In dev/preview, just use query param
  return `/directory?chapter=${chapter.subdomain}`;
}
