import { useState, type FormEvent } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import type { AccountController } from '../hooks/useAccount';
import type { LibraryController } from '../lib/library';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input, Field } from './ui/field';
import { UserAvatar } from './UserAvatar';
import { LocalImportPanel } from './LocalImportPanel';
export function AccountDialog({
  open,
  onOpenChange,
  account,
  library,
  runAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountController;
  library: LibraryController;
  runAction: (run: () => void) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [message, setMessage] = useState('');
  const [validation, setValidation] = useState('');
  const busy = account.pending || library.pending || !account.ready;
  function changeMode(next: typeof mode) {
    setMode(next);
    setPassword('');
    setRepeat('');
    setValidation('');
    setMessage('');
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setValidation('');
    if (mode === 'register' && password !== repeat) {
      setValidation('Lösenorden behöver vara likadana.');
      return;
    }
    runAction(() => {
      void (async () => {
        const success =
          mode === 'login'
            ? await account.login(email.trim(), password)
            : mode === 'register'
              ? await account.register(email.trim(), password)
              : await account.reset(email.trim());
        if (success) {
          setPassword('');
          setRepeat('');
          if (mode === 'reset')
            setMessage(
              'Om adressen har ett konto skickar vi en länk för att återställa lösenordet.',
            );
        }
      })();
    });
  }
  const feedback = (
    <>
      {(account.error || validation) && (
        <p role="alert" className="text-sm text-destructive">
          {validation || account.error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-primary">
          {message}
        </p>
      )}
      {account.pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Ansluter till kontot…
        </p>
      )}
    </>
  );
  const title = account.user
    ? 'Din profil'
    : mode === 'register'
      ? 'Registrera dig'
      : mode === 'reset'
        ? 'Återställ lösenord'
        : 'Logga in';
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          changeMode('login');
          setEmail('');
        }
      }}
      title={title}
      description={
        account.user
          ? 'Ditt konto och dina böcker.'
          : 'Spara ditt bibliotek och fortsätt läsa på dina andra enheter.'
      }
    >
      <div className="space-y-5">
        {!account.ready ? (
          <p role="status" className="text-sm text-muted-foreground">
            Hämtar ditt konto…
          </p>
        ) : account.user ? (
          <>
            <div className="flex items-center gap-4">
              <UserAvatar user={account.user} large />
              <div className="min-w-0">
                <p className="break-words font-medium">
                  {account.user.displayName || 'Ditt konto'}
                </p>
                {account.user.email && (
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {account.user.email}
                  </p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  {library.books.length}{' '}
                  {library.books.length === 1 ? 'bok' : 'böcker'} i ditt privata
                  molnbibliotek
                </p>
              </div>
            </div>
            {feedback}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                runAction(() => {
                  void account.logout();
                })
              }
            >
              <LogOut />
              Logga ut
            </Button>
            <LocalImportPanel library={library} />
          </>
        ) : account.configured ? (
          <>
            <form aria-label={title} onSubmit={submit} className="space-y-4">
              <Field id="account-email" label="E-postadress">
                <Input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                />
              </Field>
              {mode !== 'reset' && (
                <Field id="account-password" label="Lösenord">
                  <Input
                    id="account-password"
                    type="password"
                    autoComplete={
                      mode === 'register' ? 'new-password' : 'current-password'
                    }
                    minLength={mode === 'register' ? 6 : undefined}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                  />
                </Field>
              )}
              {mode === 'register' && (
                <Field id="account-repeat" label="Upprepa lösenord">
                  <Input
                    id="account-repeat"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                    disabled={busy}
                  />
                </Field>
              )}
              <Button type="submit" className="min-h-12 w-full" disabled={busy}>
                <LogIn />
                {mode === 'login'
                  ? 'Logga in'
                  : mode === 'register'
                    ? 'Skapa konto'
                    : 'Skicka återställningslänk'}
              </Button>
            </form>
            {feedback}
            {mode !== 'reset' && (
              <Button
                variant="outline"
                className="min-h-12 w-full"
                disabled={busy}
                onClick={() =>
                  runAction(() => {
                    void account.google();
                  })
                }
              >
                Fortsätt med Google
              </Button>
            )}
            {mode === 'login' ? (
              <>
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={busy}
                  onClick={() => changeMode('reset')}
                >
                  Glömt lösenord?
                </Button>
                <p className="border-t pt-4 text-center text-sm text-muted-foreground">
                  Har du inte ett konto?{' '}
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-11 px-1 font-medium text-primary underline underline-offset-4 disabled:opacity-50"
                    onClick={() => changeMode('register')}
                  >
                    Registrera dig
                  </button>
                </p>
              </>
            ) : (
              <Button
                variant="ghost"
                className="w-full"
                disabled={busy}
                onClick={() => changeMode('login')}
              >
                Tillbaka till inloggning
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Kontoinloggning är inte tillgänglig just nu. Du kan fortsätta utan
            konto.
          </p>
        )}
      </div>
    </Dialog>
  );
}
