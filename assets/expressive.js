/* Optional Gemini speech. Audio cache stays outside learning backups and API keys. */
(function () {
  'use strict';
  var MODEL = 'gemini-3.8-flash-lite-tts', LIMIT = 24 * 1024 * 1024;
  var dbp, serial = 0, playing = null, finish = null, pending = {};
  function db() {
    if (!dbp) dbp = new Promise(function (resolve) {
      if (!window.indexedDB) { resolve(null); return; }
      var req = indexedDB.open('vocab3.voice', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('clips', { keyPath: 'id' }); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = req.onblocked = function () { resolve(null); };
    }).catch(function () { return null; });
    return dbp;
  }
  function cached(id) {
    return db().then(function (d) {
      return new Promise(function (resolve) {
        if (!d) { resolve(null); return; }
        var q = d.transaction('clips').objectStore('clips').get(id);
        q.onsuccess = function () { resolve(q.result && q.result.blob); };
        q.onerror = function () { resolve(null); };
      });
    }).catch(function () { return null; });
  }
  function remember(id, blob) {
    return db().then(function (d) {
      if (!d || blob.size > LIMIT) return;
      return new Promise(function (resolve) {
        var tx = d.transaction('clips', 'readwrite'), s = tx.objectStore('clips');
        s.put({ id: id, blob: blob, at: Date.now() });
        var q = s.getAll();
        q.onsuccess = function () {
          var rows = q.result.sort(function (a, b) { return a.at - b.at; }), size = 0;
          rows.forEach(function (r) { size += r.blob.size; });
          while (size > LIMIT && rows.length) { var r = rows.shift(); size -= r.blob.size; s.delete(r.id); }
        };
        tx.oncomplete = tx.onerror = tx.onabort = function () { resolve(); };
      });
    }).catch(function () { /* Caching must never prevent playback. */ });
  }
  function clear() {
    stop();
    // Prevent an older in-flight request from putting deleted audio back.
    generation++;
    return db().then(function (d) {
      if (!d) return;
      return new Promise(function (resolve) {
        var tx = d.transaction('clips', 'readwrite'); tx.objectStore('clips').clear();
        tx.oncomplete = tx.onerror = tx.onabort = function () { resolve(); };
      });
    });
  }
  var generation = 0;
  function stop() {
    serial++;
    if (playing) { playing.pause(); playing.removeAttribute('src'); playing.load(); playing = null; }
    if (finish) { var f = finish; finish = null; f(false); }
  }
  function clip(text, opt) {
    var voice = opt.voice === 'm' ? 'Puck' : 'Kore';
    var id = MODEL + '|' + voice + '|natural-v1|' + text;
    if (pending[id]) return pending[id];
    var gen = generation;
    var work = cached(id).then(function (b) {
      if (b) return b;
      if (!opt.key) throw new Error('Gemini 키가 필요해요');
      if (opt.wait) opt.wait();
      var body = {
        model: MODEL, store: false,
        input: [{ type: 'user_input', content: [{ type: 'text', text: text, annotations: [{
          type: 'speech_metadata', style: 'Natural conversational English for a learner. Express the emotion implied by the words, with warm, subtle feeling, meaningful emphasis and natural pauses. Clear pronunciation, moderate pace. No exaggerated acting. Read the text verbatim.'
        }] }] }],
        response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice: voice }] }
      };
      return opt.call('https://generativelanguage.googleapis.com/v1beta/interactions', opt.key, JSON.stringify(body), 90000).then(function (res) {
        if (res.status !== 200) throw new Error('AI 음성을 만들지 못했어요 (' + res.status + ')');
        var out = JSON.parse(res.text), audio = null;
        (out.steps || []).forEach(function (s) {
          if (s.type === 'model_output') (s.content || []).forEach(function (c) { if (c.type === 'audio') audio = c; });
        });
        if (!audio || !audio.data || !/^audio\/wav(?:;|$)/i.test(audio.mime_type || 'audio/wav')) throw new Error('음성 응답을 읽지 못했어요');
        if (audio.data.length > 20 * 1024 * 1024) throw new Error('음성이 너무 길어요');
        var raw = atob(audio.data), bytes = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        if (raw.slice(0, 4) !== 'RIFF' || raw.slice(8, 12) !== 'WAVE') throw new Error('WAV 음성이 아니에요');
        var blob = new Blob([bytes], { type: 'audio/wav' });
        return (gen === generation ? remember(id, blob) : Promise.resolve()).then(function () { return blob; });
      });
    });
    pending[id] = work;
    work.then(function () { delete pending[id]; }, function () { delete pending[id]; });
    return work;
  }
  function read(text, opt) {
    stop(); var tok = serial;
    return clip(text, opt).then(function (blob) {
      if (tok !== serial) return false;
      if (opt.beforePlay) opt.beforePlay();
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(blob), a = new Audio(url), done = false, timer;
        function end(value, err) {
          if (done) return; done = true; clearTimeout(timer);
          a.onended = a.onerror = null; a.pause(); URL.revokeObjectURL(url);
          if (playing === a) { playing = null; finish = null; }
          if (err) reject(err); else resolve(value);
        }
        playing = a; finish = function (v) { end(v); };
        a.playbackRate = Math.max(0.5, Math.min(1.5, opt.rate || 0.9));
        a.onended = function () { end(true); };
        a.onerror = function () { end(false, new Error('음성을 재생하지 못했어요')); };
        timer = setTimeout(function () { end(false, new Error('음성 재생 시간이 초과됐어요')); }, 300000);
        var p = a.play(); if (p && p.catch) p.catch(function (e) { end(false, e); });
      });
    });
  }
  window.VocabVoice = { read: read, stop: stop, clear: clear };
})();
