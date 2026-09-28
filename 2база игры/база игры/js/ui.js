(function (global) {
  "use strict";

  const colors = {
    bg: "#070a12",
    panel: "rgba(12, 16, 28, 0.9)",
    panelBorder: "rgba(124, 92, 246, 0.5)",
    text: "#e8eefc",
    muted: "#8b9cb8",
    gold: "#3b82f6",
    goldBright: "#a5b4fc",
    goldDim: "#4338ca",
    danger: "#b33a3a",
    ok: "#4f46e5",
    track: "#141824",
    fillBar: "#4f46e5",
    ink: "#f0f4ff",
    disabled: "#1a2236",
    disabledText: "#5c6b8a",
    borderMuted: "#334155",
    titleYellow: "#f5c518",
    btnPrimaryTop: "#8ef5a8",
    btnPrimaryBottom: "#1f9a45",
    btnPrimaryStroke: "#f3fff6",
    btnSecondaryTop: "#b794f6",
    btnSecondaryBottom: "#5b21b6",
    btnSecondaryStroke: "#f3e8ff",
    btnTakeTop: "#ffe56a",
    btnTakeBottom: "#d49200",
    btnTakeStroke: "#fff6c8",
    cardCommonTop: "#9ad8ff",
    cardCommonBottom: "#2f7fe0",
    cardRareTop: "#e0b0ff",
    cardRareBottom: "#7a3ec8",
    metalLight: "#f4f7fb",
    metalMid: "#8e99a8",
    starOn: "#ffe14a",
    starOff: "rgba(255,255,255,0.38)",
  };

  const font = {
    title: 'bold 18px "Segoe UI", system-ui, sans-serif',
    body: 'bold 14px "Segoe UI", system-ui, sans-serif',
    tip: '12px "Segoe UI", system-ui, sans-serif',
    hud: 'bold 13px "Segoe UI", system-ui, sans-serif',
    banner: 'bold 28px "Segoe UI", system-ui, sans-serif',
  };

  const radius = 8;
  const btnH = 36;
  const btnHLg = 48;

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function setFont(ctx, key) {
    ctx.font = font[key] || font.body;
  }

  function drawPanel(ctx, x, y, w, h) {
    roundRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = colors.panel;
    ctx.fill();
    ctx.strokeStyle = colors.panelBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawStrokedText(ctx, text, x, y, fill) {
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000000";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill || "#ffffff";
    ctx.fillText(text, x, y);
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
  }

  function drawButton(ctx, b, labelText, variant) {
    const v = variant || "secondary";
    let top = colors.btnSecondaryTop;
    let bottom = colors.btnSecondaryBottom;
    let stroke = colors.btnSecondaryStroke;
    let textFill = "#ffffff";
    let stroked = true;

    if (v === "primary") {
      top = colors.btnPrimaryTop;
      bottom = colors.btnPrimaryBottom;
      stroke = colors.btnPrimaryStroke;
    } else if (v === "take") {
      top = colors.btnTakeTop;
      bottom = colors.btnTakeBottom;
      stroke = colors.btnTakeStroke;
    } else if (v === "ghost") {
      top = "rgba(28, 18, 58, 0.72)";
      bottom = "rgba(28, 18, 58, 0.72)";
      stroke = "#c4b5fd";
    } else if (v === "disabled") {
      top = colors.disabled;
      bottom = "#101622";
      stroke = colors.borderMuted;
      textFill = colors.disabledText;
      stroked = false;
    }

    const shadow = 4;
    roundRect(ctx, b.x, b.y + shadow, b.w, b.h, radius);
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fill();

    roundRect(ctx, b.x, b.y, b.w, b.h, radius);
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fill();

    if (v !== "disabled" && b.h >= 8) {
      ctx.save();
      roundRect(ctx, b.x, b.y, b.w, b.h, radius);
      ctx.clip();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(b.x, b.y, b.w, Math.max(3, b.h * 0.38));
      ctx.restore();
    }

    roundRect(ctx, b.x, b.y, b.w, b.h, radius);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = b.h < 40 || b.w < 50 ? 3 : 4;
    ctx.stroke();

    if (labelText) {
      const small = b.h < 40 || b.w < 50;
      ctx.font = small
        ? 'bold 13px "Segoe UI", system-ui, sans-serif'
        : 'bold 15px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (stroked) {
        drawStrokedText(ctx, labelText, b.x + b.w / 2, b.y + b.h / 2, textFill);
      } else {
        ctx.fillStyle = textFill;
        ctx.fillText(labelText, b.x + b.w / 2, b.y + b.h / 2);
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  }

  function label(ctx, text, x, y, role) {
    const r = role || "body";
    if (r === "tip" || r === "muted") {
      setFont(ctx, "tip");
      ctx.fillStyle = colors.muted;
      ctx.fillText(text, x, y);
      return;
    }
    if (r === "gold") {
      setFont(ctx, "body");
      ctx.fillStyle = colors.goldBright;
      ctx.fillText(text, x, y);
      return;
    }
    if (r === "banner") {
      setFont(ctx, "banner");
      drawStrokedText(ctx, text, x, y, colors.titleYellow);
      return;
    }
    if (r === "title") setFont(ctx, "title");
    else if (r === "hud") setFont(ctx, "hud");
    else setFont(ctx, "body");
    drawStrokedText(ctx, text, x, y, "#ffffff");
  }

  function drawScreenTitle(ctx, text, width) {
    const barH = 46;
    ctx.fillStyle = "#100818";
    ctx.fillRect(0, 0, width, barH);
    ctx.fillStyle = "#3a2a10";
    ctx.fillRect(0, barH - 4, width, 4);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    drawStrokedText(ctx, text, width / 2, barH / 2 + 1, colors.titleYellow);
    ctx.restore();
    return barH;
  }

  function drawMenuBackdrop(ctx, w, h, opts) {
    const overImage = opts && opts.overImage;
    const cx = w / 2;
    const cy = h * 0.46;
    const outer = Math.max(w, h) * 0.72;
    if (overImage) {
      const veil = ctx.createRadialGradient(cx, cy, outer * 0.2, cx, cy, outer);
      veil.addColorStop(0, "rgba(8, 16, 48, 0.28)");
      veil.addColorStop(0.55, "rgba(6, 12, 36, 0.55)");
      veil.addColorStop(1, "rgba(4, 8, 22, 0.82)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, w, h);
    } else {
      const g = ctx.createRadialGradient(cx, cy, 24, cx, cy, outer);
      g.addColorStop(0, "#243a86");
      g.addColorStop(0.42, "#122456");
      g.addColorStop(1, "#070b18");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.save();
    ctx.translate(cx, cy);
    const maxR = Math.min(w, h) * 0.46;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, maxR * (i / 4), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(120, 180, 255, " + (0.16 + i * 0.06) + ")";
      ctx.lineWidth = i === 4 ? 4 : 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCard(ctx, rect, opts) {
    const o = opts || {};
    const rare = o.rarity === "rare";
    const x = rect.x;
    const y = rect.y;
    const w = rect.w;
    const h = rect.h;
    const frame = Math.max(6, Math.min(10, w * 0.06));
    roundRect(ctx, x + 3, y + 5, w, h, 14);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    roundRect(ctx, x, y, w, h, 14);
    const metal = ctx.createLinearGradient(x, y, x + w, y + h);
    metal.addColorStop(0, colors.metalLight);
    metal.addColorStop(0.45, colors.metalMid);
    metal.addColorStop(1, "#d7dee8");
    ctx.fillStyle = metal;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    const ix = x + frame;
    const iy = y + frame;
    const iw = w - frame * 2;
    const ih = h - frame * 2;
    roundRect(ctx, ix, iy, iw, ih, 8);
    const inner = ctx.createLinearGradient(ix, iy, ix, iy + ih);
    inner.addColorStop(0, rare ? colors.cardRareTop : colors.cardCommonTop);
    inner.addColorStop(1, rare ? colors.cardRareBottom : colors.cardCommonBottom);
    ctx.fillStyle = inner;
    ctx.fill();

    const maxStars = o.maxStars == null ? 5 : o.maxStars;
    const stars = Math.max(0, Math.min(maxStars, o.stars || 0));
    const name = o.name || "";
    const nameY = y + 20;
    const starY = y + h - 16;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
    if (name) drawStrokedText(ctx, name, x + w / 2, nameY, "#ffffff");
    if (typeof o.drawIcon === "function") {
      const top = name ? nameY + 12 : iy + 4;
      const bottom = maxStars > 0 ? starY - 10 : iy + ih - 4;
      const size = Math.max(16, Math.min(40, bottom - top));
      o.drawIcon(ctx, x + w / 2 - size / 2, top + (bottom - top - size) / 2, size);
    }
    if (maxStars > 0) {
      const gap = 14;
      const rowW = (maxStars - 1) * gap;
      const sx0 = x + w / 2 - rowW / 2;
      const sy = starY;
      for (let i = 0; i < maxStars; i++) {
        ctx.fillStyle = i < stars ? colors.starOn : colors.starOff;
        drawStarShape(ctx, sx0 + i * gap, sy, 6);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  global.UI = {
    colors: colors,
    font: font,
    radius: radius,
    btnH: btnH,
    btnHLg: btnHLg,
    roundRect: roundRect,
    setFont: setFont,
    drawPanel: drawPanel,
    drawButton: drawButton,
    drawStrokedText: drawStrokedText,
    drawScreenTitle: drawScreenTitle,
    drawMenuBackdrop: drawMenuBackdrop,
    drawCard: drawCard,
    label: label,
  };
})(window);
