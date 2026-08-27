export function PdpTags({
  tags,
  fallbackTags = [],
  className = "mt-3",
}: {
  tags: unknown;
  fallbackTags?: string[];
  className?: string;
}) {
  let parsedTags: string[] = [];
  if (Array.isArray(tags)) {
    parsedTags = tags.map((t) => String(t));
  } else if (typeof tags === "string" && tags.trim()) {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        parsedTags = parsed.map((t) => String(t));
      } else {
        parsedTags = [tags];
      }
    } catch {
      if (tags.includes(",")) {
        parsedTags = tags.split(",").map((t: string) => t.trim());
      } else {
        parsedTags = [tags.trim()];
      }
    }
  }
  const displayTags = [...fallbackTags, ...parsedTags].filter((tag, index, values) => tag && values.indexOf(tag) === index);
  if (displayTags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`} aria-label="Product tags">
      {displayTags.map((tag) => (
        <span key={tag} className="rounded-md border border-deep-brown/10 bg-[#FFF9F1] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-text-primary/65">
          #{tag}
        </span>
      ))}
    </div>
  );
}
