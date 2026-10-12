# LifeNest APK Build Script
param(
    [switch]$Upload = $false
)
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Building LifeNest Android APK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Locate compatible JDK (Java 17 or 21)
$jdkPath = $null
$candidates = @(
    "C:\Users\Towsif\.jdks\jbr-21.0.11",
    "$env:USERPROFILE\.jdks\jbr-21.0.11",
    "$env:JAVA_HOME"
)

foreach ($c in $candidates) {
    if ($c -and (Test-Path "$c\bin\java.exe")) {
        $jdkPath = $c
        break
    }
}

if (-not $jdkPath) {
    # Check Android Studio jbr if compatible
    if (Test-Path "C:\Program Files\Android\Android Studio\jbr\bin\java.exe") {
        $jdkPath = "C:\Program Files\Android\Android Studio\jbr"
    }
}

if ($jdkPath) {
    $env:JAVA_HOME = $jdkPath
    $env:PATH = "$jdkPath\bin;$env:PATH"
    Write-Host "[OK] Using JDK at: $jdkPath" -ForegroundColor Green
} else {
    Write-Host "[WARN] No explicit JDK path found, relying on system PATH" -ForegroundColor Yellow
}

if (Test-Path "$env:LOCALAPPDATA\Android\Sdk") {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
}

# 2. Build Vite Frontend
Write-Host "`n--> Step 1/3: Compiling Web App (npm run build)..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\frontend"
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

# 3. Sync Web Assets to Android Platform
Write-Host "`n--> Step 2/3: Syncing Assets with Android Project (npx cap sync android)..." -ForegroundColor Yellow
& npx.cmd cap sync android
if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed" }

# 4. Build Debug APK with Gradle
Write-Host "`n--> Step 3/3: Assembling Debug APK via Gradle..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\frontend\android"
& .\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) { throw "Gradle APK build failed" }

$apkSource = "$PSScriptRoot\frontend\android\app\build\outputs\apk\debug\app-debug.apk"
$destDir = "$PSScriptRoot\apk-output"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }
$apkDest = "$destDir\LifeNest-debug.apk"
Copy-Item -Path $apkSource -Destination $apkDest -Force

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  SUCCESS! APK Built Successfully!" -ForegroundColor Green
Write-Host "  APK Location: $apkDest" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green

if ($Upload) {
    Write-Host "`n--> Uploading to Google Drive..." -ForegroundColor Yellow
    Set-Location -Path "$PSScriptRoot\backend"
    & npm.cmd run apk:upload
}

Set-Location -Path $PSScriptRoot
