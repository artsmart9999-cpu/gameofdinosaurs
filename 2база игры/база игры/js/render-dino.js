(function (global) {
  "use strict";

  const WEAPON_MOUNTS = {
    blaster: { fx: 0.32, fy: 0.0 },
    shotgun: { fx: -0.04, fy: -0.36 },
    rail: { fx: -0.42, fy: 0.1 },
  };

  function drawWeaponIcon(ctx, id, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#f4f7fb";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = Math.max(1.5, size * 0.06);
    if (id === "shotgun") {
      ctx.fillRect(size * 0.06, size * 0.3, size * 0.88, size * 0.36);
      ctx.strokeRect(size * 0.06, size * 0.3, size * 0.88, size * 0.36);
      ctx.fillStyle = "#5d6d7e";
      ctx.fillRect(size * 0.16, size * 0.38, size * 0.2, size * 0.2);
      ctx.fillRect(size * 0.42, size * 0.38, size * 0.2, size * 0.2);
    } else if (id === "rail") {
      ctx.fillStyle = "#d5dbe3";
      ctx.fillRect(size * 0.02, size * 0.42, size * 0.96, size * 0.14);
      ctx.strokeRect(size * 0.02, size * 0.42, size * 0.96, size * 0.14);
      ctx.fillStyle = "#ff4d4d";
      ctx.fillRect(size * 0.1, size * 0.46, size * 0.76, size * 0.06);
    } else {
      ctx.fillRect(size * 0.06, size * 0.38, size * 0.58, size * 0.24);
      ctx.beginPath();
      ctx.moveTo(size * 0.6, size * 0.28);
      ctx.lineTo(size * 0.96, size * 0.5);
      ctx.lineTo(size * 0.6, size * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function mountAngle(id, aim) {
    const a = aim == null ? -0.3 : aim;
    if (id === "shotgun") return -0.45 + a * 0.12;
    if (id === "rail") return Math.PI + 0.15;
    return a;
  }

  function drawMountedWeapon(ctx, weaponId, ox, oy, bodyH, aimAngle) {
    const id = WEAPON_MOUNTS[weaponId] ? weaponId : "blaster";
    const m = WEAPON_MOUNTS[id];
    const size = bodyH * 0.32;
    ctx.save();
    ctx.translate(ox + m.fx * bodyH, oy + m.fy * bodyH);
    ctx.rotate(mountAngle(id, aimAngle));
    drawWeaponIcon(ctx, id, 0, -size * 0.5, size);
    ctx.restore();
  }

  function drawTrex(ctx, x, y, s, body, accent, aimAngle) {
    const w = 44 * s;
    const h = 36 * s;
    ctx.fillStyle = body;
    ctx.fillRect(x - w * 0.3, y - h * 0.5, w * 0.85, h);
    ctx.fillRect(x + w * 0.35, y - h * 0.35, w * 0.45, h * 0.55);
    ctx.fillStyle = accent;
    ctx.fillRect(x + w * 0.55, y - h * 0.25, w * 0.2, h * 0.15);
    ctx.fillStyle = "#5dade2";
    ctx.beginPath();
    ctx.arc(x + w * 0.62, y - h * 0.18, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPtero(ctx, x, y, s, body, accent, aimAngle) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(x - 40 * s, y);
    ctx.lineTo(x - 10 * s, y - 25 * s);
    ctx.lineTo(x + 15 * s, y - 5 * s);
    ctx.lineTo(x - 10 * s, y + 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 10 * s, y - 5 * s);
    ctx.lineTo(x + 45 * s, y - 30 * s);
    ctx.lineTo(x + 25 * s, y + 5 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(x, y, 14 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.arc(x + 8 * s, y - 2 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParasau(ctx, x, y, s, body, accent, aimAngle) {
    ctx.fillStyle = body;
    ctx.fillRect(x - 25 * s, y - 8 * s, 50 * s, 22 * s);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y - 10 * s);
    ctx.lineTo(x - 8 * s, y - 38 * s);
    ctx.lineTo(x + 8 * s, y - 38 * s);
    ctx.lineTo(x + 5 * s, y - 10 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#566573";
    ctx.fillRect(x - 28 * s, y + 8 * s, 10 * s, 14 * s);
    ctx.fillRect(x + 18 * s, y + 8 * s, 10 * s, 14 * s);
  }

  function drawStego(ctx, x, y, s, body, accent, aimAngle) {
    ctx.fillStyle = body;
    ctx.fillRect(x - 30 * s, y - 5 * s, 55 * s, 24 * s);
    ctx.fillStyle = accent;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x - 18 * s + i * 12 * s, y - 28 * s, 8 * s, 22 * s);
    }
    ctx.fillStyle = "#566573";
    ctx.fillRect(x - 32 * s, y + 10 * s, 12 * s, 16 * s);
    ctx.fillRect(x + 22 * s, y + 10 * s, 12 * s, 16 * s);
  }

  const drawers = {
    trex: drawTrex,
    ptero: drawPtero,
    parasau: drawParasau,
    stego: drawStego,
  };

  function drawPoseFlash(ctx, x, y, pose, w, h) {
    if (!pose || !pose.flash || pose.flash <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle =
      "rgba(255,255,255," + Math.min(0.85, pose.flash) + ")";
    ctx.fillRect(x - w * 0.5, y - h * 0.5, w, h);
    ctx.restore();
  }

  function drawSpriteHero(ctx, img, x, y, scale, aimAngle, pose) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const targetH = 180 * scale;
    const ratio = targetH / ih;
    const dw = iw * ratio;
    const dh = targetH;
    const lean = pose && pose.lean != null ? pose.lean : 0;
    const scaleY = pose && pose.scaleY != null ? pose.scaleY : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    ctx.scale(1, scaleY);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    const weaponId = pose && pose.weaponId ? pose.weaponId : "blaster";
    drawMountedWeapon(ctx, weaponId, 0, 0, dh, aimAngle);
    drawPoseFlash(ctx, 0, 0, pose, dw, dh);
    ctx.restore();
  }

  function drawMechDino(ctx, dinoId, x, y, scale, aimAngle, pose) {
    const dino = global.DinoData.DINOS.find((d) => d.id === dinoId);
    if (!dino) return;
    const s = scale == null ? 1 : scale;
    const angle = aimAngle == null ? -0.3 : aimAngle;
    const lean = pose && pose.lean != null ? pose.lean : 0;
    const scaleY = pose && pose.scaleY != null ? pose.scaleY : 1;
    const img =
      global.Assets && global.Assets.get
        ? global.Assets.get("hero_" + dinoId)
        : null;
    if (img) {
      drawSpriteHero(ctx, img, x, y, s, angle, pose);
      return;
    }
    const draw = drawers[dinoId] || drawTrex;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    ctx.scale(1, scaleY);
    ctx.translate(-x, -y);
    draw(ctx, x, y, s, dino.body, dino.accent, angle);
    const weaponId = pose && pose.weaponId ? pose.weaponId : "blaster";
    drawMountedWeapon(ctx, weaponId, x, y, 90 * s, angle);
    drawPoseFlash(ctx, x, y, pose, 110 * s, 90 * s);
    ctx.restore();
  }

  global.RenderDino = { drawMechDino, drawWeaponIcon };
})(window);
