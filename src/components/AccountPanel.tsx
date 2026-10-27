import { useState, type FormEvent } from 'react';
import { LogIn, LogOut, UserRound, CloudUpload } from 'lucide-react';
import type { AccountController } from '../hooks/useAccount';
import type { LibraryController } from '../lib/library';
import { Button } from './ui/button';
import { Input, Field } from './ui/field';
import { StatusBadge } from './StatusBadge';
export function AccountPanel({
  account,
  library,
  runAction,
}: {
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
  const [reviewing, setReviewing] = useState(false);
  const busy = account.pending || library.pending || !account.ready;
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
  const imports = library.imports;
  const item = imports?.items[0];
  return (
    <section aria-label="Konto" className="space-y-4 border-b pb-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <UserRound className="size-4" />
        Ditt konto
      </h3>
      {!account.ready ? (
        <p role="status" className="text-sm text-muted-foreground">
          Hämtar ditt konto…
        </p>
      ) : account.user ? (
        <>
          <p className="break-words text-sm">
            {account.user.displayName || account.user.email || 'Du är inloggad'}
            {account.user.displayName && account.user.email && (
              <span className="mt-1 block text-xs text-muted-foreground">
                {account.user.email}
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            Dina böcker sparas i ditt privata molnbibliotek.
          </p>
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
          {imports && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <CloudUpload className="size-4" />
                Importera lokala böcker
              </h4>
              {imports.loading ? (
                <p className="text-sm">Kontrollerar dina lokala böcker…</p>
              ) : item ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {imports.items.length} böcker återstår att granska. Dina
                    lokala böcker behålls.
                  </p>
                  {!reviewing ? (
                    <Button
                      variant="outline"
                      disabled={busy || library.blocked}
                      onClick={() => setReviewing(true)}
                    >
                      Granska import
                    </Button>
                  ) : (
                    <>
                      <div>
                        <p className="font-serif text-xl">{item.book.title}</p>
                        <p className="mb-2 text-sm text-muted-foreground">
                          {item.book.authors.join(', ') || 'Författare saknas'}
                        </p>
                        <StatusBadge status={item.book.status} />
                      </div>
                      {item.matches.length > 0 && (
                        <div className="space-y-2 rounded-md border p-3">
                          <p className="text-sm font-medium">
                            Boken kan redan finnas i molnbiblioteket.
                          </p>
                          {item.matches.map((match) => (
                            <div key={match.book.id} className="text-sm">
                              <p>{match.book.title}</p>
                              <StatusBadge status={match.book.status} />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={busy || library.blocked}
                          onClick={() => {
                            void imports.run(
                              item,
                              'add',
                              item.matches.length > 0,
                            );
                          }}
                        >
                          {item.matches.length
                            ? 'Importera ändå'
                            : 'Importera bok'}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy || library.blocked}
                          onClick={() => {
                            void imports.run(item, 'skip');
                          }}
                        >
                          Hoppa över
                        </Button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Inga lokala böcker återstår att importera.
                </p>
              )}
              {imports.error && (
                <p role="alert" className="text-sm text-destructive">
                  {imports.error}
                </p>
              )}
              {imports.notice && (
                <p role="status" className="text-sm text-primary">
                  {imports.notice}
                </p>
              )}
            </div>
          )}
        </>
      ) : account.configured ? (
        <>
          <p className="text-sm text-muted-foreground">
            Logga in för att spara böcker mellan dina enheter. Du kan också
            fortsätta utan konto.
          </p>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() =>
              runAction(() => {
                void account.google();
              })
            }
          >
            Fortsätt med Google
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === 'login' ? 'default' : 'ghost'}
              disabled={busy}
              aria-pressed={mode === 'login'}
              onClick={() => {
                setMode('login');
                setMessage('');
                setValidation('');
              }}
            >
              Logga in
            </Button>
            <Button
              variant={mode === 'register' ? 'default' : 'ghost'}
              disabled={busy}
              aria-pressed={mode === 'register'}
              onClick={() => {
                setMode('register');
                setMessage('');
                setValidation('');
              }}
            >
              Skapa konto
            </Button>
          </div>
          <form onSubmit={submit} className="space-y-4">
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
            <Button type="submit" disabled={busy}>
              <LogIn />
              {mode === 'login'
                ? 'Logga in med e-post'
                : mode === 'register'
                  ? 'Registrera konto'
                  : 'Skicka återställningslänk'}
            </Button>
          </form>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setMode('reset');
              setMessage('');
              setValidation('');
            }}
          >
            Glömt lösenord?
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Kontoinloggning är inte tillgänglig just nu. Du kan fortsätta utan
          konto.
        </p>
      )}
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
    </section>
  );
}
