import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Fetch a single chapter by slug with location data */
export function useChapterBySlug(slug?: string) {
  return useQuery({
    queryKey: ["chapter", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("*, countries(name, iso2), states(name, code), cities(name, code)")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

/** Count members in a chapter */
export function useChapterMemberCount(chapterId?: string) {
  return useQuery({
    queryKey: ["chapter-member-count", chapterId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("chapter_id", chapterId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!chapterId,
  });
}

/** Fetch chapter members */
export function useChapterMembers(chapterId?: string) {
  return useQuery({
    queryKey: ["chapter-members", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, photo_url, global_id, verification_level, onboarding_completed")
        .eq("chapter_id", chapterId!)
        .eq("deceased", false)
        .order("first_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!chapterId,
  });
}

/** Fetch chapter committee (role assignments for this chapter via roles.chapter_id) */
export function useChapterCommittee(chapterId?: string) {
  return useQuery({
    queryKey: ["chapter-committee", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_assignments")
        .select("id, start_date, end_date, roles!inner(name, scope, chapter_id), members(id, first_name, last_name, photo_url, global_id)")
        .eq("roles.chapter_id", chapterId!)
        .or("end_date.is.null,end_date.gte." + new Date().toISOString().split("T")[0]);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!chapterId,
  });
}

/** Past committee members (expired assignments) */
export function useChapterPastCommittee(chapterId?: string) {
  return useQuery({
    queryKey: ["chapter-past-committee", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_assignments")
        .select("id, start_date, end_date, roles!inner(name, scope, chapter_id), members(id, first_name, last_name, photo_url)")
        .eq("roles.chapter_id", chapterId!)
        .lt("end_date", new Date().toISOString().split("T")[0])
        .order("end_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!chapterId,
  });
}

/** Fetch chapter events */
export function useChapterEvents(chapterId?: string, past = false) {
  return useQuery({
    queryKey: ["chapter-events", chapterId, past],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("id, name, description, starts_at, ends_at, venue, cover_image_url, category, status, event_type")
        .eq("chapter_id", chapterId!)
        .eq("status", "published");

      if (past) {
        query = query.lt("ends_at", new Date().toISOString()).order("starts_at", { ascending: false });
      } else {
        query = query.gte("ends_at", new Date().toISOString()).order("starts_at");
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!chapterId,
  });
}

/** Fetch chapter news */
export function useChapterNews(chapterId?: string) {
  return useQuery({
    queryKey: ["chapter-news", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_news")
        .select("id, title, summary, cover_image_url, published_at, category, author_name")
        .eq("chapter_id", chapterId!)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!chapterId,
  });
}

/** Fetch chapter businesses */
export function useChapterBusinesses(chapterId?: string) {
  return useQuery({
    queryKey: ["chapter-businesses", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, sector, description, logo_url, phone, website, verified")
        .eq("chapter_id", chapterId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!chapterId,
  });
}

/** Fetch chapter jobs */
export function useChapterJobs(chapterId?: string) {
  return useQuery({
    queryKey: ["chapter-jobs", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, description, location, employment_type, remote, salary_min, salary_max, salary_currency, status, created_at")
        .eq("chapter_id", chapterId!)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!chapterId,
  });
}

/** Chapter event photos (gallery) */
export function useChapterGallery(chapterId?: string) {
  return useQuery({
    queryKey: ["chapter-gallery", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_photos")
        .select("id, url, caption, created_at, events!inner(id, name, chapter_id, starts_at)")
        .eq("events.chapter_id", chapterId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!chapterId,
  });
}

/** Total member count across all chapters */
export function useTotalMemberCount() {
  return useQuery({
    queryKey: ["total-member-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("members")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });
}

/** Total chapter count */
export function useTotalChapterCount() {
  return useQuery({
    queryKey: ["total-chapter-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("chapters")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });
}

/** Total business count (all businesses, not just verified) */
export function useTotalBusinessCount() {
  return useQuery({
    queryKey: ["total-business-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("businesses")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });
}

/** Total country count — distinct countries where chapters exist */
export function useTotalCountryCount() {
  return useQuery({
    queryKey: ["total-country-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("country_id");
      if (error) throw error;
      const distinct = new Set(
        (data ?? []).map((c) => c.country_id).filter(Boolean)
      );
      return distinct.size;
    },
    staleTime: 60_000,
  });
}
