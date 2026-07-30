export function extractVideoId(url: string): { provider: "youtube" | "vimeo" | null; id: string | null } {
  if (!url) return { provider: null, id: null };

  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const match = url.match(pattern);
    if (match) return { provider: "youtube", id: match[1] };
  }

  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return { provider: "vimeo", id: vimeoMatch[1] };

  return { provider: null, id: null };
}

export function buildEmbedUrl(provider: "youtube" | "vimeo", id: string): string {
  if (provider === "youtube") return `https://www.youtube-nocookie.com/embed/${id}`;
  if (provider === "vimeo") return `https://player.vimeo.com/video/${id}`;
  return "";
}

export function isValidVideoUrl(url: string): boolean {
  const { provider, id } = extractVideoId(url);
  return provider !== null && id !== null;
}
