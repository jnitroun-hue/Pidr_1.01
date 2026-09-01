/**
 * Качает CC0/CC-BY арты с GitHub и собирает карточные PNG.
 * Запуск: node scripts/fetch-nft-theme-arts.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SIZE = 1024;

const GH = 'https://raw.githubusercontent.com';

const STAR_SHIPS = [
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip1_blue.png`,
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip1_green.png`,
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip1_orange.png`,
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip1_red.png`,
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip2_blue.png`,
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip2_green.png`,
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip2_orange.png`,
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip2_red.png`,
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip3_blue.png`,
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip3_green.png`,
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip3_orange.png`,
  `${GH}/FukuInTheCode/R-TYPE/main/assets/ships/playerShip3_red.png`,
];

const TW = (code) =>
  `https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/${code}.svg`;

const LEGENDARY_ICONS = [
  TW('1f409'),
  TW('1f451'),
  TW('1f48e'),
  TW('1f525'),
  TW('1f480'),
  TW('2694'),
  TW('1f52e'),
  TW('1f531'),
  TW('1f3c6'),
  TW('1f48d'),
  TW('1fa84'),
  TW('1f5e1'),
];

const UNIQUE_ICONS = [
  TW('2728'),
  TW('1f31f'),
  TW('26a1'),
  TW('1f4a5'),
  TW('1f300'),
  TW('1f47e'),
  TW('1f6f8'),
  TW('1f387'),
  TW('2604'),
  TW('1f4ab'),
  TW('1f30c'),
  TW('1f9ff'),
];

async function download(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function nebulaSvg(w, h, c1, c2, c3, seed) {
  const stars = Array.from({ length: 80 }, (_, i) => {
    const x = ((seed * 17 + i * 97) % 1000) / 1000 * w;
    const y = ((seed * 31 + i * 53) % 1000) / 1000 * h;
    const r = 0.6 + ((i * 13) % 18) / 10;
    const o = 0.35 + ((i * 7) % 50) / 100;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#fff" opacity="${o}"/>`;
  }).join('');
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="55%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c3}"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    ${stars}
  </svg>`);
}

function tintSvg(svgBuf, fill) {
  let s = svgBuf.toString('utf8');
  s = s.replace(/fill="[^"]*"/g, `fill="${fill}"`);
  if (!s.includes('fill=')) {
    s = s.replace('<svg', `<svg fill="${fill}"`);
  }
  return Buffer.from(s);
}

async function composeSubjectOnBg(bgSvg, subjectBuf, outPath, subjectSize = 620) {
  const bg = await sharp(bgSvg).png().toBuffer();
  let subject;
  try {
    subject = await sharp(subjectBuf)
      .resize(subjectSize, subjectSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  } catch {
    subject = await sharp(subjectBuf, { density: 400 })
      .resize(subjectSize, subjectSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }
  const left = Math.round((SIZE - subjectSize) / 2);
  const top = Math.round((SIZE - subjectSize) / 2);
  await sharp(bg)
    .resize(SIZE, SIZE)
    .composite([{ input: subject, left, top }])
    .png({ compressionLevel: 8 })
    .toFile(outPath);
}

async function makeSet({ folder, prefix, startId, urls, palettes, fill, sourcesText }) {
  const dir = path.join(ROOT, 'public', folder);
  fs.mkdirSync(dir, { recursive: true });
  let made = 0;
  for (let i = 0; i < urls.length; i++) {
    const id = startId + i;
    const out = path.join(dir, `${prefix}${id}.png`);
    if (fs.existsSync(out) && fs.statSync(out).size > 20_000 && !process.env.FORCE_ARTS) {
      console.log('skip existing', out);
      made += 1;
      continue;
    }
    const pal = palettes[i % palettes.length];
    try {
      const raw = await download(urls[i]);
      const subject = raw;
      await composeSubjectOnBg(nebulaSvg(SIZE, SIZE, pal[0], pal[1], pal[2], id * 13), subject, out);
      console.log('ok', path.relative(ROOT, out), fs.statSync(out).size);
      made += 1;
    } catch (err) {
      console.warn('fail', urls[i], err.message);
      await sharp(nebulaSvg(SIZE, SIZE, pal[0], pal[1], pal[2], id * 29))
        .png()
        .toFile(out);
      console.log('fallback bg', path.relative(ROOT, out));
      made += 1;
    }
  }
  fs.writeFileSync(path.join(dir, 'SOURCES.txt'), sourcesText);
  return made;
}

const SPACE_PALS = [
  ['#7dd3fc', '#1d4ed8', '#020617'],
  ['#c4b5fd', '#4c1d95', '#020617'],
  ['#67e8f9', '#0e7490', '#042f2e'],
  ['#fda4af', '#9f1239', '#1c1917'],
  ['#86efac', '#166534', '#022c22'],
  ['#fde68a', '#b45309', '#1c1917'],
];

const GOLD_PALS = [
  ['#fde68a', '#b45309', '#1c1005'],
  ['#f5d0fe', '#6b21a8', '#1e1024'],
  ['#fed7aa', '#9a3412', '#1c1008'],
  ['#fef08a', '#854d0e', '#1a1408'],
  ['#e9d5ff', '#5b21b6', '#14081f'],
  ['#fca5a5', '#7f1d1d', '#1c0a0a'],
];

const UNIQUE_PALS = [
  ['#e0f2fe', '#22d3ee', '#0f172a'],
  ['#fce7f3', '#e879f9', '#3b0764'],
  ['#ecfccb', '#a3e635', '#14532d'],
  ['#fee2e2', '#fb7185', '#4c0519'],
  ['#e0e7ff', '#818cf8', '#1e1b4b'],
  ['#fef9c3', '#facc15', '#422006'],
];

const SOURCES_STAR = `Star Wars-style NFT arts (sci-fi, not Disney IP)
- Kenney Space Shooter ships via GitHub FukuInTheCode/R-TYPE (CC0 Kenney.nl)
- Backgrounds generated locally
`;

const SOURCES_LEG = `Legendary NFT arts
- Icons: Twitter Twemoji SVG from GitHub twitter/twemoji (CC-BY 4.0)
- Backgrounds generated locally
`;

const SOURCES_UNIQ = `Unique / animated-ready NFT arts
- Icons: Twitter Twemoji SVG from GitHub twitter/twemoji (CC-BY 4.0)
- Drop uniq_N.gif or uniq_N.webp here later — generator prefers gif/webp over png
- Now: PNG so you can generate cards immediately
`;

const madeStar = await makeSet({
  folder: 'starwars',
  prefix: 'star_',
  startId: 8,
  urls: STAR_SHIPS,
  palettes: SPACE_PALS,
  fill: null,
  sourcesText: SOURCES_STAR,
});

const madeLeg = await makeSet({
  folder: 'legendary',
  prefix: 'leg_',
  startId: 6,
  urls: LEGENDARY_ICONS,
  palettes: GOLD_PALS,
  fill: '#f8e7a1',
  sourcesText: SOURCES_LEG,
});

const madeUniq = await makeSet({
  folder: 'unique',
  prefix: 'uniq_',
  startId: 1,
  urls: UNIQUE_ICONS,
  palettes: UNIQUE_PALS,
  fill: '#e0f2fe',
  sourcesText: SOURCES_UNIQ,
});

console.log(JSON.stringify({ madeStar, madeLeg, madeUniq }, null, 2));
