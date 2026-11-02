import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMember } from "@/hooks/useMember";

export type RoleName = 
  | "Global Admin" 
  | "Chapter Admin" 
  | "Data Steward" 
  | "Directory Manager" 
  | "Event Manager" 
  | "Finance Admin" 
  | "Global Publisher" 
  | "Moderator" 
  | "Publisher";

interface RoleAssignment {
  id: string;
  role_id: string;
  chapter_id: string | null;
  roles: { name: string; scope: string } | null;
  start_date: string | null;
  end_date: string | null;
}

export function useRoles() {
  const { user } = useAuth();
  const { member, isLoading: memberLoading } = useMember();

  const { data: roleAssignments, isLoading: rolesLoading } = useQuery({
    queryKey: ["my-roles", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await supabase
        .from("role_assignments")
        .select("id, role_id, chapter_id, roles(name, scope), start_date, end_date")
        .eq("member_id", member.id)
        .or("end_date.is.null,end_date.gte." + new Date().toISOString().split("T")[0]);
      if (error) throw error;
      return (data ?? []) as RoleAssignment[];
    },
    enabled: !!member,
  });

  const isLoading = memberLoading ? true : member === null ? false : rolesLoading;

  const roles = roleAssignments?.map((ra) => ra.roles?.name).filter(Boolean) as string[] ?? [];

  const hasRole = (roleName: RoleName | RoleName[]): boolean => {
    if (Array.isArray(roleName)) {
      return roleName.some((r) => roles.includes(r));
    }
    return roles.includes(roleName);
  };

  const isGlobalAdmin = hasRole("Global Admin");
  const isChapterAdmin = hasRole(["Global Admin", "Chapter Admin"]);
  const isDataSteward = hasRole(["Global Admin", "Data Steward"]);
  const isDirectoryManager = hasRole(["Global Admin", "Directory Manager"]);
  const isEventManager = hasRole(["Global Admin", "Event Manager"]);
  const isFinanceAdmin = hasRole(["Global Admin", "Finance Admin"]);
  const isPublisher = hasRole(["Global Admin", "Global Publisher", "Publisher"]);
  const isModerator = hasRole(["Global Admin", "Moderator"]);

  // Convenience: is any kind of admin
  const isAnyAdmin = isGlobalAdmin || isChapterAdmin || isDataSteward ||
    isDirectoryManager || isEventManager || isFinanceAdmin || isPublisher || isModerator;

  // The chapter ID scoped to the Chapter Admin role (null for Global Admin — sees all)
  const chapterScopedRoleAssignment = roleAssignments?.find(
    (ra) => ra.roles?.name === "Chapter Admin" && ra.chapter_id
  );
  const myChapterId = isGlobalAdmin ? null : (chapterScopedRoleAssignment?.chapter_id ?? member?.chapter_id ?? null);

  return {
    roles,
    roleAssignments,
    isLoading,
    hasRole,
    // Convenience booleans
    isGlobalAdmin,
    isChapterAdmin,
    isDataSteward,
    isDirectoryManager,
    isEventManager,
    isFinanceAdmin,
    isPublisher,
    isModerator,
    isAnyAdmin,
    // Chapter scoping: null means Global Admin (no filter), string means scoped to that chapter
    myChapterId,
  };
}

// Hook for checking if current user can perform specific actions
export function usePermissions() {
  const { isGlobalAdmin, isChapterAdmin, isDataSteward, isDirectoryManager,
    isEventManager, isFinanceAdmin, isPublisher, isModerator, hasRole } = useRoles();

  const isGlobalPublisher = hasRole(["Global Admin", "Global Publisher"]);
  const canManageChapter = isGlobalAdmin || isChapterAdmin;

  return {
    // Announcements
    canManageAnnouncements: isGlobalAdmin || isChapterAdmin,
    
    // Members
    canVerifyMembers: isGlobalAdmin || isDataSteward || isChapterAdmin || isModerator,
    canEditAnyMember: isGlobalAdmin || isDataSteward || isChapterAdmin || isModerator,
    canInviteMembers: isGlobalAdmin || isChapterAdmin || isDataSteward || isModerator,
    
    // Events (Chapter Admin manages chapter events; Event Manager / Moderator platform-wide)
    canManageEvents: isGlobalAdmin || isChapterAdmin || isEventManager || isModerator,
    canDeleteEvents: isGlobalAdmin || isChapterAdmin || isEventManager || isModerator,

    // News
    canPublishNews: isGlobalAdmin || isPublisher || isModerator,
    canModerateNews: isGlobalAdmin || isPublisher || isModerator,
    canDeleteNews: isGlobalAdmin || isPublisher || isModerator,
    
    // Business & Jobs
    canManageDirectory: isGlobalAdmin || isDirectoryManager,
    canVerifyBusinesses: isGlobalAdmin || isDirectoryManager,
    canDeleteJobs: isGlobalAdmin || isDirectoryManager,
    
    // Finance
    canManageFunds: isGlobalAdmin || isFinanceAdmin,
    canManageScholarships: isGlobalAdmin || isFinanceAdmin,
    canViewAllDonations: isGlobalAdmin || isFinanceAdmin,
    
    // Data
    canManageHeritageTags: isGlobalAdmin || isDataSteward,
    canManageOralHistories: isGlobalAdmin || isDataSteward,
    canManageMatrimonial: isGlobalAdmin || isDataSteward,
    
    // Chapter transfers
    canManageTransfers: isGlobalAdmin || isChapterAdmin,
    
    // Emergency contacts
    canManageEmergencyContacts: isGlobalAdmin || isChapterAdmin,
    
    // Hall bookings / Medical aid
    canApproveBookings: isGlobalAdmin || isChapterAdmin || isFinanceAdmin,
    canApproveMedicalAid: isGlobalAdmin || isChapterAdmin || isFinanceAdmin,
    
    // Audits
    canViewAudits: isGlobalAdmin || isDataSteward,
    
    // WhatsApp
    canManageWhatsApp: isGlobalAdmin,

    // Obituaries
    canPostObituaries: isGlobalAdmin || isChapterAdmin || isPublisher,

    // Derived helpers used across components
    isGlobalPublisher,
    canManageChapter,
  };
}
