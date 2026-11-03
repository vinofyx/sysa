Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$deployDir = 'D:\sysa\deployment'
$webZipPath = Join-Path $deployDir 'sysa-website-hostinger.zip'
$proxyZipPath = Join-Path $deployDir 'sysa-website-proxy-fix.zip'
$apiZipPath = Join-Path $deployDir 'sysa-api-hostinger.zip'

Write-Host "=========================================================="
Write-Host "VALIDATING: sysa-website-hostinger.zip"
Write-Host "=========================================================="
$w = [System.IO.Compression.ZipFile]::OpenRead($webZipPath)
Write-Host "File Size: $([Math]::Round((Get-Item $webZipPath).Length / 1MB, 2)) MB ($((Get-Item $webZipPath).Length) bytes)"
Write-Host "Total Entries: $($w.Entries.Count)"

$hasRootIndex = ($w.Entries | Where-Object { $_.FullName -eq 'index.html' }).Count -gt 0
Write-Host " - index.html at archive root: $hasRootIndex"

$hasHtaccess = ($w.Entries | Where-Object { $_.FullName -eq '.htaccess' }).Count -gt 0
Write-Host " - .htaccess at archive root: $hasHtaccess"

$hasProxy = ($w.Entries | Where-Object { $_.FullName -eq 'api-proxy.php' }).Count -gt 0
Write-Host " - api-proxy.php at archive root: $hasProxy"

$hasUpstream = ($w.Entries | Where-Object { $_.FullName -eq 'api-upstream.php' }).Count -gt 0
Write-Host " - api-upstream.php at archive root: $hasUpstream"

$hasDonate = ($w.Entries | Where-Object { $_.FullName -eq 'donate/index.html' }).Count -gt 0
Write-Host " - donate/index.html present: $hasDonate"

$has404 = ($w.Entries | Where-Object { $_.FullName -eq '404.html' }).Count -gt 0
Write-Host " - 404.html present: $has404"

$hasOgImage = ($w.Entries | Where-Object { $_.FullName -eq 'og-image.jpg' }).Count -gt 0
Write-Host " - og-image.jpg at archive root: $hasOgImage"

$hasWhatsappPreviewV3 = ($w.Entries | Where-Object { $_.FullName -eq 'whatsapp-preview-v3.jpg' }).Count -gt 0
Write-Host " - whatsapp-preview-v3.jpg at archive root: $hasWhatsappPreviewV3"

$hasFavicon = ($w.Entries | Where-Object { $_.FullName -eq 'favicon.ico' }).Count -gt 0
Write-Host " - favicon.ico at archive root: $hasFavicon"

$hasFaviconV2 = ($w.Entries | Where-Object { $_.FullName -eq 'favicon-v2.ico' }).Count -gt 0
Write-Host " - favicon-v2.ico at archive root: $hasFaviconV2"

$hasIconV2 = ($w.Entries | Where-Object { $_.FullName -eq 'icon-v2.png' }).Count -gt 0
Write-Host " - icon-v2.png at archive root: $hasIconV2"

$hasAppleTouchIconV2 = ($w.Entries | Where-Object { $_.FullName -eq 'apple-touch-icon-v2.png' }).Count -gt 0
Write-Host " - apple-touch-icon-v2.png at archive root: $hasAppleTouchIconV2"

$hasLogo = ($w.Entries | Where-Object { $_.FullName -eq 'logo.png' }).Count -gt 0
Write-Host " - logo.png at archive root: $hasLogo"

$nextChunks = ($w.Entries | Where-Object { $_.FullName -like '_next/static/chunks/*.js' }).Count
Write-Host " - _next/static/chunks count: $nextChunks"

$nextCss = ($w.Entries | Where-Object { $_.FullName -like '_next/static/css/*.css' }).Count
Write-Host " - _next/static/css count: $nextCss"

$imagesCount = ($w.Entries | Where-Object { $_.FullName -like 'images/*' }).Count
Write-Host " - images count: $imagesCount"

$videosCount = ($w.Entries | Where-Object { $_.FullName -like 'videos/*' }).Count
Write-Host " - videos count: $videosCount"

$envFiles = ($w.Entries | Where-Object { $_.FullName -like '*.env*' }).Count
Write-Host " - .env files count: $envFiles (MUST BE 0)"

$backslashEntries = ($w.Entries | Where-Object { $_.FullName -like '*\*' }).Count
Write-Host " - Backslash paths: $backslashEntries (MUST BE 0)"

$w.Dispose()

Write-Host "`n=========================================================="
Write-Host "VALIDATING: sysa-website-proxy-fix.zip"
Write-Host "=========================================================="
$p = [System.IO.Compression.ZipFile]::OpenRead($proxyZipPath)
Write-Host "File Size: $((Get-Item $proxyZipPath).Length) bytes"
$p.Entries | ForEach-Object { Write-Host " - $($_.FullName) ($($_.Length) bytes)" }
$p.Dispose()

Write-Host "`n=========================================================="
Write-Host "VALIDATING: sysa-api-hostinger.zip"
Write-Host "=========================================================="
$a = [System.IO.Compression.ZipFile]::OpenRead($apiZipPath)
Write-Host "File Size: $([Math]::Round((Get-Item $apiZipPath).Length / 1MB, 2)) MB ($((Get-Item $apiZipPath).Length) bytes)"
Write-Host "Total Entries: $($a.Entries.Count)"
$apiEnv = ($a.Entries | Where-Object { $_.FullName -like '*.env*' }).Count
Write-Host " - .env files count: $apiEnv (MUST BE 0)"
$apiNodeModules = ($a.Entries | Where-Object { $_.FullName -like '*node_modules*' }).Count
Write-Host " - node_modules count: $apiNodeModules (MUST BE 0)"
$hasDistServer = ($a.Entries | Where-Object { $_.FullName -eq 'dist/server.js' }).Count -gt 0
Write-Host " - dist/server.js at archive root: $hasDistServer"
$hasDistHealth = ($a.Entries | Where-Object { $_.FullName -eq 'dist/routes/v1/health.routes.js' }).Count -gt 0
Write-Host " - dist/routes/v1/health.routes.js present: $hasDistHealth"
$hasPackageJson = ($a.Entries | Where-Object { $_.FullName -eq 'package.json' }).Count -gt 0
Write-Host " - package.json at archive root: $hasPackageJson"
$hasPrismaSchema = ($a.Entries | Where-Object { $_.FullName -eq 'prisma/schema.prisma' }).Count -gt 0
Write-Host " - prisma/schema.prisma present: $hasPrismaSchema"
$a.Dispose()
Write-Host "`nALL VALIDATIONS COMPLETE."
