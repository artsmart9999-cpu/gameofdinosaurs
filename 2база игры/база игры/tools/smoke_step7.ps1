$root = Join-Path $PSScriptRoot ".."
$errors = @()
$menu = Get-Content -LiteralPath (Join-Path $root "js\menu.js") -Raw -Encoding UTF8
$battle = Get-Content -LiteralPath (Join-Path $root "js\battle.js") -Raw -Encoding UTF8
$audio = Get-Content -LiteralPath (Join-Path $root "js\audio.js") -Raw -Encoding UTF8
$render = Get-Content -LiteralPath (Join-Path $root "js\render-dino.js") -Raw -Encoding UTF8
$index = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$renderEnemy = Get-Content -LiteralPath (Join-Path $root "js\render-enemy.js") -Raw -Encoding UTF8

if ($menu -notmatch "hangarActionLayout") { $errors += "menu missing hangarActionLayout" }
if ($menu -notmatch "btn\.y - 14") { $errors += "stars not above map button" }
if ($battle -notmatch "hitstopTimer") { $errors += "battle missing hitstopTimer" }
if ($battle -notmatch "floatTexts") { $errors += "battle missing floatTexts" }
if ($battle -notmatch "triggerShake") { $errors += "battle missing triggerShake" }
if ($battle -notmatch "drawFloatTexts") { $errors += "battle missing drawFloatTexts" }
if ($audio -notmatch "startMusic") { $errors += "audio missing startMusic" }
if ($audio -notmatch "bossWarn") { $errors += "audio missing bossWarn" }
if ($render -notmatch "pose") { $errors += "render-dino missing pose" }
if ($index -notmatch "render-enemy\.js") { $errors += "index missing render-enemy.js" }
if ($renderEnemy -notmatch "RenderEnemy") { $errors += "render-enemy missing RenderEnemy" }
if ($battle -notmatch "drawProceduralFlyingEnemy") { $errors += "battle missing procedural flying draw" }

if ($errors.Count) {
  $errors | ForEach-Object { Write-Host "FAIL $_" }
  exit 1
}
Write-Host "OK step7 smoke (static)"
