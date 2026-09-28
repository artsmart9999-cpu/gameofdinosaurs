(function (global) {
  "use strict";

  const PANEL = "#475569";
  const PANEL_DARK = "#334155";
  const OUTLINE = "rgba(15, 23, 42, 0.85)";
  const EYE = "#a5b4fc";

  function drawMuzzle(ctx, cx, cy, angle, len) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(0, -3, len, 6);
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath();
    ctx.arc(len, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function wingPath(ctx, side, flapY) {
    const s = side;
    ctx.beginPath();
    ctx.moveTo(8 * s, 2);
    ctx.lineTo(38 * s, -22 * flapY);
    ctx.lineTo(42 * s, 4);
    ctx.lineTo(18 * s, 10);
    ctx.closePath();
  }

  function drawDroneBody(ctx, accent, bodyTint) {
    ctx.fillStyle = PANEL_DARK;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = bodyTint || PANEL;
    ctx.fillRect(-10, -4, 20, 8);

    ctx.fillStyle = accent || "#94a3b8";
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(22, -2);
    ctx.lineTo(10, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();

    ctx.fillStyle = EYE;
    ctx.beginPath();
    ctx.arc(14, -3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#eef2ff";
    ctx.beginPath();
    ctx.arc(15, -4, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWingLayer(ctx, side, accent, dim, flapY, front) {
    ctx.save();
    ctx.scale(1, flapY);
    ctx.fillStyle = dim ? accent + "99" : accent;
    if (dim) {
      ctx.globalAlpha *= 0.55;
    }
    wingPath(ctx, side, 1);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = front ? 1.5 : 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawShadow(ctx, footX, platformY, altFactor) {
    const t = altFactor == null ? 0.6 : altFactor;
    const rx = 28 * (0.35 + 0.65 * (1 - t * 0.5));
    const ry = 8 * (0.4 + 0.6 * (1 - t * 0.4));
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, " + (0.12 + 0.18 * t) + ")";
    ctx.beginPath();
    ctx.ellipse(footX, platformY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEngineGlow(ctx, cx, cy, pulse, muzzleFlash) {
    const base = 0.15 + 0.1 * pulse;
    const extra = muzzleFlash > 0 ? 0.25 : 0;
    const a = Math.min(0.55, base + extra);
    const gr = ctx.createRadialGradient(cx - 14, cy, 2, cx - 14, cy, 22);
    gr.addColorStop(0, "rgba(147, 197, 253, " + a + ")");
    gr.addColorStop(1, "rgba(59, 130, 246, 0)");
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(cx - 14, cy, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFlyingCore(ctx, opts) {
    const scale = opts.scale == null ? 1 : opts.scale;
    const wingPhase = opts.wingPhase || 0;
    const bank = opts.bank || 0;
    const accent = opts.accent || "#94a3b8";
    const bodyTint = opts.body || PANEL;
    const aimAngle = opts.aimAngle == null ? 0 : opts.aimAngle;
    const variant = opts.variant || "drone";
    const pulse = opts.enginePulse == null ? 0 : opts.enginePulse;
    const muzzleFlash = opts.muzzleFlash || 0;
    const faceLeft = opts.faceLeft !== false;

    const flapY =
      variant === "diver"
        ? 1.05
        : 0.78 + 0.27 * (0.5 + 0.5 * Math.sin(wingPhase));

    ctx.save();
    ctx.translate(opts.cx, opts.cy);
    ctx.scale(faceLeft ? -1 : 1, 1);
    ctx.rotate(bank);
    ctx.scale(scale, variant === "diver" ? scale * 1.12 : scale);

    drawEngineGlow(ctx, 0, 0, pulse, muzzleFlash);

    drawWingLayer(ctx, -1, accent, true, flapY, false);
    drawDroneBody(ctx, accent, bodyTint);
    drawWingLayer(ctx, 1, accent, false, flapY, true);

    const gunX = 8;
    const gunY = -2;
    drawMuzzle(ctx, gunX, gunY, faceLeft ? Math.PI - aimAngle : aimAngle, 16);

    ctx.restore();
  }

  function drawFlying(ctx, opts) {
    const variant = opts.variant || "drone";
    if (variant === "diver") {
      ctx.save();
      ctx.globalAlpha = 0.15;
      drawFlyingCore(ctx, {
        cx: opts.cx,
        cy: opts.cy - 14,
        scale: opts.scale,
        wingPhase: opts.wingPhase,
        bank: opts.bank,
        accent: opts.accent,
        body: opts.body,
        aimAngle: opts.aimAngle,
        variant: "diver",
        enginePulse: opts.enginePulse,
        muzzleFlash: 0,
        faceLeft: opts.faceLeft,
      });
      ctx.globalAlpha = 0.08;
      drawFlyingCore(ctx, {
        cx: opts.cx,
        cy: opts.cy - 28,
        scale: opts.scale * 0.95,
        wingPhase: opts.wingPhase,
        bank: opts.bank,
        accent: opts.accent,
        body: opts.body,
        aimAngle: opts.aimAngle,
        variant: "diver",
        enginePulse: 0,
        muzzleFlash: 0,
        faceLeft: opts.faceLeft,
      });
      ctx.restore();
    }
    drawFlyingCore(ctx, opts);
  }

  global.RenderEnemy = {
    drawShadow: drawShadow,
    drawFlying: drawFlying,
  };
})(window);
