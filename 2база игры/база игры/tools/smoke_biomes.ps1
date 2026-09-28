$root = Join-Path $PSScriptRoot ".."
$errors = @()
$data = Get-Content -LiteralPath (Join-Path $root "js\data.js") -Raw -Encoding UTF8
$battle = Get-Content -LiteralPath (Join-Path $root "js\battle.js") -Raw -Encoding UTF8
$menu = Get-Content -LiteralPath (Join-Path $root "js\menu.js") -Raw -Encoding UTF8

$expected = @(
  @{ ch = 1; biome = "plains"; bg = "bg_battle" },
  @{ ch = 2; biome = "falls"; bg = "bg_falls" },
  @{ ch = 3; biome = "volcano"; bg = "bg_volcano" },
  @{ ch = 4; biome = "glacier"; bg = "bg_glacier" },
  @{ ch = 5; biome = "swamp"; bg = "bg_swamp" },
  @{ ch = 6; biome = "factory"; bg = "bg_factory" },
  @{ ch = 7; biome = "crater"; bg = "bg_crater" }
)

foreach ($row in $expected) {
  $ch = $row.ch
  $biome = $row.biome
  $bg = $row.bg
  if ($data -notmatch "chapter:\s*$ch[\s\S]{0,400}?biomeId:\s*`"$biome`"") {
    if ($data -notmatch "biomeId:\s*`"$biome`"") {
      $errors += "chapter $ch missing biomeId $biome"
    }
  }
  if ($data -notmatch "bgKey:\s*`"$bg`"") {
    $errors += "missing bgKey $bg for biome $biome"
  }
}

if ($data -notmatch "function getLevelConfig") { $errors += "getLevelConfig missing" }
if ($data -notmatch "function getBiomeById") { $errors += "getBiomeById missing" }

if ($battle -notmatch "drawHazardFog\(ctx\)") { $errors += "drawHazardFog missing" }
if ($battle -match "drawHazardFog\(ctx\);\s*\r?\n\s*drawFloatTexts") {
  $errors += "drawHazardFog still after player (should be before entities)"
}
if ($battle -notmatch "drawParticles\(ctx\);\s*\r?\n\s*drawHazardFog") {
  $errors += "drawHazardFog should follow drawParticles"
}

if ($menu -notmatch "buttons\.length - 1") { $errors += "hitTest should iterate backwards" }

if ($errors.Count) {
  $errors | ForEach-Object { Write-Host "FAIL $_" }
  exit 1
}
Write-Host "OK smoke_biomes (static)"
