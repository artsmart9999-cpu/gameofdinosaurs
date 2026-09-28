(function (global) {
  "use strict";

  const BULLET_SPEED = 720;
  const BULLET_RADIUS = 4;
  const ENEMY_CONTACT_DAMAGE = 8;
  const INVULN_DURATION = 0.5;
  const MAX_DT = 0.033;
  const DRONE_ORBIT = 42;
  const DRONE_FIRE_INTERVAL = 1.2;
  const COIN_PER_KILL = 15;
  const VICTORY_BONUS = 200;
  const JUMP_VELOCITY = -520;
  const GRAVITY = 1600;
  const MAX_FALL = 900;
  const FLY_SPEED = 280;
  const DOUBLE_TAP = 0.28;
  const PLAYER_BASE_W = 90;
  const PLAYER_BASE_H = 110;
  const WATERFALL_WX = 1800;
  const WATERFALL_W = 56;
  const PARTICLE_COUNT = 50;
  const ENEMY_BULLET_SPEED = 320;
  const MAX_SPITTERS = 2;
  const MAX_TANKS = 2;
  const MAX_DIVERS = 3;
  const ENEMY_COLORS = {
    grunt: "#c0392b",
    rusher: "#e67e22",
    strafer: "#9b59b6",
    spitter: "#1abc9c",
    diver: "#3498db",
    tank: "#7f8c8d",
    frost_raptor: "#5dade2",
    spinosaur: "#27ae60",
    drone_ptero: "#bdc3c7",
  };

  /** Native orientation of the PNG; missing types fall back to grunt (left). */
  const SPRITE_FACES_LEFT = {
    grunt: true,
    rusher: true,
    tank: true,
    tyrant: true,
    spitter: false,
    frost_raptor: true,
    spinosaur: true,
    drone_ptero: false,
  };

  let width = 0;
  let height = 0;
  let platformY = 0;
  let combat = null;
  let skill = null;
  let player = null;
  let bullets = [];
  let rockets = [];
  let enemyBullets = [];
  let enemies = [];
  let drones = [];
  let scrollX = 0;
  let levelProgress = 0;
  let levelTime = 0;
  let kills = 0;
  let runGold = 0;
  let shootCooldown = 0;
  let invulnTimer = 0;
  let skillCooldown = 0;
  let spawnTimer = 0;
  let finished = false;
  let outcome = null;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let keys = null;
  let fx = [];
  let lightningBolts = [];
  let worldCoins = [];
  let paused = false;
  let animTime = 0;
  let pauseBtn = { x: 0, y: 0, w: 44, h: 44 };
  let hudHold = { a: false, d: false };
  let moveBtnA = { x: 0, y: 0, w: 48, h: 48 };
  let moveBtnD = { x: 0, y: 0, w: 48, h: 48 };
  let skillCircle = { cx: 0, cy: 0, r: 34 };
  let weaponCircle = { cx: 0, cy: 0, r: 34 };
  let hangarBtn = { x: 0, y: 0, w: 220, h: 48 };
  let biome = null;
  let level = null;
  let difficulty = null;
  let tookDamage = false;
  let clouds = [];
  let particles = [];
  let hazardState = null;
  let waterfallPhase = 0;
  let currentWaveIndex = -1;
  let waveBannerTimer = 0;
  let waveBannerText = "";
  let boss = null;
  let bossSpawned = false;
  let bossDeadTimer = -1;
  let bossKilled = false;
  let bossFx = null;
  let battleMode = "campaign";
  let survivalWave = 1;
  let survivalWaveTimer = 45;
  let survivalTier = 0;
  let survivalLastTier = 0;
  let survivalMiniBossFlip = 0;
  let shakeTimer = 0;
  let shakeMag = 0;
  let hitstopTimer = 0;
  let floatTexts = [];
  let playerHitFlashTimer = 0;

  function isSurvivalMode() {
    return battleMode === "survival" || (level && level.mode === "survival");
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function distSq(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return dx * dx + dy * dy;
  }

  function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    return distSq(cx, cy, closestX, closestY) <= r * r;
  }

  function rectRectHit(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function screenShakeOffset() {
    if (shakeTimer <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * shakeMag * 2,
      y: (Math.random() - 0.5) * shakeMag * 2,
    };
  }

  function worldToScreen(wx, wy) {
    const sh = screenShakeOffset();
    return { x: wx - scrollX + sh.x, y: wy + sh.y };
  }

  function triggerShake(mag, dur) {
    shakeMag = Math.max(shakeMag, mag);
    shakeTimer = Math.max(shakeTimer, dur);
  }

  function triggerHitstop(sec) {
    hitstopTimer = Math.max(hitstopTimer, sec);
  }

  function triggerBossDeathJuice() {
    triggerShake(14, 0.35);
    triggerHitstop(0.12);
  }

  function spawnFloatText(wx, wy, amount, crit, kind) {
    const n = Math.max(1, Math.round(amount));
    let stack = 0;
    for (let i = 0; i < floatTexts.length; i++) {
      const prev = floatTexts[i];
      if (Math.abs(prev.wx - wx) < 36 && prev.life > 0.2) stack++;
    }
    floatTexts.push({
      wx: wx,
      wy: wy - stack * 16,
      text: "-" + n,
      life: 0.85,
      vy: -48 - Math.random() * 12,
      crit: !!crit,
      kind: kind || "enemy",
    });
  }

  function updateJuice(dt) {
    if (shakeTimer > 0) {
      shakeTimer -= dt;
      if (shakeTimer <= 0) {
        shakeTimer = 0;
        shakeMag = 0;
      }
    }
  }

  function updateFloatTexts(dt) {
    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const f = floatTexts[i];
      f.life -= dt;
      f.wy += f.vy * dt;
      f.vy *= 0.92;
      if (f.life <= 0) floatTexts.splice(i, 1);
    }
  }

  function decayHitFlashes(dt) {
    if (playerHitFlashTimer > 0) playerHitFlashTimer -= dt;
    if (boss && boss.hitFlash > 0) boss.hitFlash -= dt;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.muzzleFlash > 0) e.muzzleFlash -= dt;
    }
  }

  function juicePlayerHit(dmg) {
    playerHitFlashTimer = 0.12;
    if (player) {
      spawnFloatText(
        player.x + player.w * 0.5,
        player.y + player.h * 0.3,
        dmg,
        false,
        "player"
      );
    }
  }

  function screenToWorld(sx, sy) {
    return { x: sx + scrollX, y: sy };
  }

  function resetParticle(p, kind) {
    const bid = biome ? biome.id : "plains";
    if (bid === "volcano") {
      p.x = scrollX + Math.random() * width;
      p.y = platformY - 20 - Math.random() * (height * 0.5);
      p.vx = (Math.random() - 0.5) * 40;
      p.vy = -40 - Math.random() * 90;
      p.life = 1.5 + Math.random() * 2;
      p.maxLife = p.life;
      p.r = 2 + Math.random() * 3;
      p.kind = "ember";
    } else if (bid === "glacier") {
      p.x = scrollX + Math.random() * width;
      p.y = 30 + Math.random() * (platformY - 80);
      p.vx = (Math.random() - 0.5) * 25;
      p.vy = 40 + Math.random() * 60;
      p.life = 1.2 + Math.random() * 1.5;
      p.maxLife = p.life;
      p.r = 2 + Math.random() * 3;
      p.kind = "snow";
    } else if (bid === "falls") {
      p.x = WATERFALL_WX + (Math.random() - 0.5) * (WATERFALL_W + 40);
      p.y = 40 + Math.random() * (platformY - 80);
      p.vx = (Math.random() - 0.5) * 30;
      p.vy = 60 + Math.random() * 120;
      p.life = 0.8 + Math.random() * 1.2;
      p.maxLife = p.life;
      p.r = 2 + Math.random() * 4;
      p.kind = "mist";
    } else {
      p.x = scrollX + Math.random() * width;
      p.y = 60 + Math.random() * (platformY - 100);
      p.vx = -20 - Math.random() * 40;
      p.vy = 10 + Math.random() * 25;
      p.life = 3 + Math.random() * 4;
      p.maxLife = p.life;
      p.r = 3 + Math.random() * 4;
      p.kind = "leaf";
      p.rot = Math.random() * Math.PI * 2;
    }
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = {};
      resetParticle(p);
      p.life = Math.random() * (p.maxLife || 2);
      particles.push(p);
    }
  }

  function updateParticles(dt) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.kind === "leaf") p.rot += dt * 2;
      if (p.kind === "ember") p.vy -= 20 * dt;
      if (
        p.life <= 0 ||
        p.y > platformY + 20 ||
        p.y < -40 ||
        p.x < scrollX - 80 ||
        p.x > scrollX + width + 80
      ) {
        resetParticle(p);
      }
    }
  }

  function drawParticles(ctx) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const s = worldToScreen(p.x, p.y);
      const a = Math.max(0, p.life / (p.maxLife || 1));
      if (p.kind === "ember") {
        ctx.fillStyle = "rgba(255," + Math.floor(100 + a * 100) + ",40," + (0.35 + a * 0.5) + ")";
        ctx.beginPath();
        ctx.arc(s.x, s.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "snow") {
        ctx.fillStyle = "rgba(230,245,255," + (0.35 + a * 0.5) + ")";
        ctx.beginPath();
        ctx.arc(s.x, s.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "mist") {
        ctx.fillStyle = "rgba(200,230,240," + (0.15 + a * 0.35) + ")";
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, p.r * 1.5, p.r, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = "rgba(90,160,70," + (0.25 + a * 0.45) + ")";
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        ctx.restore();
      }
    }
  }

  function drawWaterfall(ctx) {
    if (!biome || biome.id !== "falls") return;
    const sx = WATERFALL_WX - scrollX;
    if (sx + WATERFALL_W < -20 || sx > width + 20) return;
    const top = 20;
    const bot = platformY;
    const h = bot - top;
    const g = ctx.createLinearGradient(sx, top, sx + WATERFALL_W, top);
    g.addColorStop(0, "rgba(120,190,220,0.15)");
    g.addColorStop(0.5, "rgba(180,230,255,0.55)");
    g.addColorStop(1, "rgba(120,190,220,0.15)");
    ctx.fillStyle = g;
    ctx.fillRect(sx, top, WATERFALL_W, h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, top, WATERFALL_W, h);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    const bandH = 18;
    const offset = (waterfallPhase * 140) % bandH;
    for (let y = top - bandH + offset; y < bot; y += bandH) {
      ctx.fillRect(sx + 4, y, WATERFALL_W - 8, 6);
    }
    ctx.fillStyle = "rgba(160,220,255,0.25)";
    for (let y = top - bandH * 0.5 + offset * 1.3; y < bot; y += bandH * 1.4) {
      ctx.fillRect(sx + 12, y, WATERFALL_W - 24, 4);
    }
    ctx.restore();

    ctx.fillStyle = "rgba(200,230,245,0.4)";
    for (let i = 0; i < 6; i++) {
      const bx = sx + WATERFALL_W * 0.5 + Math.sin(waterfallPhase * 8 + i) * 18;
      const by = bot - 8 - (i % 3) * 6;
      ctx.beginPath();
      ctx.ellipse(bx, by, 10 + (i % 3) * 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function initBattle(w, h, save, inputKeys, levelCfg) {
    width = w;
    height = h;
    platformY = h * 0.78;
    keys = inputKeys;
    combat = global.DinoData.getCombatStats(save);
    skill = global.DinoData.getSkillStats(save);
    level = levelCfg || global.DinoData.getLevelConfig(1, 1);
    battleMode = level.mode === "survival" ? "survival" : "campaign";
    const D = global.DinoData;
    survivalWave = 1;
    survivalWaveTimer = D.SURVIVAL_WAVE_SEC || 45;
    survivalTier = 0;
    survivalLastTier = 0;
    survivalMiniBossFlip = 0;
    difficulty = global.DinoData.getDifficulty(
      save && save.selectedDifficulty ? save.selectedDifficulty : "normal"
    );
    biome = level.biome;
    tookDamage = false;
    clouds = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({
        x: Math.random() * width,
        y: 40 + Math.random() * (height * 0.35),
        w: 60 + Math.random() * 100,
        h: 22 + Math.random() * 28,
        speed: 12 + Math.random() * 28,
      });
    }
    waterfallPhase = 0;
    initParticles();
    initHazards();
    currentWaveIndex = -1;
    waveBannerTimer = 0;
    waveBannerText = "";
    boss = null;
    bossSpawned = false;
    bossDeadTimer = -1;
    bossKilled = false;
    bossFx = {
      iceWall: null,
      groundWave: null,
      earthquake: null,
      laser: null,
    };
    shakeTimer = 0;
    shakeMag = 0;
    hitstopTimer = 0;
    floatTexts = [];
    playerHitFlashTimer = 0;
    if (global.AudioFX) {
      global.AudioFX.unlock();
      global.AudioFX.startAmbient(biome.ambient);
      global.AudioFX.startMusic(biome.ambient);
    }
    finished = false;
    outcome = null;
    levelProgress = 0;
    levelTime = 0;
    kills = 0;
    runGold = 0;
    shootCooldown = 0;
    invulnTimer = 0;
    skillCooldown = 0;
    spawnTimer = 0.5;
    bullets = [];
    rockets = [];
    lightningBolts = [];
    enemyBullets = [];
    enemies = [];
    fx = [];
    worldCoins = [];
    paused = false;
    mouseDown = false;
    hudHold.a = false;
    hudHold.d = false;
    animTime = 0;
    drones = [
      { angle: 0, fireTimer: 0.3 },
      { angle: Math.PI, fireTimer: 0.9 },
    ];
    const startX = 400;
    const scale = combat.evoScale || 1;
    const ph = PLAYER_BASE_H * scale;
    const pw = PLAYER_BASE_W * scale;
    player = {
      x: startX,
      y: platformY - ph,
      w: pw,
      h: ph,
      hp: combat.maxHp,
      maxHp: combat.maxHp,
      aimAngle: 0,
      vy: 0,
      grounded: true,
      flying: false,
      lastUpPressTime: -999,
      shieldTimer: 0,
      slideVx: 0,
      slowTimer: 0,
      slowMult: 1,
    };
    scrollX = player.x - width * 0.35;
    mouseX = width * 0.6;
    mouseY = height * 0.4;
  }

  function countType(typeId) {
    let n = 0;
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].typeId === typeId) n++;
    }
    return n;
  }

  function threatScore() {
    let s = 0;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      s += 1;
      if (e.typeId === "spitter") s += 1.5;
      else if (e.typeId === "tank") s += 2;
      else if (e.typeId === "rusher" && e.phase === "dash") s += 1;
      else if (e.typeId === "diver") s += 0.5;
    }
    s += enemyBullets.length * 0.5;
    return s;
  }

  function currentWave() {
    if (isSurvivalMode()) {
      const waves = global.DinoData.WAVES;
      const base = waves[waves.length - 1];
      const tier = survivalTier;
      const wave = survivalWave;
      const scale = 1 + tier * 0.08 + wave * 0.03;
      const spdScale = 1 + tier * 0.05 + wave * 0.02;
      const intervalDiv = 1 + tier * 0.06 + wave * 0.025;
      return {
        index: base.index,
        minProgress: base.minProgress,
        maxProgress: base.maxProgress,
        title: "Волна " + wave,
        hpMult: base.hpMult * scale,
        speedMult: base.speedMult * spdScale,
        maxAlive: Math.min(20, base.maxAlive + Math.floor(tier / 2)),
        baseInterval: base.baseInterval / intervalDiv,
        mix: base.mix,
      };
    }
    return global.DinoData.getWaveForLevel(levelProgress, level);
  }

  function finalBurst(wave) {
    if (isSurvivalMode()) return false;
    return !level.hasBoss && global.DinoData.isFinalWave(wave, level);
  }

  function applyDamageToEnemy(e, damage, opts) {
    opts = opts || {};
    let dmg = damage;
    if (e && e.shielded) {
      dmg *= 0.35;
      e.shielded = false;
    }
    e.hp -= dmg;
    e.hitFlash = 0.1;
    const wx =
      opts.wx != null ? opts.wx : e.x + (e.w || 0) * 0.5;
    const wy = opts.wy != null ? opts.wy : e.y + (e.h || 0) * 0.35;
    const crit = opts.crit || opts.weaponId === "rail";
    spawnFloatText(wx, wy, dmg, crit);
    if (opts.weaponId === "rail") {
      triggerShake(6, 0.12);
      triggerHitstop(0.05);
    }
    return dmg;
  }

  function nightmareShielded(typeId) {
    if (!difficulty || difficulty.id !== "nightmare" || !difficulty.modifiers) {
      return false;
    }
    if (typeId !== "grunt" && typeId !== "tank") return false;
    return Math.random() < difficulty.modifiers.shieldChance;
  }

  function nextSpawnInterval(wave) {
    const w = wave || currentWave();
    const threat = threatScore();
    const burst = finalBurst(w) ? 0.8 : 1;
    const spawnMult = difficulty ? difficulty.spawnMult : 1;
    return clamp(
      (w.baseInterval * (1 + threat * 0.08) - levelProgress * 0.15) *
        burst *
        spawnMult,
      0.22,
      1.4
    );
  }

  function pickEnemyType() {
    const wave = currentWave();
    const biomeId = biome ? biome.id : "plains";
    const pool = [];
    let total = 0;
    const mixIds = Object.keys(wave.mix);
    const idSet = {};
    for (let i = 0; i < mixIds.length; i++) idSet[mixIds[i]] = true;
    const allowed = level && level.enemies ? level.enemies : [];
    for (let a = 0; a < allowed.length; a++) {
      if (!idSet[allowed[a]]) idSet[allowed[a]] = true;
    }
    const ids = Object.keys(idSet);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id === "spitter" && countType("spitter") >= MAX_SPITTERS) continue;
      if (id === "tank" && countType("tank") >= MAX_TANKS) continue;
      if (id === "diver" && countType("diver") >= MAX_DIVERS) continue;
      let weight = global.DinoData.getSpawnWeight(
        id,
        wave,
        biomeId,
        level.enemies
      );
      if (weight <= 0 && allowed.indexOf(id) >= 0) {
        const typExtra = global.DinoData.getEnemyType(id);
        if (typExtra && typExtra.id === id) {
          weight =
            typExtra.spawnWeight * (0.5 + wave.index * 0.25);
        }
      }
      if (weight <= 0) continue;
      const typ = global.DinoData.getEnemyType(id);
      pool.push({ typ: typ, weight: weight });
      total += weight;
    }
    if (!pool.length) return global.DinoData.getEnemyType("grunt");
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) return pool[i].typ;
    }
    return pool[pool.length - 1].typ;
  }

  function pushEnemy(typ, exOffset) {
    const t = levelProgress;
    const wave = currentWave();
    const ahead =
      player.x + width * 0.5 + Math.random() * 400 + (exOffset || 0);
    const ex = clamp(
      ahead,
      player.x + 200,
      global.DinoData.WORLD_LENGTH - 100
    );
    const sizeScale = 1 + wave.index * 0.04;
    const baseW = Math.floor(typ.w * sizeScale);
    const baseH = Math.floor(typ.h * sizeScale);
    let ey = platformY - baseH - Math.random() * 120;
    let phase = typ.behavior === "charge" ? "windup" : "idle";
    if (typ.behavior === "dive") {
      ey = -40 - Math.random() * 30;
      phase = "dive";
    } else if (typ.behavior === "swarm_fly") {
      ey = platformY - 160 - Math.random() * 80;
      phase = "fly";
    } else if (typ.behavior === "burrow") {
      phase = "surface";
    }
    const hpMult = difficulty ? difficulty.enemyHpMult : 1;
    const dmgMult = difficulty ? difficulty.enemyDmgMult : 1;
    const coinDiff = difficulty ? difficulty.coinMult : 1;
    let hp = Math.ceil(
      typ.hp * wave.hpMult * (1 + t) * level.hpMult * hpMult
    );
    let speed = typ.speed * wave.speedMult + t * 25;
    let coinValue = Math.round(typ.coinValue * level.coinMult * coinDiff);
    const elite = !!(level && level.eliteOnly);
    if (elite) {
      hp = Math.ceil(hp * 1.35);
      speed *= 1.15;
      coinValue = Math.round(coinValue * 1.4);
    }
    if (
      difficulty &&
      difficulty.id === "nightmare" &&
      difficulty.modifiers &&
      (typ.id === "rusher" ||
        typ.id === "strafer" ||
        typ.id === "diver" ||
        typ.id === "frost_raptor" ||
        typ.id === "drone_ptero")
    ) {
      speed *= difficulty.modifiers.fastSpeedMult;
    }
    enemies.push({
      x: ex,
      y: ey,
      w: baseW,
      h: baseH,
      hp: hp,
      maxHp: hp,
      speed: speed,
      typeId: typ.id,
      behavior: typ.behavior,
      contactDamage: typ.contactDamage * level.dmgMult * dmgMult,
      coinValue: coinValue,
      shielded: nightmareShielded(typ.id),
      elite: elite,
      color: ENEMY_COLORS[typ.id] || ENEMY_COLORS.grunt,
      phase: phase,
      phaseTimer: 0.4 + Math.random() * 0.5,
      fireTimer: 1 + Math.random(),
      dashDx: 0,
      dashDy: 0,
      diveVy: 0,
      baseY: Math.min(ey, platformY - baseH - 40),
      strafePhase: Math.random() * Math.PI * 2,
      burrowTargetX: 0,
      _uid: "e" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    });
  }

  function spawnEnemy() {
    const typ = pickEnemyType();
    const pack = typ.spawnPack || 1;
    for (let i = 0; i < pack; i++) {
      pushEnemy(typ, i * 55);
    }
  }

  function bossDamageMult() {
    const def = level && level.bossDef ? level.bossDef : null;
    const ch =
      def && def.bossDmgMult != null ? def.bossDmgMult : 1;
    const lv = level ? level.dmgMult : 1;
    const diff = difficulty ? difficulty.enemyDmgMult : 1;
    return ch * lv * diff;
  }

  function pickBossAttack(attacks) {
    if (!attacks || !attacks.length) return "chase";
    const special = [];
    for (let i = 0; i < attacks.length; i++) {
      if (attacks[i] !== "chase") special.push(attacks[i]);
    }
    if (!special.length) return "chase";
    if (Math.random() < 0.58) {
      return special[Math.floor(Math.random() * special.length)];
    }
    return "chase";
  }

  function bossMoveToward(dt, px, py, speedMult) {
    if (!boss || boss.burrowHidden) return;
    const ex = boss.x + boss.w * 0.5;
    const ey = boss.y + boss.h * 0.5;
    const dx = px - ex;
    const dy = py - ey;
    const dist = Math.hypot(dx, dy) || 1;
    const spd = boss.speed * (speedMult || 1);
    boss.x += (dx / dist) * spd * dt;
    boss.y += (dy / dist) * spd * dt * 0.35;
    boss.y = Math.min(boss.y, platformY - boss.h);
  }

  function fireBossIcicleFan(ex, ey, px, py) {
    const base = Math.atan2(py - ey, px - ex);
    const n = 6;
    const dmg = 9 * bossDamageMult();
    for (let i = 0; i < n; i++) {
      const ang = base + (i - (n - 1) / 2) * 0.18;
      const tx = ex + Math.cos(ang) * 400;
      const ty = ey + Math.sin(ang) * 400;
      fireEnemyBullet(ex, ey, tx, ty, dmg, {
        speed: 280,
        slow: 2.2,
        tint: "ice",
        r: 6,
      });
    }
  }

  function fireBossRocketSalvo(px, py) {
    const ex = boss.x + boss.w * 0.5;
    const ey = boss.y + boss.h * 0.35;
    const dmg = 14 * bossDamageMult();
    for (let i = 0; i < 4; i++) {
      const spread = (i - 1.5) * 0.12;
      const ang = Math.atan2(py - ey, px - ex) + spread;
      enemyBullets.push({
        x: ex,
        y: ey,
        vx: Math.cos(ang) * 420,
        vy: Math.sin(ang) * 420,
        r: 9,
        damage: dmg,
        life: 2.5,
        slowDuration: 0,
        tint: "rocket",
      });
    }
  }

  function spawnBossIceWall() {
    const wallW = 36;
    const wallH = platformY - (boss.y - 20);
    bossFx.iceWall = {
      x: boss.x - wallW - 20,
      y: boss.y - 30,
      w: wallW,
      h: Math.max(60, wallH),
      life: 2.5,
    };
  }

  function startBossAttack(attackId, px, py) {
    const wind = {
      spit: 0.15,
      screen_dash: 0.4,
      summon_grunt: 0.35,
      charge_ram: 0.55,
      earthquake: 0.5,
      icicle_fan: 0.4,
      ice_wall: 0.35,
      burrow_dive: 0.3,
      ground_wave: 0.4,
      laser_beam: 0.6,
      rocket_salvo: 0.45,
      shield: 0.2,
    };
    boss.attackState = {
      id: attackId,
      stage: "windup",
      timer: wind[attackId] != null ? wind[attackId] : 0.3,
      dashDx: 0,
      dashDy: 0,
      aimX: px,
      aimY: py,
    };
    const windDur = wind[attackId] != null ? wind[attackId] : 0.3;
    if (
      global.AudioFX &&
      global.AudioFX.bossWarn &&
      windDur >= 0.35 &&
      attackId !== "shield" &&
      attackId !== "spit"
    ) {
      global.AudioFX.bossWarn();
    }
    if (attackId === "screen_dash") {
      const ex = boss.x + boss.w * 0.5;
      boss.attackState.dashDx = px >= ex ? 1 : -1;
    }
    if (attackId === "charge_ram") {
      const ex = boss.x + boss.w * 0.5;
      const ey = boss.y + boss.h * 0.5;
      const dx = px - ex;
      const dy = py - ey;
      const dist = Math.hypot(dx, dy) || 1;
      boss.attackState.dashDx = dx / dist;
      boss.attackState.dashDy = dy / dist;
    }
    if (attackId === "burrow_dive") {
      boss.burrowHidden = true;
    }
  }

  function tickBossAttack(dt, px, py) {
    const st = boss.attackState;
    if (!st) return false;
    st.timer -= dt;
    const ex = boss.x + boss.w * 0.5;
    const ey = boss.y + boss.h * 0.5;

    if (st.id === "screen_dash") {
      if (st.stage === "windup") {
        boss.x += Math.sin(animTime * 35) * 0.9;
        if (st.timer <= 0) {
          st.stage = "active";
          st.timer = 0.45;
        }
      } else if (st.stage === "active") {
        boss.x += st.dashDx * boss.speed * 4.2 * dt;
        boss.y += Math.sin(animTime * 20) * 8 * dt;
        if (st.timer <= 0) {
          st.stage = "recover";
          st.timer = 0.55;
        }
      } else {
        if (st.timer <= 0) return false;
      }
      return true;
    }

    if (st.id === "charge_ram") {
      if (st.stage === "windup") {
        if (st.timer <= 0) {
          st.stage = "active";
          st.timer = 0.48;
          boss.y = platformY - boss.h - 8;
        }
      } else if (st.stage === "active") {
        boss.x += st.dashDx * boss.speed * 3.6 * dt;
        boss.y = platformY - boss.h - 8;
        const ram = {
          x: boss.x,
          y: platformY - 34,
          w: boss.w,
          h: 28,
        };
        if (
          !playerIsShielded() &&
          invulnTimer <= 0 &&
          player.y + player.h > platformY - 52 &&
          rectRectHit(player, ram)
        ) {
          const ramDmg = boss.contactDamage * 1.1;
          player.hp -= ramDmg;
          tookDamage = true;
          invulnTimer = INVULN_DURATION;
          juicePlayerHit(ramDmg);
          if (player.hp <= 0) {
            player.hp = 0;
            endBattle(false);
          }
        }
        if (st.timer <= 0) {
          st.stage = "recover";
          st.timer = 0.65;
        }
      } else {
        if (st.timer <= 0) return false;
      }
      return true;
    }

    if (st.id === "burrow_dive") {
      if (st.stage === "windup") {
        if (st.timer <= 0) {
          st.stage = "active";
          st.timer = 1.05;
          st.aimX = px;
        }
      } else if (st.stage === "active") {
        boss.y = Math.min(boss.y + 120 * dt, platformY + 6);
        boss.x += (st.aimX - ex) * dt * 1.5;
        if (st.timer <= 0) {
          st.stage = "emerge";
          st.timer = 0.38;
          boss.x = clamp(px - boss.w * 0.5, 80, global.DinoData.WORLD_LENGTH - boss.w);
          boss.y = platformY - boss.h;
          boss.burrowHidden = false;
        }
      } else if (st.stage === "emerge") {
        if (st.timer <= 0) return false;
      } else {
        if (st.timer <= 0) return false;
      }
      return true;
    }

    if (st.id === "earthquake") {
      if (st.stage === "windup") {
        if (st.timer <= 0) {
          st.stage = "active";
          st.timer = 0.12;
          bossFx.earthquake = {
            x: boss.x + boss.w * 0.5 - 200,
            w: 400,
            life: 0.25,
            damaged: false,
          };
        }
      } else if (st.stage === "active") {
        if (st.timer <= 0) {
          st.stage = "recover";
          st.timer = 0.85;
        }
      } else {
        if (st.timer <= 0) return false;
      }
      return true;
    }

    if (st.id === "laser_beam") {
      if (st.stage === "windup") {
        bossFx.laser = {
          x1: ex,
          y1: ey,
          x2: px,
          y2: py,
          stage: "warn",
          life: st.timer,
        };
        if (st.timer <= 0) {
          st.aimX = px;
          st.aimY = py;
          st.stage = "active";
          st.timer = 0.35;
          bossFx.laser.stage = "active";
          bossFx.laser.x2 = px;
          bossFx.laser.y2 = py;
          bossFx.laser.life = st.timer;
        }
      } else if (st.stage === "active") {
        bossFx.laser = {
          x1: ex,
          y1: ey,
          x2: st.aimX,
          y2: st.aimY,
          stage: "active",
          life: st.timer,
        };
        if (st.timer <= 0) {
          st.stage = "recover";
          st.timer = 0.65;
          bossFx.laser = null;
        }
      } else {
        if (st.timer <= 0) return false;
      }
      return true;
    }

    if (st.stage === "windup") {
      if (st.timer <= 0) {
        st.stage = "active";
        st.timer = 0.08;
        if (st.id === "spit") {
          fireEnemyBullet(ex, ey, px, py, boss.spitDamage);
          st.stage = "recover";
          st.timer = 0.35;
        } else if (st.id === "summon_grunt") {
          spawnSummonGrunt(boss.x - 40);
          spawnSummonGrunt(boss.x + boss.w + 10);
          waveBannerTimer = 1;
          waveBannerText = "ПРИЗЫВ!";
          st.stage = "recover";
          st.timer = 0.75;
        } else if (st.id === "icicle_fan") {
          fireBossIcicleFan(ex, ey, px, py);
          st.stage = "recover";
          st.timer = 0.8;
        } else if (st.id === "ice_wall") {
          spawnBossIceWall();
          st.stage = "recover";
          st.timer = 0.9;
        } else if (st.id === "ground_wave") {
          bossFx.groundWave = {
            x: boss.x,
            w: 40,
            maxW: 520,
            life: 0.55,
            hitDone: false,
          };
          st.stage = "recover";
          st.timer = 0.75;
        } else if (st.id === "rocket_salvo") {
          fireBossRocketSalvo(px, py);
          st.stage = "recover";
          st.timer = 0.85;
        } else if (st.id === "shield") {
          boss.shieldActive = true;
          boss.shieldTimer = 4;
          st.stage = "recover";
          st.timer = 0.4;
        }
      }
      return true;
    }
    if (st.stage === "recover") {
      if (st.timer <= 0) return false;
      return true;
    }
    return true;
  }

  function updateBossFx(dt, px, py) {
    if (!bossFx) return;
    if (bossFx.iceWall) {
      const w = bossFx.iceWall;
      w.life -= dt;
      if (w.life <= 0) bossFx.iceWall = null;
      else if (rectRectHit(player, w)) {
        player.slowTimer = 0.35;
        player.slowMult = 0.5;
      }
    }
    if (bossFx.groundWave) {
      const g = bossFx.groundWave;
      g.life -= dt;
      g.w = Math.min(g.maxW, g.w + 680 * dt);
      if (g.life <= 0) bossFx.groundWave = null;
      else {
        const hit = {
          x: g.x,
          y: platformY - 36,
          w: g.w,
          h: 32,
        };
        if (
          !g.hitDone &&
          player.y + player.h > platformY - 48 &&
          rectRectHit(player, hit) &&
          !playerIsShielded() &&
          invulnTimer <= 0
        ) {
          g.hitDone = true;
          applyHazardDamage(12 * bossDamageMult());
        }
      }
    }
    if (bossFx.earthquake) {
      const eq = bossFx.earthquake;
      eq.life -= dt;
      if (eq.life <= 0) bossFx.earthquake = null;
      else if (!eq.damaged && eq.life < 0.14) {
        eq.damaged = true;
        const hit = { x: eq.x, y: platformY - 40, w: eq.w, h: 36 };
        if (
          player.y + player.h > platformY - 50 &&
          rectRectHit(player, hit)
        ) {
          applyHazardDamage(16 * bossDamageMult());
        }
      }
    }
    if (bossFx.laser && bossFx.laser.stage === "active") {
      const L = bossFx.laser;
      L.life -= dt;
      if (L.life <= 0) bossFx.laser = null;
      else {
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const lx = L.x1 + (L.x2 - L.x1) * t;
          const ly = L.y1 + (L.y2 - L.y1) * t;
          if (
            circleRectHit(lx, ly, 14, player.x, player.y, player.w, player.h) &&
            !playerIsShielded() &&
            invulnTimer <= 0
          ) {
            applyHazardDamage(18 * bossDamageMult());
            break;
          }
        }
      }
    }
    if (boss && boss.shieldTimer > 0) {
      boss.shieldTimer -= dt;
      if (boss.shieldTimer <= 0) boss.shieldActive = false;
    }
  }

  function drawBossTelegraphs(ctx) {
    if (!bossFx) return;
    if (bossFx.earthquake) {
      const eq = bossFx.earthquake;
      const s = worldToScreen(eq.x, platformY);
      ctx.fillStyle = "rgba(180,80,20,0.35)";
      ctx.fillRect(s.x, platformY - 8, eq.w, 10);
    }
    if (bossFx.groundWave) {
      const g = bossFx.groundWave;
      const s = worldToScreen(g.x, platformY);
      ctx.fillStyle = "rgba(40,120,60,0.45)";
      ctx.fillRect(s.x, platformY - 28, g.w, 24);
    }
    if (bossFx.iceWall) {
      const w = bossFx.iceWall;
      const s = worldToScreen(w.x, w.y);
      ctx.fillStyle = "rgba(170,220,255,0.55)";
      ctx.fillRect(s.x, s.y, w.w, w.h);
    }
    if (bossFx.laser) {
      const L = bossFx.laser;
      const a = worldToScreen(L.x1, L.y1);
      const b = worldToScreen(L.x2, L.y2);
      ctx.strokeStyle =
        L.stage === "active"
          ? "rgba(231,76,60,0.85)"
          : "rgba(231,76,60,0.4)";
      ctx.lineWidth = L.stage === "active" ? 5 : 3;
      ctx.setLineDash(L.stage === "active" ? [] : [8, 8]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (boss && boss.attackState && boss.attackState.id === "charge_ram") {
      if (boss.attackState.stage === "windup") {
        const s = worldToScreen(boss.x, platformY);
        ctx.fillStyle = "rgba(255,200,0,0.25)";
        ctx.fillRect(s.x, platformY - 30, boss.w, 26);
      }
    }
  }

  function spawnBoss() {
    const B = level.bossDef || global.DinoData.getChapterBossDef({ bossId: "tyrant" });
    const hpMult = difficulty ? difficulty.enemyHpMult : 1;
    const coinDiff = difficulty ? difficulty.coinMult : 1;
    const bossHp = Math.ceil(
      B.hp * level.hpMult * B.bossHpMult * hpMult
    );
    const bossDmg = bossDamageMult();
    const bx = clamp(
      player.x + width * 0.45,
      player.x + 280,
      global.DinoData.WORLD_LENGTH - B.w - 40
    );
    boss = {
      x: bx,
      y: platformY - B.h,
      w: B.w,
      h: B.h,
      hp: bossHp,
      maxHp: bossHp,
      speed: B.speed,
      typeId: B.id,
      name: B.name,
      spriteKey: B.spriteKey || "enemy_tyrant",
      phases: B.phases,
      contactDamage: B.contactDamage * bossDmg,
      coinValue: Math.round(B.coinValue * level.coinMult * coinDiff),
      spitDamage: B.spitDamage * bossDmg,
      spitCooldown: B.spitCooldown,
      color: "#8e44ad",
      attackCd: 0.6,
      attackState: null,
      shieldActive: false,
      shieldTimer: 0,
      burrowHidden: false,
      lastPhaseBelow: 1,
      dashDx: 0,
      dashDy: 0,
      _uid: "boss_" + B.id,
    };
    bossSpawned = true;
    waveBannerTimer = 2;
    waveBannerText = "БОСС — " + B.name;
  }

  function spawnSurvivalMiniBoss() {
    if (boss && boss.hp > 0) return;
    const id =
      survivalMiniBossFlip % 2 === 0 ? "canyon_warden" : "factory_guard";
    survivalMiniBossFlip++;
    const base = global.DinoData.getChapterBossDef({ bossId: id });
    const hpMult = difficulty ? difficulty.enemyHpMult : 1;
    const coinDiff = difficulty ? difficulty.coinMult : 1;
    const tier = survivalTier;
    const wave = survivalWave;
    const bossHp = Math.ceil(
      base.hp *
        (1 + tier * 0.12) *
        (1 + wave * 0.04) *
        hpMult
    );
    const bossDmg = bossDamageMult();
    const bx = clamp(
      player.x + width * 0.45,
      player.x + 280,
      global.DinoData.WORLD_LENGTH - base.w - 40
    );
    boss = {
      x: bx,
      y: platformY - base.h,
      w: base.w,
      h: base.h,
      hp: bossHp,
      maxHp: bossHp,
      speed: base.speed * (1 + tier * 0.04),
      typeId: base.id,
      name: base.name,
      spriteKey: base.spriteKey || "enemy_tyrant",
      phases: base.phases,
      contactDamage: base.contactDamage * bossDmg,
      coinValue: Math.round(base.coinValue * level.coinMult * coinDiff * 1.2),
      spitDamage: base.spitDamage * bossDmg,
      spitCooldown: base.spitCooldown,
      color: "#8e44ad",
      attackCd: 0.6,
      attackState: null,
      shieldActive: false,
      shieldTimer: 0,
      burrowHidden: false,
      lastPhaseBelow: 1,
      dashDx: 0,
      dashDy: 0,
      survivalMini: true,
      _uid: "boss_surv_" + base.id,
    };
    bossSpawned = true;
    waveBannerTimer = 2;
    waveBannerText = "МИНИ-БОСС — " + base.name;
  }

  function spawnSummonGrunt(ox) {
    const typ = global.DinoData.getEnemyType("grunt");
    const ey = platformY - typ.h - 20;
    enemies.push({
      x: ox,
      y: ey,
      w: typ.w,
      h: typ.h,
      hp: Math.ceil(
        typ.hp * level.hpMult * (difficulty ? difficulty.enemyHpMult : 1)
      ),
      maxHp: Math.ceil(
        typ.hp * level.hpMult * (difficulty ? difficulty.enemyHpMult : 1)
      ),
      speed: typ.speed,
      typeId: typ.id,
      behavior: typ.behavior,
      contactDamage:
        typ.contactDamage *
        level.dmgMult *
        (difficulty ? difficulty.enemyDmgMult : 1),
      coinValue: Math.round(
        typ.coinValue *
          level.coinMult *
          (difficulty ? difficulty.coinMult : 1)
      ),
      shielded: nightmareShielded("grunt"),
      color: ENEMY_COLORS.grunt,
      phase: "idle",
      phaseTimer: 0.3,
      fireTimer: 1,
      dashDx: 0,
      dashDy: 0,
      baseY: ey,
      strafePhase: 0,
      _uid: "e" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    });
  }

  function updateBoss(dt, px, py) {
    if (!boss || boss.hp <= 0) return;
    const ratio = boss.hp / boss.maxHp;
    const phaseDef = global.DinoData.getBossPhase(
      { phases: boss.phases },
      ratio
    );
    if (boss.lastPhaseBelow == null) {
      boss.lastPhaseBelow = phaseDef.hpBelow;
    } else if (phaseDef.hpBelow !== boss.lastPhaseBelow) {
      let label = 2;
      if (phaseDef.hpBelow <= 0.35) label = 3;
      else if (phaseDef.hpBelow <= 0.7) label = 2;
      waveBannerTimer = 1.6;
      waveBannerText = "ФАЗА " + label;
      boss.lastPhaseBelow = phaseDef.hpBelow;
    }

    updateBossFx(dt, px, py);

    const busy = boss.attackState && tickBossAttack(dt, px, py);
    if (!busy) {
      boss.attackState = null;
      boss.attackCd -= dt;
      if (boss.attackCd <= 0) {
        const atk = pickBossAttack(phaseDef.attacks);
        if (atk === "chase") {
          bossMoveToward(dt, px, py, phaseDef.speedMult);
          boss.attackCd = 0.4;
        } else {
          startBossAttack(atk, px, py);
          boss.attackCd = 0.55;
        }
      } else if (!boss.burrowHidden) {
        bossMoveToward(dt, px, py, phaseDef.speedMult * 0.55);
      }
    }

    if (
      boss.attackState &&
      boss.attackState.id === "burrow_dive" &&
      boss.attackState.stage === "emerge" &&
      !playerIsShielded() &&
      invulnTimer <= 0 &&
      rectRectHit(player, boss)
    ) {
      player.hp -= boss.contactDamage;
      tookDamage = true;
      invulnTimer = INVULN_DURATION;
      juicePlayerHit(boss.contactDamage);
      if (player.hp <= 0) {
        player.hp = 0;
        endBattle(false);
      }
    }

    if (
      boss.attackState &&
      boss.attackState.id === "screen_dash" &&
      boss.attackState.stage === "active" &&
      !playerIsShielded() &&
      invulnTimer <= 0 &&
      rectRectHit(player, boss)
    ) {
      const dashDmg = boss.contactDamage * 1.15;
      player.hp -= dashDmg;
      tookDamage = true;
      invulnTimer = INVULN_DURATION;
      juicePlayerHit(dashDmg);
      if (player.hp <= 0) {
        player.hp = 0;
        endBattle(false);
      }
    }

    boss.y = Math.min(boss.y, platformY - boss.h);
  }

  function applyBulletToBoss(b) {
    if (!boss || boss.hp <= 0) return { hit: false, remove: false };
    if (b.hitSet && b.hitSet[boss._uid]) return { hit: false, remove: false };
    if (!circleRectHit(b.x, b.y, b.r, boss.x, boss.y, boss.w, boss.h)) {
      return { hit: false, remove: false };
    }
    if (boss.shieldActive && b.weaponId !== "rail") {
      spawnSparks(b.x, b.y);
      spawnImpact(b.x, b.y);
      if (!b.hitSet) b.hitSet = {};
      b.hitSet[boss._uid] = true;
      return { hit: true, remove: true };
    }
    let dmg = b.damage;
    boss.hp -= dmg;
    boss.hitFlash = 0.1;
    spawnSparks(b.x, b.y);
    spawnImpact(b.x, b.y);
    spawnFloatText(
      boss.x + boss.w * 0.5,
      boss.y + boss.h * 0.35,
      dmg,
      b.weaponId === "rail"
    );
    if (b.weaponId === "rail") {
      triggerShake(6, 0.12);
      triggerHitstop(0.05);
    }
    if (!b.hitSet) b.hitSet = {};
    b.hitSet[boss._uid] = true;
    let remove = true;
    if (b.pierceLeft > 0) {
      b.pierceLeft--;
      remove = false;
    }
    if (global.AudioFX) global.AudioFX.hit();
    if (boss.hp <= 0) {
      triggerBossDeathJuice();
      boss.hp = 0;
      spawnCoins(
        boss.x + boss.w * 0.5,
        boss.y + boss.h * 0.3,
        boss.coinValue || 120
      );
      spawnSparks(boss.x + boss.w * 0.5, boss.y + boss.h * 0.5);
      bossDeadTimer = 2;
      bossKilled = true;
      kills++;
      waveBannerTimer = 2;
      waveBannerText = (boss.name || "Босс").toUpperCase() + " ПОВЕРЖЕН!";
    }
    return { hit: true, remove: remove };
  }

  function fireEnemyBullet(fromX, fromY, toX, toY, damage, opts) {
    opts = opts || {};
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const spd = opts.speed || ENEMY_BULLET_SPEED;
    enemyBullets.push({
      x: fromX,
      y: fromY,
      vx: (dx / len) * spd,
      vy: (dy / len) * spd,
      r: opts.r || 5,
      damage: damage || 10,
      life: 3,
      slowDuration: opts.slow || 0,
      tint: opts.tint || null,
    });
  }

  function updateEnemy(e, dt, px, py) {
    const ex = e.x + e.w * 0.5;
    const ey = e.y + e.h * 0.5;
    const dx = px - ex;
    const dy = py - ey;
    const dist = Math.hypot(dx, dy) || 1;
    const behavior = e.behavior || "chase";

    if (behavior === "dive") {
      if (e.phase === "dive") {
        const targetY = py - e.h * 0.5;
        e.diveVy = Math.min((e.diveVy || 0) + 900 * dt, e.speed * 3.2);
        e.y += e.diveVy * dt;
        e.x += (dx / dist) * e.speed * 0.6 * dt;
        if (e.y >= targetY || e.y >= platformY - e.h - 10) {
          e.phase = "chase";
          e.y = Math.min(e.y, platformY - e.h);
          e.baseY = e.y;
        }
        return;
      }
      e.x += (dx / dist) * e.speed * dt;
      e.y += (dy / dist) * e.speed * dt * 0.5;
      e.y = Math.min(e.y, platformY - e.h);
      return;
    }

    if (behavior === "charge") {
      e.phaseTimer -= dt;
      if (e.phase === "windup") {
        e.x += Math.sin(animTime * 40) * 0.6;
        if (e.phaseTimer <= 0) {
          e.phase = "dash";
          e.phaseTimer = 0.35;
          e.dashDx = dx / dist;
          e.dashDy = dy / dist;
        }
      } else if (e.phase === "dash") {
        e.x += e.dashDx * e.speed * 2.8 * dt;
        e.y += e.dashDy * e.speed * 2.8 * dt * 0.5;
        if (e.phaseTimer <= 0) {
          e.phase = "cooldown";
          e.phaseTimer = 0.9;
        }
      } else {
        e.x += (dx / dist) * e.speed * 0.4 * dt;
        e.y += (dy / dist) * e.speed * 0.4 * dt * 0.5;
        if (e.phaseTimer <= 0) {
          e.phase = "windup";
          e.phaseTimer = 0.45;
        }
      }
      e.y = Math.min(e.y, platformY - e.h);
      return;
    }

    if (behavior === "strafe") {
      const spd = Math.abs(dx) > 350 ? e.speed * 1.25 : e.speed;
      e.x += Math.sign(dx || 1) * spd * dt;
      e.y =
        e.baseY +
        Math.sin(animTime * 3 + e.strafePhase) * 55;
      e.y = clamp(e.y, 40, platformY - e.h);
      return;
    }

    if (behavior === "ranged" || behavior === "frost_ranged") {
      if (dist > 280) {
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt * 0.4;
      } else if (dist < 180) {
        e.x -= (dx / dist) * e.speed * dt;
        e.y -= (dy / dist) * e.speed * dt * 0.3;
      }
      e.y = clamp(e.y, 40, platformY - e.h);
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && dist < 420) {
        const dmg =
          10 * level.dmgMult * (difficulty ? difficulty.enemyDmgMult : 1);
        if (behavior === "frost_ranged") {
          fireEnemyBullet(ex, ey, px, py, dmg * 0.85, {
            speed: 260,
            slow: 2.5,
            tint: "ice",
            r: 6,
          });
          e.fireTimer = 1.7 + Math.random() * 0.5;
        } else {
          fireEnemyBullet(ex, ey, px, py, dmg);
          e.fireTimer = 1.4 + Math.random() * 0.4;
        }
      }
      return;
    }

    if (behavior === "swarm_fly") {
      const spd = Math.abs(dx) > 300 ? e.speed * 1.15 : e.speed;
      e.x += Math.sign(dx || 1) * spd * dt;
      e.y =
        e.baseY + Math.sin(animTime * 4 + e.strafePhase) * 35;
      e.y = clamp(e.y, 50, platformY - 120);
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && dist < 480) {
        fireEnemyBullet(
          ex,
          ey,
          px,
          py,
          8 * level.dmgMult * (difficulty ? difficulty.enemyDmgMult : 1),
          { speed: 380 }
        );
        e.fireTimer = 0.85 + Math.random() * 0.35;
        e.muzzleFlash = 0.1;
      }
      return;
    }

    if (behavior === "burrow") {
      if (e.phase === "surface") {
        e.x += (dx / dist) * e.speed * dt;
        e.y = Math.min(e.y, platformY - e.h);
        e.phaseTimer -= dt;
        if (dist < 280 && e.phaseTimer <= 0) {
          e.phase = "submerge";
          e.phaseTimer = 1.05;
          e.burrowTargetX = px;
        }
        return;
      }
      if (e.phase === "submerge") {
        e.y = Math.min(e.y + 140 * dt, platformY + 8);
        e.x += (e.burrowTargetX - ex) * dt * 1.4;
        e.phaseTimer -= dt;
        if (e.phaseTimer <= 0) {
          e.phase = "emerge";
          e.x = clamp(
            px + (Math.random() - 0.5) * 60,
            80,
            global.DinoData.WORLD_LENGTH - e.w
          );
          e.y = platformY - e.h;
          e.phaseTimer = 0.4;
        }
        return;
      }
      if (e.phase === "emerge") {
        e.phaseTimer -= dt;
        if (e.phaseTimer <= 0) {
          e.phase = "surface";
          e.phaseTimer = 1.2 + Math.random() * 0.8;
        }
        return;
      }
    }

    e.x += (dx / dist) * e.speed * dt;
    e.y += (dy / dist) * e.speed * dt * 0.5;
    e.y = Math.min(e.y, platformY - e.h);
  }

  function spawnCoins(wx, wy, value) {
    worldCoins.push({
      x: wx,
      y: wy,
      vy: -80 - Math.random() * 40,
      value: value,
      life: 8,
    });
  }

  function spawnImpact(wx, wy) {
    fx.push({
      x: wx,
      y: wy,
      life: 0.12,
      maxLife: 0.12,
      kind: "impact",
      r: 18,
    });
  }

  function spawnSparks(wx, wy) {
    for (let i = 0; i < 4; i++) {
      fx.push({
        x: wx + (Math.random() - 0.5) * 20,
        y: wy + (Math.random() - 0.5) * 20,
        life: 0.25 + Math.random() * 0.15,
        maxLife: 0.35,
        kind: "spark",
        r: 3 + Math.random() * 4,
      });
    }
  }

  function spawnMuzzle(wx, wy) {
    fx.push({
      x: wx,
      y: wy,
      life: 0.12,
      maxLife: 0.12,
      kind: "muzzle",
      r: 10,
    });
  }

  function fireBullet(fromX, fromY, angle, damage, withMuzzle, pierceLeft) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const spd = (combat && combat.bulletSpeed) || BULLET_SPEED;
    const rad = (combat && combat.bulletR) || BULLET_RADIUS;
    bullets.push({
      x: fromX,
      y: fromY,
      vx: cos * spd,
      vy: sin * spd,
      r: rad,
      damage: damage || combat.bulletDamage,
      pierceLeft: pierceLeft || 0,
      weaponId: (combat && combat.weaponId) || "blaster",
      hitSet: {},
    });
    if (withMuzzle) spawnMuzzle(fromX, fromY);
  }

  function drawPlayerBullet(ctx, b) {
    const s = worldToScreen(b.x, b.y);
    const ang = Math.atan2(b.vy, b.vx);
    const id = b.weaponId || "blaster";
    let len = 26;
    let thick = 8;
    let shell = "#4fc3f7";
    if (id === "rail") {
      len = 108;
      thick = 11;
      shell = "#ff3b3b";
    } else if (id === "shotgun") {
      len = 14;
      thick = 11;
      shell = "#f5c518";
    }
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);
    ctx.lineCap = "round";
    ctx.strokeStyle = shell;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, thick * 0.32);
    ctx.beginPath();
    ctx.moveTo(-len * 0.72, 0);
    ctx.lineTo(-2, 0);
    ctx.stroke();
    ctx.restore();
  }

  function fireFromPlayer() {
    if (paused || shootCooldown > 0 || finished) return;
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.35;
    const mx = px + Math.cos(player.aimAngle) * 30;
    const my = py + Math.sin(player.aimAngle) * 30;
    const pattern = (combat.weapon && combat.weapon.pattern) || "single";
    const dmg = combat.bulletDamage;
    const pierce = combat.pierceLeft || 0;

    if (pattern === "spread") {
      const n = combat.pelletCount || 3;
      const mid = (n - 1) / 2;
      for (let i = 0; i < n; i++) {
        const ang = player.aimAngle + (i - mid) * 0.12;
        fireBullet(mx, my, ang, dmg, i === mid, 0);
      }
    } else {
      fireBullet(mx, my, player.aimAngle, dmg, true, pierce);
    }

    shootCooldown = combat.bulletCooldown;
    if (global.AudioFX) global.AudioFX.shoot();
  }

  function nearestEnemy() {
    let best = null;
    let bestD = Infinity;
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.35;
    if (boss && boss.hp > 0) {
      best = boss;
      bestD = distSq(px, py, boss.x + boss.w / 2, boss.y + boss.h / 2);
    }
    for (const e of enemies) {
      const d = distSq(px, py, e.x + e.w / 2, e.y + e.h / 2);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function killBossFromSkill(e) {
    triggerBossDeathJuice();
    e.hp = 0;
    spawnCoins(e.x + e.w / 2, e.y + e.h / 2, e.coinValue || 120);
    bossDeadTimer = 2;
    bossKilled = true;
    kills++;
    waveBannerTimer = 2;
    waveBannerText = (boss.name || "Босс").toUpperCase() + " ПОВЕРЖЕН!";
  }

  function explodeRocket(rx, ry, damage, radius) {
    spawnSparks(rx, ry);
    spawnSparks(rx + 10, ry - 8);
    if (boss && boss.hp > 0) {
      const bx = boss.x + boss.w / 2;
      const by = boss.y + boss.h / 2;
      if (Math.hypot(bx - rx, by - ry) <= radius) {
        boss.hp -= damage;
        boss.hitFlash = 0.1;
        spawnFloatText(bx, by, damage, false);
        if (boss.hp <= 0) killBossFromSkill(boss);
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      if (Math.hypot(ex - rx, ey - ry) <= radius) {
        applyDamageToEnemy(e, damage, { wx: ex, wy: ey });
        spawnSparks(ex, ey);
        if (e.hp <= 0) {
          enemies.splice(i, 1);
          kills++;
          spawnCoins(ex, ey, e.coinValue || COIN_PER_KILL);
        }
      }
    }
    if (global.AudioFX) global.AudioFX.hit();
  }

  function spawnLightningBolt(px, py, dir, range, halfAngle) {
    const steps = 8;
    const pts = [];
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const along = t * range;
      const side = i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 42;
      pts.push({
        x: px + Math.cos(dir) * along + nx * side,
        y: py + Math.sin(dir) * along + ny * side,
      });
    }
    lightningBolts.push({
      pts: pts,
      px: px,
      py: py,
      dir: dir,
      range: range,
      halfAngle: halfAngle,
      life: 0.28,
      maxLife: 0.28,
    });
  }

  function useSkill() {
    if (paused || skillCooldown > 0 || finished || !skill) return;
    skillCooldown = skill.cooldown;
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.35;

    if (skill.kind === "shield") {
      player.shieldTimer = skill.duration;
      player.hp = Math.min(player.maxHp, player.hp + skill.heal);
      spawnSparks(px, py);
      return;
    }

    if (skill.kind === "rocket") {
      const target = screenToWorld(mouseX, mouseY);
      const dx = target.x - px;
      const dy = target.y - py;
      const len = Math.hypot(dx, dy) || 1;
      rockets.push({
        x: px,
        y: py,
        vx: (dx / len) * skill.speed,
        vy: (dy / len) * skill.speed,
        tx: target.x,
        ty: target.y,
        r: 7,
        damage: skill.damage,
        radius: skill.radius,
        life: 2.5,
      });
      if (global.AudioFX) global.AudioFX.shoot();
      return;
    }

    // cone / lightning
    const dir = player.aimAngle;
    const dmg = skill.damage;
    const range = skill.range;
    const half = skill.halfAngle || 1.05;
    spawnLightningBolt(px, py, dir, range, half);
    triggerShake(5, 0.12);
    if (global.AudioFX && global.AudioFX.lightning) global.AudioFX.lightning();

    function tryHit(e, isBoss) {
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      const ang = Math.atan2(ey - py, ex - px);
      let diff = ang - dir;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const dist = Math.hypot(ex - px, ey - py);
      if (Math.abs(diff) < half && dist < range) {
        if (isBoss) {
          e.hp -= dmg;
          e.hitFlash = 0.1;
          spawnFloatText(ex, ey, dmg, false);
        } else applyDamageToEnemy(e, dmg, { wx: ex, wy: ey });
        spawnSparks(ex, ey);
        if (isBoss && e.hp <= 0) killBossFromSkill(e);
        return e.hp <= 0 && !isBoss;
      }
      return false;
    }

    if (boss && boss.hp > 0) tryHit(boss, true);
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (tryHit(e, false)) {
        enemies.splice(i, 1);
        kills++;
        spawnCoins(e.x + e.w / 2, e.y + e.h / 2, e.coinValue || COIN_PER_KILL);
      }
    }
  }

  function playerIsShielded() {
    return player && player.shieldTimer > 0;
  }

  function endBattle(victory) {
    finished = true;
    paused = false;
    mouseDown = false;
    hudHold.a = false;
    hudHold.d = false;
    if (global.AudioFX) {
      global.AudioFX.stopAmbient();
      global.AudioFX.stopMusic();
    }
    for (const c of worldCoins) runGold += c.value;
    worldCoins = [];
    enemyBullets = [];
    rockets = [];
    const coinDiff = difficulty ? difficulty.coinMult : 1;
    const survival = isSurvivalMode();
    let coinsEarned = runGold;
    if (!survival) {
      coinsEarned +=
        victory
          ? Math.round(VICTORY_BONUS * level.coinMult * coinDiff)
          : 0;
      if (victory && bossKilled) {
        coinsEarned += Math.round(
          (global.DinoData.BOSS_KILL_BONUS || 0) * coinDiff
        );
      }
    } else {
      coinsEarned += Math.round(
        kills * 3 * coinDiff + levelTime * 0.4 * coinDiff
      );
    }
    const fastEnough = levelTime <= level.targetTime;
    let stars = 0;
    if (victory && !survival) {
      stars = 1;
      if (player.hp > player.maxHp * 0.5) stars = 2;
      if (!tookDamage || (stars === 2 && fastEnough)) stars = 3;
    }
    outcome = {
      mode: survival ? "survival" : "campaign",
      victory: victory,
      kills: kills,
      coinsEarned: coinsEarned,
      levelProgress: levelProgress,
      bossKilled: !!bossKilled,
      weaponReward: !!(victory && bossKilled && level.hasBoss && !survival),
      levelKey: survival ? "survival" : level.key,
      globalLevel: level.globalLevel,
      chapter: level.chapter,
      level: level.level,
      title: level.title,
      chapterName: level.chapterName,
      hasBoss: level.hasBoss,
      stars: stars,
      timeSec: levelTime,
      targetTime: level.targetTime,
      noDamage: !tookDamage,
      hpLeftPct: Math.max(0, Math.round((player.hp / player.maxHp) * 100)),
      difficulty: difficulty ? difficulty.id : "normal",
      difficultyLabel: difficulty ? difficulty.label : "Норма",
      advancesProgress: !!(difficulty && difficulty.advancesProgress && !survival),
      survivalWave: survivalWave,
      survivalTier: survivalTier,
    };
  }

  function togglePause() {
    if (finished) return;
    paused = !paused;
  }

  function hitPauseButton(sx, sy) {
    return (
      sx >= pauseBtn.x &&
      sx <= pauseBtn.x + pauseBtn.w &&
      sy >= pauseBtn.y &&
      sy <= pauseBtn.y + pauseBtn.h
    );
  }

  function hitRect(btn, sx, sy) {
    return (
      sx >= btn.x &&
      sx <= btn.x + btn.w &&
      sy >= btn.y &&
      sy <= btn.y + btn.h
    );
  }

  function hitMoveButton(sx, sy) {
    if (hitRect(moveBtnA, sx, sy)) return "a";
    if (hitRect(moveBtnD, sx, sy)) return "d";
    return "";
  }

  function setHudHold(dir, down) {
    if (dir === "a") hudHold.a = !!down;
    if (dir === "d") hudHold.d = !!down;
  }

  function clearHudHold() {
    hudHold.a = false;
    hudHold.d = false;
  }

  function hitSkillCircle(sx, sy) {
    return pointInCircle(sx, sy, skillCircle);
  }

  function hitWeaponCircle(sx, sy) {
    return pointInCircle(sx, sy, weaponCircle);
  }

  function hitHangarButton(sx, sy) {
    if (!paused || finished) return false;
    return (
      sx >= hangarBtn.x &&
      sx <= hangarBtn.x + hangarBtn.w &&
      sy >= hangarBtn.y &&
      sy <= hangarBtn.y + hangarBtn.h
    );
  }

  function quitToHangar() {
    if (!paused || finished) return null;
    endBattle(false);
    return outcome;
  }

  function update(dt) {
    if (finished) return outcome;
    if (paused) return null;

    updateJuice(dt);
    updateFloatTexts(dt);
    decayHitFlashes(dt);
    if (hitstopTimer > 0) {
      hitstopTimer -= dt;
      return null;
    }

    animTime += dt;

    for (let i = 0; i < clouds.length; i++) {
      clouds[i].x -= clouds[i].speed * dt;
      if (clouds[i].x + clouds[i].w < -40) {
        clouds[i].x = width + 40;
        clouds[i].y = 40 + Math.random() * (height * 0.35);
      }
    }
    waterfallPhase += dt;
    updateParticles(dt);
    updateHazards(dt);
    if (finished) return outcome;

    shootCooldown = Math.max(0, shootCooldown - dt);
    skillCooldown = Math.max(0, skillCooldown - dt);
    if (mouseDown) fireFromPlayer();
    if (keys.__skillPulse) {
      keys.__skillPulse = false;
      useSkill();
    }

    if (keys.__upPulse) {
      keys.__upPulse = false;
      const now = animTime;
      if (player.grounded && !player.flying) {
        player.vy = JUMP_VELOCITY * jumpMult();
        player.grounded = false;
        player.lastUpPressTime = now;
        if (global.AudioFX) global.AudioFX.jump();
      } else if (!player.grounded && !player.flying) {
        if (now - player.lastUpPressTime <= DOUBLE_TAP) {
          player.flying = true;
          player.vy = 0;
        }
        player.lastUpPressTime = now;
      }
    }

    player.slowTimer = Math.max(0, (player.slowTimer || 0) - dt);
    const moveMult =
      player.slowTimer > 0 ? player.slowMult || 0.55 : 1;
    let vx = 0;
    if (keys["a"] || keys["arrowleft"] || hudHold.a) vx -= combat.playerSpeed * moveMult;
    if (keys["d"] || keys["arrowright"] || hudHold.d) vx += combat.playerSpeed * moveMult;
    const hCfg = hazardConfig();
    if (hCfg && hCfg.id === "ice_slide" && player.grounded && !player.flying) {
      player.slideVx = (player.slideVx || 0) + vx * (hCfg.slideGain || 0.22);
      player.slideVx *= hCfg.slideDecay || 0.988;
      vx += player.slideVx;
    } else if (player.grounded) {
      player.slideVx = (player.slideVx || 0) * 0.92;
    }
    player.x = clamp(
      player.x + vx * dt,
      80,
      global.DinoData.WORLD_LENGTH - player.w
    );
    player.faceVx = vx;

    const minY = height * 0.12;
    const groundTop = platformY - player.h;

    if (player.flying) {
      let flyVy = 0;
      if (keys["w"] || keys["arrowup"]) flyVy -= FLY_SPEED;
      if (keys["s"] || keys["arrowdown"]) flyVy += FLY_SPEED;
      player.vy = flyVy;
      player.y += player.vy * dt;
      if (player.y >= groundTop) {
        player.y = groundTop;
        player.vy = 0;
        player.flying = false;
        player.grounded = true;
      } else {
        player.y = clamp(player.y, minY, groundTop);
        player.grounded = false;
      }
    } else {
      if (!player.grounded) {
        player.vy = Math.min(
          MAX_FALL,
          player.vy + GRAVITY * gravityMult() * dt
        );
        player.y += player.vy * dt;
      }
      if (player.y >= groundTop) {
        player.y = groundTop;
        player.vy = 0;
        player.grounded = true;
        player.flying = false;
      } else {
        player.grounded = false;
        if (player.y < minY) {
          player.y = minY;
          player.vy = Math.max(0, player.vy);
        }
      }
    }

    scrollX = clamp(
      player.x - width * 0.35,
      0,
      global.DinoData.WORLD_LENGTH - width
    );

    const aimWorld = screenToWorld(mouseX, mouseY);
    player.aimAngle = Math.atan2(
      aimWorld.y - (player.y + player.h * 0.35),
      aimWorld.x - (player.x + player.w * 0.5)
    );

    if (invulnTimer > 0) invulnTimer -= dt;
    if (player.shieldTimer > 0) player.shieldTimer -= dt;

    levelTime += dt;
    if (isSurvivalMode()) {
      const D = global.DinoData;
      survivalTier = Math.floor(levelTime / (D.SURVIVAL_TIER_SEC || 30));
      if (survivalTier > survivalLastTier) {
        survivalLastTier = survivalTier;
        waveBannerTimer = 1.2;
        waveBannerText = "СЛОЖНОСТЬ +" + (survivalTier + 1);
      }
      survivalWaveTimer -= dt;
      if (survivalWaveTimer <= 0) {
        survivalWave++;
        survivalWaveTimer = D.SURVIVAL_WAVE_SEC || 45;
        waveBannerTimer = 1.5;
        waveBannerText = "ВОЛНА " + survivalWave;
        if (
          survivalWave % (D.SURVIVAL_MINI_BOSS_EVERY || 5) === 0 &&
          (!boss || boss.hp <= 0) &&
          bossDeadTimer < 0
        ) {
          spawnSurvivalMiniBoss();
        }
      }
      levelProgress = Math.min(
        0.35,
        levelTime / (D.SURVIVAL_WAVE_SEC * 8)
      );
    } else {
      const timeScale = global.DinoData.LEVEL_DURATION / level.duration;
      levelProgress = Math.min(
        1,
        (levelTime / global.DinoData.LEVEL_DURATION + kills * 0.02) * timeScale
      );
    }

    const wave = currentWave();
    if (wave.index !== currentWaveIndex) {
      currentWaveIndex = wave.index;
      waveBannerTimer = 1.5;
      waveBannerText = finalBurst(wave) ? "Финальная волна" : wave.title;
    }
    if (waveBannerTimer > 0) waveBannerTimer -= dt;

    if (
      !isSurvivalMode() &&
      level.hasBoss &&
      !bossSpawned &&
      levelProgress >= global.DinoData.BOSS_SPAWN_PROGRESS
    ) {
      spawnBoss();
    }

    if (bossDeadTimer >= 0) {
      bossDeadTimer -= dt;
      if (bossDeadTimer <= 0) {
        if (isSurvivalMode()) {
          boss = null;
          bossSpawned = false;
          bossDeadTimer = -1;
        } else {
          endBattle(true);
          return outcome;
        }
      }
    }

    spawnTimer -= dt;
    const bossAlive = boss && boss.hp > 0;
    if (
      spawnTimer <= 0 &&
      enemies.length < wave.maxAlive + (finalBurst(wave) ? 4 : 0) &&
      !bossAlive &&
      bossDeadTimer < 0
    ) {
      spawnEnemy();
      spawnTimer = nextSpawnInterval(wave);
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (
        b.x < scrollX - 50 ||
        b.x > scrollX + width + 50 ||
        b.y < -50 ||
        b.y > height + 50
      ) {
        bullets.splice(i, 1);
      }
    }

    for (let i = fx.length - 1; i >= 0; i--) {
      fx[i].life -= dt;
      if (fx[i].life <= 0) fx.splice(i, 1);
    }

    for (let i = lightningBolts.length - 1; i >= 0; i--) {
      lightningBolts[i].life -= dt;
      if (lightningBolts[i].life <= 0) lightningBolts.splice(i, 1);
    }

    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.35;

    for (let i = worldCoins.length - 1; i >= 0; i--) {
      const c = worldCoins[i];
      c.vy += 280 * dt;
      c.y += c.vy * dt;
      if (c.y > platformY - 20) {
        c.y = platformY - 20;
        c.vy *= -0.35;
      }
      c.life -= dt;
      if (distSq(c.x, c.y, px, py) < 50 * 50 || c.life <= 0) {
        runGold += c.value;
        worldCoins.splice(i, 1);
        if (global.AudioFX) global.AudioFX.coin();
      }
    }

    for (const d of drones) {
      d.angle += dt * 1.8;
      d.fireTimer -= dt;
      if (d.fireTimer <= 0) {
        d.fireTimer = DRONE_FIRE_INTERVAL;
        const target = nearestEnemy();
        if (target) {
          const tx = target.x + target.w / 2;
          const ty = target.y + target.h / 2;
          const ox = px + Math.cos(d.angle) * DRONE_ORBIT;
          const oy = py + Math.sin(d.angle) * DRONE_ORBIT * 0.6;
          const ang = Math.atan2(ty - oy, tx - ox);
          fireBullet(ox, oy, ang, combat.bulletDamage * 0.6, true);
        }
      }
    }

    updateBoss(dt, px, py);
    if (finished) return outcome;

    if (boss && boss.hp > 0) {
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        const res = applyBulletToBoss(b);
        if (res.hit && res.remove) bullets.splice(j, 1);
      }
      if (
        !playerIsShielded() &&
        invulnTimer <= 0 &&
        rectRectHit(player, boss)
      ) {
        const bDmg = boss.contactDamage || ENEMY_CONTACT_DAMAGE;
        player.hp -= bDmg;
        tookDamage = true;
        invulnTimer = INVULN_DURATION;
        juicePlayerHit(bDmg);
        if (player.hp <= 0) {
          player.hp = 0;
          endBattle(false);
          return outcome;
        }
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const ex = e.x + e.w * 0.5;
      const ey = e.y + e.h * 0.5;
      updateEnemy(e, dt, px, py);

      let killed = false;
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (b.hitSet && b.hitSet[e._uid]) continue;
        if (circleRectHit(b.x, b.y, b.r, e.x, e.y, e.w, e.h)) {
          applyDamageToEnemy(e, b.damage, {
            wx: b.x,
            wy: b.y,
            weaponId: b.weaponId,
          });
          spawnSparks(b.x, b.y);
          spawnImpact(b.x, b.y);
          if (!b.hitSet) b.hitSet = {};
          b.hitSet[e._uid] = true;
          if (b.pierceLeft > 0) {
            b.pierceLeft--;
          } else {
            bullets.splice(j, 1);
          }
          if (global.AudioFX) global.AudioFX.hit();
          if (e.hp <= 0) {
            enemies.splice(i, 1);
            kills++;
            spawnCoins(ex, ey, e.coinValue || COIN_PER_KILL);
            killed = true;
          }
          break;
        }
      }
      if (killed) continue;

      if (
        e.behavior === "burrow" &&
        (e.phase === "submerge" || e.phase === "emerge")
      ) {
        if (
          e.phase === "emerge" &&
          !playerIsShielded() &&
          invulnTimer <= 0 &&
          rectRectHit(player, e)
        ) {
          const eDmg1 = e.contactDamage || ENEMY_CONTACT_DAMAGE;
          player.hp -= eDmg1;
          tookDamage = true;
          invulnTimer = INVULN_DURATION;
          juicePlayerHit(eDmg1);
          if (player.hp <= 0) {
            player.hp = 0;
            endBattle(false);
            return outcome;
          }
        }
        continue;
      }

      if (
        !playerIsShielded() &&
        invulnTimer <= 0 &&
        rectRectHit(player, e)
      ) {
        const eDmg2 = e.contactDamage || ENEMY_CONTACT_DAMAGE;
        player.hp -= eDmg2;
        tookDamage = true;
        invulnTimer = INVULN_DURATION;
        juicePlayerHit(eDmg2);
        if (player.hp <= 0) {
          player.hp = 0;
          endBattle(false);
          return outcome;
        }
      }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      eb.life -= dt;
      if (
        eb.life <= 0 ||
        eb.x < scrollX - 80 ||
        eb.x > scrollX + width + 80 ||
        eb.y < -80 ||
        eb.y > height + 80
      ) {
        enemyBullets.splice(i, 1);
        continue;
      }
      if (
        !playerIsShielded() &&
        invulnTimer <= 0 &&
        circleRectHit(eb.x, eb.y, eb.r, player.x, player.y, player.w, player.h)
      ) {
        player.hp -= eb.damage;
        tookDamage = true;
        invulnTimer = INVULN_DURATION;
        juicePlayerHit(eb.damage);
        if (eb.slowDuration) {
          player.slowTimer = Math.max(
            player.slowTimer || 0,
            eb.slowDuration
          );
          player.slowMult = 0.55;
        }
        enemyBullets.splice(i, 1);
        if (global.AudioFX) global.AudioFX.hit();
        if (player.hp <= 0) {
          player.hp = 0;
          endBattle(false);
          return outcome;
        }
      }
    }

    for (let i = rockets.length - 1; i >= 0; i--) {
      const rk = rockets[i];
      rk.x += rk.vx * dt;
      rk.y += rk.vy * dt;
      rk.life -= dt;
      let boom = rk.life <= 0;
      const toTarget = Math.hypot(rk.tx - rk.x, rk.ty - rk.y);
      if (toTarget < 18) boom = true;
      if (!boom && boss && boss.hp > 0) {
        if (circleRectHit(rk.x, rk.y, rk.r, boss.x, boss.y, boss.w, boss.h)) {
          boom = true;
        }
      }
      if (!boom) {
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (circleRectHit(rk.x, rk.y, rk.r, e.x, e.y, e.w, e.h)) {
            boom = true;
            break;
          }
        }
      }
      if (boom) {
        explodeRocket(rk.x, rk.y, rk.damage, rk.radius);
        rockets.splice(i, 1);
      }
    }

    if (!isSurvivalMode() && levelProgress >= 1 && !bossSpawned) {
      endBattle(true);
      return outcome;
    }
    if (finished) return outcome;
    return null;
  }

  function drawBackground(ctx) {
    const b = biome || global.DinoData.getBiome(0);
    const bg =
      global.Assets && global.Assets.get
        ? global.Assets.get(b.bgKey)
        : null;
    if (bg) {
      const iw = bg.naturalWidth || bg.width;
      const ih = bg.naturalHeight || bg.height;
      const parallax = scrollX * 0.25;
      const scale = Math.max(height / ih, width / iw);
      const dw = iw * scale;
      const dh = ih * scale;
      const offset = -((parallax % dw) + dw) % dw;
      for (let x = offset; x < width; x += dw) {
        ctx.drawImage(bg, x, 0, dw, dh);
      }
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, "#1a3a52");
      g.addColorStop(1, "#85c1e9");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = b.skyTint;
    ctx.fillRect(0, 0, width, height);

    const cloudShift = scrollX * 0.1;
    ctx.fillStyle = b.cloudColor;
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      const sx = c.x - cloudShift * 0.2;
      ctx.beginPath();
      ctx.ellipse(sx, c.y, c.w * 0.5, c.h * 0.5, 0, 0, Math.PI * 2);
      ctx.ellipse(sx + c.w * 0.25, c.y - 6, c.w * 0.35, c.h * 0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(sx - c.w * 0.2, c.y + 4, c.w * 0.3, c.h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = b.ground;
    ctx.fillRect(
      -scrollX,
      platformY,
      global.DinoData.WORLD_LENGTH + width,
      height - platformY
    );
    ctx.fillStyle = b.groundEdge;
    ctx.fillRect(
      -scrollX,
      platformY,
      global.DinoData.WORLD_LENGTH + width,
      8
    );
    drawPlatformTrim(ctx);
    drawExitPortal(ctx);

    drawWaterfall(ctx);
  }

  function drawPlatformTrim(ctx) {
    const wl = global.DinoData.WORLD_LENGTH;
    const x0 = -scrollX;
    ctx.fillStyle = "#c5ccd4";
    ctx.fillRect(x0, platformY, wl + width, 16);
    ctx.fillStyle = "#7b848f";
    ctx.fillRect(x0, platformY + 16, wl + width, 8);
    const step = 780;
    for (let wx = 420; wx < wl - 280; wx += step) {
      const s = worldToScreen(wx, platformY);
      if (s.x < -90 || s.x > width + 90) continue;
      const dw = 54;
      const dh = 64;
      const dx = s.x - dw / 2;
      const dy = platformY + 16;
      ctx.fillStyle = "#9aa3ad";
      ctx.fillRect(dx - 5, dy, dw + 10, dh);
      ctx.fillStyle = "#2c3138";
      ctx.fillRect(dx, dy + 4, dw, dh - 8);
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx + 5, dy + 8, dw - 10, dh - 16);
      ctx.clip();
      for (let i = -3; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#f5c518" : "#141414";
        ctx.beginPath();
        ctx.moveTo(dx + i * 14, dy + dh);
        ctx.lineTo(dx + i * 14 + 12, dy + dh);
        ctx.lineTo(dx + i * 14 + 34, dy);
        ctx.lineTo(dx + i * 14 + 22, dy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawExitPortal(ctx) {
    if (isSurvivalMode()) return;
    const wx = global.DinoData.WORLD_LENGTH - 280;
    const s = worldToScreen(wx, platformY);
    if (s.x < -180 || s.x > width + 220) return;
    ctx.save();
    ctx.strokeStyle = "#e6edf5";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(s.x, platformY - 6, 58, Math.PI, 0);
    ctx.stroke();
    ctx.strokeStyle = "#9fd6ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(s.x, platformY - 6, 44, Math.PI, 0);
    ctx.stroke();
    const glow = ctx.createRadialGradient(s.x, platformY - 24, 6, s.x, platformY - 12, 46);
    glow.addColorStop(0, "rgba(140, 255, 230, 0.9)");
    glow.addColorStop(1, "rgba(0, 170, 160, 0.12)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, platformY - 18, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    global.UI.drawStrokedText(ctx, "ДАЛЬШЕ", s.x + 72, platformY - 78, "#7CFF4A");
    ctx.fillStyle = "#3ddc5c";
    ctx.strokeStyle = "#08300f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x + 168, platformY - 98);
    ctx.lineTo(s.x + 198, platformY - 78);
    ctx.lineTo(s.x + 168, platformY - 58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const bob = Math.sin(animTime * 3) * 8;
    drawMysteryCard(ctx, s.x + 96, platformY - 128 + bob);
    ctx.restore();
  }

  function drawMysteryCard(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.18);
    ctx.fillStyle = "#f5c518";
    ctx.fillRect(-18, -24, 36, 48);
    ctx.fillStyle = "#2f6fe0";
    ctx.fillRect(-14, -20, 28, 40);
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, 2);
    ctx.restore();
  }

  function drawHandPack(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#1d4e89";
    ctx.fillRect(-16, -12, 32, 26);
    ctx.fillStyle = "#3ec6ff";
    ctx.fillRect(-16, -12, 32, 8);
    ctx.fillStyle = "#f4f7fb";
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, 4);
    ctx.restore();
  }

  function hazardConfig() {
    return biome && biome.hazard ? biome.hazard : null;
  }

  function hazardDamage(base) {
    const dm = level ? level.dmgMult : 1;
    const diff = difficulty ? difficulty.enemyDmgMult : 1;
    return base * dm * diff;
  }

  function applyHazardDamage(dmg) {
    if (playerIsShielded() || invulnTimer > 0 || finished) return;
    player.hp -= dmg;
    tookDamage = true;
    invulnTimer = INVULN_DURATION;
    juicePlayerHit(dmg);
    if (global.AudioFX) global.AudioFX.hit();
    if (player.hp <= 0) {
      player.hp = 0;
      endBattle(false);
    }
  }

  function initHazards() {
    const h = hazardConfig();
    if (!h) {
      hazardState = null;
      return;
    }
    hazardState = {
      id: h.id,
      cfg: h,
      spawnTimer: 0.8 + Math.random(),
      icicleTimer: 1.5,
      meteorTimer: 1.8,
      drops: [],
      pools: [],
      turrets: [],
      swampDotAcc: 0,
      conveyorPhase: 0,
    };
    if (h.id === "swamp") {
      const wl = global.DinoData.WORLD_LENGTH;
      const count = h.poolCount || 12;
      for (let i = 0; i < count; i++) {
        const wx = 400 + ((wl - 800) * i) / count + (Math.random() - 0.5) * 120;
        hazardState.pools.push({
          x: wx,
          y: platformY - (h.poolH || 14),
          w: (h.poolW || 90) * (0.85 + Math.random() * 0.3),
          h: h.poolH || 14,
        });
      }
    }
  }

  function spawnFallingDrop(kind, worldX, cfg) {
    const warn = cfg.warnTime || 1;
    hazardState.drops.push({
      kind: kind,
      x: worldX,
      phase: "warn",
      timer: warn,
      warnTotal: warn,
      y: -40,
      radius: cfg.radius || 30,
      damage: hazardDamage(cfg.damage || 12),
      fallSpeed: cfg.fallSpeed || 500,
    });
  }

  function updateFactoryTurrets(dt, h) {
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.35;
    hazardState.turrets = hazardState.turrets.filter(function (t) {
      return t.x > player.x - 250;
    });
    while (hazardState.turrets.length < 3) {
      const n = hazardState.turrets.length;
      hazardState.turrets.push({
        x: player.x + 320 + n * 260 + Math.random() * 80,
        y: platformY - 55,
        phase: "idle",
        timer: 0.6 + Math.random() * h.turretCd,
        aimX: px,
        aimY: py,
      });
    }
    for (let i = 0; i < hazardState.turrets.length; i++) {
      const t = hazardState.turrets[i];
      if (Math.abs(t.x - px) > h.turretRange) continue;
      t.timer -= dt;
      if (t.phase === "idle") {
        if (t.timer <= 0) {
          t.phase = "warn";
          t.timer = h.turretWarn;
          t.aimX = px;
          t.aimY = py;
        }
      } else if (t.phase === "warn") {
        if (t.timer <= 0) {
          fireEnemyBullet(
            t.x,
            t.y,
            t.aimX,
            t.aimY,
            hazardDamage(h.turretDamage)
          );
          t.phase = "idle";
          t.timer = h.turretCd + Math.random() * 0.4;
        }
      }
    }
  }

  function updateHazards(dt) {
    const h = hazardConfig();
    if (!h || !hazardState || !player || finished) return;

    if (h.conveyorVx) {
      player.x = clamp(
        player.x + h.conveyorVx * dt,
        80,
        global.DinoData.WORLD_LENGTH - player.w
      );
      hazardState.conveyorPhase += dt * h.conveyorVx * 0.08;
    }

    if (h.id === "swamp") {
      player.slowTimer = Math.max(0, (player.slowTimer || 0) - dt);
      let inPool = false;
      for (let i = 0; i < hazardState.pools.length; i++) {
        const p = hazardState.pools[i];
        if (rectRectHit(player, p)) inPool = true;
      }
      if (inPool) {
        player.slowTimer = 0.45;
        player.slowMult = h.slowMult || 0.55;
        hazardState.swampDotAcc += dt;
        if (hazardState.swampDotAcc >= 0.25) {
          hazardState.swampDotAcc -= 0.25;
          applyHazardDamage(hazardDamage(h.dotDps * 0.25));
        }
      }
    }

    if (h.id === "lava_rain") {
      hazardState.spawnTimer -= dt;
      if (hazardState.spawnTimer <= 0) {
        spawnFallingDrop("lava", player.x + 200 + Math.random() * width * 0.75, h);
        hazardState.spawnTimer = h.interval + Math.random() * 0.9;
      }
    }

    if (h.id === "ice_slide") {
      hazardState.icicleTimer -= dt;
      if (hazardState.icicleTimer <= 0) {
        spawnFallingDrop("icicle", player.x + 160 + Math.random() * width * 0.7, {
          warnTime: h.icicleWarn,
          radius: h.icicleRadius,
          damage: h.icicleDamage,
          fallSpeed: h.icicleFallSpeed,
        });
        hazardState.icicleTimer = h.icicleInterval + Math.random() * 0.8;
      }
    }

    if (h.id === "crater") {
      hazardState.meteorTimer -= dt;
      if (hazardState.meteorTimer <= 0) {
        spawnFallingDrop("meteor", player.x + 180 + Math.random() * width * 0.85, {
          warnTime: h.meteorWarn,
          radius: h.meteorRadius,
          damage: h.meteorDamage,
          fallSpeed: h.meteorFallSpeed,
        });
        hazardState.meteorTimer = h.meteorInterval + Math.random();
      }
    }

    if (h.id === "factory") updateFactoryTurrets(dt, h);

    for (let i = hazardState.drops.length - 1; i >= 0; i--) {
      const d = hazardState.drops[i];
      if (d.phase === "warn") {
        d.timer -= dt;
        if (d.timer <= 0) {
          d.phase = "fall";
          d.y = -50;
        }
      } else if (d.phase === "fall") {
        d.y += d.fallSpeed * dt;
        const hitY = platformY - 8;
        if (
          circleRectHit(
            d.x,
            d.y,
            Math.max(6, d.radius * 0.35),
            player.x,
            player.y,
            player.w,
            player.h
          )
        ) {
          applyHazardDamage(d.damage);
          hazardState.drops.splice(i, 1);
          continue;
        }
        if (d.y >= hitY) {
          if (
            circleRectHit(
              d.x,
              platformY - player.h * 0.4,
              d.radius,
              player.x,
              player.y,
              player.w,
              player.h
            )
          ) {
            applyHazardDamage(d.damage);
          }
          d.phase = "splash";
          d.timer = 0.2;
        }
      } else {
        d.timer -= dt;
        if (d.timer <= 0) hazardState.drops.splice(i, 1);
      }
    }
  }

  function drawHazards(ctx) {
    const h = hazardConfig();
    if (!h || !hazardState) return;

    for (let i = 0; i < hazardState.drops.length; i++) {
      const d = hazardState.drops[i];
      const s = worldToScreen(d.x, d.phase === "fall" ? d.y : platformY);
      if (d.phase === "warn") {
        const a = 0.25 + 0.35 * (1 - d.timer / (d.warnTotal || 1));
        ctx.fillStyle =
          d.kind === "lava"
            ? "rgba(180,40,20," + a + ")"
            : d.kind === "icicle"
              ? "rgba(100,160,220," + a + ")"
              : "rgba(80,60,100," + a + ")";
        const gs = worldToScreen(d.x, platformY);
        ctx.beginPath();
        ctx.ellipse(gs.x, gs.y, d.radius, d.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.phase === "fall") {
        ctx.fillStyle =
          d.kind === "lava"
            ? "#e74c3c"
            : d.kind === "icicle"
              ? "#aed6f1"
              : "#8e44ad";
        ctx.beginPath();
        ctx.arc(s.x, s.y, d.kind === "icicle" ? 5 : 8 + d.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (h.id === "swamp") {
      for (let i = 0; i < hazardState.pools.length; i++) {
        const p = hazardState.pools[i];
        const ps = worldToScreen(p.x, p.y);
        if (ps.x + p.w < -20 || ps.x > width + 20) continue;
        ctx.fillStyle = "rgba(40,90,30,0.55)";
        ctx.fillRect(ps.x, ps.y, p.w, p.h);
        ctx.fillStyle = "rgba(120,200,80,0.25)";
        ctx.fillRect(ps.x + 4, ps.y + 2, p.w - 8, p.h - 4);
      }
    }

    if (h.conveyorVx) {
      const stripeW = 48;
      const off = -((hazardState.conveyorPhase + scrollX) % stripeW);
      ctx.fillStyle = "rgba(255,193,7,0.12)";
      for (let x = off; x < width + stripeW; x += stripeW) {
        ctx.fillRect(x, platformY + 2, stripeW * 0.45, 6);
      }
      ctx.fillStyle = "rgba(200,200,200,0.08)";
      ctx.fillRect(0, platformY, width, 10);
    }

    if (h.id === "factory") {
      for (let i = 0; i < hazardState.turrets.length; i++) {
        const t = hazardState.turrets[i];
        const ts = worldToScreen(t.x, t.y);
        if (ts.x < -40 || ts.x > width + 40) continue;
        ctx.fillStyle = "#566573";
        ctx.fillRect(ts.x - 14, ts.y - 20, 28, 24);
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(ts.x - 6, ts.y - 16, 12, 8);
        if (t.phase === "warn") {
          const aim = worldToScreen(t.aimX, t.aimY);
          ctx.strokeStyle = "rgba(231,76,60,0.65)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(ts.x, ts.y - 8);
          ctx.lineTo(aim.x, aim.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

  }

  function gravityMult() {
    const h = hazardConfig();
    if (h && h.gravityMult) return h.gravityMult;
    return 1;
  }

  function jumpMult() {
    const h = hazardConfig();
    if (h && h.jumpMult) return h.jumpMult;
    return 1;
  }

  /** Hysteresis keeps the sprite from flickering while the hero is directly above. */
  function faceTowardPlayer(ent, prevLeft) {
    const dx = player.x + player.w * 0.5 - (ent.x + ent.w * 0.5);
    if (dx < -6) return true;
    if (dx > 6) return false;
    return prevLeft !== undefined ? prevLeft : true;
  }

  function drawFacing(ctx, spr, x, y, w, h, mirror) {
    if (!mirror) {
      ctx.drawImage(spr, x, y, w, h);
      return;
    }
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(spr, 0, 0, w, h);
    ctx.restore();
  }

  function drawEnemyOverlays(ctx, sx, sy, e, padX, padY, drawW, drawH) {
    const cx = sx + padX + drawW / 2;
    const cy = sy + padY + drawH / 2;
    if (e.shielded && global.UI) {
      const ui = global.UI;
      ctx.strokeStyle = ui.colors.goldBright;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(e.w, e.h) * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.elite && global.UI) {
      const ui = global.UI;
      ctx.strokeStyle = ui.colors.goldBright;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(e.w, e.h) * 0.62, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.hitFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle =
        "rgba(255,255,255," + Math.min(0.85, e.hitFlash * 8) + ")";
      ctx.fillRect(sx + padX, sy + padY, drawW, drawH);
      ctx.restore();
    }
  }

  function isProceduralFlyingEnemy(e) {
    return e.typeId === "drone_ptero" || e.typeId === "diver";
  }

  function drawProceduralFlyingEnemy(ctx, e, s) {
    const RE = global.RenderEnemy;
    if (!RE) return false;
    const padX = -8;
    const padY = -12;
    const drawW = e.w + 16;
    const drawH = e.h + 16;
    const ecx = e.x + e.w * 0.5;
    const ecy = e.y + e.h * 0.5;
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.35;
    e.faceLeft = faceTowardPlayer(e, e.faceLeft);
    const aimAngle = Math.atan2(py - ecy, px - ecx);
    const bank = Math.sign(px - ecx || 1) * 0.22;
    const alt = clamp((platformY - e.y) / 400, 0.2, 1);
    const foot = worldToScreen(ecx, platformY);
    const center = worldToScreen(ecx, ecy);
    RE.drawShadow(ctx, foot.x, foot.y, alt);
    ctx.save();
    if (e.behavior === "burrow" && e.phase === "submerge") {
      ctx.globalAlpha = 0.12;
    }
    RE.drawFlying(ctx, {
      cx: center.x,
      cy: center.y,
      scale: e.w / 32,
      faceLeft: e.faceLeft,
      aimAngle: aimAngle,
      wingPhase: animTime * 10 + (e.strafePhase || 0),
      bank: bank,
      variant: e.typeId === "diver" ? "diver" : "drone",
      accent: e.color || ENEMY_COLORS.drone_ptero,
      body: "#475569",
      enginePulse: Math.sin(animTime * 8),
      muzzleFlash: e.muzzleFlash || 0,
    });
    ctx.restore();
    drawEnemyOverlays(ctx, s.x, s.y, e, padX, padY, drawW, drawH);
    return true;
  }

  function drawHazardFog(ctx) {
    const h = hazardConfig();
    if (!h || h.id !== "swamp" || !hazardState || !(h.fogAlpha > 0)) return;
    if (!player) return;
    const bob = player.flying ? Math.sin(animTime * 3) * 6 : 0;
    const ps = worldToScreen(
      player.x + player.w * 0.5,
      player.y + player.h * 0.5 + bob
    );
    const clearR = h.fogClearR || 220;
    const fa = h.fogAlpha;
    ctx.save();
    ctx.fillStyle = "rgba(20,30,15," + fa * 0.55 + ")";
    ctx.fillRect(0, 0, width, height);
    const gr = ctx.createRadialGradient(ps.x, ps.y, 50, ps.x, ps.y, clearR);
    gr.addColorStop(0, "rgba(20,30,15,0)");
    gr.addColorStop(0.45, "rgba(20,30,15," + fa * 0.25 + ")");
    gr.addColorStop(1, "rgba(20,30,15," + fa + ")");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function drawLightningBolts(ctx) {
    for (let i = 0; i < lightningBolts.length; i++) {
      const b = lightningBolts[i];
      const a = Math.max(0, b.life / b.maxLife);
      const origin = worldToScreen(b.px, b.py);
      const left = b.dir - b.halfAngle;
      const right = b.dir + b.halfAngle;
      ctx.save();
      ctx.globalAlpha = 0.28 * a;
      ctx.fillStyle = "rgba(165, 180, 252, 0.55)";
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(
        origin.x + Math.cos(left) * b.range,
        origin.y + Math.sin(left) * b.range
      );
      ctx.lineTo(
        origin.x + Math.cos(right) * b.range,
        origin.y + Math.sin(right) * b.range
      );
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let p = 0; p < b.pts.length; p++) {
        const s = worldToScreen(b.pts[p].x, b.pts[p].y);
        if (p === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      }
      ctx.strokeStyle = "rgba(129, 140, 248, 0.9)";
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  function draw(ctx) {
    drawBackground(ctx);
    drawHazards(ctx);
    drawBossTelegraphs(ctx);
    drawParticles(ctx);
    drawHazardFog(ctx);

    const grunt =
      global.Assets && global.Assets.get
        ? global.Assets.get("enemy_grunt")
        : null;
    for (const e of enemies) {
      const s = worldToScreen(e.x, e.y);
      const col = e.color || ENEMY_COLORS.grunt;
      const typeId = e.typeId || "grunt";
      if (isProceduralFlyingEnemy(e) && drawProceduralFlyingEnemy(ctx, e, s)) {
        continue;
      }
      let spr =
        global.Assets && global.Assets.get
          ? global.Assets.get("enemy_" + typeId)
          : null;
      let nativeLeft = SPRITE_FACES_LEFT[typeId] !== false;
      if (!spr) {
        spr = grunt;
        nativeLeft = true;
      }
      if (spr) {
        ctx.save();
        if (e.behavior === "burrow" && e.phase === "submerge") {
          ctx.globalAlpha = 0.12;
        }
        e.faceLeft = faceTowardPlayer(e, e.faceLeft);
        const padX = -8;
        const padY = -12;
        const drawW = e.w + 16;
        const drawH = e.h + 16;
        drawFacing(
          ctx,
          spr,
          s.x + padX,
          s.y + padY,
          drawW,
          drawH,
          e.faceLeft !== nativeLeft
        );
        drawEnemyOverlays(ctx, s.x, s.y, e, padX, padY, drawW, drawH);
        ctx.restore();
      } else {
        ctx.fillStyle = col;
        ctx.fillRect(s.x, s.y, e.w, e.h);
        ctx.fillStyle = "#566573";
        ctx.fillRect(s.x + 4, s.y + 8, e.w - 8, 6);
      }
    }

    if (boss && (boss.hp > 0 || bossDeadTimer > 0)) {
      const s = worldToScreen(boss.x, boss.y);
      const key = boss.spriteKey || "enemy_tyrant";
      const spr =
        global.Assets && global.Assets.get
          ? global.Assets.get(key)
          : null;
      const fade = boss.hp <= 0 ? Math.max(0.2, bossDeadTimer / 2) : 1;
      const faceKey = boss.typeId === "tyrant" ? "tyrant" : "grunt";
      ctx.globalAlpha = fade * (boss.burrowHidden ? 0.15 : 1);
      if (spr) {
        boss.faceLeft = faceTowardPlayer(boss, boss.faceLeft);
        const nativeLeft =
          SPRITE_FACES_LEFT[faceKey] !== undefined
            ? SPRITE_FACES_LEFT[faceKey]
            : true;
        drawFacing(
          ctx,
          spr,
          s.x - 12,
          s.y - 16,
          boss.w + 24,
          boss.h + 24,
          boss.faceLeft !== nativeLeft
        );
      } else {
        ctx.fillStyle = "#8e44ad";
        ctx.fillRect(s.x, s.y, boss.w, boss.h);
      }
      ctx.globalAlpha = fade;
      if (boss.shieldActive && global.UI) {
        const ui = global.UI;
        const cx = s.x - 12 + (boss.w + 24) / 2;
        const cy = s.y - 16 + (boss.h + 24) / 2;
        ctx.strokeStyle = ui.colors.goldBright;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(boss.w, boss.h) * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (boss.hitFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle =
          "rgba(255,255,255," + Math.min(0.85, boss.hitFlash * 8) + ")";
        ctx.fillRect(s.x - 12, s.y - 16, boss.w + 24, boss.h + 24);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    drawLightningBolts(ctx);

    for (const c of worldCoins) {
      const s = worldToScreen(c.x, c.y);
      const r = 9;
      const g = ctx.createRadialGradient(
        s.x - r * 0.35,
        s.y - r * 0.4,
        r * 0.15,
        s.x,
        s.y,
        r
      );
      g.addColorStop(0, "#fff4c2");
      g.addColorStop(0.45, "#f1c40f");
      g.addColorStop(1, "#9a7209");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6b4e09";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 236, 160, 0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.beginPath();
      ctx.ellipse(s.x - r * 0.28, s.y - r * 0.32, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#f1c40f";
    for (const b of bullets) {
      drawPlayerBullet(ctx, b);
    }

    ctx.fillStyle = "#e74c3c";
    for (const rk of rockets) {
      const s = worldToScreen(rk.x, rk.y);
      ctx.beginPath();
      ctx.arc(s.x, s.y, rk.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f5b041";
      ctx.beginPath();
      ctx.arc(s.x - 4, s.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e74c3c";
    }

    for (const eb of enemyBullets) {
      const s = worldToScreen(eb.x, eb.y);
      ctx.fillStyle =
        eb.tint === "ice"
          ? "#85c1e9"
          : eb.tint === "rocket"
            ? "#e67e22"
            : "#9b59b6";
      ctx.beginPath();
      ctx.arc(s.x, s.y, eb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle =
        eb.tint === "ice"
          ? "#d6eaf8"
          : eb.tint === "rocket"
            ? "#f5b041"
            : "#e67e22";
      ctx.beginPath();
      ctx.arc(s.x, s.y, eb.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const f of fx) {
      const s = worldToScreen(f.x, f.y);
      const a = Math.max(0, f.life / (f.maxLife || 0.2));
      ctx.globalAlpha = a;
      ctx.fillStyle =
        f.kind === "impact"
          ? "#ffffff"
          : f.kind === "muzzle"
            ? "#fff59d"
            : "#ff6f00";
      const rad = f.kind === "impact" ? f.r * (1.6 - a * 0.6) : f.r * (0.5 + a);
      ctx.beginPath();
      ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const bob = player.flying ? Math.sin(animTime * 3) * 6 : 0;
    const ps = worldToScreen(
      player.x + player.w / 2,
      player.y + player.h * 0.5 + bob
    );
    const invulnBlink =
      invulnTimer > 0 && Math.floor(invulnTimer * 20) % 2 === 0;
    const spd = combat.playerSpeed || 280;
    const lean = clamp((player.faceVx || 0) / spd, -1, 1) * 0.12;
    const scaleY =
      !player.grounded && !player.flying ? 0.86 : 1;
    const hitFlash = playerHitFlashTimer > 0 ? playerHitFlashTimer * 8 : 0;
    const flash = Math.max(hitFlash, invulnBlink ? 0.38 : 0);
    global.RenderDino.drawMechDino(
      ctx,
      combat.dinoId,
      ps.x,
      ps.y,
      combat.evoScale || 1,
      player.aimAngle,
      {
        scaleY: scaleY,
        lean: lean,
        flash: flash,
        weaponId: combat.weaponId || "blaster",
      }
    );

    if (!isSurvivalMode()) {
      drawHandPack(ctx, ps.x + 78, ps.y + 8 + Math.sin(animTime * 2.4) * 6);
    }

    if (player.shieldTimer > 0) {
      ctx.strokeStyle = "rgba(93, 173, 226, 0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ps.x, ps.y, player.w * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(93, 173, 226, 0.15)";
      ctx.fill();
    }

    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.35 + bob;
    for (const d of drones) {
      const ox = px + Math.cos(d.angle) * DRONE_ORBIT;
      const oy = py + Math.sin(d.angle) * DRONE_ORBIT * 0.6;
      const ds = worldToScreen(ox, oy);
      ctx.fillStyle = "#f39c12";
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const rx = ds.x + Math.cos(a) * 8;
        const ry = ds.y + Math.sin(a) * 8;
        if (i === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.fill();
    }

    drawReticle(ctx);
    drawFloatTexts(ctx);
    drawHud(ctx);

    if (paused) {
      const ui = global.UI;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, width, height);
      ui.drawScreenTitle(ctx, "Пауза", width);
      ctx.textAlign = "center";
      ui.label(ctx, "Esc — продолжить", width / 2, height * 0.52, "muted");
      hangarBtn = {
        x: width / 2 - 110,
        y: height * 0.52 + 28,
        w: 220,
        h: ui.btnHLg,
      };
      ui.drawButton(ctx, hangarBtn, "В ангар", "secondary");
      ctx.textAlign = "left";
    }
  }

  function drawReticle(ctx) {
    if (paused || finished) return;
    const x = mouseX;
    const y = mouseY;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.moveTo(x - 18, y);
    ctx.lineTo(x - 5, y);
    ctx.moveTo(x + 5, y);
    ctx.lineTo(x + 18, y);
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x, y - 5);
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x, y + 18);
    ctx.stroke();
    ctx.restore();
  }

  function drawFloatTexts(ctx) {
    const ui = global.UI;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < floatTexts.length; i++) {
      const f = floatTexts[i];
      const s = worldToScreen(f.wx, f.wy);
      const a = Math.min(1, f.life / 0.85);
      ctx.globalAlpha = a;
      const size = f.kind === "player" ? 18 : f.crit ? 26 : 22;
      ctx.font = "bold " + size + 'px "Segoe UI", system-ui, sans-serif';
      const fill = f.kind === "player" ? "#ff4d4d" : "#ffffff";
      ui.drawStrokedText(ctx, f.text, s.x, s.y, fill);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  function pointInCircle(x, y, c) {
    if (!c) return false;
    const dx = x - c.cx;
    const dy = y - c.cy;
    return dx * dx + dy * dy <= c.r * c.r;
  }

  function drawHudCircle(ctx, c, ready) {
    ctx.beginPath();
    ctx.arc(c.cx, c.cy + 3, c.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(c.cx - 8, c.cy - 10, 4, c.cx, c.cy, c.r);
    g.addColorStop(0, ready ? "#7c5cff" : "#3a3550");
    g.addColorStop(1, ready ? "#3a1d78" : "#241c33");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = ready ? "#d7c6ff" : "#6b6480";
    ctx.stroke();
  }

  function drawHud(ctx) {
    const ui = global.UI;
    const C = ui.colors;
    const hpRatio = Math.max(0, player.hp / player.maxHp);
    const port = 56;
    const plateX = 12;
    const plateY = 10;
    ui.roundRect(ctx, plateX, plateY, port, port, 8);
    ctx.fillStyle = "#16325c";
    ctx.fill();
    ctx.save();
    ui.roundRect(ctx, plateX + 3, plateY + 3, port - 6, port - 6, 6);
    ctx.clip();
    global.RenderDino.drawMechDino(
      ctx,
      combat.dinoId,
      plateX + port / 2,
      plateY + port * 0.78,
      0.22,
      -0.25,
      { weaponId: combat.weaponId || "blaster" }
    );
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#9fd0ff";
    ui.roundRect(ctx, plateX, plateY, port, port, 8);
    ctx.stroke();

    const barX = plateX + port + 8;
    const barY = plateY + 8;
    const barW = 148;
    const barH = 22;
    ui.roundRect(ctx, barX, barY, barW, barH, 6);
    ctx.fillStyle = "#14301c";
    ctx.fill();
    ui.roundRect(ctx, barX, barY, Math.max(8, barW * hpRatio), barH, 6);
    ctx.fillStyle = hpRatio > 0.3 ? "#3ddc5c" : C.danger;
    ctx.fill();
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ui.drawStrokedText(
      ctx,
      Math.ceil(hpRatio * 100) + "%",
      barX + barW / 2,
      barY + barH / 2,
      "#ffffff"
    );

    ctx.beginPath();
    ctx.arc(barX + 8, barY + barH + 16, 7, 0, Math.PI * 2);
    const coin = ctx.createRadialGradient(barX + 6, barY + barH + 14, 1, barX + 8, barY + barH + 16, 7);
    coin.addColorStop(0, "#fff4c2");
    coin.addColorStop(1, "#c9920a");
    ctx.fillStyle = coin;
    ctx.fill();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
    ui.drawStrokedText(ctx, String(runGold), barX + 20, barY + barH + 16, "#ffe56a");

    const segs = 5;
    const segGap = 14;
    const levelW = Math.min(360, Math.max(180, width - 460));
    const levelX = (width - levelW) / 2;
    const levelY = 30;
    const segW = (levelW - segGap * (segs - 1)) / segs;
    const progress = isSurvivalMode()
      ? Math.min(1, levelTime / ((global.DinoData.SURVIVAL_WAVE_SEC || 45) * 12))
      : levelProgress;
    const lvlNum = isSurvivalMode()
      ? survivalWave
      : (level && level.globalLevel != null ? level.globalLevel : 0) + 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ui.drawStrokedText(
      ctx,
      (isSurvivalMode() ? "Волна " : "Уровень ") + lvlNum,
      width / 2,
      20,
      "#ffffff"
    );
    for (let i = 0; i < segs; i++) {
      const sx = levelX + i * (segW + segGap);
      const filled = progress * segs - i;
      ui.roundRect(ctx, sx, levelY, segW, 14, 4);
      ctx.fillStyle = "#2a3140";
      ctx.fill();
      if (filled > 0) {
        ui.roundRect(ctx, sx, levelY, segW * Math.min(1, filled), 14, 4);
        ctx.fillStyle = "#f5c518";
        ctx.fill();
      }
      if (i < segs - 1) {
        const ax = sx + segW + 2;
        ctx.fillStyle = "#f5c518";
        ctx.beginPath();
        ctx.moveTo(ax, levelY + 2);
        ctx.lineTo(ax + 8, levelY + 7);
        ctx.lineTo(ax, levelY + 12);
        ctx.closePath();
        ctx.fill();
      }
    }

    const badge = {
      x: levelX + levelW + 10,
      y: levelY - 8,
      w: 30,
      h: 30,
    };
    ui.roundRect(ctx, badge.x, badge.y, badge.w, badge.h, 6);
    ctx.fillStyle = bossSpawned ? "#c0392b" : "#1d4e89";
    ctx.fill();
    ctx.strokeStyle = "#d6e6ff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#f4f7fb";
    ctx.fillRect(badge.x + 8, badge.y + 7, 14, 10);
    ctx.beginPath();
    ctx.moveTo(badge.x + 15, badge.y + 16);
    ctx.lineTo(badge.x + 11, badge.y + 23);
    ctx.lineTo(badge.x + 19, badge.y + 23);
    ctx.closePath();
    ctx.fill();

    if (bossSpawned && boss) {
      const bbarW = Math.min(width - 280, 360);
      const bbarX = (width - bbarW) / 2;
      const ratio = Math.max(0, boss.hp / boss.maxHp);
      ctx.fillStyle = "#2a3140";
      ctx.fillRect(bbarX, 50, bbarW, 10);
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(bbarX, 50, bbarW * ratio, 10);
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
      ui.drawStrokedText(
        ctx,
        (boss.name || "Тиран") + " " + Math.ceil(ratio * 100) + "%",
        width / 2,
        74,
        "#ffffff"
      );
    }

    const wave = currentWave();

    if (waveBannerTimer > 0) {
      const a = Math.min(1, waveBannerTimer / 0.4);
      ctx.save();
      ctx.globalAlpha = Math.min(1, a);
      const bw = 300;
      const bh = 56;
      const bx = width / 2 - bw / 2;
      const by = height * 0.22;
      ui.drawPanel(ctx, bx, by, bw, bh);
      ctx.textAlign = "center";
      ui.setFont(ctx, "banner");
      ctx.fillStyle = C.goldBright;
      ctx.fillText(waveBannerText || wave.title, width / 2, by + 38);
      ctx.textAlign = "left";
      ctx.restore();
    }

    pauseBtn = { x: width - 58, y: 10, w: 46, h: 46 };
    ui.drawButton(ctx, pauseBtn, "", "secondary");
    ctx.fillStyle = "#f4f7fb";
    ctx.fillRect(pauseBtn.x + 15, pauseBtn.y + 12, 6, 22);
    ctx.fillRect(pauseBtn.x + 25, pauseBtn.y + 12, 6, 22);

    const by = height - 70;
    moveBtnA = { x: 16, y: by, w: 48, h: 48 };
    moveBtnD = { x: 112, y: by, w: 48, h: 48 };
    ui.drawButton(ctx, moveBtnA, "A", hudHold.a ? "primary" : "secondary");
    ui.drawButton(ctx, moveBtnD, "D", hudHold.d ? "primary" : "secondary");
    ctx.strokeStyle = "#d7c6ff";
    ctx.fillStyle = "#d7c6ff";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(72, by + 24);
    ctx.lineTo(104, by + 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(72, by + 24);
    ctx.lineTo(82, by + 16);
    ctx.lineTo(82, by + 32);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(104, by + 24);
    ctx.lineTo(94, by + 16);
    ctx.lineTo(94, by + 32);
    ctx.closePath();
    ctx.fill();

    const skReady = skillCooldown <= 0;
    skillCircle = { cx: width - 168, cy: height - 86, r: 34 };
    weaponCircle = { cx: width - 78, cy: height - 86, r: 34 };
    drawHudCircle(ctx, skillCircle, skReady);
    drawHudCircle(ctx, weaponCircle, true);
    ctx.fillStyle = "#fff6c2";
    ctx.beginPath();
    ctx.moveTo(skillCircle.cx + 4, skillCircle.cy - 14);
    ctx.lineTo(skillCircle.cx - 8, skillCircle.cy + 2);
    ctx.lineTo(skillCircle.cx + 1, skillCircle.cy + 2);
    ctx.lineTo(skillCircle.cx - 4, skillCircle.cy + 16);
    ctx.lineTo(skillCircle.cx + 12, skillCircle.cy - 2);
    ctx.lineTo(skillCircle.cx + 2, skillCircle.cy - 2);
    ctx.closePath();
    ctx.fill();
    global.RenderDino.drawWeaponIcon(
      ctx,
      combat.weaponId || "blaster",
      weaponCircle.cx - 16,
      weaponCircle.cy - 16,
      32
    );
    if (!skReady) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.arc(skillCircle.cx, skillCircle.cy, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ui.drawStrokedText(
        ctx,
        String(Math.ceil(skillCooldown)),
        skillCircle.cx,
        skillCircle.cy,
        "#ffffff"
      );
    }
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ui.drawStrokedText(ctx, "АВТО", skillCircle.cx, skillCircle.cy + 48, "#ffffff");
    ui.drawStrokedText(ctx, "ПРОБЕЛ", weaponCircle.cx, weaponCircle.cy + 48, "#ffffff");
    ctx.textAlign = "left";
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (global.UI) {
      global.UI.roundRect(ctx, x, y, w, h, r);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function setPointer(x, y, down) {
    mouseX = x;
    mouseY = y;
    if (down !== undefined) mouseDown = down;
  }

  function isFinished() {
    return finished;
  }

  function getOutcome() {
    return outcome;
  }

  function isPaused() {
    return paused;
  }

  global.BattleScreen = {
    initBattle,
    update,
    draw,
    setPointer,
    fireFromPlayer,
    isFinished,
    getOutcome,
    togglePause,
    hitPauseButton,
    hitMoveButton,
    setHudHold,
    clearHudHold,
    hitSkillCircle,
    hitWeaponCircle,
    hitHangarButton,
    quitToHangar,
    isPaused,
  };
})(window);
