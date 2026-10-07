/* ── CougarMoth — Playlists ───────────────────────────────
   Renders a playlist page from window.PLAYLIST.

   PLAYLIST = {
     title, theme, released, youtubeId, cover,
     story: ["paragraph", ...],
     tracks: [{ title, length, file }],   // length "m:ss" (optional; read from the file if missing)
     license
   }

   One <audio> element plays the tracks. "Play all" plays them in order.
   The video is a YouTube embed; "TV mode" makes it full screen.
   ──────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var P = window.PLAYLIST;
  var root = document.getElementById('cm-root');
  if (!P || !root) return;

  var tracks = P.tracks || [];
  var audio = new Audio();
  audio.preload = 'none';
  var current = -1;
  var playingAll = false;

  root.innerHTML =
    '<header class="cm-top"><a href="/"><img src="/logo.png" alt="CougarMoth"></a></header>' +
    '<main class="cm-page">' +
      '<h1 class="cm-title">' + esc(P.title) + '</h1>' +
      (P.theme ? '<p class="cm-theme">' + esc(P.theme) + '</p>' : '') +
      renderVideo() +
      renderStory() +
      renderTracks() +
      renderDetails() +
    '</main>' +
    '<footer class="cm-footer">&copy; 2026 <a href="https://craz.com">Crabtree Labz</a></footer>';

  wireVideo();
  wireTracks();

  // ── Video ─────────────────────────────────────────────
  function renderVideo() {
    var inner = P.youtubeId
      ? '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(P.youtubeId) +
        '?rel=0&modestbranding=1" title="' + esc(P.title) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>'
      : '<div class="cm-video-stub"><span>Video coming soon</span></div>';
    return '<section class="cm-video">' +
      '<div class="cm-frame" id="cm-frame">' + inner + '</div>' +
      '<button type="button" class="cm-tv" id="cm-tv">⛶ TV mode</button>' +
    '</section>';
  }

  function wireVideo() {
    var btn = document.getElementById('cm-tv');
    var frame = document.getElementById('cm-frame');
    if (!btn || !frame) return;
    if (!frame.requestFullscreen && !frame.webkitRequestFullscreen) { btn.hidden = true; return; }
    btn.addEventListener('click', function () {
      (frame.requestFullscreen || frame.webkitRequestFullscreen).call(frame);
    });
  }

  // ── Story ─────────────────────────────────────────────
  function renderStory() {
    var paras = [].concat(P.story || []);
    if (!paras.length) return '';
    return '<section class="cm-story">' +
      paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
    '</section>';
  }

  // ── Tracks ────────────────────────────────────────────
  function renderTracks() {
    if (!tracks.length) return '';
    var rows = tracks.map(function (t, i) {
      return '<li class="cm-track" data-i="' + i + '">' +
        '<button type="button" class="cm-play" aria-label="Play ' + esc(t.title) + '">▶</button>' +
        '<span class="cm-num">' + pad(i + 1) + '</span>' +
        '<span class="cm-name">' + esc(t.title) + '</span>' +
        '<span class="cm-len">' + esc(t.length || '') + '</span>' +
        (t.file ? '<a class="cm-dl" href="' + esc(t.file) + '" download aria-label="Download ' + esc(t.title) + '">↓</a>' : '<span class="cm-dl"></span>') +
      '</li>';
    }).join('');
    var label = tracks.length === 1 ? '1 song' : tracks.length + ' songs';
    return '<section class="cm-tracks">' +
      '<div class="cm-tracks-head">' +
        '<h2>Tracklist</h2>' +
        '<span class="cm-count">' + label + '<span class="cm-total"></span></span>' +
        '<button type="button" class="cm-playall" id="cm-playall">▶ Play all</button>' +
      '</div>' +
      '<ol class="cm-list">' + rows + '</ol>' +
      '<div class="cm-now" id="cm-now" hidden><span class="cm-now-name"></span><div class="cm-bar"><span></span></div></div>' +
    '</section>';
  }

  function wireTracks() {
    var list = root.querySelector('.cm-list');
    if (!list) return;

    list.addEventListener('click', function (e) {
      var btn = e.target.closest('.cm-play');
      if (!btn) return;
      var i = +btn.closest('.cm-track').dataset.i;
      if (i === current && !audio.paused) { audio.pause(); return; }
      playingAll = false;
      play(i);
    });

    document.getElementById('cm-playall').addEventListener('click', function () {
      if (playingAll && !audio.paused) { audio.pause(); return; }
      playingAll = true;
      play(current >= 0 && audio.paused && audio.currentTime > 0 ? current : 0);
    });

    audio.addEventListener('ended', function () {
      if (playingAll && current < tracks.length - 1) play(current + 1);
      else { playingAll = false; update(); }
    });
    audio.addEventListener('play', update);
    audio.addEventListener('pause', update);
    audio.addEventListener('timeupdate', function () {
      var bar = root.querySelector('.cm-bar span');
      if (bar && audio.duration) bar.style.width = (audio.currentTime / audio.duration * 100) + '%';
    });
    audio.addEventListener('error', function () {
      var t = tracks[current];
      var name = root.querySelector('.cm-now-name');
      if (name && t) name.textContent = '“' + t.title + '” isn’t available yet.';
      playingAll = false;
      update();
    });

    fillLengths();
  }

  function play(i) {
    var t = tracks[i];
    if (!t || !t.file) return;
    if (i !== current) { current = i; audio.src = t.file; }
    audio.play().catch(function () { /* blocked or missing; the error handler explains */ });
  }

  function update() {
    var playing = !audio.paused;
    root.querySelectorAll('.cm-track').forEach(function (row) {
      var i = +row.dataset.i;
      var on = i === current;
      row.classList.toggle('is-current', on);
      var b = row.querySelector('.cm-play');
      b.textContent = on && playing ? '❚❚' : '▶';
      b.setAttribute('aria-label', (on && playing ? 'Pause ' : 'Play ') + tracks[i].title);
    });
    var all = document.getElementById('cm-playall');
    if (all) all.textContent = playingAll && playing ? '❚❚ Pause' : '▶ Play all';
    var now = document.getElementById('cm-now');
    if (now && current >= 0) {
      now.hidden = false;
      if (!audio.error) now.querySelector('.cm-now-name').textContent = (playing ? 'Now playing: ' : 'Paused: ') + tracks[current].title;
    }
  }

  // Fill in any missing lengths (and the total) from the files' metadata.
  function fillLengths() {
    var secs = tracks.map(function (t) { return toSecs(t.length); });
    var pending = 0;
    tracks.forEach(function (t, i) {
      if (secs[i] != null || !t.file) return;
      pending++;
      var probe = new Audio();
      probe.preload = 'metadata';
      probe.addEventListener('loadedmetadata', function () {
        secs[i] = probe.duration;
        root.querySelector('.cm-track[data-i="' + i + '"] .cm-len').textContent = fmt(probe.duration);
        if (--pending === 0) total();
      });
      probe.addEventListener('error', function () { if (--pending === 0) total(); });
      probe.src = t.file;
    });
    if (!pending) total();

    function total() {
      var sum = secs.reduce(function (a, s) { return a + (s || 0); }, 0);
      var el = root.querySelector('.cm-total');
      if (el && sum) el.textContent = ' · ' + fmt(sum);
    }
  }

  // ── Details ───────────────────────────────────────────
  function renderDetails() {
    var rows = [];
    if (P.released) rows.push('<div><dt>Released</dt><dd>' + esc(P.released) + '</dd></div>');
    if (P.license) rows.push('<div><dt>Downloads</dt><dd>' + esc(P.license) + '</dd></div>');
    return rows.length ? '<dl class="cm-details">' + rows.join('') + '</dl>' : '';
  }

  // ── Helpers ───────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toSecs(s) {
    if (!s) return null;
    var p = String(s).split(':').map(Number);
    return p.length === 2 ? p[0] * 60 + p[1] : null;
  }
  function fmt(s) {
    s = Math.round(s);
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }
})();
