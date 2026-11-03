# Packaging script for SYSA Hostinger deployment (Cross-Platform Linux Normalized Paths)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$deployDir = 'D:\sysa\deployment'
if (!(Test-Path $deployDir)) {
    New-Item -ItemType Directory -Path $deployDir | Out-Null
}

function Create-CleanZipArchive([string]$sourceDir, [string]$zipPath) {
    if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
    $archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    $files = Get-ChildItem -Path $sourceDir -Recurse -File -Force
    foreach ($file in $files) {
        $relPath = $file.FullName.Substring($sourceDir.Length).TrimStart('\','/').Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $relPath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    $archive.Dispose()
}

# 1. Package Complete Website (sysa-website-hostinger.zip) for public_html
$websiteOutDir = 'D:\sysa\website\out'
$websiteZipPath = Join-Path $deployDir 'sysa-website-hostinger.zip'

if (!(Test-Path $websiteOutDir)) {
    throw "website/out does not exist. Run npm run build:static --workspace=website first."
}

# Ensure .htaccess, proxy files, and brand icons are in website/out
Copy-Item 'D:\sysa\website\public\.htaccess' "$websiteOutDir\.htaccess" -Force
Copy-Item 'D:\sysa\website\public\api-proxy.php' "$websiteOutDir\api-proxy.php" -Force
Copy-Item 'D:\sysa\website\public\api-upstream.php' "$websiteOutDir\api-upstream.php" -Force
Copy-Item 'D:\sysa\website\public\favicon.ico' "$websiteOutDir\favicon.ico" -Force
Copy-Item 'D:\sysa\website\public\icon.png' "$websiteOutDir\icon.png" -Force
Copy-Item 'D:\sysa\website\public\apple-touch-icon.png' "$websiteOutDir\apple-touch-icon.png" -Force
Copy-Item 'D:\sysa\website\public\favicon-v2.ico' "$websiteOutDir\favicon-v2.ico" -Force
Copy-Item 'D:\sysa\website\public\icon-v2.png' "$websiteOutDir\icon-v2.png" -Force
Copy-Item 'D:\sysa\website\public\apple-touch-icon-v2.png' "$websiteOutDir\apple-touch-icon-v2.png" -Force
Copy-Item 'D:\sysa\website\public\logo.png' "$websiteOutDir\logo.png" -Force
Copy-Item 'D:\sysa\website\public\og-image.jpg' "$websiteOutDir\og-image.jpg" -Force
Copy-Item 'D:\sysa\website\public\og-image.png' "$websiteOutDir\og-image.png" -Force
Copy-Item 'D:\sysa\website\public\whatsapp-preview-v3.jpg' "$websiteOutDir\whatsapp-preview-v3.jpg" -Force

$stagingRoot = Join-Path $deployDir '.staging'
if (Test-Path $stagingRoot) { Remove-Item -Recurse -Force $stagingRoot -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $stagingRoot | Out-Null

# Create clean temporary staging directory for website
$tempWebSite = Join-Path $stagingRoot ('web-full-' + [System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempWebSite | Out-Null
Copy-Item "$websiteOutDir\*" -Destination $tempWebSite -Recurse -Force
# Ensure hidden files like .htaccess are copied
Get-ChildItem -Path $websiteOutDir -Filter ".*" -Force | Copy-Item -Destination $tempWebSite -Force

# Add Node.js standalone server and package.json so Hostinger's Node.js Web App
# onboarding uploader recognizes it as a valid Express/Node project, while still
# retaining index.html, .htaccess and api-proxy.php for direct public_html hosting.
Copy-Item 'D:\sysa\website\scripts\standalone-server.js' (Join-Path $tempWebSite 'server.js') -Force
$webPkgContent = @'
{
  "name": "sysa-website",
  "version": "0.1.0",
  "private": true,
  "description": "Sai Yadadri Seva Ashram — Production Website",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "build": "node -e \"console.log('Website ready')\""
  },
  "dependencies": {
    "express": "^4.21.1"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
'@
Set-Content -Path (Join-Path $tempWebSite 'package.json') -Value $webPkgContent -Encoding UTF8

# Exclude any .env or sensitive files from website zip
Get-ChildItem -Path $tempWebSite -Recurse -Force | Where-Object {
    $_.Name -like '.env*' -or
    $_.Name -like '*.log' -or
    $_.Name -like '*.git*'
} | Remove-Item -Force -Recurse

Create-CleanZipArchive -sourceDir $tempWebSite -zipPath $websiteZipPath
Copy-Item $websiteZipPath (Join-Path $deployDir 'public_html.zip') -Force
Copy-Item $websiteZipPath 'D:\sysa\public_html.zip' -Force
Remove-Item -Recurse -Force $tempWebSite
Write-Host "Created $websiteZipPath with size: $((Get-Item $websiteZipPath).Length) bytes"
Write-Host "Created D:\sysa\public_html.zip with size: $((Get-Item 'D:\sysa\public_html.zip').Length) bytes"

# 2. Package Website Proxy Fix Only (sysa-website-proxy-fix.zip)
$webProxyZipPath = Join-Path $deployDir 'sysa-website-proxy-fix.zip'
$tempProxy = Join-Path $stagingRoot ('web-proxy-' + [System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempProxy | Out-Null

Copy-Item 'D:\sysa\website\public\.htaccess' -Destination $tempProxy -Force
Copy-Item 'D:\sysa\website\public\api-proxy.php' -Destination $tempProxy -Force
Copy-Item 'D:\sysa\website\public\api-upstream.php' -Destination $tempProxy -Force

Create-CleanZipArchive -sourceDir $tempProxy -zipPath $webProxyZipPath
Remove-Item -Recurse -Force $tempProxy
Write-Host "Created $webProxyZipPath with size: $((Get-Item $webProxyZipPath).Length) bytes"

# 3. Package API Hostinger (sysa-api-hostinger.zip)
# Standalone structure: all API files at archive root so Hostinger's npm install,
# npm run build, and Entry File 'dist/server.js' work without monorepo / husky hooks.
$apiZipPath = Join-Path $deployDir 'sysa-api-hostinger.zip'
$tempApi = Join-Path $stagingRoot ('api-pkg-' + [System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempApi | Out-Null

# Generate standalone lockfile for API if not cached
$cachedLock = Join-Path $stagingRoot 'test-api-lock\package-lock.json'
if (!(Test-Path $cachedLock)) {
    $tempLockDir = Join-Path $stagingRoot ('api-lock-gen-' + [System.Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tempLockDir | Out-Null
    Copy-Item 'D:\sysa\api\package.json' -Destination $tempLockDir
    Push-Location $tempLockDir
    npm i --package-lock-only 2>$null
    Pop-Location
    $cachedLock = Join-Path $tempLockDir 'package-lock.json'
}

Copy-Item 'D:\sysa\api\package.json' -Destination $tempApi
Copy-Item 'D:\sysa\api\server.js' -Destination $tempApi
if (Test-Path $cachedLock) {
    Copy-Item $cachedLock -Destination (Join-Path $tempApi 'package-lock.json')
}
Copy-Item 'D:\sysa\api\tsconfig.json' -Destination $tempApi
Copy-Item 'D:\sysa\api\tsconfig.build.json' -Destination $tempApi

Copy-Item -Recurse 'D:\sysa\api\prisma' -Destination $tempApi
Copy-Item -Recurse 'D:\sysa\api\src' -Destination $tempApi
Copy-Item -Recurse 'D:\sysa\api\dist' -Destination $tempApi
Copy-Item -Recurse 'D:\sysa\api\scripts' -Destination $tempApi

# Exclude any .env or sensitive files from api zip
Get-ChildItem -Path $tempApi -Recurse -Force | Where-Object {
    $_.Name -like '.env*' -or
    $_.Name -like '*.log' -or
    $_.Name -like '*test-db*' -or
    $_.Name -like '*passwords*'
} | Remove-Item -Force -Recurse

Create-CleanZipArchive -sourceDir $tempApi -zipPath $apiZipPath
Remove-Item -Recurse -Force $tempApi
Write-Host "Created $apiZipPath with size: $((Get-Item $apiZipPath).Length) bytes"
