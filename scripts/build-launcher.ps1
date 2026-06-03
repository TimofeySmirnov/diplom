$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$LauncherDir = Join-Path $Root "launcher"
$DistDir = Join-Path $Root "dist"
$LauncherSource = Join-Path $LauncherDir "launcher.py"

Set-Location $Root

py -3 -m PyInstaller --clean --noconsole --onefile --name DiplomLauncher --distpath $DistDir $LauncherSource

Write-Host "Launcher exe: $(Join-Path $DistDir 'DiplomLauncher.exe')"
