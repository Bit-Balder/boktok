import { createWorker, OEM, PSM, type Worker } from 'tesseract.js';
import { coverSearchText, photoCanvas, ScanError } from './scanning';

export async function readCover(
  file: File,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
) {
  const canvas = await photoCanvas(file, signal);
  const base = new URL(
    `${import.meta.env.BASE_URL}ocr/`,
    window.location.origin,
  ).href;
  let worker: Worker | undefined;
  let stopped = false;
  const stop = () => {
    if (worker && !stopped) {
      stopped = true;
      void worker.terminate().catch(() => {});
    }
  };
  let rejectAbort: (reason: unknown) => void = () => {};
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  const abort = () => {
    stop();
    rejectAbort(new DOMException('Avbruten', 'AbortError'));
  };
  signal.addEventListener('abort', abort, { once: true });
  // Race the entire operation, including language initialization. A late worker is terminated too.
  const operation = (async () => {
    signal.throwIfAborted();
    worker = await createWorker(['swe', 'eng'], OEM.LSTM_ONLY, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      langPath: base,
      workerBlobURL: false,
      logger: (message) => {
        if (!signal.aborted)
          onProgress(
            message.status === 'recognizing text' ? message.progress : 0,
          );
      },
    });
    if (signal.aborted) {
      stop();
      signal.throwIfAborted();
    }
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    signal.throwIfAborted();
    const result = await worker.recognize(canvas);
    signal.throwIfAborted();
    const text = coverSearchText(result.data.text);
    if (!text)
      throw new ScanError(
        'Ingen tydlig text hittades. Ta en skarpare bild eller sök med titel.',
      );
    return text;
  })();
  try {
    return await Promise.race([operation, aborted]);
  } finally {
    signal.removeEventListener('abort', abort);
    stop();
    canvas.width = canvas.height = 0;
  }
}
