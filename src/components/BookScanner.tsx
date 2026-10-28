import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, ScanBarcode } from 'lucide-react';
import type { SearchMode } from '../lib/lookup';
import { cameraMessage, validatePhoto, ScanError } from '../lib/scanning';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';

export default function BookScanner({
  onSearch,
}: {
  onSearch: (query: string, mode: SearchMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const request = useRef<AbortController | null>(null);
  const barcodeFile = useRef<HTMLInputElement>(null);
  function cancel() {
    request.current?.abort();
    request.current = null;
    setCamera(false);
    setBusy(false);
  }
  function close() {
    cancel();
    setOpen(false);
  }
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const hide = () => {
      if (document.hidden) {
        request.current?.abort();
        setCamera(false);
        setBusy(false);
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [open]);
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
            setOpen(false);
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

  async function image(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    cancel();
    setError('');
    setHint('');
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
          'Läsningen tog för lång tid. Prova en mindre bild eller skriv ISBN själv.',
        );
      }, 30000);
      const { isbnFromPhoto } = await import('../lib/barcode');
      controller.signal.throwIfAborted();
      const isbn = await isbnFromPhoto(file, controller.signal);
      if (!controller.signal.aborted) {
        close();
        onSearch(isbn, 'isbn');
      }
    } catch (problem) {
      if (!controller.signal.aborted) {
        console.warn('[Boktok] Bildläsning misslyckades');
        setError(
          problem instanceof ScanError
            ? problem.message
            : 'Bilden kunde inte läsas. Försök igen eller skriv ISBN själv.',
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
      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => {
            cancel();
            setError('');
            setHint('');
            setOpen(true);
          }}
        >
          <ScanBarcode />
          Skanna ISBN
        </Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
        title="Skanna ISBN"
        description="Rikta kameran mot streckkoden på bokens baksida."
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Bilder behandlas på enheten. Du granskar uppgifterna innan du sparar
            boken.
          </p>
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
              void image(event);
            }}
          />
          <p className="text-sm text-muted-foreground">
            Ingen träff? Flytta kameran lite längre bort eller skriv ISBN i
            sökfältet.
          </p>
          {busy && (
            <div role="status" className="space-y-2 text-sm">
              <p>Läser streckkoden…</p>
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
        </div>
      </Dialog>
    </>
  );
}
