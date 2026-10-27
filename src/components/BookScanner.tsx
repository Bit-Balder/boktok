import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, ScanBarcode } from 'lucide-react';
import type { SearchMode } from '../lib/lookup';
import { cameraMessage, validatePhoto, ScanError } from '../lib/scanning';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Field, Textarea } from './ui/field';

type ScanMode = 'isbn' | 'cover';
export default function BookScanner({
  onSearch,
}: {
  onSearch: (query: string, mode: SearchMode) => void;
}) {
  const [mode, setMode] = useState<ScanMode | null>(null);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const request = useRef<AbortController | null>(null);
  const barcodeFile = useRef<HTMLInputElement>(null);
  const coverFile = useRef<HTMLInputElement>(null);
  const coverCamera = useRef<HTMLInputElement>(null);
  function cancel() {
    request.current?.abort();
    request.current = null;
    setCamera(false);
    setBusy(false);
  }
  function close() {
    cancel();
    setMode(null);
  }
  function open(next: ScanMode) {
    cancel();
    setError('');
    setHint('');
    setText(null);
    setProgress(0);
    setMode(next);
  }
  function found(isbn: string) {
    close();
    onSearch(isbn, 'isbn');
  }
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!mode) return;
    const hide = () => {
      if (document.hidden) {
        request.current?.abort();
        setCamera(false);
        setBusy(false);
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [mode]);
  useEffect(() => {
    if (!camera || !video.current) return;
    const controller = new AbortController();
    request.current = controller;
    const element = video.current;
    void import('../lib/barcode')
      .then(({ startIsbnScanner }) =>
        startIsbnScanner(
          element,
          controller.signal,
          (isbn) => {
            controller.abort();
            setCamera(false);
            setMode(null);
            onSearch(isbn, 'isbn');
          },
          () =>
            setHint(
              'Streckkoden är inte ett giltigt ISBN. Rikta kameran mot bokens ISBN-streckkod.',
            ),
        ),
      )
      .catch((problem) => {
        if (!controller.signal.aborted) {
          setError(cameraMessage(problem));
          setCamera(false);
        }
      });
    return () => controller.abort();
  }, [camera, onSearch]);

  async function image(event: ChangeEvent<HTMLInputElement>, kind: ScanMode) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    cancel();
    setError('');
    setHint('');
    setText(null);
    setProgress(0);
    const controller = new AbortController();
    request.current = controller;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      validatePhoto(file);
      setBusy(true);
      timer = setTimeout(() => {
        if (request.current !== controller || controller.signal.aborted) return;
        controller.abort();
        setBusy(false);
        setError(
          'Läsningen tog för lång tid. Prova en mindre bild eller sök med titel.',
        );
      }, 90000);
      if (kind === 'isbn') {
        const { isbnFromPhoto } = await import('../lib/barcode');
        controller.signal.throwIfAborted();
        const isbn = await isbnFromPhoto(file, controller.signal);
        if (!controller.signal.aborted) found(isbn);
      } else {
        const { readCover } = await import('../lib/ocr');
        controller.signal.throwIfAborted();
        const result = await readCover(file, controller.signal, setProgress);
        if (!controller.signal.aborted) setText(result);
      }
    } catch (problem) {
      if (!controller.signal.aborted) {
        console.warn('[Boktok] Bildläsning misslyckades');
        setError(
          problem instanceof ScanError
            ? problem.message
            : 'Bilden kunde inte läsas. Försök igen eller sök med titel.',
        );
      }
    } finally {
      clearTimeout(timer);
      if (request.current === controller && !controller.signal.aborted)
        setBusy(false);
    }
  }
  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => open('isbn')}>
          <ScanBarcode />
          Skanna ISBN
        </Button>
        <Button variant="outline" onClick={() => open('cover')}>
          <Camera />
          Läs bokomslag
        </Button>
      </div>
      <Dialog
        open={mode !== null}
        onOpenChange={(value) => {
          if (!value) close();
        }}
        title={mode === 'isbn' ? 'Skanna ISBN' : 'Läs bokomslag'}
        description={
          mode === 'isbn'
            ? 'Rikta kameran mot streckkoden på bokens baksida.'
            : 'Fotografera omslaget eller välj en bild. Håll titel och författare tydliga.'
        }
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Bilder behandlas på enheten. Du granskar uppgifterna innan du sparar
            boken.
          </p>
          {mode === 'isbn' && (
            <>
              {camera && (
                <video
                  ref={video}
                  autoPlay
                  playsInline
                  muted
                  aria-label="Kameravy för ISBN"
                  className="aspect-[4/3] w-full rounded-lg bg-muted object-cover"
                />
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  onClick={() => {
                    if (camera) cancel();
                    else {
                      setError('');
                      setHint('');
                      setCamera(true);
                    }
                  }}
                >
                  <Camera />
                  {camera ? 'Stoppa kameran' : 'Starta kameran'}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => barcodeFile.current?.click()}
                >
                  <ImagePlus />
                  Välj bild
                </Button>
              </div>
              <input
                ref={barcodeFile}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Bild av ISBN-streckkod"
                onChange={(event) => {
                  void image(event, 'isbn');
                }}
              />
              <p className="text-sm text-muted-foreground">
                Ingen träff? Flytta kameran lite längre bort eller skriv ISBN i
                sökfältet.
              </p>
            </>
          )}
          {mode === 'cover' && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  onClick={() => coverCamera.current?.click()}
                >
                  <Camera />
                  Fotografera omslag
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => coverFile.current?.click()}
                >
                  <ImagePlus />
                  Välj bild
                </Button>
              </div>
              <input
                ref={coverCamera}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                aria-label="Fotografera bokomslag"
                onChange={(event) => {
                  void image(event, 'cover');
                }}
              />
              <input
                ref={coverFile}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Bild av bokomslag"
                onChange={(event) => {
                  void image(event, 'cover');
                }}
              />
              <p className="text-xs text-muted-foreground">
                Svenska och engelska stöds. Första läsningen hämtar språkfiler
                och kan ta en stund.
              </p>
            </>
          )}
          {busy && (
            <div role="status" className="space-y-2 text-sm">
              <p>
                {mode === 'cover'
                  ? progress > 0
                    ? `Läser text… ${Math.round(progress * 100)} %`
                    : 'Förbereder textläsning…'
                  : 'Läser streckkoden…'}
              </p>
              <Button variant="outline" onClick={cancel}>
                Avbryt läsning
              </Button>
            </div>
          )}
          {hint && (
            <p role="status" className="text-sm text-muted-foreground">
              {hint}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {text !== null && !busy && (
            <>
              <Field
                label="Titel och författare att söka efter"
                id="cover-query"
              >
                <Textarea
                  id="cover-query"
                  value={text}
                  maxLength={250}
                  onChange={(event) => setText(event.target.value)}
                />
              </Field>
              <p className="text-sm text-muted-foreground">
                Rätta texten och ta bort övriga ord före sökningen.
              </p>
              <Button
                disabled={!text.trim()}
                onClick={() => {
                  const query = text.trim();
                  close();
                  onSearch(query, 'all');
                }}
              >
                Sök efter boken
              </Button>
            </>
          )}
        </div>
      </Dialog>
    </>
  );
}
