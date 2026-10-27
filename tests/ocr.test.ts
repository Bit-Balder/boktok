import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ create: vi.fn(), canvas: vi.fn() }));
vi.mock('tesseract.js', () => ({
  createWorker: mocks.create,
  OEM: { LSTM_ONLY: 1 },
  PSM: { SPARSE_TEXT: '11' },
}));
vi.mock('../src/lib/scanning', async (original) => {
  const actual = await original<typeof import('../src/lib/scanning')>();
  return { ...actual, photoCanvas: mocks.canvas };
});
import { readCover } from '../src/lib/ocr';
const file = new File([''], 'cover.jpg', { type: 'image/jpeg' });
afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.stubEnv('BASE_URL', '/boktok/');
  mocks.canvas.mockReset().mockResolvedValue({ width: 100, height: 100 });
  mocks.create.mockReset();
});
function worker() {
  return {
    setParameters: vi.fn().mockResolvedValue(undefined),
    recognize: vi.fn().mockResolvedValue({ data: { text: 'ÅSA\nSOLSTORM' } }),
    terminate: vi.fn().mockResolvedValue(undefined),
  };
}
describe('omslagsläsningens livscykel', () => {
  it('använder egna språkfiler och stänger arbetaren efter läsning', async () => {
    const engine = worker();
    mocks.create.mockResolvedValue(engine);
    const result = await readCover(file, new AbortController().signal, vi.fn());
    expect(result).toBe('ÅSA SOLSTORM');
    const options = mocks.create.mock.calls[0][2];
    expect(mocks.create.mock.calls[0][0]).toEqual(['swe', 'eng']);
    expect(new URL(options.workerPath).pathname).toBe(
      '/boktok/ocr/worker.min.js',
    );
    expect(new URL(options.langPath).origin).toBe(window.location.origin);
    expect(engine.terminate).toHaveBeenCalledOnce();
  });
  it('avbryter väntan på språkfiler och stänger en sent startad arbetare', async () => {
    const engine = worker();
    let resolve!: (value: typeof engine) => void;
    mocks.create.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const controller = new AbortController();
    const result = readCover(file, controller.signal, vi.fn());
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    resolve(engine);
    await vi.waitFor(() => expect(engine.terminate).toHaveBeenCalledOnce());
    expect(engine.recognize).not.toHaveBeenCalled();
  });
  it('stänger arbetaren vid avbrott under pågående textläsning', async () => {
    const engine = worker();
    engine.recognize.mockImplementation(() => new Promise(() => {}));
    mocks.create.mockResolvedValue(engine);
    const controller = new AbortController();
    const result = readCover(file, controller.signal, vi.fn());
    await vi.waitFor(() => expect(engine.recognize).toHaveBeenCalledOnce());
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(engine.terminate).toHaveBeenCalledOnce();
  });
  it('stänger arbetaren vid misslyckad läsning', async () => {
    const engine = worker();
    engine.recognize.mockRejectedValue(new Error('worker failed'));
    mocks.create.mockResolvedValue(engine);
    await expect(
      readCover(file, new AbortController().signal, vi.fn()),
    ).rejects.toThrow();
    expect(engine.terminate).toHaveBeenCalledOnce();
  });
});
