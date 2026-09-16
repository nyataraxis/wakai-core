import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const destination = new URL('apps/web/public/data/', root);
await mkdir(destination, { recursive: true });
for (const name of ['alchemy.json', 'audit.json']) {
  try {
    await copyFile(new URL(`data/generated/${name}`, root), new URL(name, destination));
  } catch (error) {
    throw new Error(
      `Missing ${name}. Run pnpm generate first. Destination: ${fileURLToPath(destination)}`,
      { cause: error }
    );
  }
}
for (const name of ['NOTICE.md', 'KANJIVG-LICENSE.txt']) {
  await copyFile(new URL(`data/${name}`, root), new URL(name, destination));
}
