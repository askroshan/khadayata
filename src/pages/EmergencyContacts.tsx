import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Search, TriangleAlert as AlertTriangle, Building, User, Stethoscope, Shield } from "lucide-react";

const TYPE_ICONS: Record<string, typeof Phone> = {
  hospital: Stethoscope,
  police: Shield,
  fire: AlertTriangle,
  community: User,
  government: Building,
  other: Phone,
};

const TYPE_COLORS: Record<string, string> = {
  hospital: "from-success to-success/70",
  police: "from-primary to-primary/70",
  fire: "from-destructive to-destructive/70",
  community: "from-secondary to-secondary/70",
  government: "from-jewel to-jewel/70",
  other: "from-muted-foreground to-muted-foreground/70",
};

export default function EmergencyContacts() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["emergency-contacts", search],
    queryFn: async () => {
      let q = supabase.from("emergency_contacts").select("*, cities(name)").order("type").order("name");
      if (search.trim()) {
        q = q.or(`name.ilike.%${search}%,type.ilike.%${search}%`);
      }
      const { data } = await q.limit(100);
      return data ?? [];
    },
    enabled: !!user,
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  // Group by type
  const groupedContacts = contacts?.reduce((acc, contact) => {
    const type = contact.type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(contact);
    return acc;
  }, {} as Record<string, typeof contacts>);

  return (
    <AppLayout title="Emergency Contacts">
      <div className="space-y-6">
        {/* Hero */}
        <div className="bg-destructive/90 p-6 sm:p-8 text-destructive-foreground">
          <h1 className="text-xl sm:text-3xl font-display font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" /> Emergency Contacts
          </h1>
          <p className="text-destructive-foreground/80 mt-1 max-w-md">
            Important emergency numbers for community members. Keep these handy for urgent situations.
          </p>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-destructive-foreground text-foreground border-0"
              maxLength={100}
            />
          </div>
        </div>

        <div className="px-3 sm:px-6 pb-6 space-y-6">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : !contacts?.length ? (
            <Card className="shadow-card">
              <CardContent className="text-center py-16">
                <Phone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No emergency contacts found</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedContacts ?? {}).map(([type, typeContacts]) => {
              const Icon = TYPE_ICONS[type] ?? Phone;
              return (
                <div key={type} className="space-y-3">
                  <h2 className="text-lg font-display font-bold capitalize flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    {type}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {typeContacts?.map((contact) => (
                      <Card key={contact.id} className="shadow-card hover:shadow-elevated transition-all group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${TYPE_COLORS[type] ?? TYPE_COLORS.other} flex items-center justify-center text-primary-foreground shrink-0`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm break-words group-hover:text-primary transition-colors">
                                {contact.name}
                              </h3>
                              {(contact.cities as { name: string } | null)?.name && (
                                <p className="text-xs text-muted-foreground">{(contact.cities as { name: string } | null)?.name}</p>
                              )}
                              <a
                                href={`tel:${contact.phone}`}
                                className="flex items-center gap-1 text-sm font-mono text-primary mt-2 hover:underline"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {contact.phone}
                              </a>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* Universal emergency numbers */}
          <Card className="shadow-elevated border-destructive/30 overflow-hidden">
            <div className="h-2 bg-destructive" />
            <CardContent className="p-5">
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" /> Universal Emergency Numbers
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { country: "India", number: "112", label: "National Emergency" },
                  { country: "USA", number: "911", label: "Emergency Services" },
                  { country: "UK", number: "999", label: "Emergency Services" },
                ].map((em) => (
                  <div key={em.country} className="p-4 rounded-lg bg-destructive/10 text-center">
                    <Badge variant="outline" className="mb-2">{em.country}</Badge>
                    <a href={`tel:${em.number}`} className="text-2xl font-bold font-mono text-destructive block">
                      {em.number}
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">{em.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
