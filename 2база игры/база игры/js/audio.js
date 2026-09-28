(function (global) {
  "use strict";

  let ctx = null;
  let ambientNodes = null;
  let musicNodes = null;
  let unlocked = false;

  function hz(root, semitones) {
    return root * Math.pow(2, semitones / 12);
  }

  const MUSIC_PROFILES = {
    wind: {
      root: 196,
      melodyType: "triangle",
      melodyVol: 0.038,
      padVol: 0.012,
      beat: 0.5,
      notes: [
        { d: 0, len: 0.62 },
        { d: 2, len: 0.5 },
        { d: 4, len: 0.62 },
        { d: 7, len: 0.7 },
        { d: 4, len: 0.5 },
        { d: 2, len: 0.5 },
        { d: 0, len: 0.7 },
        { d: 7, len: 0.62 },
      ],
    },
    water: {
      root: 220,
      melodyType: "sine",
      melodyVol: 0.036,
      padVol: 0.011,
      beat: 0.42,
      notes: [
        { d: 0, len: 0.5 },
        { d: 4, len: 0.42 },
        { d: 7, len: 0.55 },
        { d: 9, len: 0.5 },
        { d: 7, len: 0.42 },
        { d: 4, len: 0.42 },
        { d: 2, len: 0.5 },
        { d: 0, len: 0.62 },
      ],
    },
    rumble: {
      root: 110,
      melodyType: "triangle",
      melodyVol: 0.034,
      padVol: 0.014,
      beat: 0.58,
      notes: [
        { d: 0, len: 0.7 },
        { d: 3, len: 0.5 },
        { d: 7, len: 0.7 },
        { d: 3, len: 0.5 },
        { d: 0, len: 0.62 },
        { d: 7, len: 0.5 },
        { d: 10, len: 0.7 },
        { d: 7, len: 0.62 },
      ],
    },
    ice: {
      root: 262,
      melodyType: "sine",
      melodyVol: 0.032,
      padVol: 0.01,
      beat: 0.48,
      notes: [
        { d: 0, len: 0.55 },
        { d: 4, len: 0.48 },
        { d: 7, len: 0.55 },
        { d: 12, len: 0.7 },
        { d: 11, len: 0.48 },
        { d: 7, len: 0.48 },
        { d: 4, len: 0.55 },
        { d: 0, len: 0.7 },
      ],
    },
    swamp: {
      root: 147,
      melodyType: "triangle",
      melodyVol: 0.034,
      padVol: 0.012,
      beat: 0.62,
      notes: [
        { d: 0, len: 0.7 },
        { d: 3, len: 0.55 },
        { d: 5, len: 0.62 },
        { d: 7, len: 0.7 },
        { d: 5, len: 0.55 },
        { d: 3, len: 0.55 },
        { d: 0, len: 0.7 },
        { d: 7, len: 0.62 },
      ],
    },
    factory: {
      root: 131,
      melodyType: "triangle",
      melodyVol: 0.034,
      padVol: 0.01,
      beat: 0.36,
      notes: [
        { d: 0, len: 0.4 },
        { d: 7, len: 0.36 },
        { d: 12, len: 0.48 },
        { d: 7, len: 0.36 },
        { d: 0, len: 0.4 },
        { d: 5, len: 0.36 },
        { d: 7, len: 0.42 },
        { d: 12, len: 0.5 },
      ],
    },
    space: {
      root: 175,
      melodyType: "sine",
      melodyVol: 0.03,
      padVol: 0.011,
      beat: 0.7,
      notes: [
        { d: 0, len: 0.85 },
        { d: 7, len: 0.7 },
        { d: 12, len: 0.9 },
        { d: 7, len: 0.7 },
        { d: 3, len: 0.75 },
        { d: 10, len: 0.7 },
        { d: 12, len: 0.9 },
        { d: 7, len: 0.8 },
      ],
    },
  };

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    unlocked = true;
    return ctx;
  }

  function unlock() {
    ensure();
  }

  function beep(freq, dur, type, vol, slide) {
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol || 0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function playSoftNote(freq, start, dur, type, vol) {
    const ac = ctx;
    if (!ac || !musicNodes || !musicNodes.gain) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, start);
    const attack = Math.min(0.1, dur * 0.22);
    const release = Math.min(0.28, dur * 0.5);
    const peakAt = start + attack;
    const fadeAt = Math.max(peakAt, start + dur - release);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, peakAt);
    g.gain.setValueAtTime(vol, fadeAt);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(musicNodes.gain);
    o.start(start);
    o.stop(start + dur + 0.03);
  }

  function shoot() {
    beep(880, 0.06, "square", 0.05, 220);
  }

  function jump() {
    beep(280, 0.12, "triangle", 0.07, 520);
  }

  function hit() {
    beep(160, 0.08, "sawtooth", 0.06, 80);
  }

  function coin() {
    beep(660, 0.05, "sine", 0.06, 990);
    setTimeout(function () {
      beep(990, 0.07, "sine", 0.05);
    }, 50);
  }

  function bossWarn() {
    beep(280, 0.32, "sawtooth", 0.1, 920);
  }

  function lightning() {
    beep(180, 0.09, "sawtooth", 0.08, 70);
    beep(1480, 0.06, "square", 0.045, 360);
  }

  function stopAmbient() {
    if (!ambientNodes) return;
    try {
      const t = (ctx && ctx.currentTime) || 0;
      if (ambientNodes.gain) {
        ambientNodes.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      }
      if (ambientNodes.src) ambientNodes.src.stop(t + 0.3);
    } catch (e) {
      /* ignore */
    }
    ambientNodes = null;
  }

  function startAmbient() {
    stopAmbient();
  }

  function stopMusic() {
    if (!musicNodes) return;
    if (musicNodes.timeoutId) clearTimeout(musicNodes.timeoutId);
    try {
      const ac = ctx;
      if (ac && musicNodes.gain) {
        const t = ac.currentTime;
        musicNodes.gain.gain.cancelScheduledValues(t);
        musicNodes.gain.gain.setValueAtTime(
          Math.max(0.0001, musicNodes.gain.gain.value),
          t
        );
        musicNodes.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      }
    } catch (e) {
      /* ignore */
    }
    musicNodes = null;
  }

  function scheduleBar(prof) {
    if (!musicNodes || !ctx) return;
    const ac = ctx;
    const t0 = ac.currentTime + 0.04;
    const notes = prof.notes;
    const barDur = notes.length * prof.beat;
    playSoftNote(hz(prof.root, 0), t0, barDur + 0.15, "sine", prof.padVol);
    playSoftNote(hz(prof.root, 7), t0, barDur + 0.15, "sine", prof.padVol * 0.72);
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      playSoftNote(
        hz(prof.root, n.d),
        t0 + i * prof.beat,
        n.len,
        prof.melodyType,
        prof.melodyVol
      );
    }
    musicNodes.timeoutId = setTimeout(function () {
      scheduleBar(prof);
    }, barDur * 1000);
  }

  function startMusic(kind) {
    const ac = ensure();
    if (!ac) return;
    stopMusic();
    const prof = MUSIC_PROFILES[kind] || MUSIC_PROFILES.wind;
    const master = ac.createGain();
    master.gain.value = 0.9;
    master.connect(ac.destination);
    musicNodes = { timeoutId: null, gain: master };
    scheduleBar(prof);
  }

  global.AudioFX = {
    unlock: unlock,
    shoot: shoot,
    jump: jump,
    hit: hit,
    coin: coin,
    bossWarn: bossWarn,
    lightning: lightning,
    startAmbient: startAmbient,
    stopAmbient: stopAmbient,
    startMusic: startMusic,
    stopMusic: stopMusic,
    isUnlocked: function () {
      return unlocked;
    },
  };
})(window);
