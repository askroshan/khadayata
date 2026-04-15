import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles, usePermissions } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
  const { isAnyAdmin, isModerator, roles, isLoading: rolesLoading, isGlobalAdmin, isChapterAdmin, myChapterId, isDataSteward, isDirectoryManager, isEventManager, isFinanceAdmin, isPublisher } = useRoles();
  const { canVerifyMembers, canManageTransfers, canViewAudits, canManageAnnouncements, canManageDirectory, canManageEvents, canManageFunds, canPublishNews, canInviteMembers } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: allMembers } = useQuery({
    queryKey: ["admin-members", myChapterId],
    queryFn: async () => {
      let q = supabase.from("members").select("id, user_id, first_name, last_name, verification_level, onboarding_completed, chapter_id, created_at, chapters(name)").order("created_at", { ascending: false }).limit(200);
      if (myChapterId) q = q.eq("chapter_id", myChapterId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && canVerifyMembers,
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
    enabled: !!user && (isGlobalAdmin || isChapterAdmin || isDataSteward),
  });

  const { data: audits } = useQuery({
    queryKey: ["admin-audits"],
    queryFn: async () => {
      const { data } = await supabase.from("audits").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled: !!user && canViewAudits,
  });

  const { data: tagRequests } = useQuery({
    queryKey: ["admin-tag-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("tag_requests").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user && (isGlobalAdmin || isChapterAdmin || isDataSteward),
  });

  const { data: announcements } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user && canManageAnnouncements,
  });

  if (loading || rolesLoading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  // Access denied for non-admins
  if (!isAnyAdmin) {
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
              {canVerifyMembers && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => searchParams.get('tab') !== 'members' && setSearchParams({ tab: 'members' })}>
                  <Users className="w-3 h-3 mr-1" /> Members
                </Button>
              )}
              {isGlobalAdmin && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setSearchParams({ tab: 'chapters' })}>
                  <Building2 className="w-3 h-3 mr-1" /> Chapters
                </Button>
              )}
              {canManageEvents && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setSearchParams({ tab: 'events' })}>
                  <Calendar className="w-3 h-3 mr-1" /> Events
                </Button>
              )}
              {(isGlobalAdmin || isChapterAdmin || isDataSteward) && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setSearchParams({ tab: 'roles' })}>
                  <Shield className="w-3 h-3 mr-1" /> Roles
                </Button>
              )}
              {canManageDirectory && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setSearchParams({ tab: 'directory' })}>
                  <Building2 className="w-3 h-3 mr-1" /> Directory
                </Button>
              )}
              {canManageFunds && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setSearchParams({ tab: 'finance' })}>
                  <DollarSign className="w-3 h-3 mr-1" /> Finance
                </Button>
              )}
              {canPublishNews && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setSearchParams({ tab: 'publisher' })}>
                  <Newspaper className="w-3 h-3 mr-1" /> News
                </Button>
              )}
              {(isAnyAdmin || isModerator) && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setSearchParams({ tab: 'reports' })}>
                  <Flag className="w-3 h-3 mr-1" /> Reports
                </Button>
              )}
              {canManageAnnouncements && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setSearchParams({ tab: 'announcements' })}>
                  <BookOpen className="w-3 h-3 mr-1" /> Announce
                </Button>
              )}
              {isGlobalAdmin && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setSearchParams({ tab: 'bulk-content' })}>
                  <Trash2 className="w-3 h-3 mr-1" /> Bulk Delete
                </Button>
              )}
              {canViewAudits && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setSearchParams({ tab: 'audits' })}>
                  <LayoutDashboard className="w-3 h-3 mr-1" /> Audits
                </Button>
              )}
              {(isGlobalAdmin || isChapterAdmin) && (
                <Button variant="outline" size="sm" className="justify-start text-xs" onClick={() => setSearchParams({ tab: 'analytics' })}>
                  <BarChart2 className="w-3 h-3 mr-1" /> Analytics
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Tabs defaultValue={searchParams.get('tab') || (isDataSteward && !isGlobalAdmin ? "verification" : isDirectoryManager && !isGlobalAdmin ? "directory" : isEventManager && !isGlobalAdmin ? "events" : isFinanceAdmin && !isGlobalAdmin ? "finance" : isPublisher && !isGlobalAdmin ? "publisher" : isModerator && !isGlobalAdmin ? "reports" : "members")} onValueChange={(tab) => setSearchParams({ tab })}>
          <div className="overflow-x-auto pb-1 -mb-1">
            <TabsList className="flex w-max min-w-full h-auto gap-1">
              {isDataSteward && <TabsTrigger value="verification" className="gap-1 text-xs sm:text-sm"><LayoutDashboard className="w-3.5 h-3.5" />Verification</TabsTrigger>}
              {canVerifyMembers && <TabsTrigger value="members" className="text-xs sm:text-sm">Members</TabsTrigger>}
              {(isGlobalAdmin || isChapterAdmin || isDataSteward) && <TabsTrigger value="roles" className="text-xs sm:text-sm">Roles</TabsTrigger>}
              {(isAnyAdmin || isModerator) && <TabsTrigger value="reports" className="gap-1 text-xs sm:text-sm"><Flag className="w-3.5 h-3.5" />Reports</TabsTrigger>}
              {canManageTransfers && <TabsTrigger value="transfers" className="text-xs sm:text-sm">Transfers</TabsTrigger>}
              {canViewAudits && <TabsTrigger value="audits" className="text-xs sm:text-sm">Audit Log</TabsTrigger>}
              {(isGlobalAdmin || isChapterAdmin || isDataSteward) && <TabsTrigger value="tags" className="text-xs sm:text-sm">Tags</TabsTrigger>}
              {canManageAnnouncements && <TabsTrigger value="announcements" className="text-xs sm:text-sm">Announcements</TabsTrigger>}
              {canManageDirectory && <TabsTrigger value="directory" className="gap-1 text-xs sm:text-sm"><Building2 className="w-3.5 h-3.5" />Directory</TabsTrigger>}
              {canManageEvents && <TabsTrigger value="events" className="gap-1 text-xs sm:text-sm"><Calendar className="w-3.5 h-3.5" />Events</TabsTrigger>}
              {canManageFunds && <TabsTrigger value="finance" className="gap-1 text-xs sm:text-sm"><DollarSign className="w-3.5 h-3.5" />Finance</TabsTrigger>}
              {canPublishNews && <TabsTrigger value="publisher" className="gap-1 text-xs sm:text-sm"><Newspaper className="w-3.5 h-3.5" />My Content</TabsTrigger>}
              {isGlobalAdmin && <TabsTrigger value="chapters" className="gap-1 text-xs sm:text-sm"><Building2 className="w-3.5 h-3.5" />Chapters</TabsTrigger>}
              {(isGlobalAdmin || isChapterAdmin) && <TabsTrigger value="samiti" className="text-xs sm:text-sm">Samiti</TabsTrigger>}
              {isGlobalAdmin && <TabsTrigger value="whatsapp" className="text-xs sm:text-sm">WhatsApp</TabsTrigger>}
              {isGlobalAdmin && <TabsTrigger value="sms" className="text-xs sm:text-sm">SMS</TabsTrigger>}
              {isGlobalAdmin && <TabsTrigger value="bulk-content" className="gap-1 text-xs sm:text-sm"><Trash2 className="w-3.5 h-3.5" />Bulk Delete</TabsTrigger>}
              {(isGlobalAdmin || isModerator) && <TabsTrigger value="keywords" className="text-xs sm:text-sm">Keywords</TabsTrigger>}
              {(isGlobalAdmin || isChapterAdmin) && <TabsTrigger value="analytics" className="gap-1 text-xs sm:text-sm"><BarChart2 className="w-3.5 h-3.5" />Analytics</TabsTrigger>}
            </TabsList>
          </div>

          {isDataSteward && (
            <TabsContent value="verification" className="mt-4">
              <VerificationDashboard myChapterId={myChapterId} />
            </TabsContent>
          )}
          {canVerifyMembers && (
            <TabsContent value="members" className="mt-4">
              <MembersTab members={allMembers} myChapterId={myChapterId} canInvite={canInviteMembers} isGlobalAdmin={isGlobalAdmin} />
            </TabsContent>
          )}
          {(isGlobalAdmin || isChapterAdmin || isDataSteward) && (
            <TabsContent value="roles" className="mt-4">
              <RolesTab roleAssignments={roleAssignments} myChapterId={myChapterId} />
            </TabsContent>
          )}
          {(isAnyAdmin || isModerator) && (
            <TabsContent value="reports" className="mt-4">
              <ReportsTab />
            </TabsContent>
          )}
          {canManageTransfers && (
            <TabsContent value="transfers" className="mt-4">
              <ChapterTransfersTab />
            </TabsContent>
          )}
          {canViewAudits && (
            <TabsContent value="audits" className="mt-4">
              <AuditsTab audits={audits} />
            </TabsContent>
          )}
          {(isGlobalAdmin || isChapterAdmin || isDataSteward) && (
            <TabsContent value="tags" className="mt-4">
              <TagRequestsTab tagRequests={tagRequests} />
            </TabsContent>
          )}
          {canManageAnnouncements && (
            <TabsContent value="announcements" className="mt-4">
              <AnnouncementsTab announcements={announcements} myChapterId={myChapterId} />
            </TabsContent>
          )}
          {canManageDirectory && (
            <TabsContent value="directory" className="mt-4">
              <DirectoryTab myChapterId={myChapterId} />
            </TabsContent>
          )}
          {canManageEvents && (
            <TabsContent value="events" className="mt-4">
              <EventsTab myChapterId={myChapterId} />
            </TabsContent>
          )}
          {canManageFunds && (
            <TabsContent value="finance" className="mt-4">
              <FinanceTab myChapterId={myChapterId} />
            </TabsContent>
          )}
          {canPublishNews && (
            <TabsContent value="publisher" className="mt-4">
              <NewsPublisherTab myChapterId={myChapterId} />
            </TabsContent>
          )}
          {isGlobalAdmin && (
            <TabsContent value="chapters" className="mt-4">
              <ChaptersTab />
            </TabsContent>
          )}
          {(isGlobalAdmin || isChapterAdmin) && (
            <TabsContent value="samiti" className="mt-4">
              <SamitiTab />
            </TabsContent>
          )}
          {isGlobalAdmin && (
            <TabsContent value="whatsapp" className="mt-4">
              <WhatsAppTab />
            </TabsContent>
          )}
          {isGlobalAdmin && (
            <TabsContent value="sms" className="mt-4">
              <SMSTab />
            </TabsContent>
          )}
          {isGlobalAdmin && (
            <TabsContent value="bulk-content" className="mt-4">
              <BulkContentTab />
            </TabsContent>
          )}
          {(isGlobalAdmin || isModerator) && (
            <TabsContent value="keywords" className="mt-4">
              <BannedKeywordsTab />
            </TabsContent>
          )}
          {(isGlobalAdmin || isChapterAdmin) && (
            <TabsContent value="analytics" className="mt-4">
              <AnalyticsTab myChapterId={myChapterId} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
