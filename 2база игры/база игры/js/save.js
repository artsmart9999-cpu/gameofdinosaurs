(function (global) {
  "use strict";

  const KEY = "dominators_analog_v1";
  const KEY_V2 = "dominators_analog_v2";

  function defaultWeaponLevels() {
    return { blaster: 0, shotgun: 0, rail: 0 };
  }

  function defaultSkillLevels() {
    return { lightning: 0, shield: 0, rocket: 0 };
  }

  function defaultDino() {
    return {
      armorLevel: 0,
      damageLevel: 0,
      rateLevel: 0,
      characterLevel: 1,
      evolution: 0,
    };
  }

  function defaultStarsByDiff() {
    return { normal: {}, easy: {}, nightmare: {} };
  }

  function migrateDino(raw) {
    const d = defaultDino();
    if (!raw) return d;
    d.characterLevel = raw.characterLevel || 1;
    d.evolution = raw.evolution || 0;
    if (
      typeof raw.armorLevel === "number" ||
      typeof raw.damageLevel === "number" ||
      typeof raw.rateLevel === "number"
    ) {
      d.armorLevel = raw.armorLevel || 0;
      d.damageLevel = raw.damageLevel || 0;
      d.rateLevel = raw.rateLevel || 0;
    } else {
      const old = raw.upgradeLevel || 0;
      d.armorLevel = old;
      d.damageLevel = old;
      d.rateLevel = old;
    }
    return d;
  }

  function ensureStarsByDiff(save) {
    if (!save.starsByDiff) save.starsByDiff = defaultStarsByDiff();
    if (!save.starsByDiff.normal) save.starsByDiff.normal = {};
    if (!save.starsByDiff.easy) save.starsByDiff.easy = {};
    if (!save.starsByDiff.nightmare) save.starsByDiff.nightmare = {};
  }

  function getStars(save, difficultyId, levelKey) {
    ensureStarsByDiff(save);
    const bucket = save.starsByDiff[difficultyId] || save.starsByDiff.normal;
    return (bucket && bucket[levelKey]) || 0;
  }

  function setStarsMax(save, difficultyId, levelKey, stars) {
    ensureStarsByDiff(save);
    if (!save.starsByDiff[difficultyId]) save.starsByDiff[difficultyId] = {};
    const prev = save.starsByDiff[difficultyId][levelKey] || 0;
    save.starsByDiff[difficultyId][levelKey] = Math.max(
      prev,
      Math.max(0, Math.min(3, stars | 0))
    );
  }

  function mergeStarsIntoNormal(base, flatStars) {
    ensureStarsByDiff(base);
    const keys = Object.keys(flatStars);
    for (let i = 0; i < keys.length; i++) {
      const v = flatStars[keys[i]];
      if (typeof v === "number") {
        base.starsByDiff.normal[keys[i]] = Math.max(
          0,
          Math.min(3, v | 0)
        );
      }
    }
  }

  /** Old saves counted full boss runs; each one equals a whole chapter now. */
  function migrateLevelsCleared(base, levelsCleared) {
    const D = global.DinoData;
    const n = Math.max(0, levelsCleared | 0);
    base.maxUnlocked = n * D.LEVELS_PER_CHAPTER;
    ensureStarsByDiff(base);
    for (let g = 0; g < base.maxUnlocked; g++) {
      const lv = D.globalToLevel(g);
      base.starsByDiff.normal[D.levelKey(lv.chapter, lv.level)] = 1;
    }
    base.selectedLevel = base.maxUnlocked;
  }

  function recordLevelResult(save, outcome) {
    if (!outcome || !outcome.victory || !outcome.levelKey) return;
    const diff = outcome.difficulty || "normal";
    setStarsMax(save, diff, outcome.levelKey, outcome.stars || 1);
    if (
      outcome.advancesProgress &&
      outcome.globalLevel >= (save.maxUnlocked || 0)
    ) {
      save.maxUnlocked = outcome.globalLevel + 1;
      save.selectedLevel = save.maxUnlocked;
    }
    if (
      diff === "normal" &&
      outcome.hasBoss &&
      outcome.victory
    ) {
      save.nightmareUnlocked = true;
    }
  }

  function defaultSave() {
    return {
      coins: global.DinoData.START_COINS,
      selectedIndex: 0,
      maxUnlocked: 0,
      selectedLevel: 0,
      selectedDifficulty: "normal",
      nightmareUnlocked: false,
      starsByDiff: defaultStarsByDiff(),
      selectedWeaponId: "blaster",
      weaponLevels: defaultWeaponLevels(),
      selectedSkillId: "lightning",
      skillLevels: defaultSkillLevels(),
      dinos: [
        defaultDino(),
        defaultDino(),
        defaultDino(),
        defaultDino(),
      ],
      survivalBest: { timeSec: 0, kills: 0 },
    };
  }

  function ensureSurvivalBest(save) {
    if (!save.survivalBest || typeof save.survivalBest !== "object") {
      save.survivalBest = { timeSec: 0, kills: 0 };
    }
    if (typeof save.survivalBest.timeSec !== "number") {
      save.survivalBest.timeSec = 0;
    }
    if (typeof save.survivalBest.kills !== "number") {
      save.survivalBest.kills = 0;
    }
  }

  function recordSurvivalResult(save, outcome) {
    if (!outcome || outcome.mode !== "survival") return { newBestTime: false, newBestKills: false };
    ensureSurvivalBest(save);
    const timeSec = Math.max(0, outcome.timeSec || 0);
    const kills = Math.max(0, outcome.kills | 0);
    let newBestTime = false;
    let newBestKills = false;
    if (timeSec > save.survivalBest.timeSec) {
      save.survivalBest.timeSec = timeSec;
      newBestTime = true;
    }
    if (kills > save.survivalBest.kills) {
      save.survivalBest.kills = kills;
      newBestKills = true;
    }
    return { newBestTime: newBestTime, newBestKills: newBestKills };
  }

  function loadSave() {
    try {
      let raw = localStorage.getItem(KEY);
      if (!raw) raw = localStorage.getItem(KEY_V2);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      const base = defaultSave();
      if (typeof parsed.coins === "number") base.coins = parsed.coins;
      if (typeof parsed.selectedIndex === "number") {
        base.selectedIndex = Math.max(0, Math.min(3, parsed.selectedIndex));
      }
      if (typeof parsed.maxUnlocked === "number") {
        base.maxUnlocked = Math.max(0, parsed.maxUnlocked | 0);
        if (parsed.starsByDiff && typeof parsed.starsByDiff === "object") {
          base.starsByDiff = defaultStarsByDiff();
          const diffs = ["normal", "easy", "nightmare"];
          for (let d = 0; d < diffs.length; d++) {
            const id = diffs[d];
            const src = parsed.starsByDiff[id];
            if (src && typeof src === "object") {
              const keys = Object.keys(src);
              for (let i = 0; i < keys.length; i++) {
                if (typeof src[keys[i]] === "number") {
                  base.starsByDiff[id][keys[i]] = Math.max(
                    0,
                    Math.min(3, src[keys[i]] | 0)
                  );
                }
              }
            }
          }
        } else if (parsed.stars && typeof parsed.stars === "object") {
          mergeStarsIntoNormal(base, parsed.stars);
        }
        base.selectedLevel =
          typeof parsed.selectedLevel === "number"
            ? parsed.selectedLevel | 0
            : base.maxUnlocked;
      } else if (typeof parsed.levelsCleared === "number") {
        migrateLevelsCleared(base, parsed.levelsCleared);
      }
      if (typeof parsed.nightmareUnlocked === "boolean") {
        base.nightmareUnlocked = parsed.nightmareUnlocked;
      }
      if (typeof parsed.selectedDifficulty === "string") {
        base.selectedDifficulty = global.DinoData.getDifficulty(
          parsed.selectedDifficulty
        ).id;
      }
      if (base.selectedDifficulty === "nightmare" && !base.nightmareUnlocked) {
        base.selectedDifficulty = "normal";
      }
      base.selectedLevel = Math.max(
        0,
        Math.min(base.maxUnlocked, base.selectedLevel)
      );
      if (typeof parsed.selectedWeaponId === "string") {
        base.selectedWeaponId = global.DinoData.getWeapon(
          parsed.selectedWeaponId
        ).id;
      }
      if (parsed.weaponLevels && typeof parsed.weaponLevels === "object") {
        base.weaponLevels = defaultWeaponLevels();
        const ids = ["blaster", "shotgun", "rail"];
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (typeof parsed.weaponLevels[id] === "number") {
            base.weaponLevels[id] = Math.max(0, parsed.weaponLevels[id]);
          }
        }
      }
      if (typeof parsed.selectedSkillId === "string") {
        base.selectedSkillId = global.DinoData.getSkill(
          parsed.selectedSkillId
        ).id;
      }
      if (parsed.skillLevels && typeof parsed.skillLevels === "object") {
        base.skillLevels = defaultSkillLevels();
        const sids = ["lightning", "shield", "rocket"];
        for (let i = 0; i < sids.length; i++) {
          const id = sids[i];
          if (typeof parsed.skillLevels[id] === "number") {
            base.skillLevels[id] = Math.max(0, parsed.skillLevels[id]);
          }
        }
      }
      if (Array.isArray(parsed.dinos)) {
        for (let i = 0; i < 4; i++) {
          base.dinos[i] = migrateDino(parsed.dinos[i]);
        }
      }
      if (parsed.survivalBest && typeof parsed.survivalBest === "object") {
        base.survivalBest = {
          timeSec: Math.max(0, parsed.survivalBest.timeSec | 0),
          kills: Math.max(0, parsed.survivalBest.kills | 0),
        };
      }
      ensureSurvivalBest(base);
      return base;
    } catch {
      return defaultSave();
    }
  }

  function saveSave(data) {
    try {
      ensureStarsByDiff(data);
      localStorage.setItem(
        KEY,
        JSON.stringify({
          coins: data.coins,
          selectedIndex: data.selectedIndex,
          maxUnlocked: data.maxUnlocked || 0,
          selectedLevel: data.selectedLevel || 0,
          selectedDifficulty: data.selectedDifficulty || "normal",
          nightmareUnlocked: !!data.nightmareUnlocked,
          starsByDiff: data.starsByDiff,
          selectedWeaponId: data.selectedWeaponId || "blaster",
          weaponLevels: data.weaponLevels || defaultWeaponLevels(),
          selectedSkillId: data.selectedSkillId || "lightning",
          skillLevels: data.skillLevels || defaultSkillLevels(),
          dinos: data.dinos.map(function (d) {
            return {
              armorLevel: d.armorLevel || 0,
              damageLevel: d.damageLevel || 0,
              rateLevel: d.rateLevel || 0,
              characterLevel: d.characterLevel || 1,
              evolution: d.evolution || 0,
            };
          }),
          survivalBest: data.survivalBest || { timeSec: 0, kills: 0 },
        })
      );
    } catch {
      /* ignore */
    }
  }

  function applyStatUpgrade(save, stat) {
    const field = global.DinoData.STAT_FIELDS[stat];
    if (!field) return false;
    const cost = global.DinoData.statCost(save, stat);
    if (save.coins < cost) return false;
    save.coins -= cost;
    const prog = save.dinos[save.selectedIndex];
    prog[field] = (prog[field] || 0) + 1;
    prog.evolution += global.DinoData.EVOLUTION_PER_UPGRADE;
    if (prog.evolution >= 100) {
      prog.evolution = 0;
      prog.characterLevel++;
    }
    saveSave(save);
    return true;
  }

  function applyWeaponUpgrade(save) {
    const id = save.selectedWeaponId || "blaster";
    if (!save.weaponLevels) {
      save.weaponLevels = defaultWeaponLevels();
    }
    const cost = global.DinoData.weaponUpgradeCost(save);
    if (save.coins < cost) return false;
    save.coins -= cost;
    save.weaponLevels[id] = (save.weaponLevels[id] || 0) + 1;
    saveSave(save);
    return true;
  }

  function applySkillUpgrade(save) {
    const id = save.selectedSkillId || "lightning";
    if (!save.skillLevels) {
      save.skillLevels = defaultSkillLevels();
    }
    const cost = global.DinoData.skillUpgradeCost(save);
    if (save.coins < cost) return false;
    save.coins -= cost;
    save.skillLevels[id] = (save.skillLevels[id] || 0) + 1;
    saveSave(save);
    return true;
  }

  function commitBattleRewards(save, outcome) {
    if (!save || !outcome || outcome.rewardsApplied) return outcome;
    save.coins += outcome.coinsEarned || 0;
    if (outcome.mode === "survival") {
      const rec = recordSurvivalResult(save, outcome);
      outcome.newBestTime = rec.newBestTime;
      outcome.newBestKills = rec.newBestKills;
    } else {
      recordLevelResult(save, outcome);
    }
    outcome.rewardsApplied = true;
    saveSave(save);
    return outcome;
  }

  global.SaveGame = {
    loadSave,
    saveSave,
    applyStatUpgrade,
    applyWeaponUpgrade,
    applySkillUpgrade,
    recordLevelResult,
    recordSurvivalResult,
    commitBattleRewards,
    ensureSurvivalBest,
    getStars,
    defaultSave,
  };
})(window);
