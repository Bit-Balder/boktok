import { canonicalIsbn } from './isbn';

export class ScanError extends Error {}

export function isbnFromBarcode(text: string) {
  // Reject retail codes, URLs and ISBN-13 values with invalid checksums.
  return canonicalIsbn(text.trim());
}

export function coverSearchText(text: string) {
  return text
    .normalize('NFKC')
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/[^\p{L}\p{N}'’&:,.!?\s-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((line) => /\p{L}{2}/u.test(line))
    .slice(0, 8)
    .join(' ')
    .slice(0, 250)
    .trim();
}

export function cameraMessage(error: unknown) {
  const name =
    error && typeof error === 'object' && 'name' in error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Tillåt kameran i webbläsarens inställningar, eller välj en bild.';
  if (name === 'NotFoundError' || name === 'NotSupportedError')
    return 'Kameran är inte tillgänglig. Välj en bild eller skriv ISBN själv.';
  if (name === 'NotReadableError')
    return 'Kameran används redan. Stäng andra kameraappar och försök igen.';
  return 'Kameran kunde inte startas. Försök igen eller välj en bild.';
}

export function validatePhoto(file: File) {
  if (!file.type.startsWith('image/'))
    throw new ScanError('Välj en bild av boken.');
  if (file.size > 20 * 1024 * 1024)
    throw new ScanError('Bilden är för stor. Välj en bild under 20 MB.');
}

export async function photoCanvas(file: File, signal: AbortSignal) {
  validatePhoto(file);
  signal.throwIfAborted();
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        image.src = '';
        reject(new DOMException('Avbruten', 'AbortError'));
      };
      const cleanup = () => signal.removeEventListener('abort', abort);
      image.onload = () => {
        cleanup();
        resolve();
      };
      image.onerror = () => {
        cleanup();
        reject(new ScanError('Bilden kunde inte öppnas. Prova JPG eller PNG.'));
      };
      signal.addEventListener('abort', abort, { once: true });
      image.src = url;
    });
    signal.throwIfAborted();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 60_000_000
    )
      throw new ScanError('Bilden är för stor. Prova en mindre bild.');
    const scale = Math.min(
      1,
      2200 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context)
      throw new ScanError('Bilden kunde inte bearbetas i den här webbläsaren.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    image.onload = null;
    image.onerror = null;
    URL.revokeObjectURL(url);
  }
}
