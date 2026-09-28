(function () {
  "use strict";

  function survivalLevelConfigOrFallback() {
    var D = window.DinoData;
    if (D && typeof D.getSurvivalLevelConfig === "function") {
      return D.getSurvivalLevelConfig();
    }
    var biomes = D && D.BIOMES ? D.BIOMES : [];
    var biome =
      biomes.length > 0
        ? biomes[Math.floor(Math.random() * biomes.length)]
        : D && D.getBiome
          ? D.getBiome(0)
          : null;
    var enemyList = ["grunt", "rusher", "spitter"];
    if (D && D.CHAPTERS) {
      var set = Object.create(null);
      for (var ci = 0; ci < D.CHAPTERS.length; ci++) {
        var list = D.CHAPTERS[ci].enemies || [];
        for (var ei = 0; ei < list.length; ei++) set[list[ei]] = true;
      }
      enemyList = Object.keys(set);
    }
    var waveMax =
      D && D.WAVES && D.WAVES.length ? D.WAVES.length - 1 : 0;
    return {
      mode: "survival",
      chapter: 0,
      level: 0,
      globalLevel: 0,
      key: "survival",
      title: "Выживание · " + (biome && biome.name ? biome.name : "Арена"),
      chapterName: "Выживание",
      biome: biome,
      enemies: enemyList,
      eliteOnly: false,
      bossDef: null,
      hasBoss: false,
      hpMult: 1,
      dmgMult: 1,
      coinMult: 1,
      duration: 9999,
      targetTime: 0,
      maxWaveIndex: waveMax,
    };
  }

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  let width = 0;
  let height = 0;
  let scene = "menu";
  let save = null;
  let resultsOutcome = null;
  let animTime = 0;

  const keys = Object.create(null);
  let pointerX = 0;
  let pointerY = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function canvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function startBattle() {
    if (window.AudioFX) window.AudioFX.unlock();
    BattleScreen.initBattle(
      width,
      height,
      save,
      keys,
      MenuScreen.selectedLevelConfig(save)
    );
    scene = "battle";
  }

  function startSurvivalBattle() {
    const survCfg = survivalLevelConfigOrFallback();
    if (window.AudioFX) window.AudioFX.unlock();
    BattleScreen.initBattle(width, height, save, keys, survCfg);
    scene = "battle";
  }

  MenuScreen.onStartSurvival = startSurvivalBattle;
  MenuScreen.onStartBattle = startBattle;

  function handleClick(x, y) {
    if (scene === "menu") {
      const id = MenuScreen.hitTest(x, y);
      if (!id) return;
      const action = MenuScreen.handleMenuAction(id, save);
      if (action === "startBattle") startBattle();
      else if (action === "openMap") scene = "map";
      else if (action === "openCollection") scene = "collection";
    } else if (scene === "collection") {
      const id = MenuScreen.hitTest(x, y);
      if (!id) return;
      const action = MenuScreen.handleMenuAction(id, save);
      if (action === "menu") scene = "menu";
    } else if (scene === "map") {
      const id = MenuScreen.hitTest(x, y);
      if (!id) return;
      const action = MenuScreen.handleMapAction(id, save);
      if (action === "startBattle") startBattle();
      else if (action === "menu") scene = "menu";
    } else if (scene === "results") {
      if (!resultsOutcome) {
        scene = "menu";
        return;
      }
      const id = MenuScreen.hitTest(x, y);
      if (!id) return;
      const next = MenuScreen.handleResultsAction(id, save, resultsOutcome);
      if (next === "menu" || next === "map") {
        resultsOutcome = null;
        scene = next;
      }
    } else if (scene === "battle") {
      if (BattleScreen.hitPauseButton(x, y)) {
        BattleScreen.togglePause();
      }
    }
  }

  let lastTime = 0;
  function loop(time) {
    const dt = Math.min((time - lastTime) / 1000 || 0, 0.033);
    lastTime = time;
    animTime += dt;

    if (scene === "battle") {
      const out = BattleScreen.update(dt);
      if (out) {
        out.firstClear =
          !!out.victory && out.globalLevel >= (save.maxUnlocked || 0);
        SaveGame.commitBattleRewards(save, out);
        if (out.weaponReward) {
          const list = window.DinoData.WEAPONS;
          const cur = save.selectedWeaponId || "blaster";
          let idx = 0;
          for (let i = 0; i < list.length; i++) {
            if (list[i].id === cur) idx = i;
          }
          out.rewardChoices = [cur, list[(idx + 1) % list.length].id];
          out.rewardStep = "choose";
        }
        resultsOutcome = out;
        scene = "results";
      }
    }

    ctx.clearRect(0, 0, width, height);
    if (scene === "menu") {
      MenuScreen.drawMenu(ctx, width, height, save, animTime);
    } else if (scene === "collection") {
      MenuScreen.drawCollection(ctx, width, height, save);
    } else if (scene === "map") {
      MenuScreen.drawMap(ctx, width, height, save);
    } else if (scene === "battle") {
      BattleScreen.draw(ctx);
    } else if (scene === "results") {
      if (resultsOutcome) {
        BattleScreen.draw(ctx);
        MenuScreen.drawResults(ctx, width, height, resultsOutcome, save);
      } else {
        scene = "menu";
        MenuScreen.drawMenu(ctx, width, height, save, animTime);
      }
    }

    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (scene === "menu") {
      if (k === "arrowleft") {
        save.selectedIndex = (save.selectedIndex + 3) % 4;
        SaveGame.saveSave(save);
      }
      if (k === "arrowright") {
        save.selectedIndex = (save.selectedIndex + 1) % 4;
        SaveGame.saveSave(save);
      }
      if (k === "enter") startBattle();
      if (k === "v") startSurvivalBattle();
      if (k === "m") {
        MenuScreen.openMap(save);
        scene = "map";
      }
    } else if (scene === "collection") {
      if (k === "escape") scene = "menu";
    } else if (scene === "map") {
      if (k === "escape") scene = "menu";
      if (k === "enter") startBattle();
      if (k === "arrowleft") MenuScreen.moveMapSelection(save, -1);
      if (k === "arrowright") MenuScreen.moveMapSelection(save, 1);
    } else if (scene === "results" && (k === "enter" || k === "r")) {
      if (!resultsOutcome) {
        scene = "menu";
      } else if (resultsOutcome.rewardStep === "pack") {
        MenuScreen.handleResultsAction("reward_take", save, resultsOutcome);
      } else if (resultsOutcome.rewardStep !== "choose") {
        MenuScreen.handleResultsAction("continue", save, resultsOutcome);
        resultsOutcome = null;
        scene = "menu";
      }
    }
    if (scene === "battle") {
      if (k === "escape") {
        e.preventDefault();
        BattleScreen.togglePause();
      }
      if (k === " ") {
        e.preventDefault();
        if (!BattleScreen.isPaused()) keys.__skillPulse = true;
      }
      if (k === "w" || k === "arrowup") {
        e.preventDefault();
        if (!BattleScreen.isPaused()) keys.__upPulse = true;
      }
      if (k === "arrowdown" || k === "s") {
        e.preventDefault();
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    const p = canvasCoords(e.clientX, e.clientY);
    pointerX = p.x;
    pointerY = p.y;
    if (scene === "battle") BattleScreen.setPointer(p.x, p.y);
  });

  canvas.addEventListener("mousedown", (e) => {
    const p = canvasCoords(e.clientX, e.clientY);
    if (e.button !== 0) return;
    if (scene === "battle") {
      if (BattleScreen.isPaused() && BattleScreen.hitHangarButton(p.x, p.y)) {
        const out = BattleScreen.quitToHangar();
        if (out) SaveGame.commitBattleRewards(save, out);
        scene = "menu";
        return;
      }
      if (BattleScreen.hitPauseButton(p.x, p.y)) {
        BattleScreen.togglePause();
        return;
      }
      const moveDir = BattleScreen.hitMoveButton(p.x, p.y);
      if (moveDir && !BattleScreen.isPaused()) {
        BattleScreen.setHudHold(moveDir, true);
        return;
      }
      if (BattleScreen.hitSkillCircle(p.x, p.y)) {
        if (!BattleScreen.isPaused()) keys.__skillPulse = true;
        return;
      }
      if (BattleScreen.hitWeaponCircle(p.x, p.y)) return;
      if (!BattleScreen.isPaused()) {
        BattleScreen.setPointer(p.x, p.y, true);
        BattleScreen.fireFromPlayer();
      }
    } else {
      handleClick(p.x, p.y);
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 0 && scene === "battle") {
      BattleScreen.clearHudHold();
      BattleScreen.setPointer(pointerX, pointerY, false);
    }
  });

  window.addEventListener("blur", () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    if (scene === "battle") {
      BattleScreen.clearHudHold();
      BattleScreen.setPointer(0, 0, false);
    }
  });

  window.addEventListener("resize", resize);

  function drawLoading() {
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#5dade2";
    ctx.font = "22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Загрузка…", width / 2, height / 2);
    ctx.textAlign = "left";
  }

  resize();
  save = SaveGame.loadSave();
  drawLoading();
  Assets.loadAll().then(function () {
    lastTime = performance.now();
    requestAnimationFrame(loop);
  });
})();
