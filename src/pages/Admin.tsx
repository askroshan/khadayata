import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles, usePermissions } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  resolveAdminTab,
  canAccessTab,
  canAccessAdmin,
  firstAccessibleAdminTab,
  type AdminTab,
  type UserRoles,
} from "@/lib/admin-utils";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, TriangleAlert as AlertTriangle, Flag, LayoutDashboard, Building2, Calendar, DollarSign, Newspaper, ChartBar as BarChart2, ChevronDown, Users, BookOpen, Zap, Trash2 } from "lucide-react";
import AdminStats from "@/components/admin/AdminStats";
import MembersTab from "@/components/admin/MembersTab";
import RolesTab from "@/components/admin/RolesTab";
import AuditsTab from "@/components/admin/AuditsTab";
import TagRequestsTab from "@/components/admin/TagRequestsTab";
import AnnouncementsTab from "@/components/admin/AnnouncementsTab";
import ChapterTransfersTab from "@/components/admin/ChapterTransfersTab";
import ReportsTab from "@/components/admin/ReportsTab";
import SamitiTab from "@/components/admin/SamitiTab";
import VerificationDashboard from "@/components/admin/VerificationDashboard";
import DirectoryTab from "@/components/admin/DirectoryTab";
import EventsTab from "@/components/admin/EventsTab";
import FinanceTab from "@/components/admin/FinanceTab";
import NewsPublisherTab from "@/components/admin/NewsPublisherTab";
import WhatsAppTab from "@/components/admin/WhatsAppTab";
import SMSTab from "@/components/admin/SMSTab";
import BannedKeywordsTab from "@/components/admin/BannedKeywordsTab";
import ChaptersTab from "@/components/admin/ChaptersTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import BulkContentTab from "@/components/admin/BulkContentTab";

export default function Admin() {
  const { user, loading } = useAuth();
  const {
    isAnyAdmin,
    roles,
    isLoading: rolesLoading,
    isGlobalAdmin,
    isChapterAdmin,
    myChapterId,
    isDataSteward,
    isDirectoryManager,
    isEventManager,
    isFinanceAdmin,
    isPublisher,
    isModerator,
  } = useRoles();
  const { canVerifyMembers, canInviteMembers } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRoles: UserRoles = {
    isGlobalAdmin,
    isChapterAdmin,
    isDataSteward,
    isDirectoryManager,
    isEventManager,
    isFinanceAdmin,
    isPublisher,
    isModerator,
  };

  const rawTab = searchParams.get("tab");
  const requestedTab = resolveAdminTab(rawTab);
  // Bare /admin lands on a role-appropriate tab (not empty "stats").
  const activeTab: AdminTab =
    rawTab === null || rawTab === ""
      ? firstAccessibleAdminTab(userRoles)
      : canAccessTab(userRoles, requestedTab)
        ? requestedTab
        : firstAccessibleAdminTab(userRoles);

  const setTab = (tab: string) => {
    const next = resolveAdminTab(tab);
    if (canAccessTab(userRoles, next)) {
      setSearchParams({ tab: next });
    }
  };

  const { data: allMembers } = useQuery({
    queryKey: ["admin-members", myChapterId],
    queryFn: async () => {
      let q = supabase.from("members").select("id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)").order("created_at", { ascending: false }).limit(200);
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && canAccessTab(userRoles, "members"),
  });

  const { data: roleAssignments } = useQuery({
    queryKey: ["admin-roles", myChapterId],
    queryFn: async () => {
      let q = supabase
        .from("role_assignments")
        .select("id, role_id, member_id, chapter_id, start_date, end_date, created_at, roles(name, scope), members(first_name, last_name), chapters(name)")
        .order("created_at", { ascending: false });
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user && canAccessTab(userRoles, "roles"),
  });

  const { data: audits } = useQuery({
    queryKey: ["admin-audits"],
    queryFn: async () => {
      const { data } = await supabase.from("audits").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled: !!user && canAccessTab(userRoles, "audits"),
  });

  const { data: tagRequests } = useQuery({
    queryKey: ["admin-tag-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("tag_requests").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user && canAccessTab(userRoles, "tag-requests"),
  });

  const { data: announcements } = useQuery({
    queryKey: ["admin-announcements", myChapterId],
    queryFn: async () => {
      let q = supabase
        .from("announcements")
        .select("id, title, body, created_at, chapter_id")
        .order("created_at", { ascending: false });
      if (myChapterId) {
        q = q.or(`chapter_id.eq.${myChapterId},chapter_id.is.null`);
      }
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user && canAccessTab(userRoles, "announcements"),
  });

  if (loading || rolesLoading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  if (!isAnyAdmin || !canAccessAdmin(userRoles)) {
    return (
      <AppLayout title="Admin">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-center">Access Denied</h1>
          <p className="text-muted-foreground text-center mt-2 max-w-md">
            You don't have permission to access the Admin Dashboard.
            Contact a Global Admin if you believe this is an error.
          </p>
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Your current roles: {roles.length > 0 ? roles.join(", ") : "None"}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Dedicated moderation surface lives at /moderation
  if (activeTab === "moderator") {
    return <Navigate to="/moderation" replace />;
  }

  // Normalize legacy aliases / unauthorized tabs into the URL
  if (searchParams.get("tab") !== activeTab) {
    return <Navigate to={`/admin?tab=${activeTab}`} replace />;
  }

  return (
    <AppLayout title="Admin">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {isGlobalAdmin ? "Global governance, moderation & analytics" : "Chapter governance, moderation & analytics"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-0">
              <Shield className="w-3 h-3 mr-1" />
              {roles.join(", ") || "Member"}
            </Badge>
            {!isGlobalAdmin && allMembers && allMembers[0] && (
              <Badge variant="outline" className="text-xs">
                {(allMembers[0].chapters as { name: string } | null)?.name ?? "Chapter Scoped"}
              </Badge>
            )}
          </div>
        </div>

        {canVerifyMembers && <AdminStats members={allMembers} isChapterScoped={!!myChapterId} myChapterId={myChapterId} />}

        <Collapsible className="border border-border rounded-lg p-3 bg-muted/30">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-auto py-2 px-3 font-semibold">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Quick Access — Admin CRUD Operations
              </span>
              <ChevronDown className="w-4 h-4 transition-transform" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 pt-2 border-t border-border">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {canAccessTab(userRoles, "members") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("members")}>
                  <Users className="w-3 h-3 mr-1" /> Members
                </Button>
              )}
              {canAccessTab(userRoles, "chapters") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("chapters")}>
                  <Building2 className="w-3 h-3 mr-1" /> Chapters
                </Button>
              )}
              {canAccessTab(userRoles, "events") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("events")}>
                  <Calendar className="w-3 h-3 mr-1" /> Events
                </Button>
              )}
              {canAccessTab(userRoles, "roles") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("roles")}>
                  <Shield className="w-3 h-3 mr-1" /> Roles
                </Button>
              )}
              {canAccessTab(userRoles, "directory") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("directory")}>
                  <Building2 className="w-3 h-3 mr-1" /> Directory
                </Button>
              )}
              {canAccessTab(userRoles, "finance") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("finance")}>
                  <DollarSign className="w-3 h-3 mr-1" /> Finance
                </Button>
              )}
              {canAccessTab(userRoles, "news-publisher") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("news-publisher")}>
                  <Newspaper className="w-3 h-3 mr-1" /> News
                </Button>
              )}
              {canAccessTab(userRoles, "reports") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("reports")}>
                  <Flag className="w-3 h-3 mr-1" /> Reports
                </Button>
              )}
              {canAccessTab(userRoles, "announcements") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("announcements")}>
                  <BookOpen className="w-3 h-3 mr-1" /> Announce
                </Button>
              )}
              {canAccessTab(userRoles, "bulk-content") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("bulk-content")}>
                  <Trash2 className="w-3 h-3 mr-1" /> Bulk Delete
                </Button>
              )}
              {canAccessTab(userRoles, "audits") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("audits")}>
                  <LayoutDashboard className="w-3 h-3 mr-1" /> Audits
                </Button>
              )}
              {canAccessTab(userRoles, "analytics") && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setTab("analytics")}>
                  <BarChart2 className="w-3 h-3 mr-1" /> Analytics
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Tabs value={activeTab} onValueChange={setTab}>
          <div className="overflow-x-auto pb-1 -mb-1">
            <TabsList className="flex w-max min-w-full h-auto gap-1">
              {canAccessTab(userRoles, "verification") && <TabsTrigger value="verification" className="gap-1 text-xs sm:text-sm"><LayoutDashboard className="w-3.5 h-3.5" />Verification</TabsTrigger>}
              {canAccessTab(userRoles, "members") && <TabsTrigger value="members" className="text-xs sm:text-sm">Members</TabsTrigger>}
              {canAccessTab(userRoles, "roles") && <TabsTrigger value="roles" className="text-xs sm:text-sm">Roles</TabsTrigger>}
              {canAccessTab(userRoles, "reports") && <TabsTrigger value="reports" className="gap-1 text-xs sm:text-sm"><Flag className="w-3.5 h-3.5" />Reports</TabsTrigger>}
              {canAccessTab(userRoles, "transfers") && <TabsTrigger value="transfers" className="text-xs sm:text-sm">Transfers</TabsTrigger>}
              {canAccessTab(userRoles, "audits") && <TabsTrigger value="audits" className="text-xs sm:text-sm">Audit Log</TabsTrigger>}
              {canAccessTab(userRoles, "tag-requests") && <TabsTrigger value="tag-requests" className="text-xs sm:text-sm">Tags</TabsTrigger>}
              {canAccessTab(userRoles, "announcements") && <TabsTrigger value="announcements" className="text-xs sm:text-sm">Announcements</TabsTrigger>}
              {canAccessTab(userRoles, "directory") && <TabsTrigger value="directory" className="gap-1 text-xs sm:text-sm"><Building2 className="w-3.5 h-3.5" />Directory</TabsTrigger>}
              {canAccessTab(userRoles, "events") && <TabsTrigger value="events" className="gap-1 text-xs sm:text-sm"><Calendar className="w-3.5 h-3.5" />Events</TabsTrigger>}
              {canAccessTab(userRoles, "finance") && <TabsTrigger value="finance" className="gap-1 text-xs sm:text-sm"><DollarSign className="w-3.5 h-3.5" />Finance</TabsTrigger>}
              {canAccessTab(userRoles, "news-publisher") && <TabsTrigger value="news-publisher" className="gap-1 text-xs sm:text-sm"><Newspaper className="w-3.5 h-3.5" />My Content</TabsTrigger>}
              {canAccessTab(userRoles, "chapters") && <TabsTrigger value="chapters" className="gap-1 text-xs sm:text-sm"><Building2 className="w-3.5 h-3.5" />Chapters</TabsTrigger>}
              {canAccessTab(userRoles, "samiti") && <TabsTrigger value="samiti" className="text-xs sm:text-sm">Samiti</TabsTrigger>}
              {canAccessTab(userRoles, "whatsapp") && <TabsTrigger value="whatsapp" className="text-xs sm:text-sm">WhatsApp</TabsTrigger>}
              {canAccessTab(userRoles, "sms") && <TabsTrigger value="sms" className="text-xs sm:text-sm">SMS</TabsTrigger>}
              {canAccessTab(userRoles, "bulk-content") && <TabsTrigger value="bulk-content" className="gap-1 text-xs sm:text-sm"><Trash2 className="w-3.5 h-3.5" />Bulk Delete</TabsTrigger>}
              {canAccessTab(userRoles, "banned-keywords") && <TabsTrigger value="banned-keywords" className="text-xs sm:text-sm">Keywords</TabsTrigger>}
              {canAccessTab(userRoles, "analytics") && <TabsTrigger value="analytics" className="gap-1 text-xs sm:text-sm"><BarChart2 className="w-3.5 h-3.5" />Analytics</TabsTrigger>}
            </TabsList>
          </div>

          {canAccessTab(userRoles, "verification") && (
            <TabsContent value="verification" className="mt-4">
              <VerificationDashboard
                myChapterId={myChapterId}
                isGlobalAdmin={isGlobalAdmin}
                canSendReminders={isGlobalAdmin || isChapterAdmin}
              />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "members") && (
            <TabsContent value="members" className="mt-4">
              <MembersTab
                members={allMembers}
                myChapterId={myChapterId}
                canInvite={canInviteMembers}
                canSendReminders={isGlobalAdmin || isChapterAdmin}
                isGlobalAdmin={isGlobalAdmin}
              />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "roles") && (
            <TabsContent value="roles" className="mt-4">
              <RolesTab roleAssignments={roleAssignments} myChapterId={myChapterId} />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "reports") && (
            <TabsContent value="reports" className="mt-4">
              <ReportsTab />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "transfers") && (
            <TabsContent value="transfers" className="mt-4">
              <ChapterTransfersTab />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "audits") && (
            <TabsContent value="audits" className="mt-4">
              <AuditsTab audits={audits} />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "tag-requests") && (
            <TabsContent value="tag-requests" className="mt-4">
              <TagRequestsTab tagRequests={tagRequests} />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "announcements") && (
            <TabsContent value="announcements" className="mt-4">
              <AnnouncementsTab announcements={announcements} myChapterId={myChapterId} />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "directory") && (
            <TabsContent value="directory" className="mt-4">
              <DirectoryTab myChapterId={myChapterId} />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "events") && (
            <TabsContent value="events" className="mt-4">
              <EventsTab myChapterId={myChapterId} />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "finance") && (
            <TabsContent value="finance" className="mt-4">
              <FinanceTab myChapterId={myChapterId} />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "news-publisher") && (
            <TabsContent value="news-publisher" className="mt-4">
              <NewsPublisherTab myChapterId={myChapterId} />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "chapters") && (
            <TabsContent value="chapters" className="mt-4">
              <ChaptersTab />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "samiti") && (
            <TabsContent value="samiti" className="mt-4">
              <SamitiTab />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "whatsapp") && (
            <TabsContent value="whatsapp" className="mt-4">
              <WhatsAppTab />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "sms") && (
            <TabsContent value="sms" className="mt-4">
              <SMSTab />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "bulk-content") && (
            <TabsContent value="bulk-content" className="mt-4">
              <BulkContentTab />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "banned-keywords") && (
            <TabsContent value="banned-keywords" className="mt-4">
              <BannedKeywordsTab />
            </TabsContent>
          )}
          {canAccessTab(userRoles, "analytics") && (
            <TabsContent value="analytics" className="mt-4">
              <AnalyticsTab myChapterId={myChapterId} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
