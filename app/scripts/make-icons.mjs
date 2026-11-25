#!/usr/bin/env node
/**
 * Builds the installable-app icons (public/icon-192.png, icon-512.png, apple-touch-icon.png)
 * from public/favicon.svg, so "Add to home screen" opens the site full screen with a proper icon.
 *
 * Usage:  node scripts/make-icons.mjs
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(path.join(root, 'public/favicon.svg'));
const img = await loadImage(svg);

for (const [name, size, pad] of [['icon-192.png', 192, 0.12], ['icon-512.png', 512, 0.12], ['apple-touch-icon.png', 180, 0.08]]) {
  const c = createCanvas(size, size);
  const g = c.getContext('2d');
  // full-bleed background, so "maskable" crops (circles, squircles) never show transparent corners
  g.fillStyle = '#f4eee0';
  g.fillRect(0, 0, size, size);
  const p = size * pad;
  g.drawImage(img, p, p, size - 2 * p, size - 2 * p);
  await writeFile(path.join(root, 'public', name), c.toBuffer('image/png'));
  console.log(`public/${name}`);
}
