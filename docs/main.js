/* 3단계 단어장 landing page. Plain ES2019, GSAP + ScrollTrigger from jsDelivr.
   The static HTML/CSS is the reduced-motion page. Everything below only adds motion on top. */
(() => {
  'use strict';
  const root = document.documentElement;
  const q = (s, el = document) => el.querySelector(s);
  const qa = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* 1. Latest release: point every download button at the .apk itself. Runs with or without motion. */
  fetch('https://api.github.com/repos/Seobuk/vocab3/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((rel) => {
      const apk = (rel.assets || []).find((a) => /\.apk$/i.test(a.name));
      if (!apk) return;
      qa('[data-apk]').forEach((a) => { a.href = apk.browser_download_url; });
      const meta = rel.tag_name + ', ' + (apk.size / 1048576).toFixed(1) + 'MB';
      qa('[data-apk-meta]').forEach((el) => { el.textContent = meta; });
    })
    .catch(() => { /* keep the releases/latest link and the fallback text */ });

  const showIntro = () => root.classList.remove('intro');
  if (!window.gsap || !window.ScrollTrigger) { showIntro(); return; }
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add({
    desk: '(min-width: 1024px)',
    narrow: '(max-width: 1023.98px)',
    phone: '(max-width: 767.98px)',
    motion: '(prefers-reduced-motion: no-preference)',
    tall: '(min-height: 640px)'   // the pinned method board needs a full-height frame; shorter screens keep the static list
  }, (ctx) => {
    const { desk, phone, motion, tall } = ctx.conditions;
    if (!motion) { showIntro(); return; }
    root.classList.add('motion');
    const off = [];
    const on = (el, type, fn) => { el.addEventListener(type, fn); off.push(() => el.removeEventListener(type, fn)); };

    /* M1. Hero phones rise in after the text is already readable. */
    /* Skipped when the 2.5s guard already showed them (slow CDN) and when matchMedia re-runs on resize. */
    const phones = qa('.hero-art .device');
    if (root.classList.contains('intro')) {
      gsap.set(phones, { y: 48, opacity: 0 });
      gsap.to(phones, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', delay: 0.1, stagger: 0.12 });
    }
    showIntro();

    /* M2. Recall first, then a double tap on the meaning box (the app's v2.30 gesture) reveals the card. Click replays. */
    const front = q('.ph-front .device');
    const rev = q('.ph-front .rev');
    const heroTap = q('.ph-front .tap');
    gsap.set(rev, { opacity: 0 });
    gsap.set(heroTap, { left: '50%', top: '45%', xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
    const reveal = gsap.timeline({ delay: 1.3 })
      .fromTo(heroTap, { scale: 0, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 0.32, ease: 'power2.out', immediateRender: false })
      .fromTo(heroTap, { scale: 0, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 0.32, ease: 'power2.out', immediateRender: false }, '>-0.12')
      .to(rev, { opacity: 1, duration: 0.35, ease: 'power1.out' }, '>-0.1');
    on(front, 'click', () => { gsap.set(rev, { opacity: 0 }); reveal.restart(); });

    if (tall) {
      root.classList.add('pin');
      /* M4 + M5. One word climbs the notebooks with the app's own swipe-up judgement at every step. */
      const method = q('#method');
      const card = q('.wcard');
      const stamp = q('.wcard .stamp');
      const stampTx = qa('.wcard .stamp .st span');
      const badge = q('.wcard .badge');
      const chips = qa('.wcard .stage span');
      const lis = qa('.stages li');
      const fills = qa('.stages .node i');
      const segs = qa('.stages .seg i');
      const caps = desk ? qa('.stages p') : qa('.cap-slot p');
      const glows = qa('.board-bg i');
      const segProp = desk ? 'scaleX' : 'scaleY';
      const dim = desk ? 1 : 0;   // desktop captions stay readable; the cell outline and node carry the state

      gsap.set(chips, { opacity: (i) => (i ? 0 : 1) });
      gsap.set(fills, { scale: (i) => (i ? 0 : 1) });
      gsap.set(segs, { [segProp]: 0 });
      gsap.set(caps, { opacity: (i) => (i ? dim : 1) });
      gsap.set(glows, { opacity: (i) => (i ? 0 : 1) });
      gsap.set(stamp, { opacity: 0, y: 8 });
      gsap.set(stampTx[1], { opacity: 0 });
      gsap.set(badge, { opacity: 0, scale: 0.6 });

      let burstDone = false;
      const story = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: method,
          start: 'top top',
          end: () => '+=' + Math.round(innerHeight * (desk ? 3 : 2.6)),
          pin: true,
          scrub: 0.6,
          snap: { snapTo: 'labelsDirectional', inertia: false, duration: { min: 0.2, max: 0.6 }, delay: 0.1, ease: 'power1.inOut' },
          invalidateOnRefresh: true
        }
      });
      story.addLabel('s1').to({}, { duration: 0.5 });
      for (let i = 1; i < 4; i++) {
        if (i === 3) story.set(stampTx[0], { opacity: 0 }).set(stampTx[1], { opacity: 1 });   // the app stamps the last step 졸업
        story
          .to(card, { y: desk ? -28 : -16, rotation: -2, duration: 0.3 })
          .to(stamp, { opacity: 1, y: 0, duration: 0.3 }, '<')
          .to(card, { x: desk ? () => lis[i].offsetLeft - lis[0].offsetLeft : 0, y: 0, rotation: 0, duration: 0.7 })
          .to(stamp, { opacity: 0, duration: 0.3 }, '<+0.2')
          .to(segs[i - 1], { [segProp]: 1, duration: 0.6, ease: 'none' }, '<-0.2')
          .to(fills[i], { scale: 1, duration: 0.25, ease: 'back.out(2)' }, '>-0.1')
          .to(chips[i - 1], { opacity: 0, duration: 0.3 }, '<')
          .to(chips[i], { opacity: 1, duration: 0.3 }, '<')
          .to(caps[i - 1], { opacity: dim, duration: 0.3 }, '<')
          .to(caps[i], { opacity: 1, duration: 0.3 }, '<')
          .to(glows[i - 1] || {}, { opacity: 0, duration: 0.3 }, '<')
          .to(glows[i] || {}, { opacity: 1, duration: 0.3 }, '<');
        if (i === 3) story.to(badge, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.2)' }, '<');
        story.addLabel('s' + (i + 1)).to({}, { duration: 0.5 });
      }
      story.addLabel('out');   // a snap point at progress 1, so snapping never holds the reader inside the pin
      /* Confetti as the badge lands, going forward, once. Placed just before s4: a snap that rests on s4
         can stop a hair short of the label (rounded scroll pixels), and a call exactly on it would not fire. */
      story.call(() => {
        if (!burstDone && story.scrollTrigger.direction > 0) { burstDone = true; confetti(); }
      }, null, 's4-=0.1');

      /* From below, #method's box sits at the end of the pin-spacer; start the story instead of landing on 졸업. */
      on(q('.nav-links a[href="#method"]'), 'click', (e) => { e.preventDefault(); scrollTo({ top: story.scrollTrigger.start, behavior: 'smooth' }); });

      /* The app's celebrate() confetti, trimmed: 80 pieces, 1.4s, accent family only. */
      function confetti() {
        const cv = q('.confetti');
        const c2 = cv.getContext('2d');
        if (!c2) return;
        const box = cv.getBoundingClientRect();
        const dpr = Math.min(2, devicePixelRatio || 1);
        cv.width = box.width * dpr; cv.height = box.height * dpr;
        c2.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cs = getComputedStyle(root);
        const colors = ['--primary', '--primary', '--muted'].map((v) => cs.getPropertyValue(v).trim());
        const cb = card.getBoundingClientRect();
        const ox = cb.left - box.left + cb.width / 2;
        const oy = cb.top - box.top + cb.height * 0.25;
        const parts = Array.from({ length: 80 }, (_, i) => {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2;
          const sp = 5 + Math.random() * 8;
          return { x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 5 + Math.random() * 6, h: 3 + Math.random() * 5, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, c: colors[i % 3] };
        });
        const t0 = gsap.ticker.time;
        const draw = () => {
          const t = gsap.ticker.time - t0;
          c2.clearRect(0, 0, box.width, box.height);
          if (t > 1.4) { gsap.ticker.remove(draw); return; }
          c2.globalAlpha = Math.min(1, (1.4 - t) / 0.5);
          parts.forEach((p) => {
            p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
            c2.save(); c2.translate(p.x, p.y); c2.rotate(p.r); c2.fillStyle = p.c; c2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c2.restore();
          });
        };
        gsap.ticker.add(draw);
        off.push(() => gsap.ticker.remove(draw));
      }
    }

    /* M6. Turning the phone sideways is how the time-edit view appears in the app. */
    if (desk) {
      gsap.timeline({ scrollTrigger: { trigger: '.yt-land', start: 'top 85%', end: 'top 35%', scrub: 0.6 } })
        .fromTo('.yt-land .device', { rotation: -90, scale: 0.62 }, { rotation: 0, scale: 1, duration: 1, ease: 'power2.inOut' })
        .fromTo('.yt-land .port', { opacity: 1 }, { opacity: 0, duration: 0.2, ease: 'none' }, 0.5);
    }

    /* M7 + M8. The transcript demo: per-sentence stop, double tap for Korean, double tap a word for its meaning. */
    const demo = q('.demo');
    const rows = qa('.demo .ys');
    const bgs = rows.map((r) => q('.ys-bg', r));
    const progs = rows.map((r) => q('.ys-prog', r));
    const stops = rows.map((r) => q('.ys-stop', r));
    const kOn = rows.map((r) => q('.k-on', r));
    const kOff = rows.map((r) => q('.k-off', r));
    const pop = q('.demo .ycard');
    const hl = q('.demo .yw-hl');
    const word = q('.demo .yw');
    const dTap = q('.demo > .tap');
    const dcaps = qa('.dcaps li');

    gsap.set(bgs, { opacity: 0 });
    gsap.set(progs, { scaleX: 0 });
    gsap.set(stops, { opacity: 0 });
    gsap.set(kOn, { opacity: 0 });
    gsap.set(kOff, { opacity: 0.55 });
    gsap.set([pop, hl], { opacity: 0 });
    gsap.set(pop, { scale: 0.96, y: -4 });
    gsap.set(dcaps, { opacity: (i) => (i ? 0 : 1) });
    gsap.set(dTap, { opacity: 0, xPercent: -50, yPercent: -50 });

    const place = (el) => {
      const d = demo.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      gsap.set(dTap, { x: r.left - d.left + r.width / 2, y: r.top - d.top + r.height / 2 });
    };
    const demoTl = gsap.timeline({
      repeat: -1, repeatDelay: 1, defaults: { ease: 'power2.out' },
      scrollTrigger: { trigger: demo, start: 'top 90%', end: 'bottom 10%', toggleActions: 'play pause resume pause' }
    });
    const caption = (i) => demoTl.to(dcaps, { opacity: (j) => (j === i ? 1 : 0), duration: 0.3 }, '<');
    const play = (i, secs) => {
      demoTl.addLabel('r' + i)
        .to(bgs, { opacity: (j) => (j === i ? 1 : 0), duration: 0.3 })
        .set(progs[i], { scaleX: 0, opacity: 1 }, '<');
      caption(0);
      demoTl.to(progs[i], { scaleX: 1, duration: secs, ease: 'none' })
        .to(stops[i], { opacity: 1, duration: 0.15, repeat: 3, yoyo: true, ease: 'none' })
        .to(progs[i], { opacity: 0, duration: 0.3 }, '<');
    };
    const doubleTap = (el) => {
      demoTl.call(place, [el])
        .fromTo(dTap, { scale: 0, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 0.32, immediateRender: false })
        .fromTo(dTap, { scale: 0, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 0.32, immediateRender: false }, '>-0.12');
    };
    play(0, 1.6);
    play(1, 2.0);
    doubleTap(rows[1].querySelector('.ys-k'));
    caption(1);
    demoTl.to(kOn[1], { opacity: 1, duration: 0.3 }, '<').to(kOff[1], { opacity: 0, duration: 0.3 }, '<').to({}, { duration: 1.4 });
    play(2, 1.8);
    doubleTap(word);
    caption(2);
    demoTl.to(hl, { opacity: 1, duration: 0.2 }, '<')
      .to(pop, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.6)' }, '<')
      .to({}, { duration: 1.8 })
      .to([pop, hl], { opacity: 0, duration: 0.25 })
      .set(pop, { scale: 0.96, y: -4 });
    play(3, 1.6);
    demoTl.to(kOn[1], { opacity: 0, duration: 0.3 }).to(kOff[1], { opacity: 0.55, duration: 0.3 }, '<').to(bgs, { opacity: 0, duration: 0.3 }, '<');
    rows.forEach((r, i) => on(r, 'click', () => demoTl.seek('r' + i).play()));

    /* M9. The seven features arrive as one set, in reading order. */
    const cells = qa('.bento .cell');
    gsap.set(cells, { y: 24, opacity: 0 });
    ScrollTrigger.batch(cells, {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out', overwrite: true })
    });

    /* M10. The same home screen switching to dark mode. */
    gsap.fromTo('.split .dark-half',
      { clipPath: 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)' },
      { clipPath: 'polygon(55% 0%, 100% 0%, 100% 100%, 35% 100%)', ease: 'none', scrollTrigger: { trigger: '.c-theme', start: 'top 90%', end: 'center 45%', scrub: 0.6 } });

    /* M11. The install track states the order of the three steps. */
    const track = q('.track');
    const markers = qa('.steps .marker');
    const vertical = phone;
    gsap.set(track, vertical ? { scaleY: 0 } : { scaleX: 0 });
    gsap.set(markers, { scale: 0.6, opacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: '.steps', start: 'top 80%', once: true } })
      .to(track, vertical ? { scaleY: 1, duration: 0.8, ease: 'power2.inOut' } : { scaleX: 1, duration: 0.8, ease: 'power2.inOut' })
      .to(markers, { scale: 1, opacity: 1, duration: 0.4, stagger: 0.25, ease: 'back.out(2)' }, 0);

    /* M12 is CSS. Magnetic pull on the one big download button, for mouse users only. */
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const mag = q('.magnet');
      const xTo = gsap.quickTo(mag, 'x', { duration: 0.4, ease: 'power3.out' });
      const yTo = gsap.quickTo(mag, 'y', { duration: 0.4, ease: 'power3.out' });
      on(mag, 'pointermove', (e) => {
        const r = mag.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.22);
        yTo((e.clientY - r.top - r.height / 2) * 0.3);
      });
      on(mag, 'pointerleave', () => { xTo(0); yTo(0); });
    }

    return () => { off.forEach((f) => f()); root.classList.remove('motion', 'pin'); };
  });

  /* Images and web fonts change heights after the first measure. */
  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
