# Bake magenta chroma to PNG alpha (flood-fill from image edges), compiled C# for speed
# Usage: powershell -ExecutionPolicy Bypass -File tools/bake_alpha.ps1
Add-Type -AssemblyName System.Drawing

$csharp = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class MagentaBake {
  static bool IsKey(int r, int g, int b) {
    int lo = Math.Min(r, b), hi = Math.Max(r, b);
    if (hi < 60) return false;
    if (g * 2.2 >= lo) return false;
    if (r < 0.7 * b || b < 0.55 * r) return false;
    return (r - g) > 60 && (b - g) > 40;
  }

  static bool IsFringe(int r, int g, int b) {
    return (r - g) > 40 && (b - g) > 30 && r > 0.6 * b && b > 0.5 * r;
  }

  static bool IsStrictKey(int r, int g, int b) {
    return IsKey(r, g, b) && r > 170 && b > 140 && g < 70;
  }

  public static string FillHoles(string path, int minArea) {
    using (var src = Image.FromFile(path))
    using (var bmp = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb)) {
      using (var gr = Graphics.FromImage(bmp)) {
        gr.Clear(Color.Transparent);
        gr.DrawImage(src, 0, 0, src.Width, src.Height);
      }
      int w = bmp.Width, h = bmp.Height;
      var data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int stride = data.Stride;
      byte[] buf = new byte[stride * h];
      Marshal.Copy(data.Scan0, buf, 0, buf.Length);

      var seen = new bool[w * h];
      var stack = new Stack<int>();
      var comp = new List<int>();
      int removed = 0;
      for (int start = 0; start < w * h; start++) {
        if (seen[start]) continue;
        int si = (start / w) * stride + (start % w) * 4;
        if (buf[si + 3] == 0 || !IsStrictKey(buf[si + 2], buf[si + 1], buf[si])) { seen[start] = true; continue; }
        comp.Clear();
        stack.Push(start);
        while (stack.Count > 0) {
          int p = stack.Pop();
          if (seen[p]) continue;
          int x = p % w, y = p / w;
          int i = y * stride + x * 4;
          if (buf[i + 3] == 0 || !IsKey(buf[i + 2], buf[i + 1], buf[i])) continue;
          seen[p] = true;
          comp.Add(i);
          if (x > 0) stack.Push(p - 1);
          if (x < w - 1) stack.Push(p + 1);
          if (y > 0) stack.Push(p - w);
          if (y < h - 1) stack.Push(p + w);
        }
        if (comp.Count >= minArea) {
          foreach (int i in comp) buf[i + 3] = 0;
          removed += comp.Count;
        }
      }

      var fringe = new List<int>();
      for (int y = 1; y < h - 1; y++) {
        for (int x = 1; x < w - 1; x++) {
          int i = y * stride + x * 4;
          if (buf[i + 3] == 0) continue;
          if (!IsFringe(buf[i + 2], buf[i + 1], buf[i])) continue;
          if (buf[i - 4 + 3] == 0 || buf[i + 4 + 3] == 0 ||
              buf[i - stride + 3] == 0 || buf[i + stride + 3] == 0) {
            fringe.Add(i);
          }
        }
      }
      foreach (int i in fringe) buf[i + 3] = 0;

      Marshal.Copy(buf, 0, data.Scan0, buf.Length);
      bmp.UnlockBits(data);
      if (removed == 0 && fringe.Count == 0) return "HOLES none " + path;
      bmp.Save(path + ".bake.tmp.png", ImageFormat.Png);
      return "HOLES " + path + " removed=" + removed + " fringe=" + fringe.Count;
    }
  }

  public static string Process(string path) {
    using (var src = Image.FromFile(path))
    using (var bmp = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb)) {
      using (var gr = Graphics.FromImage(bmp)) {
        gr.Clear(Color.Transparent);
        gr.DrawImage(src, 0, 0, src.Width, src.Height);
      }
      int w = bmp.Width, h = bmp.Height;
      var rect = new Rectangle(0, 0, w, h);
      var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int stride = data.Stride;
      byte[] buf = new byte[stride * h];
      Marshal.Copy(data.Scan0, buf, 0, buf.Length);

      if (buf[3] == 0) {
        bmp.UnlockBits(data);
        return "SKIP (already transparent) " + path;
      }

      var seen = new bool[w * h];
      var stack = new Stack<int>();
      Func<int, int, bool> key = (x, y) => {
        int i = y * stride + x * 4;
        return buf[i + 3] == 0 || IsKey(buf[i + 2], buf[i + 1], buf[i]);
      };
      for (int x = 0; x < w; x++) { stack.Push(x); stack.Push((h - 1) * w + x); }
      for (int y = 0; y < h; y++) { stack.Push(y * w); stack.Push(y * w + w - 1); }

      while (stack.Count > 0) {
        int p = stack.Pop();
        if (seen[p]) continue;
        int x = p % w, y = p / w;
        if (!key(x, y)) continue;
        seen[p] = true;
        buf[y * stride + x * 4 + 3] = 0;
        if (x > 0) stack.Push(p - 1);
        if (x < w - 1) stack.Push(p + 1);
        if (y > 0) stack.Push(p - w);
        if (y < h - 1) stack.Push(p + w);
      }

      var fringe = new List<int>();
      for (int y = 1; y < h - 1; y++) {
        for (int x = 1; x < w - 1; x++) {
          int i = y * stride + x * 4;
          if (buf[i + 3] == 0) continue;
          if (!IsFringe(buf[i + 2], buf[i + 1], buf[i])) continue;
          if (buf[i - 4 + 3] == 0 || buf[i + 4 + 3] == 0 ||
              buf[i - stride + 3] == 0 || buf[i + stride + 3] == 0) {
            fringe.Add(i);
          }
        }
      }
      foreach (int i in fringe) buf[i + 3] = 0;

      Marshal.Copy(buf, 0, data.Scan0, buf.Length);
      bmp.UnlockBits(data);
      bmp.Save(path + ".bake.tmp.png", ImageFormat.Png);
      return "OK " + path + " cornerA=" + buf[3] + " fringe=" + fringe.Count;
    }
  }
}
'@

Add-Type -TypeDefinition $csharp -ReferencedAssemblies System.Drawing

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backup = Join-Path $root "assets\_backup"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

$files = @(
  "assets\heroes\trex.png",
  "assets\heroes\ptero.png",
  "assets\heroes\parasau.png",
  "assets\heroes\stego.png",
  "assets\enemies\grunt.png",
  "assets\enemies\rusher.png",
  "assets\enemies\spitter.png",
  "assets\enemies\tank.png",
  "assets\enemies\tyrant.png",
  "assets\enemies\frost_raptor.png",
  "assets\enemies\spinosaur.png",
  "assets\enemies\drone_ptero.png"
)

foreach ($rel in $files) {
  $full = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $full)) { Write-Host "MISSING $rel"; continue }
  $result = [MagentaBake]::Process($full)
  Write-Host $result
  $tmp = $full + ".bake.tmp.png"
  if (Test-Path -LiteralPath $tmp) {
    $bak = Join-Path $backup ((Split-Path $rel -Leaf) -replace "\.png$", "_magenta.png")
    if (-not (Test-Path -LiteralPath $bak)) { Copy-Item -LiteralPath $full -Destination $bak }
    Move-Item -LiteralPath $tmp -Destination $full -Force
  }
}

# Enclosed magenta pockets (e.g. between legs). Tyrant is excluded: its pink glow stripes match the key.
$holeFiles = @(
  "assets\enemies\grunt.png",
  "assets\enemies\rusher.png",
  "assets\enemies\spitter.png",
  "assets\enemies\tank.png"
)
foreach ($rel in $holeFiles) {
  $full = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $full)) { continue }
  Write-Host ([MagentaBake]::FillHoles($full, 150))
  $tmp = $full + ".bake.tmp.png"
  if (Test-Path -LiteralPath $tmp) { Move-Item -LiteralPath $tmp -Destination $full -Force }
}
Write-Host "Done."
