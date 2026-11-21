// Contact sheet of the live page after stepping to each stop. Usage: node live.mjs <url> <out.png> <WxH> [startKeyPresses] [count]
// Needs playwright-core and Google Chrome:  cd tools && npm i --no-save playwright-core
import { chromium } from 'playwright-core';
const [url, out, size, skip = '0', count = '13'] = process.argv.slice(2); const [W, H] = size.split('x').map(Number), phone = W < 500;
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: W, height: H }, ...(phone ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
const pg = await ctx.newPage(); await pg.goto(url); await pg.waitForTimeout(2600); const shots = [];
const snap = async () => shots.push([await pg.evaluate(() => (document.documentElement.dataset.stop ?? '—') + ' ' + document.getElementById('live').textContent), (await pg.screenshot({ type: 'jpeg', quality: 80 })).toString('base64')]);
if (+skip === 0) await snap();
for (let i = 0; i < +skip + +count - 1; i++) { await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(2300); if (i + 1 >= +skip) await snap(); }
const cols = phone ? 5 : 3, k = phone ? 0.72 : 0.42, cw = Math.round(W * k);
const p2 = await b.newPage({ viewport: { width: (cw + 2) * cols + 8, height: Math.ceil(shots.length / cols) * (Math.round(H * k) + 20) + 8 } });
await p2.setContent(`<body style="margin:4px;display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:2px;font:12px monospace;background:#888">` + shots.map(([m, d]) => `<div style="background:#fff"><div>${m}</div><img src="data:image/jpeg;base64,${d}" style="width:${cw}px;display:block"></div>`).join('') + '</body>');
await p2.screenshot({ path: out }); await b.close();
