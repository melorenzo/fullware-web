Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(10, 10, 10))
$g.FillRectangle($bg, 0, 0, $width, $height)

# Grilla sutil
$linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(30, 38, 38, 38)), 1
for ($x = 0; $x -lt $width; $x += 48) { $g.DrawLine($linePen, $x, 0, $x, $height) }
for ($y = 0; $y -lt $height; $y += 48) { $g.DrawLine($linePen, 0, $y, $width, $y) }

# Resplandor naranja
$orange = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(26, 255, 106, 0))
$g.FillEllipse($orange, 760, -140, 700, 700)

# Barra neón
$neonBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 255, 0))
$g.FillRectangle($neonBrush, 80, 150, 120, 6)

$mono = New-Object System.Drawing.Font 'Consolas', 22, ([System.Drawing.FontStyle]::Regular)
$monoSmall = New-Object System.Drawing.Font 'Consolas', 18, ([System.Drawing.FontStyle]::Regular)
$display = New-Object System.Drawing.Font 'Consolas', 64, ([System.Drawing.FontStyle]::Bold)
$tagline = New-Object System.Drawing.Font 'Consolas', 28, ([System.Drawing.FontStyle]::Regular)

$muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(163, 163, 163))
$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 245, 245))
$orangeText = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 106, 0))

$g.DrawString('$ fullware --status online', $monoSmall, $muted, 80, 96)
$g.DrawString('FULLWARE_', $display, $neonBrush, 72, 196)
$g.DrawString('Automatizamos lo repetitivo.', $tagline, $white, 80, 330)
$g.DrawString('Vos te ocupás de crecer.', $tagline, $muted, 80, 378)
$g.DrawString('agentes de IA  /  whatsapp  /  tableros  /  devops', $monoSmall, $orangeText, 80, 486)
$g.DrawString('fullware.com.ar', $mono, $muted, 80, 540)

$bmp.Save((Join-Path $PSScriptRoot '..\public\og-image.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output 'og-image.png generado'
