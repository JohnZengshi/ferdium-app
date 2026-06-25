<#
.SYNOPSIS
  One-click production build script for $PRODUCT_NAME on Windows.
  Builds the app and packages it into an Inno Setup installer (no code signing).

.DESCRIPTION
  This script:
    1. Validates the development environment (Node, pnpm, MSVS Tools, recipes)
    2. Optionally cleans all caches (set $env:CLEAN = "true")
    3. Builds recipes
    4. Compiles the app via esbuild + electron-builder (unpacked only)
    5. Packages the unpacked app into an Inno Setup installer
    6. Verifies the build hash matches the latest commit

  Output: .\out\$PRODUCT_NAME-win-AutoSetup-{version}-{arch}.exe

.PARAMETER Arch
  Target architecture: "x64" (default) or "arm64".

.PARAMETER SkipRecipes
  Skip building recipes (use if already built).

.PARAMETER SkipTests
  Skip running tests (for faster iteration).

.PARAMETER InnoSetupPath
  Path to ISCC.exe. Auto-detected if not specified.

.PARAMETER SkipVer
  Skip the strict recipe version check in `pnpm package`.
  Useful for local builds where you don't want to bump recipe versions.
  Equivalent to setting `$env:FERDIUM_DEV = "1"`.

.EXAMPLE
  .\scripts\build-windows-installer.ps1

.EXAMPLE
  $env:CLEAN = "true"; .\scripts\build-windows-installer.ps1 -Arch arm64

.EXAMPLE
  .\scripts\build-windows-installer.ps1 -SkipTests -SkipRecipes

.EXAMPLE
  .\scripts\build-windows-installer.ps1 -SkipVer
#>

param(
  [ValidateSet("x64", "arm64")]
  [string]$Arch = "",

  [switch]$SkipRecipes = $false,

  [switch]$SkipTests = $false,

  [string]$InnoSetupPath = "",

  [switch]$SkipVer = $false
)

# -----------------------------------------------------------------------------
#                        Configuration
# -----------------------------------------------------------------------------
$USERHOME = "${env:HOMEDRIVE}${env:HOMEPATH}"
$PROJECT_ROOT = Resolve-Path "$PSScriptRoot\.."
$OUT_DIR = "$PROJECT_ROOT\out"
$BUILD_DIR = "$PROJECT_ROOT\build"
$RECIPES_DIR = "$PROJECT_ROOT\recipes"

$env:ELECTRON_CACHE = "$USERHOME\.cache\electron"
$env:ELECTRON_BUILDER_CACHE = "$USERHOME\.cache\electron-builder"
$env:CSC_IDENTITY_AUTO_DISCOVERY = $false
$env:CI = $true

if ($SkipVer) {
  $env:FERDIUM_DEV = "1"
  Write-Host "  [SKIP] Recipe version check disabled (FERDIUM_DEV=1)" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
#                        Utility Functions
# -----------------------------------------------------------------------------
Function fail_with_docs {
  param([string]$Message)
  Write-Host "*************** FAILING ***************" -ForegroundColor Red
  Write-Host $Message -ForegroundColor Red
  Write-Host ""
  Write-Host "Please read the developer documentation in CONTRIBUTING.md"
  exit 1
}

Function Test-CommandExists {
  param([string]$Command, [string]$ErrorMessage)
  $oldPreference = $ErrorActionPreference
  $ErrorActionPreference = "stop"
  try {
    if (Get-Command $Command) { return }
  } catch {
    fail_with_docs $ErrorMessage
  } finally {
    $ErrorActionPreference = $oldPreference
  }
}

Function Get-InnoSetupPath {
  # Check if user provided a path
  if ($InnoSetupPath -and (Test-Path $InnoSetupPath)) {
    return $InnoSetupPath
  }

  # Common install locations
  $commonPaths = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 5\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 5\ISCC.exe",
    "$USERHOME\AppData\Local\Programs\Inno Setup 6\ISCC.exe",
    "$USERHOME\AppData\Local\Programs\Inno Setup 5\ISCC.exe"
  )

  foreach ($path in $commonPaths) {
    if (Test-Path $path) {
      return $path
    }
  }

  # Check PATH
  $pathResult = Get-Command "ISCC.exe" -ErrorAction SilentlyContinue
  if ($pathResult) {
    return $pathResult.Source
  }

  return $null
}

Function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==============================================" -ForegroundColor Cyan
  Write-Host "  $Message" -ForegroundColor Cyan
  Write-Host "==============================================" -ForegroundColor Cyan
}

# -----------------------------------------------------------------------------
#            Step 1: Check the developer environment
# -----------------------------------------------------------------------------
Write-Step "Checking developer environment"

# Check for required tools
Test-CommandExists node "Node.js is not installed"
Test-CommandExists npm "npm is not installed"
Test-CommandExists git "Git is not installed"

# Check node version
$EXPECTED_NODE_VERSION = Get-Content "$PROJECT_ROOT\.nvmrc"
$ACTUAL_NODE_VERSION = node -v
if ("v$EXPECTED_NODE_VERSION" -ne $ACTUAL_NODE_VERSION) {
  fail_with_docs "You are not running the expected version of node!
    expected: [v$EXPECTED_NODE_VERSION]
    actual  : [$ACTUAL_NODE_VERSION]"
}
Write-Host "  [OK] Node.js $ACTUAL_NODE_VERSION"

# Check if the 'recipes' folder is present
if (-not (Test-Path "$RECIPES_DIR\package.json" -PathType Leaf)) {
  fail_with_docs "'recipes' folder is missing or submodule has not been checked out"
}
Write-Host "  [OK] Recipes submodule found"

# Determine target architecture
if (-not $Arch) {
  if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
    $Arch = "arm64"
  } else {
    $Arch = "x64"
  }
}
Write-Host "  [OK] Target architecture: $Arch"

# Read package info for version and product name
$PACKAGE_JSON = Get-Content "$PROJECT_ROOT\package.json" | ConvertFrom-Json
$APP_VERSION = $PACKAGE_JSON.version
$PRODUCT_NAME = $PACKAGE_JSON.productName
Write-Host "  [OK] Product name: $PRODUCT_NAME, App version: $APP_VERSION"

# -----------------------------------------------------------------------------
#        Step 2: Optional clean (set $env:CLEAN = "true")
# -----------------------------------------------------------------------------
if ($env:CLEAN -eq "true") {
  Write-Step "Cleaning all caches"

  $NPM_PATH = "$USERHOME\AppData\Roaming\npm\node_modules"
  $NPM_CACHE1_PATH = "$USERHOME\AppData\Local\npm-cache"
  $NPM_CACHE2_PATH = "$USERHOME\AppData\Roaming\npm-cache"
  $ELECTRON_GYP = "$USERHOME\.electron-gyp"

  if ((Test-Path "$PROJECT_ROOT\pnpm-lock.yaml") -and (Get-Command -ErrorAction Ignore -Type Application pnpm)) {
    $PNPM_STORE = "$USERHOME\.pnpm-store"
    $PNPM_STATE = "$USERHOME\.pnpm-state"
    pnpm store prune
    Remove-Item -Path $PNPM_STORE -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path $PNPM_STATE -Recurse -ErrorAction SilentlyContinue
  }

  npm cache clean --force
  Remove-Item -Path $NPM_PATH -Recurse -ErrorAction SilentlyContinue
  Remove-Item -Path $NPM_CACHE1_PATH -Recurse -ErrorAction SilentlyContinue
  Remove-Item -Path $NPM_CACHE2_PATH -Recurse -ErrorAction SilentlyContinue
  Remove-Item -Path $ELECTRON_GYP -Recurse -ErrorAction SilentlyContinue

  Push-Location $RECIPES_DIR
  git clean -fxd
  Pop-Location

  git -C $PROJECT_ROOT clean -fxd
  Write-Host "  [OK] Clean complete"
}

# -----------------------------------------------------------------------------
#        Step 3: Check MSVS Tools
# -----------------------------------------------------------------------------
Write-Step "Checking Visual Studio Build Tools"

$EXPECTED_MSVST_VERSION = @("2019", "2022")
$NPM_CONFIG_MSVS_VERSION = npm config get msvs_version
if ((-not $NPM_CONFIG_MSVS_VERSION) -or -not ($EXPECTED_MSVST_VERSION -contains $NPM_CONFIG_MSVS_VERSION)) {
  Write-Host "MSVS Tools not configured correctly. Auto-detecting..."

  $MSVS_REG_PATH = "Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\X64"
  if (-not (Test-Path $MSVS_REG_PATH)) {
    fail_with_docs "Microsoft Visual Studio Build Tools 2019 or 2022 is not installed!"
  }

  $MSVS_VERSION = [int]((Get-ItemProperty -Path $MSVS_REG_PATH).Version.substring(4, 2))
  switch ($MSVS_VERSION) {
    { $_ -ge 30 } { $ACTUAL_MSVST_VERSION = "2022" }
    { ($_ -ge 20) -and ($_ -le 29) } { $ACTUAL_MSVST_VERSION = "2019" }
    { $_ -lt 20 } { $ACTUAL_MSVST_VERSION = "2017 or lower" }
  }

  if (-not ($EXPECTED_MSVST_VERSION -contains $ACTUAL_MSVST_VERSION)) {
    fail_with_docs "Unsupported MSVS Tools version: $ACTUAL_MSVST_VERSION"
  }

  Write-Host "  Setting msvs_version to [$ACTUAL_MSVST_VERSION] via .npmrc"
  # npm 10+ removed msvs_version as a valid option, write directly to .npmrc instead
  $npmrcPath = "$USERHOME\.npmrc"
  $npmrcContent = @"
msvs_version=$ACTUAL_MSVST_VERSION
"@
  Add-Content -Path $npmrcPath -Value "msvs_version=$ACTUAL_MSVST_VERSION" -NoNewline -ErrorAction SilentlyContinue
  # Also set for node-gyp directly via environment variable
  $env:GYP_MSVS_VERSION = $ACTUAL_MSVST_VERSION
}
Write-Host "  [OK] Visual Studio Build Tools ready"

# -----------------------------------------------------------------------------
#        Step 4: Check pnpm version
# -----------------------------------------------------------------------------
Write-Step "Checking pnpm version"

$EXPECTED_PNPM_VERSION = (Get-Content "$PROJECT_ROOT\package.json" | ConvertFrom-Json).engines.pnpm
$ACTUAL_PNPM_VERSION = pnpm --version 2>$null
if ($ACTUAL_PNPM_VERSION -ne $EXPECTED_PNPM_VERSION) {
  Write-Host "  Installing pnpm@$EXPECTED_PNPM_VERSION..."
  npm i -gf "pnpm@$EXPECTED_PNPM_VERSION"
  $ACTUAL_PNPM_VERSION = pnpm --version
}
Write-Host "  [OK] pnpm $ACTUAL_PNPM_VERSION"

# Check pnpm version of the recipes submodule
$EXPECTED_RECIPES_PNPM_VERSION = (Get-Content "$RECIPES_DIR\package.json" | ConvertFrom-Json).engines.pnpm
if ($ACTUAL_PNPM_VERSION -ne $EXPECTED_RECIPES_PNPM_VERSION) {
  fail_with_docs "pnpm version mismatch between main repo and recipes submodule!
    expected in recipes  : [$EXPECTED_RECIPES_PNPM_VERSION]
    expected in main repo: [$EXPECTED_PNPM_VERSION]
    actual               : [$ACTUAL_PNPM_VERSION]"
}

# -----------------------------------------------------------------------------
#        Step 5: Install dependencies
# -----------------------------------------------------------------------------
Write-Step "Installing dependencies"

Push-Location $PROJECT_ROOT
pnpm i
if ($LASTEXITCODE -ne 0) {
  fail_with_docs "pnpm install failed!"
}
Write-Host "  [OK] Dependencies installed"
Pop-Location

# -----------------------------------------------------------------------------
#        Step 6: Build recipes
# -----------------------------------------------------------------------------
if (-not $SkipRecipes) {
  Write-Step "Building recipes"

  Push-Location $RECIPES_DIR
  pnpm i
  if ($LASTEXITCODE -ne 0) {
    fail_with_docs "Recipes pnpm install failed!"
  }

  pnpm lint
  pnpm reformat-files
  pnpm package
  if ($LASTEXITCODE -ne 0) {
    fail_with_docs "Recipes packaging failed!"
  }
  Pop-Location
  Write-Host "  [OK] Recipes built"
} else {
  Write-Host "  [SKIP] Recipes build skipped"
}

# -----------------------------------------------------------------------------
#        Step 7: Prepare code (typecheck + lint + format)
# -----------------------------------------------------------------------------
Write-Step "Preparing code (typecheck + lint + format)"

Push-Location $PROJECT_ROOT
pnpm prepare-code
if ($LASTEXITCODE -ne 0) {
  fail_with_docs "Code preparation failed! Fix the issues and retry."
}
Write-Host "  [OK] Code preparation passed"
Pop-Location

# -----------------------------------------------------------------------------
#        Step 8: Run tests
# -----------------------------------------------------------------------------
if (-not $SkipTests) {
  Write-Step "Running tests"

  Push-Location $PROJECT_ROOT
  pnpm test
  if ($LASTEXITCODE -ne 0) {
    fail_with_docs "Tests failed! Fix the issues and retry."
  }
  Pop-Location
  Write-Host "  [OK] All tests passed"
} else {
  Write-Host "  [SKIP] Tests skipped"
}

# -----------------------------------------------------------------------------
#        Step 9: Build the app (unpacked only)
# -----------------------------------------------------------------------------
Write-Step "Building app (unpacked)"

Push-Location $PROJECT_ROOT

# Clean previous output
if (Test-Path $OUT_DIR) {
  Remove-Item -Path "$OUT_DIR\*" -Recurse -Force -ErrorAction SilentlyContinue
}

# Run the full build pipeline but only produce unpacked directory
# This runs: preval-build-info-cli && node esbuild.mjs && electron-builder --x64 --dir
pnpm build -- "--$Arch" --dir
if ($LASTEXITCODE -ne 0) {
  fail_with_docs "App build failed!"
}

Pop-Location

# Locate the unpacked output directory
$UNPACKED_DIR = "$OUT_DIR\win-$Arch-unpacked"
if (-not (Test-Path $UNPACKED_DIR)) {
  # electron-builder may use a different naming convention
  $UNPACKED_DIR = "$OUT_DIR\win-unpacked"
}
if (-not (Test-Path $UNPACKED_DIR)) {
  fail_with_docs "Could not find unpacked app directory in $OUT_DIR"
}

# Verify the main executable exists
$MAIN_EXE = "$UNPACKED_DIR\$PRODUCT_NAME.exe"
if (-not (Test-Path $MAIN_EXE)) {
  fail_with_docs "Main executable not found at $MAIN_EXE"
}

# Read build info for version
$BUILD_INFO_FILE = "$BUILD_DIR\buildInfo.json"
if (-not (Test-Path $BUILD_INFO_FILE)) {
  fail_with_docs "buildInfo.json not found at $BUILD_INFO_FILE"
}
$BUILD_INFO = Get-Content $BUILD_INFO_FILE | ConvertFrom-Json

# Compute a sortable build number: total commits on HEAD.
# Monotonically increasing - every new commit adds 1, so a larger number = newer.
$BUILD_INFO | Add-Member -NotePropertyName 'buildNumber' -NotePropertyValue (& git -C $PROJECT_ROOT rev-list --count HEAD) -Force

Write-Host "  [OK] App built successfully (version: $APP_VERSION, build: $($BUILD_INFO.buildNumber), arch: $Arch)"
Write-Host "  Unpacked app: $UNPACKED_DIR"

# -----------------------------------------------------------------------------
#        Step 10: Package with Inno Setup
# -----------------------------------------------------------------------------
Write-Step "Packaging with Inno Setup"

# Find ISCC.exe
$ISCC = Get-InnoSetupPath
if (-not $ISCC) {
  fail_with_docs @"
Inno Setup Compiler (ISCC.exe) not found!

Please install Inno Setup 6 from: https://jrsoftware.org/isdl.php
(default installation path is recommended)

After installation, you can also specify the path manually:
  .\scripts\build-windows-production.ps1 -InnoSetupPath "C:\Path\To\ISCC.exe"
"@
}
Write-Host "  [OK] Inno Setup found: $ISCC"

# Generate ISS file with correct version and arch
$ISS_TEMPLATE = "$PROJECT_ROOT\scripts\ferdium-setup.iss"
$ISS_OUTPUT = "$PROJECT_ROOT\scripts\ferdium-setup.generated.iss"

# Read the template and replace placeholders
$issContent = Get-Content $ISS_TEMPLATE -Raw
$issContent = $issContent.Replace('{#MyAppName}', $PRODUCT_NAME)
$issContent = $issContent.Replace('{#MyAppExeName}', "$PRODUCT_NAME.exe")
$issContent = $issContent.Replace('{#AppVersion}', $APP_VERSION)
$issContent = $issContent.Replace('{#AppVersionNumeric}', ($APP_VERSION -replace '-.*$', ''))
$issContent = $issContent.Replace('{#AppBuildNumber}', $BUILD_INFO.buildNumber)
$issContent = $issContent.Replace('{#AppGitHash}', $BUILD_INFO.gitHashShort)
$issContent = $issContent.Replace('{#AppArch}', $Arch)
$issContent = $issContent.Replace('{#AppSourcePath}', "..\out\win-unpacked\")
Set-Content -Path $ISS_OUTPUT -Value $issContent

Write-Host "  Generated ISS file: $ISS_OUTPUT"

# Run Inno Setup Compiler
Write-Host "  Running Inno Setup Compiler..."
& $ISCC $ISS_OUTPUT
if ($LASTEXITCODE -ne 0) {
  fail_with_docs "Inno Setup compilation failed (exit code: $LASTEXITCODE)!"
}

# Clean up generated ISS file
Remove-Item $ISS_OUTPUT -Force -ErrorAction SilentlyContinue

# -----------------------------------------------------------------------------
#        Step 11: Verify the installer
# -----------------------------------------------------------------------------
Write-Step "Verifying installer"

$INSTALLER_NAME = "$PRODUCT_NAME-win-AutoSetup-$APP_VERSION-$($BUILD_INFO.buildNumber)-$Arch.exe"
$INSTALLER_PATH = "$OUT_DIR\$INSTALLER_NAME"

if (-not (Test-Path $INSTALLER_PATH)) {
  # Try to find the installer with a different naming pattern
  $INSTALLER_PATH = Get-ChildItem -Path $OUT_DIR -Filter "$PRODUCT_NAME-win-AutoSetup-*.exe" | Select-Object -First 1
  if (-not $INSTALLER_PATH) {
    fail_with_docs "Installer not found in $OUT_DIR!"
  }
  $INSTALLER_NAME = $INSTALLER_PATH.Name
  $INSTALLER_PATH = $INSTALLER_PATH.FullName
}

$INSTALLER_SIZE = (Get-Item $INSTALLER_PATH).Length / 1MB
Write-Host "  [OK] Installer created: $INSTALLER_NAME"
Write-Host "  Size: $([math]::Round($INSTALLER_SIZE, 2)) MB"
Write-Host "  Path: $INSTALLER_PATH"

# -----------------------------------------------------------------------------
#        Step 12: Verify build hash matches latest commit
# -----------------------------------------------------------------------------
Write-Step "Verifying build integrity"

$VERSION_BUILT_HASH = $BUILD_INFO.gitHashShort
$GIT_BUILT_HASH = & git -C $PROJECT_ROOT rev-parse --short HEAD
if ($VERSION_BUILT_HASH -ne $GIT_BUILT_HASH) {
  Write-Host "  WARNING: The built version is not on the latest commit!" -ForegroundColor Yellow
  Write-Host "    latest commit : [$GIT_BUILT_HASH]" -ForegroundColor Yellow
  Write-Host "    actual build  : [$VERSION_BUILT_HASH]" -ForegroundColor Yellow
  Write-Host "  This is expected if you built from a non-HEAD commit." -ForegroundColor Yellow
} else {
  Write-Host "  [OK] Build hash matches latest commit: $GIT_BUILT_HASH"
}

# -----------------------------------------------------------------------------
#                        Done!
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "************************************************************" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "************************************************************" -ForegroundColor Green
Write-Host ""
Write-Host "  Installer  : $INSTALLER_NAME" -ForegroundColor Green
Write-Host "  Version    : $APP_VERSION" -ForegroundColor Green
Write-Host "  Build #    : $($BUILD_INFO.buildNumber)" -ForegroundColor Green
Write-Host "  Git Hash   : $($BUILD_INFO.gitHashShort)" -ForegroundColor Green
Write-Host "  Arch       : $Arch" -ForegroundColor Green
Write-Host "  Size       : $([math]::Round($INSTALLER_SIZE, 2)) MB" -ForegroundColor Green
Write-Host ""
Write-Host "  Full path: $INSTALLER_PATH" -ForegroundColor Green
Write-Host ""
Write-Host "  Note: This installer is NOT code-signed." -ForegroundColor Yellow
Write-Host "  Windows SmartScreen may show a warning." -ForegroundColor Yellow
Write-Host "  Click 'More info' -> 'Run anyway' to install." -ForegroundColor Yellow
Write-Host ""
Write-Host "************************************************************" -ForegroundColor Green
