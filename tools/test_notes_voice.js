// English notes preserve source; expressive speech caches audio and cancels stale playback.
const { chromium } = require('playwright');
const assert = require('assert/strict');
const path = require('path');
const fs = require('fs');
const FILE = require('url').pathToFileURL(path.resolve(__dirname, '../assets/index.html')).href;
fs.mkdirSync(path.resolve(__dirname, '../build/shots'), { recursive: true });
const SOURCE = 'Today I was very happy. I meet my friend.\n\nWe talked about our robot project!';
const wav = Buffer.alloc(524);
wav.write('RIFF'); wav.writeUInt32LE(516, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(24000, 24);
wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(480, 40);
let count = 0;
function eq(label, actual, expected) { assert.deepEqual(actual, expected, label); console.log('ok ' + label); count++; }
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(({ wav, SOURCE }) => {
      window.__requests = []; window.__played = []; window.__local = []; window.__failed = false;
      window.__hold = false; window.__audioHold = false;
      window.fetch = async (url, opt) => {
        const body = JSON.parse(opt.body); window.__requests.push({ url, body });
        if (/interactions$/.test(url)) {
          if (window.__hold) await new Promise(r => { window.__release = r; });
          return { status: window.__failed ? 429 : 200, text: async () => JSON.stringify({ steps: [{ type: 'model_output', content: [{ type: 'audio', mime_type: 'audio/wav', data: wav }] }] }) };
        }
        if (window.__failed) return { status: 400, text: async () => '{"error":{"message":"test failure"}}' };
        return { status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: '친구와 즐거운 하루', b: '', lines: [
          { s: 'A', e: 'Today I was very happy. I met my friend.', k: '오늘 기분이 좋았어요. 친구를 만났어요.' },
          { s: 'A', e: SOURCE.split('\n\n')[1], k: '로봇 프로젝트에 대해 이야기했어요!' }
        ] }) } }] }) };
      };
      window.Audio = function (url) {
        this.play = () => { window.__played.push(url); if (!window.__audioHold) this._t = setTimeout(() => this.onended && this.onended(), 40); return Promise.resolve(); };
        this.pause = () => clearTimeout(this._t); this.load = () => {}; this.removeAttribute = () => {};
      };
      window.SpeechSynthesisUtterance = function (text) { this.text = text; };
      Object.defineProperty(window, 'speechSynthesis', { value: {
        cancel() {}, getVoices() { return []; }, speak(u) { window.__local.push(u.text); setTimeout(() => u.onend && u.onend(), 40); }
      } });
      window.SpeechRecognition = function () { this.start = () => { window.__lang = this.lang; }; this.stop = () => {}; this.abort = () => {}; };
    }, { wav: wav.toString('base64'), SOURCE });
    await p.goto(FILE);
    await p.evaluate(() => { localStorage.clear(); }); await p.reload();
    await p.evaluate(() => {
      const s = window.__vocab.state(); s.settings.tour = Object.fromEntries(['home','dlg','dlgv','settings'].map(x => [x, 1]));
      s.settings.themeRandom = false; window.__vocab.save(); window.__vocab.go('dlg');
    });
    await p.click('.topbar [data-action="dlg-add"]');
    eq('default mode is diary/prose', await p.getAttribute('[data-action="note-kind"].on', 'data-value'), 'note');
    await p.fill('#dlgSit', SOURCE);
    await p.screenshot({path:path.resolve(__dirname, '../build/shots/notes-add.png')});
    await p.click('[data-action="dlg-mic"]');
    eq('note microphone listens in English', await p.evaluate(() => window.__lang), 'en-US');
    await p.evaluate(() => window.onStt(''));
    await p.click('[data-action="note-save"]');
    eq('raw text saves without an AI key', await p.evaluate(() => window.__vocab.state().dlg[0].sit), SOURCE);
    eq('paragraphs stay in order without speakers', await p.$$eval('.dl-line .dl-tag', es => es.map(e => e.textContent)), ['1','2']);
    eq('raw save makes no external request', await p.evaluate(() => window.__requests.length), 0);
    await p.click('details summary');
    eq('original text is visible unchanged', await p.textContent('.note-original'), SOURCE);
    const id = await p.evaluate(() => window.__vocab.state().dlg[0].id);
    await p.click('[data-action="dlg-edit"]'); await p.fill('#dlgSit', SOURCE + '\nAnother thought.');
    await p.click('[data-action="note-save"]');
    eq('raw edit updates same note without AI', await p.evaluate(() => [window.__vocab.state().dlg.length,window.__vocab.state().dlg[0].sit,window.__requests.length]), [1,SOURCE + '\nAnother thought.',0]);
    await p.click('[data-action="dlg-edit"]'); await p.fill('#dlgSit', SOURCE); await p.click('[data-action="note-save"]');
    await p.reload(); await p.evaluate(id => window.__vocab.go('dlgv', { id }), id);
    eq('note type and original survive reload/migration', await p.evaluate(() => [window.__vocab.state().dlg[0].kind, window.__vocab.state().dlg[0].sit]), ['note',SOURCE]);
    await p.click('[data-action="dlg-edit"]'); await p.click('[data-action="dlg-submit"]');
    eq('missing key keeps edit sheet and source', await p.inputValue('#dlgSit'), SOURCE);
    await p.evaluate(() => localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST', or: 1 })));
    await p.reload(); await p.evaluate(id => window.__vocab.go('dlgv', { id }), id);
    await p.click('[data-action="dlg-edit"]'); await p.click('[data-action="dlg-submit"]');
    await p.waitForFunction(() => document.querySelector('#dlgT').textContent === '친구와 즐거운 하루');
    eq('AI organization retains original separately', await p.evaluate(() => window.__vocab.state().dlg[0].sit), SOURCE);
    eq('minimally edited English and translation render', await p.textContent('#dl-0 .dl-e'), 'Today I was very happy. I met my friend.');
    eq('request forbids invented content and dialogue', await p.evaluate(() => /Do not invent/.test(window.__requests[0].body.messages[0].content) && /Original text:\nToday/.test(window.__requests[0].body.messages[1].content)), true);
    eq('note request omits learner profile', await p.evaluate(() => !/About the learner/.test(window.__requests[0].body.messages[0].content)), true);
    await p.click('[data-action="dlg-edit"]'); await p.fill('#dlgSit', SOURCE + '\nA new detail.');
    await p.evaluate(() => { window.__failed = true; }); await p.click('[data-action="dlg-submit"]');
    await p.waitForTimeout(300);
    eq('failed reorganization keeps saved original and edited text', await p.evaluate(() => [window.__vocab.state().dlg[0].sit, window.__vocab.state().dlg[0].lines[0].e]), [SOURCE,'Today I was very happy. I met my friend.']);
    await p.click('[data-action="dlg-edit"]');
    eq('failed draft is available for retry', await p.inputValue('#dlgSit'), SOURCE + '\nA new detail.');
    await p.click('[data-action="close-sheet"]');
    await p.evaluate(() => {
      window.__failed = false; localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key:'TEST', gkey:'TEST', or:1 }));
      window.__vocab.state().settings.expressiveVoice = true; window.__vocab.save();
    });
    await p.reload(); await p.evaluate(id => window.__vocab.go('dlgv', { id }), id);
    await p.click('.dl-play'); await p.waitForTimeout(1500);
    eq('AI voice plays both paragraphs then stops', await p.evaluate(() => [window.__played.length, document.querySelector('.dl-play').classList.contains('on')]), [2,false]);
    eq('speech request uses verbatim source and style metadata', await p.evaluate(() => {
      const r = window.__requests.find(x => /interactions$/.test(x.url));
      return [r.body.input[0].content[0].text, /subtle feeling/.test(r.body.input[0].content[0].annotations[0].style)];
    }), ['Today I was very happy. I met my friend.',true]);
    eq('speech requests disable stored interaction history', await p.evaluate(() => window.__requests.find(x => /interactions$/.test(x.url)).body.store), false);
    const calls = await p.evaluate(() => window.__requests.length);
    await p.reload(); await p.evaluate(id => window.__vocab.go('dlgv', { id }), id);
    await p.click('.dl-play'); await p.waitForTimeout(1500);
    eq('audio survives reload and replays without network calls', await p.evaluate(() => [window.__requests.length, window.__played.length]), [0,2]);
    await p.screenshot({ path: path.resolve(__dirname, '../build/shots/notes-organized.png') });
    const checks = await p.evaluate(async () => {
      const opt = { key:'TEST', voice:'f', rate:0.9, call: async (url, key, body) => { const r=await fetch(url,{body}); return {status:r.status,text:await r.text()}; } };
      window.__hold = true; const before = window.__played.length;
      const work = VocabVoice.read('A pending request must stay silent.', opt);
      await new Promise(r => setTimeout(r, 100)); VocabVoice.stop(); window.__release();
      const stopped = await work;
      window.__hold = false;
      return [stopped, window.__played.length === before];
    });
    eq('stopping during generation prevents delayed playback', checks, [false,true]);
    await p.evaluate(() => VocabVoice.clear());
    const cacheChecks = await p.evaluate(async () => {
      const opts = { key:'', voice:'f', rate:0.9, call: () => { throw new Error('should not call without key'); } };
      try { await VocabVoice.read('Today I was very happy. I met my friend.', opts); return false; } catch (_) { return true; }
    });
    eq('clear cache removes stored audio', cacheChecks, true);
    // Explicit failure must fall back to local speech and finish the note.
    await p.evaluate(() => { window.__failed = true; });
    await p.click('.dl-play'); await p.waitForTimeout(1500);
    eq('AI failure falls back to phone voice through end', await p.evaluate(() => [window.__local.length, document.querySelector('.dl-play').classList.contains('on')]), [2,false]);
    await p.evaluate(() => { window.__failed = false; window.__played = []; window.__local = []; window.__vocab.go('list', {stage:'all'}); });
    const word = await p.evaluate(() => window.__vocab.state().words.find(w => !/\s/.test(w.w) && w.e));
    await p.click('#listBody [data-id="' + word.id + '"] .it-w');
    await p.waitForTimeout(350);
    eq('word then example stay in order with AI enabled', await p.evaluate(() => [window.__local[0], window.__played.length]), [word.w,1]);
    await p.evaluate(() => window.__vocab.go('settings'));
    await p.screenshot({path:path.resolve(__dirname,'../build/shots/notes-voice-settings.png'), fullPage:true});
    // Old records without kind must remain dialogues.
    await p.evaluate(() => {
      const s=window.__vocab.state(); s.dlg.push({id:'old',sit:'At a cafe',lines:[{s:'A',e:'Hello!',k:'안녕'},{s:'B',e:'Hi!',k:'안녕'}]}); window.__vocab.save();
    });
    await p.reload(); await p.evaluate(() => window.__vocab.go('dlgv',{id:'old'}));
    eq('legacy dialogue keeps two speakers', await p.$$eval('.dl-line .dl-tag', es => es.map(e => e.textContent)), ['A','B']);
    await p.evaluate(() => { window.__vocab.state().settings.expressiveVoice = false; window.__local = []; window.__vocab.go('dlg'); });
    await p.click('.topbar [data-action="dlg-add"]');
    const longNote = '\n  ' + 'I felt grateful today. '.repeat(240) + '\n';
    await p.fill('#dlgSit', longNote); await p.click('[data-action="note-save"]');
    await p.click('.dl-play'); await p.waitForTimeout(1100);
    eq('long paragraphs split for phone TTS without truncation', await p.evaluate(() => [window.__local.every(t => t.length <= 3000), window.__local.join(''), document.querySelector('.dl-play').classList.contains('on')]), [true,longNote.trim(),false]);
    eq('long paragraph stays intact in stored original', await p.evaluate(() => window.__vocab.state().dlg.slice(-1)[0].sit), longNote);
    eq('no page errors', errors, []);
    const real = await b.newPage(); await real.goto(FILE);
    eq('generated WAV decodes and finishes in real browser audio', await real.evaluate(async wav => {
      return VocabVoice.read('A real WAV playback check.', {key:'TEST', rate:0.9, call: async () => ({status:200,text:JSON.stringify({steps:[{type:'model_output',content:[{type:'audio',mime_type:'audio/wav',data:wav}]}]})})});
    }, wav.toString('base64')), true);
    await real.close();
    console.log('all ok (' + count + ')');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
