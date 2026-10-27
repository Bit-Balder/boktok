import { LogIn, LoaderCircle } from 'lucide-react';
import type { AccountController } from '../hooks/useAccount';
import type { LibraryController } from '../lib/library';
import { Button } from './ui/button';
import { UserAvatar } from './UserAvatar';
import { AccountDialog } from './AccountDialog';
export function AccountControl({
  account,
  library,
  open,
  onOpenChange,
  runAction,
}: {
  account: AccountController;
  library: LibraryController;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runAction: (run: () => void) => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant={account.user ? 'ghost' : 'outline'}
        disabled={!account.ready}
        aria-label={
          !account.ready
            ? 'Hämtar konto'
            : account.user
              ? 'Öppna profil'
              : 'Logga in'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        title={account.user?.displayName || account.user?.email || undefined}
        className={account.user ? 'size-11 rounded-full p-0' : 'min-h-11'}
        onClick={() => onOpenChange(true)}
      >
        {!account.ready ? (
          <LoaderCircle className="animate-spin" />
        ) : account.user ? (
          <UserAvatar user={account.user} />
        ) : (
          <>
            <LogIn />
            Logga in
          </>
        )}
      </Button>
      <AccountDialog
        open={open}
        onOpenChange={onOpenChange}
        account={account}
        library={library}
        runAction={runAction}
      />
    </>
  );
}
