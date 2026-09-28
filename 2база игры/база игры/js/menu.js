(function (global) {
  "use strict";

  let buttons = [];
  let mapChapter = 1;
  let collectionTab = "weapons";

  function rect(x, y, w, h, id) {
    buttons.push({ x, y, w, h, id });
  }

  function U() {
    return global.UI;
  }

  function formatSurvivalTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function drawHangarBg(ctx, w, h) {
    const ui = U();
    const bg =
      global.Assets && global.Assets.get
        ? global.Assets.get("bg_hangar")
        : null;
    if (bg) {
      const iw = bg.naturalWidth || bg.width;
      const ih = bg.naturalHeight || bg.height;
      const scale = Math.max(w / iw, h / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(bg, (w - dw) / 2, (h - dh) / 2, dw, dh);
      ui.drawMenuBackdrop(ctx, w, h, { overImage: true });
      return;
    }
    ui.drawMenuBackdrop(ctx, w, h);
  }

  function drawSkillIcon(ctx, id, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#fff6c2";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    if (id === "shield") {
      ctx.beginPath();
      ctx.moveTo(size * 0.5, size * 0.08);
      ctx.lineTo(size * 0.88, size * 0.28);
      ctx.lineTo(size * 0.5, size * 0.92);
      ctx.lineTo(size * 0.12, size * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (id === "rocket") {
      ctx.beginPath();
      ctx.moveTo(size * 0.5, size * 0.06);
      ctx.lineTo(size * 0.72, size * 0.78);
      ctx.lineTo(size * 0.5, size * 0.64);
      ctx.lineTo(size * 0.28, size * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(size * 0.55, size * 0.05);
      ctx.lineTo(size * 0.28, size * 0.48);
      ctx.lineTo(size * 0.48, size * 0.48);
      ctx.lineTo(size * 0.38, size * 0.95);
      ctx.lineTo(size * 0.78, size * 0.4);
      ctx.lineTo(size * 0.55, size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCoinIcon(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    const r = size * 0.38;
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, "#fff4c2");
    g.addColorStop(0.55, "#f1c40f");
    g.addColorStop(1, "#9a7209");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6b4e09";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawStatIcon(ctx, kind, ix, iy) {
    ctx.fillStyle = U().colors.gold;
    if (kind === "shield") {
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ix + 10, iy - 4);
      ctx.lineTo(ix + 20, iy);
      ctx.lineTo(ix + 10, iy + 14);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "bite") {
      ctx.fillRect(ix + 4, iy, 12, 8);
      ctx.fillRect(ix, iy + 4, 4, 6);
      ctx.fillRect(ix + 16, iy + 4, 4, 6);
    } else {
      ctx.fillRect(ix + 8, iy - 6, 4, 16);
      ctx.fillRect(ix, iy + 6, 20, 6);
    }
  }

  function drawStars(ctx, cx, y, count) {
    ctx.fillStyle = U().colors.goldBright;
    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      ctx.arc(cx - (count - 1) * 8 + i * 16, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawStarShape(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawStarRow(ctx, cx, y, filled, r) {
    const ui = U();
    const gap = r * 2.6;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < filled ? ui.colors.goldBright : ui.colors.disabled;
      drawStarShape(ctx, cx + (i - 1) * gap, y, r);
    }
  }

  function selectedLevelInfo(save) {
    const D = global.DinoData;
    const g = Math.max(0, Math.min(save.maxUnlocked || 0, save.selectedLevel || 0));
    const lv = D.globalToLevel(g);
    return D.getLevelConfig(lv.chapter, lv.level);
  }

  function chapterCount(save) {
    const D = global.DinoData;
    return Math.floor((save.maxUnlocked || 0) / D.LEVELS_PER_CHAPTER) + 1;
  }

  function currentDifficultyId(save) {
    return save.selectedDifficulty || "normal";
  }

  function starsFor(save, levelKey) {
    return global.SaveGame.getStars(
      save,
      currentDifficultyId(save),
      levelKey
    );
  }

  function chapterStars(save, chapter) {
    const D = global.DinoData;
    let sum = 0;
    for (let lv = 1; lv <= D.LEVELS_PER_CHAPTER; lv++) {
      sum += starsFor(save, D.levelKey(chapter, lv));
    }
    return sum;
  }

  function totalStars(save) {
    let sum = 0;
    const n = chapterCount(save);
    for (let ch = 1; ch <= n; ch++) sum += chapterStars(save, ch);
    return sum;
  }

  function hangarActionLayout(w, h, ui) {
    const colW = 156;
    const x = w - colW - 20;
    const gap = h < 620 ? 6 : 10;
    const bottom = h < 620 ? h - 12 : h - 20;
    const play = {
      x: x,
      y: bottom - ui.btnHLg,
      w: colW,
      h: ui.btnHLg,
      id: "play",
    };
    const survival = {
      x: x,
      y: play.y - gap - ui.btnH,
      w: colW,
      h: ui.btnH,
      id: "survival",
    };
    const map = {
      x: x,
      y: survival.y - gap - ui.btnH,
      w: colW,
      h: ui.btnH,
      id: "open_map",
    };
    const collections = {
      x: x,
      y: map.y - gap - ui.btnH,
      w: colW,
      h: ui.btnH,
      id: "open_collection",
    };
    return { play: play, survival: survival, map: map, collections: collections };
  }

  function drawLevelPicker(ctx, w, h, save, mapBtn) {
    const ui = U();
    const cfg = selectedLevelInfo(save);
    const btn = mapBtn || hangarActionLayout(w, h, ui).map;
    ui.drawButton(ctx, btn, "Карта · " + cfg.chapter + "-" + cfg.level, "secondary");
    drawStarRow(
      ctx,
      btn.x + btn.w / 2,
      btn.y - 14,
      starsFor(save, cfg.key),
      7
    );
    ctx.textAlign = "left";
  }

  function drawLock(ctx, cx, cy, r) {
    const ui = U();
    ctx.strokeStyle = ui.colors.disabledText;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.12, r * 0.28, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = ui.colors.disabledText;
    ctx.fillRect(cx - r * 0.36, cy - r * 0.12, r * 0.72, r * 0.5);
  }

  function drawLevelNode(ctx, cx, cy, r, cfg, save, selected, unlocked) {
    const ui = U();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = !unlocked
      ? ui.colors.disabled
      : selected
      ? ui.colors.gold
      : "rgba(18, 18, 20, 0.92)";
    ctx.fill();
    ctx.strokeStyle = !unlocked
      ? ui.colors.borderMuted
      : selected
      ? ui.colors.goldBright
      : ui.colors.gold;
    ctx.lineWidth = cfg.hasBoss ? 4 : 2;
    ctx.stroke();

    ctx.textAlign = "center";
    if (!unlocked) {
      drawLock(ctx, cx, cy, r);
    } else {
      ui.setFont(ctx, "title");
      ctx.fillStyle = selected ? ui.colors.ink : ui.colors.text;
      ctx.textBaseline = "middle";
      ctx.fillText(String(cfg.level), cx, cy);
      ctx.textBaseline = "alphabetic";
    }
    if (cfg.hasBoss) {
      ctx.fillStyle = unlocked ? ui.colors.goldBright : ui.colors.disabledText;
      ui.setFont(ctx, "tip");
      ctx.fillText("БОСС", cx, cy - r - 10);
    }
    const stars = unlocked ? starsFor(save, cfg.key) : 0;
    drawStarRow(ctx, cx, cy + r + 18, stars, 7);
    ctx.textAlign = "left";
  }

  function drawMap(ctx, w, h, save) {
    const ui = U();
    const D = global.DinoData;
    buttons = [];
    drawHangarBg(ctx, w, h);
    ui.drawScreenTitle(ctx, "Карта", w);

    const maxUnlocked = save.maxUnlocked || 0;
    const chapters = chapterCount(save);
    const selCfg = selectedLevelInfo(save);
    if (mapChapter < 1 || mapChapter > chapters) mapChapter = selCfg.chapter;

    ctx.textAlign = "center";
    ui.label(
      ctx,
      totalStars(save) +
        " / " +
        chapters * D.LEVELS_PER_CHAPTER * 3 +
        " звёзд",
      w / 2,
      80,
      "muted"
    );
    ctx.textAlign = "left";

    const selDiff = currentDifficultyId(save);
    const diffDefs = global.DinoData.DIFFICULTIES;
    const diffW = 118;
    const diffGap = 8;
    const diffRowW = diffDefs.length * diffW + (diffDefs.length - 1) * diffGap;
    const diffY = 96;
    let dx = (w - diffRowW) / 2;
    for (let i = 0; i < diffDefs.length; i++) {
      const def = diffDefs[i];
      const locked =
        def.id === "nightmare" && !save.nightmareUnlocked;
      const tab = {
        x: dx,
        y: diffY,
        w: diffW,
        h: ui.btnH,
        id: "diff_" + def.id,
      };
      let variant = "secondary";
      if (locked) variant = "disabled";
      else if (def.id === selDiff) variant = "primary";
      ui.drawButton(ctx, tab, def.label, variant);
      if (!locked) rect(tab.x, tab.y, tab.w, tab.h, tab.id);
      dx += diffW + diffGap;
    }

    const maxTabs = 5;
    const first = Math.max(1, Math.min(mapChapter - 2, chapters - maxTabs + 1));
    const chapterMaxStars = D.LEVELS_PER_CHAPTER * 3;
    const shown = Math.min(maxTabs, chapters);
    const tabW = 150;
    const gap = 8;
    const rowW = shown * tabW + (shown - 1) * gap;
    const tabY = 148;
    let tx = (w - rowW) / 2;
    for (let i = 0; i < shown; i++) {
      const ch = first + i;
      const cfg = D.getLevelConfig(ch, 1);
      const tab = { x: tx, y: tabY, w: tabW, h: ui.btnH, id: "map_ch_" + ch };
      ui.drawButton(
        ctx,
        tab,
        cfg.chapterName + "  " + chapterStars(save, ch) + "/" + chapterMaxStars,
        ch === mapChapter ? "primary" : "secondary"
      );
      rect(tab.x, tab.y, tab.w, tab.h, tab.id);
      tx += tabW + gap;
    }
    if (chapters > maxTabs) {
      const left = { x: (w - rowW) / 2 - 44, y: tabY, w: 36, h: ui.btnH, id: "map_ch_left" };
      const right = { x: (w + rowW) / 2 + 8, y: tabY, w: 36, h: ui.btnH, id: "map_ch_right" };
      ui.drawButton(ctx, left, "<", first > 1 ? "secondary" : "disabled");
      ui.drawButton(
        ctx,
        right,
        ">",
        first + shown - 1 < chapters ? "secondary" : "disabled"
      );
      rect(left.x, left.y, left.w, left.h, left.id);
      rect(right.x, right.y, right.w, right.h, right.id);
    }

    const r = 30;
    const step = Math.min(150, (w - 160) / D.LEVELS_PER_CHAPTER);
    const rowLevelsW = step * (D.LEVELS_PER_CHAPTER - 1);
    const startX = (w - rowLevelsW) / 2;
    const nodeY = h * 0.45;
    ctx.strokeStyle = ui.colors.panelBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, nodeY);
    ctx.lineTo(startX + rowLevelsW, nodeY);
    ctx.stroke();

    for (let lv = 1; lv <= D.LEVELS_PER_CHAPTER; lv++) {
      const cfg = D.getLevelConfig(mapChapter, lv);
      const cx = startX + (lv - 1) * step;
      const unlocked = cfg.globalLevel <= maxUnlocked;
      const selected = cfg.globalLevel === (save.selectedLevel || 0);
      drawLevelNode(ctx, cx, nodeY, r, cfg, save, selected, unlocked);
      if (unlocked) {
        rect(cx - r, nodeY - r, r * 2, r * 2, "map_lv_" + cfg.globalLevel);
      }
    }

    const pw = Math.min(420, w - 80);
    const px = (w - pw) / 2;
    const py = h - 210;
    ui.drawPanel(ctx, px, py, pw, 96);
    ctx.textAlign = "center";
    ui.label(ctx, selCfg.chapterName, w / 2, py + 22, "muted");
    ui.setFont(ctx, "title");
    ctx.fillStyle = selCfg.hasBoss ? ui.colors.goldBright : ui.colors.text;
    ctx.fillText(
      "Уровень " +
        selCfg.chapter +
        "-" +
        selCfg.level +
        (selCfg.hasBoss ? " · БОСС" : ""),
      w / 2,
      py + 50
    );
    const diffCfg = global.DinoData.getDifficulty(currentDifficultyId(save));
    ui.label(
      ctx,
      diffCfg.label +
        "  ·  x" +
        selCfg.hpMult.toFixed(1) +
        "  ·  цель " +
        selCfg.targetTime +
        "с" +
        (diffCfg.coinMult !== 1
          ? "  ·  монеты x" + diffCfg.coinMult
          : ""),
      w / 2,
      py + 76,
      "tip"
    );
    ctx.textAlign = "left";

    const play = {
      x: w / 2 - 176,
      y: h - 96,
      w: 170,
      h: ui.btnHLg,
      id: "map_play",
    };
    const back = {
      x: w / 2 + 6,
      y: h - 96,
      w: 170,
      h: ui.btnHLg,
      id: "map_back",
    };
    ui.drawButton(ctx, play, "В бой", "primary");
    ui.drawButton(ctx, back, "В ангар", "secondary");
    rect(play.x, play.y, play.w, play.h, play.id);
    rect(back.x, back.y, back.w, back.h, back.id);
  }

  function selectChapterLevel(save, chapter) {
    const D = global.DinoData;
    const maxUnlocked = save.maxUnlocked || 0;
    const current = D.globalToLevel(save.selectedLevel || 0);
    if (current.chapter === chapter) return;
    const first = D.levelToGlobal(chapter, 1);
    const last = D.levelToGlobal(chapter, D.LEVELS_PER_CHAPTER);
    let pick = -1;
    for (let g = first; g <= last && g <= maxUnlocked; g++) pick = g;
    if (pick < 0) return;
    save.selectedLevel = pick;
    global.SaveGame.saveSave(save);
  }

  function handleMapAction(id, save) {
    if (!id) return null;
    if (id === "map_play") return "startBattle";
    if (id === "map_back") return "menu";
    if (id === "map_ch_left") {
      mapChapter = Math.max(1, mapChapter - 1);
      selectChapterLevel(save, mapChapter);
      return null;
    }
    if (id === "map_ch_right") {
      mapChapter = Math.min(chapterCount(save), mapChapter + 1);
      selectChapterLevel(save, mapChapter);
      return null;
    }
    if (id.indexOf("map_ch_") === 0) {
      mapChapter = parseInt(id.slice(7), 10) || 1;
      mapChapter = Math.max(1, Math.min(chapterCount(save), mapChapter));
      selectChapterLevel(save, mapChapter);
      return null;
    }
    if (id.indexOf("map_lv_") === 0) {
      const g = parseInt(id.slice(7), 10);
      if (!isNaN(g) && g <= (save.maxUnlocked || 0)) {
        save.selectedLevel = g;
        global.SaveGame.saveSave(save);
      }
      return null;
    }
    if (id.indexOf("diff_") === 0) {
      const did = id.slice(5);
      if (did === "nightmare" && !save.nightmareUnlocked) return null;
      save.selectedDifficulty = global.DinoData.getDifficulty(did).id;
      global.SaveGame.saveSave(save);
      return null;
    }
    return null;
  }

  function moveMapSelection(save, dir) {
    const D = global.DinoData;
    const g = Math.max(
      0,
      Math.min(save.maxUnlocked || 0, (save.selectedLevel || 0) + dir)
    );
    save.selectedLevel = g;
    mapChapter = D.globalToLevel(g).chapter;
    global.SaveGame.saveSave(save);
  }

  function openMap(save) {
    mapChapter = selectedLevelInfo(save).chapter;
  }

  function drawMenu(ctx, w, h, save, animTime) {
    const ui = U();
    buttons = [];
    drawHangarBg(ctx, w, h);
    const titleH = ui.drawScreenTitle(ctx, "Ангар", w);

    ctx.textAlign = "left";
    ui.label(
      ctx,
      global.DinoData.formatStat(save.coins) + " монет",
      24,
      titleH + 22,
      "gold"
    );
    global.SaveGame.ensureSurvivalBest(save);
    ui.label(
      ctx,
      "Выживание — рекорд: " +
        formatSurvivalTime(save.survivalBest.timeSec) +
        " · " +
        save.survivalBest.kills +
        " убийств",
      24,
      titleH + 40,
      "muted"
    );

    const idx = save.selectedIndex;
    const dino = global.DinoData.DINOS[idx];
    const prog = global.DinoData.getDinoProgress(save, idx);
    const evoScale = 1 + Math.min(0.2, (prog.characterLevel - 1) * 0.03);

    const panelX = 24;
    const panelY = h * 0.18;
    const panelW = Math.min(260, w * 0.28);
    const panelH = 200;
    ui.drawPanel(ctx, panelX, panelY, panelW, panelH);

    ui.setFont(ctx, "title");
    ctx.fillStyle = ui.colors.goldBright;
    ctx.fillText(String(prog.characterLevel), panelX + 16, panelY + 36);
    ui.label(ctx, "ЭВОЛЮЦИЯ " + prog.evolution + "%", panelX + 52, panelY + 32, "tip");
    const barX = panelX + 16;
    const barY = panelY + 48;
    ctx.fillStyle = ui.colors.track;
    ctx.fillRect(barX, barY, panelW - 32, 10);
    ctx.fillStyle = ui.colors.fillBar;
    ctx.fillRect(barX, barY, (panelW - 32) * (prog.evolution / 100), 10);

    const stats = [
      ["shield", prog.shield, "A" + prog.armorLevel],
      ["bite", prog.bite, "D" + prog.damageLevel],
      ["rocket", Math.floor((1 - prog.rocket) * 1000), "R" + prog.rateLevel],
    ];
    stats.forEach(function (s, i) {
      const sy = panelY + 80 + i * 36;
      drawStatIcon(ctx, s[0], panelX + 16, sy);
      ui.label(
        ctx,
        global.DinoData.formatStat(s[1]),
        panelX + 48,
        sy + 6,
        "body"
      );
      ui.label(ctx, s[2], panelX + panelW - 36, sy + 6, "muted");
    });

    const upDefs = [
      { id: "up_armor", stat: "armor", label: "Броня" },
      { id: "up_damage", stat: "damage", label: "Урон" },
      { id: "up_rate", stat: "rate", label: "Темп" },
    ];
    upDefs.forEach(function (u, i) {
      const cost = global.DinoData.statCost(save, u.stat);
      const canUp = save.coins >= cost;
      const btn = {
        x: panelX,
        y: panelY + panelH + 10 + i * (ui.btnH + 6),
        w: panelW,
        h: ui.btnH,
        id: u.id,
      };
      ui.drawButton(
        ctx,
        btn,
        u.label + " " + global.DinoData.formatStat(cost),
        canUp ? "primary" : "disabled"
      );
      rect(btn.x, btn.y, btn.w, btn.h, btn.id);
    });

    const cx = w / 2;
    const t = animTime || 0;
    const cy = h * 0.48 + Math.sin(t * 2) * 8;
    ctx.fillStyle = "rgba(201, 162, 39, 0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.48 + 55, 90, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    global.RenderDino.drawMechDino(
      ctx,
      dino.id,
      cx,
      cy,
      1.75 * evoScale,
      -0.25,
      { weaponId: save.selectedWeaponId || "blaster" }
    );

    ctx.textAlign = "center";
    ui.setFont(ctx, "title");
    ctx.fillStyle = ui.colors.text;
    ctx.fillText(dino.name, cx, h * 0.2);
    drawStars(ctx, cx, h * 0.24, dino.stars);

    const navY = h * 0.48 - 20;
    const prev = { x: cx - 160, y: navY, w: 52, h: 52, id: "prev" };
    const next = { x: cx + 108, y: navY, w: 52, h: 52, id: "next" };
    ui.drawButton(ctx, prev, "<<", "secondary");
    ui.drawButton(ctx, next, ">>", "secondary");
    rect(prev.x, prev.y, prev.w, prev.h, prev.id);
    rect(next.x, next.y, next.w, next.h, next.id);

    const actions = hangarActionLayout(w, h, ui);
    drawLevelPicker(ctx, w, h, save, actions.map);
    ui.drawButton(ctx, actions.collections, "Коллекции", "secondary");
    ui.drawButton(ctx, actions.survival, "Выживание", "secondary");
    ui.drawButton(ctx, actions.play, "Играть", "primary");

    rect(actions.collections.x, actions.collections.y, actions.collections.w, actions.collections.h, actions.collections.id);
    rect(actions.map.x, actions.map.y, actions.map.w, actions.map.h, actions.map.id);
    rect(
      actions.survival.x,
      actions.survival.y,
      actions.survival.w,
      actions.survival.h,
      actions.survival.id
    );
    rect(actions.play.x, actions.play.y, actions.play.w, actions.play.h, actions.play.id);
  }

  function drawResultsVeil(ctx, w, h) {
    ctx.fillStyle = "rgba(4, 8, 22, 0.72)";
    ctx.fillRect(0, 0, w, h);
  }

  function drawVictoryEmblem(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "#3ec6ff";
    ctx.beginPath();
    ctx.moveTo(-78, 8);
    ctx.lineTo(-16, -12);
    ctx.lineTo(0, 16);
    ctx.lineTo(-30, 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(78, 8);
    ctx.lineTo(16, -12);
    ctx.lineTo(0, 16);
    ctx.lineTo(30, 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(14, -8);
    ctx.lineTo(0, 10);
    ctx.lineTo(-14, -8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPackArt(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#1d4e89";
    ctx.fillRect(-36, -28, 72, 56);
    ctx.fillStyle = "#3ec6ff";
    ctx.fillRect(-36, -28, 72, 16);
    ctx.fillStyle = "#f4f7fb";
    ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, 6);
    ctx.restore();
  }

  function weaponById(id) {
    return global.DinoData.getWeapon(id || "blaster");
  }

  function drawWeaponRewardCard(ctx, rectCard, id, stars) {
    const weapon = weaponById(id);
    U().drawCard(ctx, rectCard, {
      name: weapon.name,
      rarity: id === "rail" ? "rare" : "common",
      stars: Math.min(5, stars || 0),
      drawIcon: function (iconCtx, ix, iy, size) {
        global.RenderDino.drawWeaponIcon(iconCtx, id, ix, iy, size);
      },
    });
  }

  function drawCoinRewardCard(ctx, rectCard, coins) {
    U().drawCard(ctx, rectCard, {
      name: "+" + (coins || 0),
      rarity: "common",
      maxStars: 0,
      drawIcon: function (iconCtx, ix, iy, size) {
        drawCoinIcon(iconCtx, ix, iy, size);
      },
    });
  }

  function drawResultsNav(ctx, w, h, primaryLabel) {
    const ui = U();
    const cont = {
      x: w / 2 - 210,
      y: h * 0.78,
      w: 200,
      h: ui.btnHLg,
      id: "continue",
    };
    const toMap = {
      x: w / 2 + 10,
      y: h * 0.78,
      w: 200,
      h: ui.btnHLg,
      id: "results_map",
    };
    ui.drawButton(ctx, cont, primaryLabel, "primary");
    ui.drawButton(ctx, toMap, "На карту", "secondary");
    rect(cont.x, cont.y, cont.w, cont.h, cont.id);
    rect(toMap.x, toMap.y, toMap.w, toMap.h, toMap.id);
  }

  function drawChooseEquipment(ctx, w, h, outcome, save) {
    const ui = U();
    ui.drawScreenTitle(ctx, "Выбери оборудование", w);
    const choices = outcome.rewardChoices || [];
    const cardW = 150;
    const cardH = 168;
    const gap = 28;
    const rowW = choices.length * cardW + (choices.length - 1) * gap;
    const x0 = (w - rowW) / 2;
    const y0 = h * 0.28;
    for (let i = 0; i < choices.length; i++) {
      const id = choices[i];
      const x = x0 + i * (cardW + gap);
      drawWeaponRewardCard(ctx, { x: x, y: y0, w: cardW, h: cardH }, id, itemLevel(save, "weapon", id));
      rect(x, y0, cardW, cardH, "reward_w_" + id);
    }
  }

  function drawRewardPack(ctx, w, h, outcome, save) {
    const ui = U();
    const cardW = 140;
    const cardH = 156;
    const gap = 18;
    const y0 = h * 0.32;
    const coin = { x: w / 2 - cardW - gap / 2, y: y0, w: cardW, h: cardH };
    const gear = { x: w / 2 + gap / 2, y: y0, w: cardW, h: cardH };
    drawCoinRewardCard(ctx, coin, outcome.coinsEarned);
    drawWeaponRewardCard(
      ctx,
      gear,
      outcome.chosenWeaponId,
      itemLevel(save, "weapon", outcome.chosenWeaponId)
    );
    ctx.textAlign = "center";
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ui.drawStrokedText(ctx, "x1", gear.x + gear.w / 2, gear.y + gear.h + 18, "#7CFF4A");
    drawPackArt(ctx, w - 70, h - 80);
    const take = {
      x: w / 2 - 90,
      y: h * 0.72,
      w: 180,
      h: ui.btnHLg,
      id: "reward_take",
    };
    ui.drawButton(ctx, take, "Забрать", "take");
    rect(take.x, take.y, take.w, take.h, take.id);
    ctx.textAlign = "left";
  }

  function drawVictoryReward(ctx, w, h, outcome, save) {
    const ui = U();
    if (outcome.firstClear && outcome.hasBoss) {
      ctx.textAlign = "center";
      ui.label(ctx, "Глава " + outcome.chapter + " пройдена!", w / 2, h * 0.16, "gold");
    }
    drawVictoryEmblem(ctx, w / 2, h * 0.24);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = 'bold 42px "Segoe UI", system-ui, sans-serif';
    ui.drawStrokedText(ctx, "ПОБЕДА", w / 2, h * 0.36, "#ffffff");
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    ui.drawStrokedText(ctx, "ваша награда", w / 2, h * 0.43, "#ffffff");
    const cardW = 140;
    const cardH = 150;
    const y0 = h * 0.48;
    if (outcome.chosenWeaponId) {
      const gap = 18;
      drawCoinRewardCard(
        ctx,
        { x: w / 2 - cardW - gap / 2, y: y0, w: cardW, h: cardH },
        outcome.coinsEarned
      );
      drawWeaponRewardCard(
        ctx,
        { x: w / 2 + gap / 2, y: y0, w: cardW, h: cardH },
        outcome.chosenWeaponId,
        itemLevel(save, "weapon", outcome.chosenWeaponId)
      );
    } else {
      drawCoinRewardCard(
        ctx,
        { x: w / 2 - cardW / 2, y: y0, w: cardW, h: cardH },
        outcome.coinsEarned
      );
    }
    drawResultsNav(ctx, w, h, "Продолжить");
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  function drawResults(ctx, w, h, outcome, save) {
    if (!outcome) return;
    const ui = U();
    buttons = [];
    drawResultsVeil(ctx, w, h);
    if (outcome.rewardStep === "choose") {
      drawChooseEquipment(ctx, w, h, outcome, save || {});
      return;
    }
    if (outcome.rewardStep === "pack") {
      drawRewardPack(ctx, w, h, outcome, save || {});
      return;
    }
    const survival = outcome.mode === "survival";
    if (!survival && outcome.victory) {
      drawVictoryReward(ctx, w, h, outcome, save || {});
      return;
    }
    ui.drawScreenTitle(
      ctx,
      survival ? "Конец забега" : "Поражение",
      w
    );
    ctx.textAlign = "center";
    if (outcome.title) {
      ui.label(ctx, outcome.title, w / 2, h * 0.22, "muted");
      ctx.textAlign = "center";
    }
    if (outcome.difficultyLabel) {
      ui.label(ctx, "Режим: " + outcome.difficultyLabel, w / 2, h * 0.26, "tip");
      ctx.textAlign = "center";
    }
    if (survival) {
      const time = Math.round(outcome.timeSec || 0);
      ui.label(
        ctx,
        "Время: " +
          formatSurvivalTime(time) +
          " · Волна " +
          (outcome.survivalWave || 1) +
          " · Tier " +
          ((outcome.survivalTier || 0) + 1),
        w / 2,
        h * 0.37,
        "body"
      );
      if (outcome.newBestTime) {
        ui.label(ctx, "Новый рекорд времени!", w / 2, h * 0.41, "gold");
      }
      if (outcome.newBestKills) {
        ui.label(ctx, "Новый рекорд убийств!", w / 2, h * 0.45, "gold");
      }
    }
    ui.label(
      ctx,
      "Убийств: " + outcome.kills,
      w / 2,
      survival ? h * 0.5 : h * 0.42,
      "body"
    );
    ctx.textAlign = "center";
    drawCoinRewardCard(
      ctx,
      { x: w / 2 - 70, y: survival ? h * 0.54 : h * 0.46, w: 140, h: 120 },
      outcome.coinsEarned
    );
    drawResultsNav(ctx, w, h, "В ангар");
    ctx.textAlign = "left";
  }

  function hitTest(x, y) {
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return b.id;
      }
    }
    return null;
  }

  function itemLevel(save, kind, id) {
    if (kind === "weapon") {
      return (save.weaponLevels && save.weaponLevels[id]) || 0;
    }
    return (save.skillLevels && save.skillLevels[id]) || 0;
  }

  function itemCost(save, kind, id) {
    if (kind === "weapon") {
      const prev = save.selectedWeaponId;
      save.selectedWeaponId = id;
      const cost = global.DinoData.weaponUpgradeCost(save);
      save.selectedWeaponId = prev;
      return cost;
    }
    const prev = save.selectedSkillId;
    save.selectedSkillId = id;
    const cost = global.DinoData.skillUpgradeCost(save);
    save.selectedSkillId = prev;
    return cost;
  }

  function drawUpgradeBar(ctx, x, y, w, h, coins, cost) {
    const ui = U();
    const shown = Math.min(coins, cost);
    const ratio = cost > 0 ? shown / cost : 1;
    ui.roundRect(ctx, x, y, w, h, 6);
    ctx.fillStyle = "#10233f";
    ctx.fill();
    if (ratio > 0) {
      ui.roundRect(ctx, x, y, Math.max(8, w * ratio), h, 6);
      ctx.fillStyle = "#3ddc5c";
      ctx.fill();
    }
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ui.drawStrokedText(ctx, shown + "/" + cost, x + w / 2, y + h / 2, "#ffffff");
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  function drawCollection(ctx, w, h, save) {
    const ui = U();
    const D = global.DinoData;
    buttons = [];
    drawHangarBg(ctx, w, h);
    ui.drawScreenTitle(ctx, "Коллекции", w);

    const weapons = collectionTab === "weapons";
    const items = weapons ? D.WEAPONS : D.SKILLS;
    const selectedId = weapons
      ? save.selectedWeaponId || "blaster"
      : save.selectedSkillId || "lightning";
    const side = 210;
    const cardW = 132;
    const cardH = 150;
    const gap = 16;
    const rowW = items.length * cardW + (items.length - 1) * gap;
    const x0 = Math.max(16, (w - side - rowW) / 2);
    const y0 = 78;
    let selectedRect = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const x = x0 + i * (cardW + gap);
      const lvl = itemLevel(save, weapons ? "weapon" : "skill", item.id);
      const cost = itemCost(save, weapons ? "weapon" : "skill", item.id);
      const rare = item.id === "rail" || item.id === "lightning";
      const selected = item.id === selectedId;
      if (selected) {
        ctx.strokeStyle = "#f5c518";
        ctx.lineWidth = 4;
        ui.roundRect(ctx, x - 4, y0 - 4, cardW + 8, cardH + 8, 16);
        ctx.stroke();
        selectedRect = { x: x, y: y0, w: cardW, h: cardH, cost: cost };
      }
      ui.drawCard(
        ctx,
        { x: x, y: y0, w: cardW, h: cardH },
        {
          name: item.name,
          rarity: rare ? "rare" : "common",
          stars: Math.min(5, lvl),
          drawIcon: function (iconCtx, ix, iy, size) {
            if (weapons) global.RenderDino.drawWeaponIcon(iconCtx, item.id, ix, iy, size);
            else drawSkillIcon(iconCtx, item.id, ix, iy, size);
          },
        }
      );
      drawUpgradeBar(ctx, x, y0 + cardH + 8, cardW, 22, save.coins || 0, cost);
      rect(x, y0, cardW, cardH, (weapons ? "col_w_" : "col_s_") + item.id);
    }

    if (selectedRect) {
      const can = (save.coins || 0) >= selectedRect.cost;
      const up = {
        x: selectedRect.x,
        y: selectedRect.y + selectedRect.h + 36,
        w: selectedRect.w,
        h: ui.btnH,
        id: "col_up",
      };
      ui.drawButton(ctx, up, "Прокачать", can ? "primary" : "disabled");
      if (can) rect(up.x, up.y, up.w, up.h, up.id);
    }

    const tabX = w - side + 16;
    const tabW = side - 32;
    const guns = { x: tabX, y: 78, w: tabW, h: 64, id: "col_tab_weapons" };
    const gear = { x: tabX, y: 152, w: tabW, h: 64, id: "col_tab_skills" };
    const back = { x: tabX, y: h - 78, w: tabW, h: ui.btnHLg, id: "col_back" };
    ui.drawButton(ctx, guns, "", weapons ? "primary" : "secondary");
    ui.drawButton(ctx, gear, "", weapons ? "secondary" : "primary");
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ui.drawStrokedText(ctx, "Основные", guns.x + guns.w / 2, guns.y + 24, "#ffffff");
    ui.drawStrokedText(ctx, "пушки", guns.x + guns.w / 2, guns.y + 42, "#ffffff");
    ui.drawStrokedText(ctx, "Доп.", gear.x + gear.w / 2, gear.y + 24, "#ffffff");
    ui.drawStrokedText(ctx, "оборудование", gear.x + gear.w / 2, gear.y + 42, "#ffffff");
    ui.drawButton(ctx, back, "Назад", "secondary");
    rect(guns.x, guns.y, guns.w, guns.h, guns.id);
    rect(gear.x, gear.y, gear.w, gear.h, gear.id);
    rect(back.x, back.y, back.w, back.h, back.id);
  }

  function handleMenuAction(id, save) {
    if (id === "prev") {
      save.selectedIndex = (save.selectedIndex + 3) % 4;
      global.SaveGame.saveSave(save);
    } else if (id === "next") {
      save.selectedIndex = (save.selectedIndex + 1) % 4;
      global.SaveGame.saveSave(save);
    } else if (id === "up_armor") {
      global.SaveGame.applyStatUpgrade(save, "armor");
    } else if (id === "up_damage") {
      global.SaveGame.applyStatUpgrade(save, "damage");
    } else if (id === "up_rate") {
      global.SaveGame.applyStatUpgrade(save, "rate");
    } else if (id === "wpn_prev") {
      save.selectedWeaponId = global.DinoData.cycleWeaponId(
        save.selectedWeaponId || "blaster",
        -1
      );
      global.SaveGame.saveSave(save);
    } else if (id === "wpn_next") {
      save.selectedWeaponId = global.DinoData.cycleWeaponId(
        save.selectedWeaponId || "blaster",
        1
      );
      global.SaveGame.saveSave(save);
    } else if (id === "up_weapon") {
      global.SaveGame.applyWeaponUpgrade(save);
    } else if (id === "sk_prev") {
      save.selectedSkillId = global.DinoData.cycleSkillId(
        save.selectedSkillId || "lightning",
        -1
      );
      global.SaveGame.saveSave(save);
    } else if (id === "sk_next") {
      save.selectedSkillId = global.DinoData.cycleSkillId(
        save.selectedSkillId || "lightning",
        1
      );
      global.SaveGame.saveSave(save);
    } else if (id === "up_skill") {
      global.SaveGame.applySkillUpgrade(save);
    } else if (id === "open_collection") {
      return "openCollection";
    } else if (id === "col_back") {
      return "menu";
    } else if (id === "col_tab_weapons") {
      collectionTab = "weapons";
    } else if (id === "col_tab_skills") {
      collectionTab = "skills";
    } else if (id.indexOf("col_w_") === 0) {
      save.selectedWeaponId = id.slice(6);
      global.SaveGame.saveSave(save);
    } else if (id.indexOf("col_s_") === 0) {
      save.selectedSkillId = id.slice(6);
      global.SaveGame.saveSave(save);
    } else if (id === "col_up") {
      if (collectionTab === "weapons") global.SaveGame.applyWeaponUpgrade(save);
      else global.SaveGame.applySkillUpgrade(save);
    } else if (id === "open_map") {
      openMap(save);
      return "openMap";
    } else if (id === "play") {
      return "startBattle";
    } else if (id === "survival") {
      if (global.MenuScreen.onStartSurvival) {
        global.MenuScreen.onStartSurvival();
      }
      return "survivalStarted";
    }
    return null;
  }

  function handleResultsAction(id, save, outcome) {
    if (!outcome) return "menu";
    if (id.indexOf("reward_w_") === 0) {
      if (outcome.rewardStep !== "choose" || outcome.chosenWeaponId) return "stay";
      const wid = id.slice(9);
      if (!save.weaponLevels) {
        save.weaponLevels = { blaster: 0, shotgun: 0, rail: 0 };
      }
      save.weaponLevels[wid] = (save.weaponLevels[wid] || 0) + 1;
      outcome.chosenWeaponId = wid;
      outcome.rewardStep = "pack";
      global.SaveGame.saveSave(save);
      return "stay";
    }
    if (id === "reward_take") {
      if (outcome.rewardStep === "pack") outcome.rewardStep = "victory";
      return "stay";
    }
    if (id === "continue" || id === "results_map") {
      if (outcome.rewardStep === "choose" || outcome.rewardStep === "pack") return "stay";
      if (!outcome.rewardsApplied && global.SaveGame.commitBattleRewards) {
        global.SaveGame.commitBattleRewards(save, outcome);
      }
      if (id === "results_map") {
        openMap(save);
        return "map";
      }
      return "menu";
    }
    return null;
  }

  global.MenuScreen = {
    onStartSurvival: null,
    onStartBattle: null,
    drawMenu,
    drawMap,
    drawCollection,
    drawResults,
    hitTest,
    handleMenuAction,
    handleMapAction,
    handleResultsAction,
    moveMapSelection,
    openMap,
    selectedLevelConfig: selectedLevelInfo,
  };
})(window);
