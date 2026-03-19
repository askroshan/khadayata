import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { X, Heart, Loader } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ObituaryFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ObituaryForm({ onClose, onSuccess }: ObituaryFormProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    also_known_as: "",
    dob: "",
    dod: "",
    city_of_origin: "",
    city_of_passing: "",
    chapter_id: "",
    photo_url: "",
    tribute: "",
    family_message: "",
  });

  const { data: chapters } = useQuery({
    queryKey: ["chapters-list"],
    queryFn: async () => {
      const { data } = await supabase.from("chapters").select("id, name").order("name");
      return data ?? [];
    },
  });

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { setError("Full name is required."); return; }
    if (!form.dod) { setError("Date of passing is required."); return; }
    setError(null);
    setSaving(true);
    try {
      const { error: err } = await supabase.from("obituaries").insert({
        full_name: form.full_name.trim(),
        also_known_as: form.also_known_as.trim() || null,
        dob: form.dob || null,
        dod: form.dod,
        city_of_origin: form.city_of_origin.trim() || null,
        city_of_passing: form.city_of_passing.trim() || null,
        chapter_id: form.chapter_id || null,
        photo_url: form.photo_url.trim() || null,
        tribute: form.tribute.trim() || null,
        family_message: form.family_message.trim() || null,
        status: "published",
        posted_by: user?.id ?? null,
      });
      if (err) throw err;
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to post obituary.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 600,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 28px 20px",
          borderBottom: "1px solid rgba(46,46,46,0.1)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Heart size={22} style={{ color: "#F4B400" }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#2E2E2E", margin: 0 }}>
              Post Obituary
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer", padding: 6,
            color: "#2E2E2E80", borderRadius: 8,
          }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <Input
                  value={form.full_name}
                  onChange={e => set("full_name", e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                />
              </div>
              <div>
                <label style={labelStyle}>Also Known As</label>
                <Input
                  value={form.also_known_as}
                  onChange={e => set("also_known_as", e.target.value)}
                  placeholder="Nickname or alternate name"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <Input
                  type="date"
                  value={form.dob}
                  onChange={e => set("dob", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Date of Passing *</label>
                <Input
                  type="date"
                  value={form.dod}
                  onChange={e => set("dod", e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>City of Origin</label>
                <Input
                  value={form.city_of_origin}
                  onChange={e => set("city_of_origin", e.target.value)}
                  placeholder="e.g. Ahmedabad"
                />
              </div>
              <div>
                <label style={labelStyle}>City of Passing</label>
                <Input
                  value={form.city_of_passing}
                  onChange={e => set("city_of_passing", e.target.value)}
                  placeholder="e.g. Mumbai"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Chapter</label>
              <select
                value={form.chapter_id}
                onChange={e => set("chapter_id", e.target.value)}
                style={selectStyle}
              >
                <option value="">Select chapter (optional)</option>
                {(chapters ?? []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Photo URL</label>
              <Input
                value={form.photo_url}
                onChange={e => set("photo_url", e.target.value)}
                placeholder="https://... (portrait photo)"
              />
            </div>

            <div>
              <label style={labelStyle}>Tribute / Life Story</label>
              <textarea
                value={form.tribute}
                onChange={e => set("tribute", e.target.value)}
                placeholder="Share memories, achievements, and the life they lived..."
                rows={4}
                style={textareaStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Family Message</label>
              <textarea
                value={form.family_message}
                onChange={e => set("family_message", e.target.value)}
                placeholder="A message from the family..."
                rows={3}
                style={textareaStyle}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#E53935", margin: 0, padding: "10px 14px", background: "#FFEBEE", borderRadius: 8 }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "10px 22px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "transparent", border: "1.5px solid rgba(46,46,46,0.2)",
                  color: "#2E2E2E", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 26px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: saving ? "#ccc" : "#2E2E2E", color: "#fff",
                  border: "none", cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving && <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />}
                {saving ? "Posting..." : "Post Obituary"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "#2E2E2E80", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em",
};

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14,
  border: "1px solid rgba(46,46,46,0.2)", background: "#fff", color: "#2E2E2E",
  outline: "none", appearance: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14,
  border: "1px solid rgba(46,46,46,0.2)", background: "#fff", color: "#2E2E2E",
  outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
};
