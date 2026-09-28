$root = Join-Path $PSScriptRoot ".."
$errors = @()
$data = Get-Content -LiteralPath (Join-Path $root "js\data.js") -Raw -Encoding UTF8
$save = Get-Content -LiteralPath (Join-Path $root "js\save.js") -Raw -Encoding UTF8
$battle = Get-Content -LiteralPath (Join-Path $root "js\battle.js") -Raw -Encoding UTF8
$menu = Get-Content -LiteralPath (Join-Path $root "js\menu.js") -Raw -Encoding UTF8
$main = Get-Content -LiteralPath (Join-Path $root "js\main.js") -Raw -Encoding UTF8

foreach ($sym in @("getSurvivalLevelConfig", "SURVIVAL_TIER_SEC", "SURVIVAL_WAVE_SEC", "SURVIVAL_MINI_BOSS_EVERY")) {
  if ($data -notmatch [regex]::Escape($sym)) { $errors += "data missing $sym" }
}
if ($save -notmatch "survivalBest") { $errors += "survivalBest missing" }
if ($save -notmatch "recordSurvivalResult") { $errors += "recordSurvivalResult missing" }
if ($battle -notmatch "isSurvivalMode") { $errors += "isSurvivalMode missing" }
if ($battle -notmatch "spawnSurvivalMiniBoss") { $errors += "spawnSurvivalMiniBoss missing" }
if ($menu -notmatch '"survival"') { $errors += "survival button missing" }
if ($main -notmatch "startSurvivalBattle") { $errors += "startSurvivalBattle missing" }

if ($errors.Count) {
  $errors | ForEach-Object { Write-Host "FAIL $_" }
  exit 1
}
Write-Host "OK step6 smoke (static)"
