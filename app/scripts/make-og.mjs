#!/usr/bin/env node
/**
 * Builds public/og.jpg (1200×630), the link-preview image for social networks and messaging apps,
 * from a screenshot of the 3D scene (assets-src/og-screenshot.jpg) plus a title band.
 *
 * Usage:  node scripts/make-og.mjs
 */
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
GlobalFonts.registerFromPath(path.join(root, 'public/fonts/Heebo-Black.ttf'), 'Heebo Black');
GlobalFonts.registerFromPath(path.join(root, 'public/fonts/Heebo-Regular.ttf'), 'Heebo');

const W = 1200, H = 630;
const c = createCanvas(W, H);
const g = c.getContext('2d');

// background: crop the screenshot to 1.905:1, keeping the river's peak and the State of Israel block
const img = await loadImage(path.join(root, 'assets-src/og-screenshot.jpg'));
const cropH = img.height, cropW = Math.min(img.width, Math.round(cropH * (W / H)));
g.drawImage(img, 0, 0, cropW, cropH, 0, 0, W, H);

// title band along the top, fading downwards
const grad = g.createLinearGradient(0, 0, 0, 230);
grad.addColorStop(0, 'rgba(244,238,224,0.97)');
grad.addColorStop(0.7, 'rgba(244,238,224,0.85)');
grad.addColorStop(1, 'rgba(244,238,224,0)');
g.fillStyle = grad;
g.fillRect(0, 0, W, 230);

g.direction = 'rtl';
g.textAlign = 'right';
g.fillStyle = '#2b2418';
g.font = '900 68px "Heebo Black"';
g.fillText('ציר הזמן היהודי בתלת־ממד', W - 48, 92);
g.fillStyle = '#4a3f2c';
g.font = '400 30px Heebo';
g.fillText('אירועים · דמוגרפיה · שלטון בארץ ישראל · גלובוס של קהילות ונדידות', W - 48, 142);

g.direction = 'ltr';
g.textAlign = 'left';
g.fillStyle = '#6b5d45';
g.font = '400 26px Heebo';
g.fillText('Jewish History in 3D', 48, 186);

// small badge, bottom-left
const url = 'dovz11.github.io/jewish-history-map';
g.font = '400 22px Heebo';
const badgeW = g.measureText(url).width + 36;
g.fillStyle = 'rgba(43,36,24,0.85)';
g.beginPath();
g.roundRect(40, H - 78, badgeW, 46, 23);
g.fill();
g.fillStyle = '#fff';
g.fillText(url, 58, H - 47);

await writeFile(path.join(root, 'public/og.jpg'), await c.encode('jpeg', 88));
console.log('public/og.jpg written');
