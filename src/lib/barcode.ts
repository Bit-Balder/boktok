import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { isbnFromBarcode, photoCanvas, ScanError } from './scanning';

function reader() {
  return new BrowserMultiFormatReader(
    new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]),
    { delayBetweenScanAttempts: 300, delayBetweenScanSuccess: 500 },
  );
}

export async function startIsbnScanner(
  video: HTMLVideoElement,
  signal: AbortSignal,
  onResult: (isbn: string) => void,
  onInvalid: () => void,
) {
  signal.throwIfAborted();
  if (!navigator.mediaDevices?.getUserMedia)
    throw new DOMException('Camera unavailable', 'NotSupportedError');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
    audio: false,
  });
  let controls: IScannerControls | undefined;
  let delivered = false;
  const stop = () => {
    controls?.stop();
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
    signal.removeEventListener('abort', stop);
  };
  if (signal.aborted) {
    stop();
    return;
  }
  signal.addEventListener('abort', stop, { once: true });
  try {
    controls = await reader().decodeFromStream(
      stream,
      video,
      (result, _error, current) => {
        if (signal.aborted || delivered || !result) return;
        const isbn = isbnFromBarcode(result.getText());
        if (!isbn) {
          onInvalid();
          return;
        }
        delivered = true;
        current.stop();
        stop();
        onResult(isbn);
      },
    );
    if (signal.aborted || delivered) stop();
  } catch (error) {
    stop();
    if (!signal.aborted) throw error;
  }
}

export async function isbnFromPhoto(file: File, signal: AbortSignal) {
  const canvas = await photoCanvas(file, signal);
  signal.throwIfAborted();
  try {
    const isbn = isbnFromBarcode(reader().decodeFromCanvas(canvas).getText());
    if (isbn) return isbn;
  } catch {
    /* No readable barcode; use the same friendly message below. */
  } finally {
    canvas.width = canvas.height = 0;
  }
  throw new ScanError(
    'Inget giltigt ISBN hittades. Ta en skarpare bild av streckkoden eller skriv ISBN själv.',
  );
}
