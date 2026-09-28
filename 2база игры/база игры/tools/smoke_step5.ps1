$root = Join-Path $PSScriptRoot ".."
$errors = @()
$data = Get-Content -LiteralPath (Join-Path $root "js\data.js") -Raw -Encoding UTF8
$battle = Get-Content -LiteralPath (Join-Path $root "js\battle.js") -Raw -Encoding UTF8

foreach ($id in @("tyrant","canyon_warden","triceratops","ice_mammoth","spinosaur_king","factory_guard","mech_rex")) {
  if ($data -notmatch "id: `"$id`"") { $errors += "Missing boss $id" }
}
if ($data -notmatch "getBossPhase") { $errors += "getBossPhase missing" }
if ($data -notmatch "bossDef:") { $errors += "bossDef in level config missing" }
if ($data -notmatch "bossId:") { $errors += "bossId in chapters missing" }

foreach ($fn in @("pickBossAttack","startBossAttack","tickBossAttack","drawBossTelegraphs","weaponId")) {
  if ($battle -notmatch [regex]::Escape($fn)) { $errors += "battle missing $fn" }
}
if ($battle -match "bossSummonUsed") { $errors += "bossSummonUsed should be removed" }
if ($battle -notmatch 'shieldActive && b\.weaponId !== "rail"') { $errors += "rail shield check missing" }

if ($errors.Count) {
  $errors | ForEach-Object { Write-Host "FAIL $_" }
  exit 1
}
Write-Host "OK step5 smoke (static)"
