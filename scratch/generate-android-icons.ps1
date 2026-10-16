Add-Type -AssemblyName System.Drawing

$logoPath = "D:\Personal_Project\assethub-project\frontend\public\logo.png"
$resDir = "D:\Personal_Project\assethub-project\frontend\android\app\src\main\res"

if (-not (Test-Path $logoPath)) {
    Write-Error "Logo not found at $logoPath"
    exit 1
}

$logo = [System.Drawing.Bitmap]::new($logoPath)
$whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255))

# Generate cropped version without excessive outer padding if needed
# We already found the logo graphic is roughly centered between minX=212 maxX=1044 minY=132 maxY=1104
# For foreground adaptive icon, the logo fits directly inside the 108dp canvas (safe zone is center 66%)

function Save-ResizedImage {
    param(
        [System.Drawing.Image]$source,
        [int]$width,
        [int]$height,
        [string]$destPath,
        [bool]$makeCircle = $false,
        [float]$innerScale = 1.0
    )

    $dir = [System.IO.Path]::GetDirectoryName($destPath)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $bmp = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Background fill
    if ($makeCircle) {
        $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $path.AddEllipse(0, 0, $width, $height)
        $g.FillPath($whiteBrush, $path)
        $g.SetClip($path)
    } else {
        $g.FillRectangle($whiteBrush, 0, 0, $width, $height)
    }

    # Draw logo scaled inside canvas
    $drawW = [int]($width * $innerScale)
    $drawH = [int]($height * $innerScale)
    $drawX = [int](($width - $drawW) / 2)
    $drawY = [int](($height - $drawH) / 2)

    $g.DrawImage($source, $drawX, $drawY, $drawW, $drawH)
    $g.Dispose()

    # Save PNG
    if (Test-Path $destPath) {
        Remove-Item $destPath -Force
    }
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Saved: $destPath ($width x $height)"
}

# 1. Launcher Mipmaps
$mipmapSizes = @(
    @{ Name = "mipmap-mdpi";    Launcher = 48;  Foreground = 108 },
    @{ Name = "mipmap-hdpi";    Launcher = 72;  Foreground = 162 },
    @{ Name = "mipmap-xhdpi";   Launcher = 96;  Foreground = 216 },
    @{ Name = "mipmap-xxhdpi";  Launcher = 144; Foreground = 324 },
    @{ Name = "mipmap-xxxhdpi"; Launcher = 192; Foreground = 432 }
)

foreach ($m in $mipmapSizes) {
    $folder = Join-Path $resDir $m.Name
    $size = $m.Launcher
    $fgSize = $m.Foreground

    # Standard launcher icon (1.0 scale with white background)
    Save-ResizedImage -source $logo -width $size -height $size -destPath (Join-Path $folder "ic_launcher.png") -makeCircle $false -innerScale 0.95
    
    # Round launcher icon
    Save-ResizedImage -source $logo -width $size -height $size -destPath (Join-Path $folder "ic_launcher_round.png") -makeCircle $true -innerScale 0.92

    # Adaptive foreground icon (fits inside standard 66.7% safe zone)
    Save-ResizedImage -source $logo -width $fgSize -height $fgSize -destPath (Join-Path $folder "ic_launcher_foreground.png") -makeCircle $false -innerScale 0.98
}

# 2. Splash Screens
function Save-SplashImage {
    param(
        [System.Drawing.Image]$source,
        [int]$width,
        [int]$height,
        [string]$destPath
    )

    $dir = [System.IO.Path]::GetDirectoryName($destPath)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $bmp = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Clean solid white background
    $g.FillRectangle($whiteBrush, 0, 0, $width, $height)

    # Calculate logo size: about 35-40% of smallest screen dimension, max 360px
    $minDim = [Math]::Min($width, $height)
    $logoSize = [int][Math]::Min($minDim * 0.42, 360)
    if ($logoSize -lt 120) { $logoSize = 120 }

    $posX = [int](($width - $logoSize) / 2)
    $posY = [int](($height - $logoSize) / 2)

    $g.DrawImage($source, $posX, $posY, $logoSize, $logoSize)
    $g.Dispose()

    if (Test-Path $destPath) {
        Remove-Item $destPath -Force
    }
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Saved Splash: $destPath ($width x $height, logo $logoSize px)"
}

$splashScreens = @(
    @{ Folder = "drawable";               W = 480;  H = 320 },
    @{ Folder = "drawable-port-mdpi";     W = 320;  H = 480 },
    @{ Folder = "drawable-port-hdpi";     W = 480;  H = 800 },
    @{ Folder = "drawable-port-xhdpi";    W = 720;  H = 1280 },
    @{ Folder = "drawable-port-xxhdpi";   W = 960;  H = 1600 },
    @{ Folder = "drawable-port-xxxhdpi";  W = 1280; H = 1920 },
    @{ Folder = "drawable-land-mdpi";     W = 480;  H = 320 },
    @{ Folder = "drawable-land-hdpi";     W = 800;  H = 480 },
    @{ Folder = "drawable-land-xhdpi";    W = 1280; H = 720 },
    @{ Folder = "drawable-land-xxhdpi";   W = 1600; H = 960 },
    @{ Folder = "drawable-land-xxxhdpi";  W = 1920; H = 1280 }
)

foreach ($s in $splashScreens) {
    Save-SplashImage -source $logo -width $s.W -height $s.H -destPath (Join-Path (Join-Path $resDir $s.Folder) "splash.png")
}

$logo.Dispose()
$whiteBrush.Dispose()

# Remove the old generic android robot foreground vector so Gradle doesn't pick it up
$robotVector = Join-Path $resDir "drawable-v24\ic_launcher_foreground.xml"
if (Test-Path $robotVector) {
    Remove-Item $robotVector -Force
    Write-Output "Removed legacy generic robot vector: $robotVector"
}

Write-Output "Successfully updated all Android launcher icons and splash screens!"
