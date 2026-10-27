import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isbnFromBarcode,
  coverSearchText,
  cameraMessage,
  validatePhoto,
} from '../src/lib/scanning';
const mocks = vi.hoisted(() => ({ decode: vi.fn() }));
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    decodeFromStream = mocks.decode;
  },
}));
import { startIsbnScanner } from '../src/lib/barcode';
beforeEach(() => {
  mocks.decode.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('ISBN och omslagstext', () => {
  it('godkänner ISBN men avvisar andra varukoder och fel kontrollsiffra', () => {
    expect(isbnFromBarcode('9780306406157')).toBe('9780306406157');
    expect(isbnFromBarcode('0-306-40615-2')).toBe('9780306406157');
    expect(isbnFromBarcode('4006381333931')).toBeUndefined();
    expect(isbnFromBarcode('9780306406158')).toBeUndefined();
    expect(
      isbnFromBarcode('https://example.com/9780306406157'),
    ).toBeUndefined();
  });
  it('rensar omslagstext, behåller svenska bokstäver och begränsar söklängden', () => {
    expect(coverSearchText(' ÅSA LARSSON\n***\n  Solstorm  \n  ')).toBe(
      'ÅSA LARSSON Solstorm',
    );
    expect(coverSearchText('Ord '.repeat(100)).length).toBeLessThanOrEqual(250);
    expect(coverSearchText('123\n***')).toBe('');
  });
  it('ger begripliga kamerafel och avvisar för stora eller felaktiga filer', () => {
    expect(cameraMessage(new DOMException('', 'NotAllowedError'))).toContain(
      'Tillåt kameran',
    );
    expect(cameraMessage(new DOMException('', 'NotFoundError'))).toContain(
      'inte tillgänglig',
    );
    expect(() =>
      validatePhoto(new File(['text'], 'book.txt', { type: 'text/plain' })),
    ).toThrow('Välj en bild');
    const file = new File([''], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 });
    expect(() => validatePhoto(file)).toThrow('20 MB');
  });
});
describe('kamerans livscykel', () => {
  function camera(getUserMedia: ReturnType<typeof vi.fn>) {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  }
  it('stoppar en kamera som beviljas först efter att dialogen stängts', async () => {
    const stop = vi.fn();
    let resolve!: (stream: MediaStream) => void;
    camera(
      vi.fn(
        () =>
          new Promise<MediaStream>((done) => {
            resolve = done;
          }),
      ),
    );
    const controller = new AbortController();
    const run = startIsbnScanner(
      document.createElement('video'),
      controller.signal,
      vi.fn(),
      vi.fn(),
    );
    controller.abort();
    resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    await run;
    expect(stop).toHaveBeenCalled();
    expect(mocks.decode).not.toHaveBeenCalled();
  });
  it('levererar ett ISBN en gång och stänger kameran', async () => {
    const stop = vi.fn();
    const controls = { stop: vi.fn() };
    const result = vi.fn();
    const invalid = vi.fn();
    const video = document.createElement('video');
    camera(vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }));
    mocks.decode.mockImplementation(async (_stream, _video, callback) => {
      callback({ getText: () => '4006381333931' }, undefined, controls);
      callback({ getText: () => '9780306406157' }, undefined, controls);
      callback({ getText: () => '9780306406157' }, undefined, controls);
      return controls;
    });
    await startIsbnScanner(
      video,
      new AbortController().signal,
      result,
      invalid,
    );
    expect(result).toHaveBeenCalledExactlyOnceWith('9780306406157');
    expect(invalid).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalled();
    expect(controls.stop).toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
  });
  it('stänger strömmen vid avbrott och vid fel under start', async () => {
    for (const failure of [false, true]) {
      const stop = vi.fn();
      const controls = { stop: vi.fn() };
      camera(vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }));
      mocks.decode.mockImplementation(async () => {
        if (failure) throw new Error('video failed');
        return controls;
      });
      const controller = new AbortController();
      const run = startIsbnScanner(
        document.createElement('video'),
        controller.signal,
        vi.fn(),
        vi.fn(),
      );
      if (failure) await expect(run).rejects.toThrow('video failed');
      else await run;
      controller.abort();
      expect(stop).toHaveBeenCalled();
      if (!failure) expect(controls.stop).toHaveBeenCalled();
    }
  });
});
