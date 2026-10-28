import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
export function BookCover({
  title,
  url,
  compact = false,
}: {
  title: string;
  url?: string;
  compact?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  if (url && url !== failedUrl)
    return (
      <img
        src={url}
        alt={`Omslag: ${title}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(url)}
        className={cn(
          'rounded-sm object-contain shadow-md',
          compact ? 'h-20 w-14 shrink-0' : 'h-full max-w-full',
        )}
      />
    );
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex flex-col items-center justify-center rounded-r-md border-l-4 border-cover-spine bg-cover-background text-center text-cover-foreground',
        compact ? 'h-20 w-14 shrink-0' : 'h-full w-32 gap-4 p-4',
      )}
    >
      <BookOpen className={compact ? 'size-5' : 'size-7'} />
      {!compact && (
        <span className="line-clamp-3 font-serif text-lg">{title}</span>
      )}
    </span>
  );
}
