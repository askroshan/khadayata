import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMember() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const memberQuery = useQuery({
    queryKey: ["member", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("members")
        .select("*, chapters(*)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateMember = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("members")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", user?.id] });
    },
  });

  return { member: memberQuery.data, isLoading: memberQuery.isLoading, updateMember };
}

export function useChapters() {
  return useQuery({
    queryKey: ["chapters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("*, countries(name, iso2), states(name, code), cities(name, code)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("countries").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useStates(countryId?: string) {
  return useQuery({
    queryKey: ["states", countryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("states")
        .select("*")
        .eq("country_id", countryId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!countryId,
  });
}

export function useCities(stateId?: string) {
  return useQuery({
    queryKey: ["cities", stateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .eq("state_id", stateId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!stateId,
  });
}

export function useHasStates(countryId?: string) {
  return useQuery({
    queryKey: ["has_states", countryId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("states")
        .select("id", { count: "exact", head: true })
        .eq("country_id", countryId!);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!countryId,
  });
}

export function useCitiesByCountry(countryId?: string) {
  return useQuery({
    queryKey: ["cities_by_country", countryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*, states!inner(country_id)")
        .eq("states.country_id", countryId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!countryId,
  });
}
