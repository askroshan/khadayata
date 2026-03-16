import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader as Loader2 } from "lucide-react";

interface AvatarUploadProps {
  currentUrl?: string | null;
  onUploadComplete: (url: string) => void;
  size?: "sm" | "md" | "lg";
  initials?: string;
}

const SIZES = {
  sm: "w-12 h-12 text-sm",
  md: "w-20 h-20 text-xl",
  lg: "w-28 h-28 text-2xl",
};

export function AvatarUpload({ currentUrl, onUploadComplete, size = "md", initials = "?" }: AvatarUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Add cache-busting timestamp
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      onUploadComplete(urlWithTimestamp);
      toast({ title: "Photo uploaded!" });
    } catch (err: unknown) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      {currentUrl ? (
        <img
          src={currentUrl}
          alt="Avatar"
          className={`${SIZES[size]} rounded-full object-cover border-4 border-background shadow-lg`}
        />
      ) : (
        <div className={`${SIZES[size]} rounded-full gradient-hero flex items-center justify-center text-primary-foreground font-bold border-4 border-background shadow-lg`}>
          {initials}
        </div>
      )}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
        ) : (
          <Camera className="w-6 h-6 text-primary-foreground" />
        )}
      </button>
    </div>
  );
}
