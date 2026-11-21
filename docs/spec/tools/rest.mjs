// Where does the reader come to rest? Usage: node measure.mjs <file-url> wheel|trackpad|touch|keys|rail
// Needs playwright-core and Google Chrome:  cd tools && npm i --no-save playwright-core
import { chromium } from 'playwright-core';
const url = process.argv[2], mode = process.argv[3] || 'wheel', phone = mode === 'touch';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 820 } });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(url); await page.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(page);
const state = () => page.evaluate(() => [Math.round(scrollY), (scrollY / document.querySelector('.stage').offsetHeight).toFixed(2), 'stop=' + (document.documentElement.dataset.stop ?? '—'),
  document.getElementById('live')?.textContent || '', document.getElementById('msg').dataset.skin, document.getElementById('msg').style.getPropertyValue('--t')].join(' '));
const settle = async () => { let last = -1, same = 0; for (let i = 0; i < 120; i++) { await page.waitForTimeout(50); const y = await page.evaluate(() => scrollY); if (y === last) { if (++same >= 9) break; } else same = 0; last = y; } };
const rows = []; const push = async tag => rows.push(tag + ' → ' + await state());
await page.mouse.move(640, 400);
if (mode === 'wheel') { for (let i = 0; i < 26; i++) { await page.mouse.wheel(0, 100); await settle(); await push('tick+100'); } for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, -100); await settle(); await push('tick-100'); } }
if (mode === 'trackpad') { for (let i = 0; i < 14; i++) { const n = [12, 25, 40][i % 3]; for (let j = 0; j < n; j++) { await page.mouse.wheel(0, 9); await page.waitForTimeout(16); } await settle(); await push('drag ' + n * 9 + 'px'); } }
if (mode === 'touch') { for (let i = 0; i < 16; i++) { const d = [-180, -320, -520][i % 3]; await cdp.send('Input.synthesizeScrollGesture', { x: 180, y: 520, yDistance: d, speed: 1200, gestureSourceType: 'touch' }); await settle(); await push('swipe ' + -d); }
  for (let i = 0; i < 3; i++) { await cdp.send('Input.synthesizeScrollGesture', { x: 180, y: 300, yDistance: 260, speed: 1200, gestureSourceType: 'touch' }); await settle(); await push('swipe back 260'); } }
if (mode === 'keys') { for (let i = 0; i < 14; i++) { await page.keyboard.press(i % 4 === 3 ? 'Space' : 'ArrowDown'); await settle(); await push('next'); } for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowUp'); await settle(); await push('prev'); } }
if (mode === 'rail') { for (const sel of ['.dots .arr.next', '.dots .arr.next', '.dots button[data-i="2"]', '.dots .arr.prev', '.dots button[data-i="3"]', '.dots button[data-i="0"]', '.dots .sub[data-stop="8"]', '.dots .arr.prev']) { await page.click(sel); await settle(); await push(sel); } }
console.log(rows.join('\n')); if (errs.length) console.log('PAGE ERRORS:', errs); await browser.close();
