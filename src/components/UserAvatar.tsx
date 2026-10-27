import { useState } from 'react';
import { UserRound } from 'lucide-react';
import type { AccountUser } from '../hooks/useAccount';
import { validCover } from '../lib/books';
import { cn } from '../lib/utils';
export function UserAvatar({
  user,
  large = false,
}: {
  user: AccountUser;
  large?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  const url =
    user.photoURL && validCover(user.photoURL) ? user.photoURL : undefined;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary',
        large ? 'size-16' : 'size-11',
      )}
    >
      {url && failed !== url ? (
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(url)}
          className="size-full object-cover"
        />
      ) : (
        <UserRound aria-hidden="true" className={large ? 'size-8' : 'size-5'} />
      )}
    </span>
  );
}
