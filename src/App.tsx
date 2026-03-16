import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChapterLayout } from "@/components/ChapterLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import ResetPassword from "./pages/ResetPassword";
import Directory from "./pages/Directory";
import MemberProfile from "./pages/MemberProfile";
import Events from "./pages/Events";
import Business from "./pages/Business";
import Matrimonial from "./pages/Matrimonial";
import Temple from "./pages/Temple";
import Archives from "./pages/Archives";
import GlobalSearch from "./pages/Search";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Profile from "./pages/Profile";
import Mentorship from "./pages/Mentorship";
import Scholarships from "./pages/Scholarships";
import Services from "./pages/Services";
import OralHistory from "./pages/OralHistory";
import EmergencyContacts from "./pages/EmergencyContacts";
import Chapters from "./pages/Chapters";
import ChapterDetail from "./pages/ChapterDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ChapterLayout>
            <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/member/:id" element={<MemberProfile />} />
              <Route path="/events" element={<Events />} />
              <Route path="/business" element={<Business />} />
              <Route path="/matrimonial" element={<Matrimonial />} />
              <Route path="/temple" element={<Temple />} />
              <Route path="/archives" element={<Archives />} />
              <Route path="/search" element={<GlobalSearch />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:id" element={<NewsDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/mentorship" element={<Mentorship />} />
              <Route path="/scholarships" element={<Scholarships />} />
              <Route path="/services" element={<Services />} />
              <Route path="/oral-history" element={<OralHistory />} />
              <Route path="/emergency" element={<EmergencyContacts />} />
              <Route path="/chapters" element={<Chapters />} />
              <Route path="/chapters/:slug" element={<ChapterDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ErrorBoundary>
          </ChapterLayout>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
