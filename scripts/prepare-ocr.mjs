import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, 'public', 'ocr');
await mkdir(target, { recursive: true });
const core = dirname(require.resolve('tesseract.js-core/package.json'));
for (const name of [
  'tesseract-core-lstm',
  'tesseract-core-simd-lstm',
  'tesseract-core-relaxedsimd-lstm',
]) {
  for (const extension of ['wasm.js', 'wasm']) {
    await copyFile(
      join(core, `${name}.${extension}`),
      join(target, `${name}.${extension}`),
    );
  }
}
await copyFile(
  require.resolve('tesseract.js/dist/worker.min.js'),
  join(target, 'worker.min.js'),
);
for (const language of ['swe', 'eng']) {
  const data = dirname(
    require.resolve(`@tesseract.js-data/${language}/package.json`),
  );
  await copyFile(
    join(data, '4.0.0_best_int', `${language}.traineddata.gz`),
    join(target, `${language}.traineddata.gz`),
  );
}
await copyFile(
  require.resolve('tesseract.js/dist/worker.min.js.LICENSE.txt'),
  join(target, 'worker.min.js.LICENSE.txt'),
);
await copyFile(
  require.resolve('tesseract.js/LICENSE.md'),
  join(target, 'TESSERACT-LICENSE.txt'),
);
await copyFile(join(core, 'LICENSE'), join(target, 'CORE-LICENSE.txt'));
