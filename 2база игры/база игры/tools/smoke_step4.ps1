$root = Join-Path $PSScriptRoot ".."
$errors = @()
$data = Get-Content -LiteralPath (Join-Path $root "js\data.js") -Raw -Encoding UTF8
if ($data -notmatch 'id: 7,\s*\n\s*biomeId: "crater"') { $errors += "Chapter 7 missing" }
if ($data -notmatch 'eliteOnly: true') { $errors += "eliteOnly missing" }
if ($data -notmatch 'frost_raptor') { $errors += "frost_raptor missing" }
if ($data -notmatch 'lava_rain') { $errors += "lava_rain hazard missing" }
$battle = Get-Content -LiteralPath (Join-Path $root "js\battle.js") -Raw -Encoding UTF8
foreach ($fn in @("initHazards", "updateHazards", "drawHazards", "frost_ranged", "swarm_fly")) {
  if ($battle -notmatch [regex]::Escape($fn)) { $errors += "battle.js missing $fn" }
}
$paths = @(
  "assets\bg\glacier.png",
  "assets\bg\swamp.png",
  "assets\bg\factory.png",
  "assets\bg\crater.png",
  "assets\enemies\frost_raptor.png",
  "assets\enemies\spinosaur.png",
  "assets\enemies\drone_ptero.png"
)
foreach ($rel in $paths) {
  $full = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $full)) { $errors += "Missing $rel" }
}
if ($errors.Count) {
  $errors | ForEach-Object { Write-Host "FAIL $_" }
  exit 1
}
Write-Host "OK step4 smoke (static)"
for ($ch = 1; $ch -le 7; $ch++) {
  $idx = ($ch - 1) % 7
  Write-Host "Chapter $ch index $idx"
}
