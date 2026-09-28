(function (global) {
  "use strict";

  const MANIFEST = {
    hero_trex: "assets/heroes/trex.png",
    hero_ptero: "assets/heroes/ptero.png",
    hero_parasau: "assets/heroes/parasau.png",
    hero_stego: "assets/heroes/stego.png",
    enemy_grunt: "assets/enemies/grunt.png",
    enemy_rusher: "assets/enemies/rusher.png",
    enemy_spitter: "assets/enemies/spitter.png",
    enemy_tank: "assets/enemies/tank.png",
    enemy_tyrant: "assets/enemies/tyrant.png",
    enemy_frost_raptor: "assets/enemies/frost_raptor.png",
    enemy_spinosaur: "assets/enemies/spinosaur.png",
    enemy_drone_ptero: "assets/enemies/drone_ptero.png",
    bg_battle: "assets/bg/battle.png",
    bg_falls: "assets/bg/falls.png",
    bg_volcano: "assets/bg/volcano.png",
    bg_glacier: "assets/bg/glacier.png",
    bg_swamp: "assets/bg/swamp.png",
    bg_factory: "assets/bg/factory.png",
    bg_crater: "assets/bg/crater.png",
    bg_hangar: "assets/bg/hangar.png",
  };

  const CUTOUT_IDS = {
    hero_trex: true,
    hero_ptero: true,
    hero_parasau: true,
    hero_stego: true,
    enemy_grunt: true,
    enemy_rusher: true,
    enemy_spitter: true,
    enemy_tank: true,
    enemy_tyrant: true,
    enemy_frost_raptor: true,
    enemy_spinosaur: true,
    enemy_drone_ptero: true,
  };

  const images = Object.create(null);
  const failed = Object.create(null);

  function isChromaKey(r, g, b) {
    const lo = Math.min(r, b);
    const hi = Math.max(r, b);
    if (hi < 60) return false;
    if (g * 2.2 >= lo) return false;
    if (r < 0.7 * b || b < 0.55 * r) return false;
    return r - g > 60 && b - g > 40;
  }

  function isFringe(r, g, b) {
    return r - g > 40 && b - g > 30 && r > 0.6 * b && b > 0.5 * r;
  }

  function isBackgroundPixel(r, g, b, a) {
    if (a < 8) return true;
    if (isChromaKey(r, g, b)) return true;
    if (r > 180 && b > 180 && g < 80) return true;
    const dr = r - 255;
    const dg = g;
    const db = b - 255;
    if (dr * dr + dg * dg + db * db < 90 * 90) return true;
    if (r > 248 && g > 248 && b > 248) return true;
    return false;
  }

  /** Edge flood-fill chroma removal (matches tools/bake_alpha.ps1). */
  function processCutoutPixels(d, w, h) {
    const seen = new Uint8Array(w * h);
    const stack = [];
    for (let x = 0; x < w; x++) {
      stack.push(x, (h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      stack.push(y * w, y * w + (w - 1));
    }
    while (stack.length) {
      const p = stack.pop();
      if (seen[p]) continue;
      const x = p % w;
      const y = (p / w) | 0;
      const i = p * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const a = d[i + 3];
      if (!isBackgroundPixel(r, g, b, a)) continue;
      seen[p] = 1;
      d[i + 3] = 0;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - w);
      if (y < h - 1) stack.push(p + w);
    }
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        const i = p * 4;
        if (d[i + 3] === 0) continue;
        if (!isFringe(d[i], d[i + 1], d[i + 2])) continue;
        const l = i - 4;
        const r = i + 4;
        const u = i - w * 4;
        const dn = i + w * 4;
        if (
          d[l + 3] === 0 ||
          d[r + 3] === 0 ||
          d[u + 3] === 0 ||
          d[dn + 3] === 0
        ) {
          d[i + 3] = 0;
        }
      }
    }
    const branch =
      d[3] === 0 && d[(w - 1) * 4 + 3] === 0
        ? "cornersTransparent"
        : "edgeFlood";
    return branch;
  }

  function removeBackgroundFromCanvas(c) {
    const w = c.width;
    const h = c.height;
    const ctx = c.getContext("2d");
    const imageData = ctx.getImageData(0, 0, w, h);
    const branch = processCutoutPixels(imageData.data, w, h);
    ctx.putImageData(imageData, 0, 0);
    return { canvas: c, branch: branch };
  }

  function removeBackground(img) {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return removeBackgroundFromCanvas(c);
  }

  function storeCutout(id, canvas) {
    images[id] = canvas;
  }

  function loadAssetBlob(src) {
    return fetch(src)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.blob();
      })
      .catch(function () {
        return new Promise(function (resolve, reject) {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", src, true);
          xhr.responseType = "blob";
          xhr.onload = function () {
            if (
              xhr.status === 0 ||
              (xhr.status >= 200 && xhr.status < 300)
            ) {
              resolve(xhr.response);
            } else {
              reject(new Error("xhr " + xhr.status));
            }
          };
          xhr.onerror = function () {
            reject(new Error("xhr error"));
          };
          xhr.send();
        });
      });
  }

  function loadImageFromBlob(blob) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("blob image load"));
      };
      img.src = url;
    });
  }

  function loadOne(id, src) {
    return new Promise(function (resolve) {
      function failImg() {
        failed[id] = true;
        resolve(false);
      }

      if (!CUTOUT_IDS[id]) {
        const img = new Image();
        img.onload = function () {
          images[id] = img;
          resolve(true);
        };
        img.onerror = failImg;
        img.src = src;
        return;
      }

      function blitToCanvas(drawable) {
        if (drawable instanceof HTMLCanvasElement) return drawable;
        const c = document.createElement("canvas");
        c.width = drawable.naturalWidth || drawable.width;
        c.height = drawable.naturalHeight || drawable.height;
        c.getContext("2d").drawImage(drawable, 0, 0);
        return c;
      }

      function tryCutoutFromDrawable(drawable, branchHint) {
        let c = blitToCanvas(drawable);
        try {
          const out = removeBackgroundFromCanvas(c);
          storeCutout(id, out.canvas, branchHint + "+" + out.branch);
          resolve(true);
        } catch (e) {
          storeCutout(id, c, branchHint + "+blitOnly");
          resolve(true);
        }
      }

      function loadCutoutViaImage(branchHint) {
        const img = new Image();
        img.onload = function () {
          tryCutoutFromDrawable(img, branchHint);
        };
        img.onerror = failImg;
        img.src = src;
      }

      if (global.location && global.location.protocol === "file:") {
        loadCutoutViaImage("fileImg");
        return;
      }

      loadAssetBlob(src)
        .then(loadImageFromBlob)
        .then(function (img) {
          tryCutoutFromDrawable(img, "blobUrl");
        })
        .catch(function () {
          loadCutoutViaImage("sameOriginImg");
        });
    });
  }

  function loadAll() {
    return Promise.all(
      Object.keys(MANIFEST).map(function (id) {
        return loadOne(id, MANIFEST[id]);
      })
    ).then(function () {
      return images;
    });
  }

  function get(id) {
    return images[id] || null;
  }

  function has(id) {
    return !!images[id];
  }

  global.Assets = {
    MANIFEST,
    images,
    loadAll,
    get,
    has,
  };
})(window);
