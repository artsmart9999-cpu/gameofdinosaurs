Add-Type -AssemblyName System.Drawing
$root = Join-Path $PSScriptRoot ".."
$bgDir = Join-Path $root "assets\bg"
$enDir = Join-Path $root "assets\enemies"
New-Item -ItemType Directory -Force -Path $bgDir, $enDir | Out-Null

function Save-Bg {
  param([string]$Path, [System.Drawing.Color]$Top, [System.Drawing.Color]$Bot)
  $w = 1920
  $h = 720
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
    [System.Drawing.Point]::new(0, 0),
    [System.Drawing.Point]::new(0, $h),
    $Top,
    $Bot
  )
  $g.FillRectangle($brush, 0, 0, $w, $h)
  $g.FillRectangle([System.Drawing.Brushes]::DarkOliveGreen, 0, [int]($h * 0.72), $w, [int]($h * 0.28))
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

function Save-Enemy {
  param([string]$Path, [System.Drawing.Color]$Body)
  $w = 128
  $h = 128
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 255, 0, 255))
  $brush = New-Object System.Drawing.SolidBrush $Body
  $g.FillEllipse($brush, 24, 40, 80, 70)
  $g.FillRectangle($brush, 50, 20, 28, 35)
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

Save-Bg (Join-Path $bgDir "glacier.png") `
  ([System.Drawing.Color]::FromArgb(255, 200, 230, 255)) `
  ([System.Drawing.Color]::FromArgb(255, 120, 160, 200))
Save-Bg (Join-Path $bgDir "swamp.png") `
  ([System.Drawing.Color]::FromArgb(255, 60, 80, 50)) `
  ([System.Drawing.Color]::FromArgb(255, 30, 50, 35))
Save-Bg (Join-Path $bgDir "factory.png") `
  ([System.Drawing.Color]::FromArgb(255, 70, 75, 85)) `
  ([System.Drawing.Color]::FromArgb(255, 40, 42, 48))
Save-Bg (Join-Path $bgDir "crater.png") `
  ([System.Drawing.Color]::FromArgb(255, 30, 20, 50)) `
  ([System.Drawing.Color]::FromArgb(255, 15, 10, 25))

Save-Enemy (Join-Path $enDir "frost_raptor.png") `
  ([System.Drawing.Color]::FromArgb(255, 93, 173, 226))
Save-Enemy (Join-Path $enDir "spinosaur.png") `
  ([System.Drawing.Color]::FromArgb(255, 39, 174, 96))
Save-Enemy (Join-Path $enDir "drone_ptero.png") `
  ([System.Drawing.Color]::FromArgb(255, 189, 195, 199))

Write-Host "Generated step4 assets"
