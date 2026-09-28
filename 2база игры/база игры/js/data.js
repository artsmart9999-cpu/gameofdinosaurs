(function (global) {
  "use strict";

  const DINOS = [
    {
      id: "trex",
      name: "Тираннозавр",
      stars: 3,
      body: "#c0392b",
      accent: "#7f8c8d",
      baseShield: 100,
      baseBite: 25,
      baseRocket: 0.22,
    },
    {
      id: "ptero",
      name: "Птеранодон",
      stars: 3,
      body: "#8e44ad",
      accent: "#bdc3c7",
      baseShield: 85,
      baseBite: 22,
      baseRocket: 0.18,
    },
    {
      id: "parasau",
      name: "Паразауролоф",
      stars: 2,
      body: "#2980b9",
      accent: "#5dade2",
      baseShield: 95,
      baseBite: 20,
      baseRocket: 0.16,
    },
    {
      id: "stego",
      name: "Стегозавр",
      stars: 1,
      body: "#f1c40f",
      accent: "#7f8c8d",
      baseShield: 120,
      baseBite: 18,
      baseRocket: 0.24,
    },
  ];

  const WEAPONS = [
    {
      id: "blaster",
      name: "Бластер",
      damageMult: 1.0,
      cooldown: 0.2,
      bulletSpeed: 720,
      bulletR: 4,
      pattern: "single",
    },
    {
      id: "shotgun",
      name: "Дробовик",
      damageMult: 0.55,
      cooldown: 0.38,
      bulletSpeed: 620,
      bulletR: 3,
      pattern: "spread",
      pellets: 3,
    },
    {
      id: "rail",
      name: "Рельса",
      damageMult: 2.2,
      cooldown: 0.55,
      bulletSpeed: 1100,
      bulletR: 6,
      pattern: "single",
      pierce: true,
    },
  ];

  const SKILLS = [
    { id: "lightning", name: "Молния", cooldown: 8, kind: "cone" },
    { id: "shield", name: "Щит-импульс", cooldown: 10, kind: "shield" },
    { id: "rocket", name: "Ракета", cooldown: 7, kind: "rocket" },
  ];

  const ENEMY_TYPES = [
    {
      id: "grunt",
      name: "Грант",
      hp: 30,
      speed: 70,
      w: 34,
      h: 38,
      contactDamage: 8,
      behavior: "chase",
      spawnWeight: 10,
      minProgress: 0,
      coinValue: 15,
    },
    {
      id: "rusher",
      name: "Рывок",
      hp: 22,
      speed: 110,
      w: 30,
      h: 34,
      contactDamage: 10,
      behavior: "charge",
      spawnWeight: 6,
      minProgress: 0.15,
      coinValue: 18,
    },
    {
      id: "strafer",
      name: "Зигзаг",
      hp: 28,
      speed: 85,
      w: 32,
      h: 36,
      contactDamage: 7,
      behavior: "strafe",
      spawnWeight: 5,
      minProgress: 0.2,
      coinValue: 16,
    },
    {
      id: "diver",
      name: "Пикировщик",
      hp: 20,
      speed: 95,
      w: 36,
      h: 28,
      contactDamage: 9,
      behavior: "dive",
      spawnWeight: 4,
      minProgress: 0.25,
      coinValue: 20,
    },
    {
      id: "spitter",
      name: "Плевун",
      hp: 35,
      speed: 45,
      w: 36,
      h: 40,
      contactDamage: 6,
      behavior: "ranged",
      spawnWeight: 3,
      minProgress: 0.35,
      coinValue: 22,
    },
    {
      id: "tank",
      name: "Танк",
      hp: 90,
      speed: 40,
      w: 48,
      h: 50,
      contactDamage: 14,
      behavior: "chase",
      spawnWeight: 2,
      minProgress: 0.45,
      coinValue: 35,
    },
    {
      id: "frost_raptor",
      name: "Ледяной раптор",
      hp: 32,
      speed: 75,
      w: 34,
      h: 38,
      contactDamage: 7,
      behavior: "frost_ranged",
      spawnWeight: 5,
      minProgress: 0.2,
      coinValue: 24,
    },
    {
      id: "spinosaur",
      name: "Спинозавр",
      hp: 55,
      speed: 65,
      w: 42,
      h: 44,
      contactDamage: 12,
      behavior: "burrow",
      spawnWeight: 4,
      minProgress: 0.25,
      coinValue: 28,
    },
    {
      id: "drone_ptero",
      name: "Дрон-птеро",
      hp: 24,
      speed: 100,
      w: 32,
      h: 28,
      contactDamage: 5,
      behavior: "swarm_fly",
      spawnWeight: 4,
      minProgress: 0.2,
      coinValue: 22,
      spawnPack: 3,
    },
  ];

  const EVOLUTION_PER_UPGRADE = 12;
  const UPGRADE_COST_BASE = 500;
  const UPGRADE_COST_MULT = 1.35;
  const LEVEL_DURATION = 75;
  const WORLD_LENGTH = 12000;
  const START_COINS = 500;
  const BOSS_SPAWN_PROGRESS = 0.92;
  const BOSS_KILL_BONUS = 350;
  const SURVIVAL_TIER_SEC = 30;
  const SURVIVAL_WAVE_SEC = 45;
  const SURVIVAL_MINI_BOSS_EVERY = 5;

  // One upgrade click ≈ 8–12% to its target stat only (armor/damage/rate/weapon/skill).
  const STAT_UPGRADE_PCT = 0.1;
  const RATE_UPGRADE_STEP = 0.01;
  const WEAPON_DMG_PER_LVL = 0.1;
  const WEAPON_CD_PER_LVL = 0.03;
  const CHAR_LEVEL_BONUS = 0.05;

  // Reference DPS/TTK for tuning (blaster L0 trex ≈ bite 25 / cd 0.2 → ~125 dps raw).
  const BALANCE = {
    early: {
      playerDps: 110,
      ttkGrunt: 0.35,
      note: "wave1 blaster L0",
    },
    mid: {
      playerDps: 150,
      ttkRusher: 0.45,
      ttkSpitter: 0.75,
      note: "wave2–3 modest upgrades",
    },
    late: {
      playerDps: 210,
      ttkTank: 1.3,
      ttkBossChunk: 5,
      note: "wave4 / boss ~900hp",
    },
    upgradeStep: STAT_UPGRADE_PCT,
  };

  const BOSSES = [
    {
      id: "tyrant",
      name: "Тиран",
      spriteKey: "enemy_tyrant",
      hp: 900,
      speed: 55,
      w: 110,
      h: 100,
      contactDamage: 18,
      coinValue: 120,
      spitDamage: 14,
      spitCooldown: 1.6,
      phases: [
        { hpBelow: 1.0, speedMult: 1.0, attacks: ["chase", "spit"] },
        {
          hpBelow: 0.7,
          speedMult: 1.1,
          attacks: ["chase", "spit", "screen_dash", "summon_grunt"],
        },
        {
          hpBelow: 0.35,
          speedMult: 1.25,
          attacks: ["spit", "screen_dash", "summon_grunt"],
        },
      ],
    },
    {
      id: "canyon_warden",
      name: "Страж ущелья",
      spriteKey: "enemy_tyrant",
      hp: 880,
      speed: 52,
      w: 105,
      h: 98,
      contactDamage: 17,
      coinValue: 115,
      spitDamage: 13,
      spitCooldown: 1.5,
      phases: [
        { hpBelow: 1.0, speedMult: 1.0, attacks: ["chase", "spit"] },
        { hpBelow: 0.7, speedMult: 1.05, attacks: ["chase", "spit"] },
        { hpBelow: 0.35, speedMult: 1.1, attacks: ["chase", "spit"] },
      ],
    },
    {
      id: "triceratops",
      name: "Трицератопс",
      spriteKey: "enemy_tank",
      hp: 950,
      speed: 48,
      w: 120,
      h: 95,
      contactDamage: 20,
      coinValue: 130,
      spitDamage: 12,
      spitCooldown: 1.7,
      phases: [
        { hpBelow: 1.0, speedMult: 1.0, attacks: ["chase", "spit"] },
        { hpBelow: 0.7, speedMult: 1.08, attacks: ["chase", "charge_ram", "spit"] },
        {
          hpBelow: 0.35,
          speedMult: 1.18,
          attacks: ["charge_ram", "earthquake", "spit"],
        },
      ],
    },
    {
      id: "ice_mammoth",
      name: "Ледяной мамонт-мех",
      spriteKey: "enemy_tank",
      hp: 980,
      speed: 42,
      w: 125,
      h: 105,
      contactDamage: 19,
      coinValue: 135,
      spitDamage: 11,
      spitCooldown: 1.8,
      phases: [
        { hpBelow: 1.0, speedMult: 1.0, attacks: ["chase", "spit"] },
        { hpBelow: 0.7, speedMult: 1.05, attacks: ["chase", "icicle_fan"] },
        {
          hpBelow: 0.35,
          speedMult: 1.12,
          attacks: ["icicle_fan", "ice_wall", "chase"],
        },
      ],
    },
    {
      id: "spinosaur_king",
      name: "Спинозавр",
      spriteKey: "enemy_spinosaur",
      hp: 960,
      speed: 50,
      w: 115,
      h: 100,
      contactDamage: 18,
      coinValue: 132,
      spitDamage: 13,
      spitCooldown: 1.55,
      phases: [
        { hpBelow: 1.0, speedMult: 1.0, attacks: ["chase", "spit"] },
        { hpBelow: 0.7, speedMult: 1.1, attacks: ["chase", "burrow_dive"] },
        {
          hpBelow: 0.35,
          speedMult: 1.2,
          attacks: ["burrow_dive", "ground_wave", "spit"],
        },
      ],
    },
    {
      id: "factory_guard",
      name: "Мех-босс",
      spriteKey: "enemy_tyrant",
      hp: 1000,
      speed: 50,
      w: 112,
      h: 102,
      contactDamage: 19,
      coinValue: 140,
      spitDamage: 14,
      spitCooldown: 1.5,
      phases: [
        { hpBelow: 1.0, speedMult: 1.0, attacks: ["chase", "spit"] },
        { hpBelow: 0.7, speedMult: 1.05, attacks: ["chase", "spit"] },
        { hpBelow: 0.35, speedMult: 1.1, attacks: ["chase", "spit"] },
      ],
    },
    {
      id: "mech_rex",
      name: "Мех-Рекс",
      spriteKey: "enemy_tyrant",
      hp: 1100,
      speed: 58,
      w: 118,
      h: 108,
      contactDamage: 22,
      coinValue: 160,
      spitDamage: 15,
      spitCooldown: 1.45,
      phases: [
        { hpBelow: 1.0, speedMult: 1.0, attacks: ["chase", "spit"] },
        {
          hpBelow: 0.7,
          speedMult: 1.12,
          attacks: ["chase", "laser_beam", "rocket_salvo"],
        },
        {
          hpBelow: 0.35,
          speedMult: 1.25,
          attacks: ["shield", "laser_beam", "rocket_salvo", "spit"],
        },
      ],
    },
  ];

  function getBossById(id) {
    for (let i = 0; i < BOSSES.length; i++) {
      if (BOSSES[i].id === id) return BOSSES[i];
    }
    return BOSSES[0];
  }

  function getBossPhase(bossDef, ratio) {
    const phases =
      bossDef && bossDef.phases
        ? bossDef.phases
        : [{ hpBelow: 1, speedMult: 1, attacks: ["chase"] }];
    let best = phases[0];
    let bestBelow = 999;
    const r = Math.max(0, Math.min(1, ratio || 0));
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      if (r <= p.hpBelow && p.hpBelow < bestBelow) {
        best = p;
        bestBelow = p.hpBelow;
      }
    }
    return best;
  }

  function getChapterBossDef(chapterDef) {
    const base = getBossById(chapterDef.bossId || "tyrant");
    return {
      id: base.id,
      name: base.name,
      spriteKey: base.spriteKey,
      hp: base.hp,
      speed: base.speed,
      w: base.w,
      h: base.h,
      contactDamage: base.contactDamage,
      coinValue: base.coinValue,
      spitDamage: base.spitDamage,
      spitCooldown: base.spitCooldown,
      phases: base.phases,
      bossHpMult:
        chapterDef.bossHpMult != null ? chapterDef.bossHpMult : 1,
      bossDmgMult:
        chapterDef.bossDmgMult != null ? chapterDef.bossDmgMult : 1,
    };
  }

  const BOSS = getBossById("tyrant");

  const WEAPON_TIPS = {
    blaster: "Универсален на старте волн",
    shotgun: "Силён против rushers и толпы",
    rail: "Силён против tank / spitter / босса",
  };

  const SKILL_TIPS = {
    lightning: "Конус по прицелу",
    shield: "Неуязвимость + хил",
    rocket: "AoE в точку курсора",
  };

  const STAT_FIELDS = {
    armor: "armorLevel",
    damage: "damageLevel",
    rate: "rateLevel",
  };

  const BIOMES = [
    {
      id: "plains",
      name: "Равнины",
      bgKey: "bg_battle",
      skyTint: "rgba(93, 173, 226, 0.12)",
      ground: "rgba(90, 120, 90, 0.7)",
      groundEdge: "#7d9b6a",
      ambient: "wind",
      cloudColor: "rgba(255,255,255,0.55)",
      hazard: null,
    },
    {
      id: "falls",
      name: "Ущелье",
      bgKey: "bg_falls",
      skyTint: "rgba(100, 200, 220, 0.18)",
      ground: "rgba(90, 100, 110, 0.75)",
      groundEdge: "#85929e",
      ambient: "water",
      cloudColor: "rgba(200, 230, 240, 0.5)",
      hazard: null,
    },
    {
      id: "volcano",
      name: "Вулкан",
      bgKey: "bg_volcano",
      skyTint: "rgba(230, 80, 40, 0.22)",
      ground: "rgba(60, 30, 30, 0.8)",
      groundEdge: "#922b21",
      ambient: "rumble",
      cloudColor: "rgba(80, 70, 70, 0.45)",
      hazard: {
        id: "lava_rain",
        interval: 2.4,
        warnTime: 1.15,
        radius: 38,
        damage: 14,
        fallSpeed: 520,
      },
    },
    {
      id: "glacier",
      name: "Ледник",
      bgKey: "bg_glacier",
      skyTint: "rgba(180, 220, 255, 0.2)",
      ground: "rgba(200, 220, 235, 0.75)",
      groundEdge: "#a9cce3",
      ambient: "ice",
      cloudColor: "rgba(240, 248, 255, 0.55)",
      hazard: {
        id: "ice_slide",
        slideGain: 0.22,
        slideDecay: 0.988,
        icicleInterval: 2.8,
        icicleWarn: 0.9,
        icicleRadius: 22,
        icicleDamage: 10,
        icicleFallSpeed: 680,
      },
    },
    {
      id: "swamp",
      name: "Болото",
      bgKey: "bg_swamp",
      skyTint: "rgba(60, 90, 50, 0.25)",
      ground: "rgba(55, 70, 45, 0.8)",
      groundEdge: "#566573",
      ambient: "swamp",
      cloudColor: "rgba(120, 130, 110, 0.45)",
      hazard: {
        id: "swamp",
        poolCount: 12,
        poolW: 90,
        poolH: 14,
        dotDps: 6,
        slowMult: 0.55,
        fogAlpha: 0.42,
        fogClearR: 220,
      },
    },
    {
      id: "factory",
      name: "Завод мехов",
      bgKey: "bg_factory",
      skyTint: "rgba(80, 90, 100, 0.18)",
      ground: "rgba(70, 75, 80, 0.85)",
      groundEdge: "#5d6d7e",
      ambient: "factory",
      cloudColor: "rgba(100, 105, 110, 0.35)",
      hazard: {
        id: "factory",
        conveyorVx: 95,
        turretRange: 520,
        turretWarn: 0.35,
        turretCd: 2.2,
        turretDamage: 12,
      },
    },
    {
      id: "crater",
      name: "Метеоритный кратер",
      bgKey: "bg_crater",
      skyTint: "rgba(40, 30, 60, 0.28)",
      ground: "rgba(50, 45, 55, 0.82)",
      groundEdge: "#4a235a",
      ambient: "space",
      cloudColor: "rgba(60, 50, 70, 0.4)",
      hazard: {
        id: "crater",
        gravityMult: 0.65,
        jumpMult: 1.08,
        meteorInterval: 3.1,
        meteorWarn: 1.2,
        meteorRadius: 48,
        meteorDamage: 16,
        meteorFallSpeed: 480,
      },
    },
  ];

  const BIOME_SPAWN_BIAS = {
    plains: { grunt: 1.15 },
    volcano: { rusher: 1.6, tank: 1.3, strafer: 0.8 },
    falls: { spitter: 1.4, diver: 1.3, rusher: 0.85 },
    glacier: { frost_raptor: 1.5, rusher: 0.9 },
    swamp: { spinosaur: 1.45, spitter: 1.1 },
    factory: { drone_ptero: 1.5, tank: 1.15 },
    crater: { rusher: 1.2, tank: 1.2, spitter: 1.15 },
  };

  const WAVES = [
    {
      index: 0,
      minProgress: 0,
      maxProgress: 0.25,
      title: "Волна 1",
      hpMult: 1.0,
      speedMult: 1.0,
      maxAlive: 8,
      baseInterval: 1.15,
      mix: { grunt: 12, rusher: 2 },
    },
    {
      index: 1,
      minProgress: 0.25,
      maxProgress: 0.6,
      title: "Волна 2",
      hpMult: 1.25,
      speedMult: 1.1,
      maxAlive: 12,
      baseInterval: 0.95,
      mix: { grunt: 8, rusher: 6, strafer: 5, spitter: 2 },
    },
    {
      index: 2,
      minProgress: 0.6,
      maxProgress: 0.9,
      title: "Волна 3",
      hpMult: 1.55,
      speedMult: 1.2,
      maxAlive: 14,
      baseInterval: 0.75,
      mix: { grunt: 5, rusher: 7, strafer: 6, spitter: 5, diver: 4, tank: 2 },
    },
    {
      index: 3,
      minProgress: 0.9,
      maxProgress: 1.01,
      title: "Финал",
      hpMult: 1.9,
      speedMult: 1.35,
      maxAlive: 16,
      baseInterval: 0.55,
      mix: { rusher: 4, strafer: 3, spitter: 8, tank: 6, diver: 3 },
    },
  ];

  const DIFFICULTIES = [
    {
      id: "easy",
      label: "Лёгкий",
      enemyHpMult: 0.75,
      enemyDmgMult: 0.7,
      coinMult: 0.8,
      spawnMult: 1,
      advancesProgress: true,
    },
    {
      id: "normal",
      label: "Норма",
      enemyHpMult: 1,
      enemyDmgMult: 1,
      coinMult: 1,
      spawnMult: 1,
      advancesProgress: true,
    },
    {
      id: "nightmare",
      label: "Кошмар",
      enemyHpMult: 1.6,
      enemyDmgMult: 1.4,
      coinMult: 1.8,
      spawnMult: 0.77,
      advancesProgress: false,
      modifiers: { fastSpeedMult: 1.22, shieldChance: 0.28 },
    },
  ];

  function getDifficulty(id) {
    for (let i = 0; i < DIFFICULTIES.length; i++) {
      if (DIFFICULTIES[i].id === id) return DIFFICULTIES[i];
    }
    return DIFFICULTIES[1];
  }

  const LEVELS_PER_CHAPTER = 5;

  const CHAPTERS = [
    {
      id: 1,
      biomeId: "plains",
      name: "Равнины",
      enemies: ["grunt", "rusher", "strafer"],
      bossId: "tyrant",
      bossHpMult: 1.0,
      bossDmgMult: 1.0,
    },
    {
      id: 2,
      biomeId: "falls",
      name: "Ущелье",
      enemies: ["grunt", "rusher", "strafer", "spitter", "diver"],
      bossId: "canyon_warden",
      bossHpMult: 1.1,
      bossDmgMult: 1.05,
    },
    {
      id: 3,
      biomeId: "volcano",
      name: "Вулкан",
      enemies: ["grunt", "rusher", "strafer", "spitter", "diver", "tank"],
      bossId: "triceratops",
      bossHpMult: 1.2,
      bossDmgMult: 1.1,
    },
    {
      id: 4,
      biomeId: "glacier",
      name: "Ледник",
      enemies: [
        "grunt",
        "rusher",
        "strafer",
        "spitter",
        "diver",
        "tank",
        "frost_raptor",
      ],
      bossId: "ice_mammoth",
      bossHpMult: 1.25,
      bossDmgMult: 1.12,
    },
    {
      id: 5,
      biomeId: "swamp",
      name: "Болото",
      enemies: [
        "grunt",
        "rusher",
        "strafer",
        "spitter",
        "diver",
        "tank",
        "spinosaur",
      ],
      bossId: "spinosaur_king",
      bossHpMult: 1.3,
      bossDmgMult: 1.15,
    },
    {
      id: 6,
      biomeId: "factory",
      name: "Завод мехов",
      enemies: [
        "grunt",
        "rusher",
        "strafer",
        "spitter",
        "diver",
        "tank",
        "drone_ptero",
      ],
      bossId: "factory_guard",
      bossHpMult: 1.35,
      bossDmgMult: 1.18,
    },
    {
      id: 7,
      biomeId: "crater",
      name: "Метеоритный кратер",
      enemies: [
        "grunt",
        "rusher",
        "strafer",
        "spitter",
        "diver",
        "tank",
        "frost_raptor",
        "spinosaur",
        "drone_ptero",
      ],
      eliteOnly: true,
      bossId: "mech_rex",
      bossHpMult: 1.45,
      bossDmgMult: 1.22,
    },
  ];

  const ROMAN = ["", "", " II", " III", " IV", " V", " VI", " VII", " VIII", " IX", " X"];

  function getBiome(levelsCleared) {
    const n = Math.max(0, levelsCleared | 0);
    return BIOMES[n % BIOMES.length];
  }

  function getBiomeById(id) {
    for (let i = 0; i < BIOMES.length; i++) {
      if (BIOMES[i].id === id) return BIOMES[i];
    }
    return BIOMES[0];
  }

  function levelKey(chapter, level) {
    return chapter + "-" + level;
  }

  function levelToGlobal(chapter, level) {
    return (chapter - 1) * LEVELS_PER_CHAPTER + (level - 1);
  }

  function globalToLevel(g) {
    const n = Math.max(0, g | 0);
    return {
      chapter: Math.floor(n / LEVELS_PER_CHAPTER) + 1,
      level: (n % LEVELS_PER_CHAPTER) + 1,
    };
  }

  function getLevelConfig(chapter, level) {
    const ch = Math.max(1, chapter | 0);
    const lv = Math.max(1, Math.min(LEVELS_PER_CHAPTER, level | 0));
    const cycle = Math.floor((ch - 1) / CHAPTERS.length);
    const def = CHAPTERS[(ch - 1) % CHAPTERS.length];
    const suffix =
      ROMAN[cycle + 1] !== undefined ? ROMAN[cycle + 1] : " " + (cycle + 1);
    const chapterName = def.name + suffix;
    const globalLevel = levelToGlobal(ch, lv);
    const hasBoss = lv === LEVELS_PER_CHAPTER;
    const duration = hasBoss ? LEVEL_DURATION : 40 + lv * 4;
    return {
      chapter: ch,
      level: lv,
      globalLevel: globalLevel,
      key: levelKey(ch, lv),
      title: chapterName + " · " + ch + "-" + lv,
      chapterName: chapterName,
      biome: getBiomeById(def.biomeId),
      enemies: def.enemies,
      eliteOnly: !!def.eliteOnly,
      bossDef: hasBoss ? getChapterBossDef(def) : null,
      hasBoss: hasBoss,
      hpMult: 1 + 0.15 * globalLevel,
      dmgMult: 1 + 0.08 * globalLevel,
      coinMult: 1 + 0.1 * globalLevel,
      duration: duration,
      targetTime: Math.round(duration * 0.6),
      maxWaveIndex: Math.min(WAVES.length - 1, lv),
      mode: "campaign",
    };
  }

  function survivalEnemyPool() {
    const set = Object.create(null);
    for (let i = 0; i < CHAPTERS.length; i++) {
      const list = CHAPTERS[i].enemies || [];
      for (let j = 0; j < list.length; j++) set[list[j]] = true;
    }
    return Object.keys(set);
  }

  function getSurvivalLevelConfig() {
    const biome = BIOMES[Math.floor(Math.random() * BIOMES.length)];
    const name = "Выживание · " + biome.name;
    return {
      mode: "survival",
      chapter: 0,
      level: 0,
      globalLevel: 0,
      key: "survival",
      title: name,
      chapterName: "Выживание",
      biome: biome,
      enemies: survivalEnemyPool(),
      eliteOnly: false,
      bossDef: null,
      hasBoss: false,
      hpMult: 1,
      dmgMult: 1,
      coinMult: 1,
      duration: 9999,
      targetTime: 0,
      maxWaveIndex: WAVES.length - 1,
    };
  }

  /** Short levels compress progress so their last allowed wave still arrives. */
  function getWaveForLevel(levelProgress, cfg) {
    if (!cfg) return getWave(levelProgress);
    const p = Math.max(0, Math.min(1, levelProgress || 0));
    if (cfg.maxWaveIndex >= WAVES.length - 1) return getWave(p);
    const finalStart = WAVES[cfg.maxWaveIndex].minProgress;
    return getWave(Math.min(finalStart, (p / 0.75) * finalStart));
  }

  function isFinalWave(wave, cfg) {
    const last = cfg ? cfg.maxWaveIndex : WAVES.length - 1;
    return !!wave && wave.index === last;
  }

  function getWave(levelProgress) {
    const p = Math.max(0, Math.min(1, levelProgress || 0));
    for (let i = 0; i < WAVES.length; i++) {
      if (p < WAVES[i].maxProgress) return WAVES[i];
    }
    return WAVES[WAVES.length - 1];
  }

  function getSpawnWeight(typeId, wave, biomeId, allowed) {
    if (!wave || !wave.mix || wave.mix[typeId] == null) return 0;
    if (allowed && allowed.indexOf(typeId) < 0) return 0;
    let w = wave.mix[typeId];
    const bias = BIOME_SPAWN_BIAS[biomeId || "plains"];
    if (bias && bias[typeId]) w *= bias[typeId];
    return w;
  }

  function getWeapon(id) {
    for (let i = 0; i < WEAPONS.length; i++) {
      if (WEAPONS[i].id === id) return WEAPONS[i];
    }
    return WEAPONS[0];
  }

  function weaponIndex(id) {
    for (let i = 0; i < WEAPONS.length; i++) {
      if (WEAPONS[i].id === id) return i;
    }
    return 0;
  }

  function cycleWeaponId(id, dir) {
    const i = weaponIndex(id);
    const n = WEAPONS.length;
    return WEAPONS[(i + dir + n) % n].id;
  }

  function getSkill(id) {
    for (let i = 0; i < SKILLS.length; i++) {
      if (SKILLS[i].id === id) return SKILLS[i];
    }
    return SKILLS[0];
  }

  function skillIndex(id) {
    for (let i = 0; i < SKILLS.length; i++) {
      if (SKILLS[i].id === id) return i;
    }
    return 0;
  }

  function cycleSkillId(id, dir) {
    const i = skillIndex(id);
    const n = SKILLS.length;
    return SKILLS[(i + dir + n) % n].id;
  }

  function skillUpgradeCost(save) {
    const id = save.selectedSkillId || "lightning";
    const levels = save.skillLevels || {};
    const lvl = levels[id] || 0;
    return Math.floor(550 * Math.pow(1.38, lvl));
  }

  function getSkillStats(save) {
    const base = getSkill(save.selectedSkillId || "lightning");
    const levels = save.skillLevels || {};
    const lvl = levels[base.id] || 0;
    const stats = {
      id: base.id,
      name: base.name,
      kind: base.kind,
      level: lvl,
      cooldown: base.cooldown,
      damage: 80,
      range: 280,
      duration: 1.2,
      heal: 8,
      radius: 70,
      speed: 520,
    };
    if (base.kind === "cone") {
      stats.damage = Math.floor(150 * (1 + lvl * 0.12));
      stats.range = 560 + lvl * 20;
      stats.cooldown = Math.max(3.5, 6 - lvl * 0.25);
      stats.halfAngle = Math.min(1.25, 1.05 + lvl * 0.02);
    } else if (base.kind === "shield") {
      stats.duration = 1.2 + lvl * 0.15;
      stats.heal = Math.floor(8 + lvl * 3);
      stats.cooldown = Math.max(5, 10 - lvl * 0.3);
    } else if (base.kind === "rocket") {
      stats.damage = Math.floor(120 * (1 + lvl * 0.1));
      stats.radius = 70 + lvl * 8;
      stats.speed = 520;
      stats.cooldown = Math.max(3.5, 7 - lvl * 0.2);
    }
    return stats;
  }

  function getEnemyType(id) {
    for (let i = 0; i < ENEMY_TYPES.length; i++) {
      if (ENEMY_TYPES[i].id === id) return ENEMY_TYPES[i];
    }
    return ENEMY_TYPES[0];
  }

  function formatStat(n) {
    if (n >= 1000) return (n / 1000).toFixed(2) + "K";
    return String(Math.floor(n));
  }

  function dinoStatLevels(prog) {
    return (
      (prog.armorLevel || 0) +
      (prog.damageLevel || 0) +
      (prog.rateLevel || 0)
    );
  }

  function totalUpgrades(save) {
    let t = 0;
    for (let i = 0; i < save.dinos.length; i++) {
      t += dinoStatLevels(save.dinos[i]);
    }
    return t;
  }

  function statCost(save, stat) {
    const field = STAT_FIELDS[stat];
    const prog = save.dinos[save.selectedIndex];
    const local = field ? prog[field] || 0 : 0;
    const globalT = totalUpgrades(save);
    return Math.floor(
      UPGRADE_COST_BASE *
        Math.pow(UPGRADE_COST_MULT, globalT) *
        0.9 *
        (1 + local * 0.05)
    );
  }

  function upgradeCost(save, stat) {
    if (stat) return statCost(save, stat);
    return Math.floor(
      UPGRADE_COST_BASE * Math.pow(UPGRADE_COST_MULT, totalUpgrades(save)) * 0.9
    );
  }

  function getDinoProgress(save, index) {
    const dino = DINOS[index];
    const prog = save.dinos[index];
    const lvl = prog.characterLevel || 1;
    const armor = prog.armorLevel || 0;
    const damage = prog.damageLevel || 0;
    const rate = prog.rateLevel || 0;
    const starMult = 1 + (dino.stars - 1) * 0.08;
    // characterLevel: light shared bonus; armor/damage/rate each only their own stat
    const lvlBonus = (lvl - 1) * CHAR_LEVEL_BONUS;
    const shieldMult = (1 + armor * STAT_UPGRADE_PCT + lvlBonus) * starMult;
    const biteMult = (1 + damage * STAT_UPGRADE_PCT + lvlBonus) * starMult;
    const rocket = Math.max(
      0.08,
      dino.baseRocket - rate * RATE_UPGRADE_STEP - (lvl - 1) * 0.003
    );
    return {
      shield: Math.floor(dino.baseShield * shieldMult),
      bite: Math.floor(dino.baseBite * biteMult),
      rocket: rocket,
      rateBonus: rate * RATE_UPGRADE_STEP + (lvl - 1) * 0.003,
      characterLevel: lvl,
      armorLevel: armor,
      damageLevel: damage,
      rateLevel: rate,
      evolution: prog.evolution || 0,
    };
  }

  function weaponUpgradeCost(save) {
    const id = save.selectedWeaponId || "blaster";
    const levels = save.weaponLevels || {};
    const wLvl = levels[id] || 0;
    return Math.floor(600 * Math.pow(1.4, wLvl));
  }

  function getCombatStats(save) {
    const idx = save.selectedIndex;
    const dino = DINOS[idx];
    const p = getDinoProgress(save, idx);
    const weapon = getWeapon(save.selectedWeaponId || "blaster");
    const levels = save.weaponLevels || {};
    const wLvl = levels[weapon.id] || 0;
    const dmgScale = 1 + wLvl * WEAPON_DMG_PER_LVL;
    const cdScale = 1 - wLvl * WEAPON_CD_PER_LVL;
    const bulletCooldown = Math.max(
      0.08,
      (weapon.cooldown - p.rateBonus) * cdScale
    );
    let pelletCount = 1;
    if (weapon.pattern === "spread") {
      pelletCount = Math.min(7, (weapon.pellets || 3) + Math.floor(wLvl / 2));
    }
    let pierceLeft = 0;
    if (weapon.id === "rail" || weapon.pierce) {
      pierceLeft = Math.min(4, 1 + Math.floor(wLvl / 3));
    }
    return {
      dinoIndex: idx,
      dinoId: dino.id,
      maxHp: p.shield,
      bulletDamage: Math.floor(p.bite * weapon.damageMult * dmgScale),
      bulletCooldown: bulletCooldown,
      bulletSpeed: weapon.bulletSpeed,
      bulletR: weapon.bulletR,
      weaponId: weapon.id,
      weapon: weapon,
      weaponLevel: wLvl,
      pelletCount: pelletCount,
      pierceLeft: pierceLeft,
      playerSpeed: 280 + idx * 10,
      evoScale: 1 + Math.min(0.2, (p.characterLevel - 1) * 0.03),
    };
  }

  function getWeaponTip(id) {
    return WEAPON_TIPS[id] || WEAPON_TIPS.blaster;
  }

  function getSkillTip(id) {
    return SKILL_TIPS[id] || SKILL_TIPS.lightning;
  }

  global.DinoData = {
    DINOS,
    WEAPONS,
    SKILLS,
    ENEMY_TYPES,
    BIOMES,
    WAVES,
    BIOME_SPAWN_BIAS,
    STAT_FIELDS,
    EVOLUTION_PER_UPGRADE,
    LEVEL_DURATION,
    WORLD_LENGTH,
    START_COINS,
    BOSSES,
    BOSS,
    getBossById,
    getBossPhase,
    getChapterBossDef,
    BOSS_SPAWN_PROGRESS,
    BOSS_KILL_BONUS,
    SURVIVAL_TIER_SEC,
    SURVIVAL_WAVE_SEC,
    SURVIVAL_MINI_BOSS_EVERY,
    getSurvivalLevelConfig,
    BALANCE,
    STAT_UPGRADE_PCT,
    RATE_UPGRADE_STEP,
    WEAPON_DMG_PER_LVL,
    WEAPON_CD_PER_LVL,
    WEAPON_TIPS,
    SKILL_TIPS,
    formatStat,
    totalUpgrades,
    upgradeCost,
    statCost,
    weaponUpgradeCost,
    getDinoProgress,
    getCombatStats,
    getBiome,
    getBiomeById,
    DIFFICULTIES,
    getDifficulty,
    LEVELS_PER_CHAPTER,
    CHAPTERS,
    levelKey,
    levelToGlobal,
    globalToLevel,
    getLevelConfig,
    getWaveForLevel,
    isFinalWave,
    getWave,
    getSpawnWeight,
    getWeapon,
    getEnemyType,
    weaponIndex,
    cycleWeaponId,
    getSkill,
    skillIndex,
    cycleSkillId,
    skillUpgradeCost,
    getSkillStats,
    getWeaponTip,
    getSkillTip,
  };
})(window);
