import { extractVideoId, buildEmbedUrl } from "@/lib/video-utils";

interface VideoEmbedProps {
  url: string;
  title?: string;
  className?: string;
}

export function VideoEmbed({ url, title, className = "" }: VideoEmbedProps) {
  const { provider, id } = extractVideoId(url);
  if (!provider || !id) return null;

  const embedUrl = buildEmbedUrl(provider, id);

  return (
    <div className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black ${className}`}>
      <iframe
        src={embedUrl}
        title={title || "Video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
        loading="lazy"
      />
    </div>
  );
}
