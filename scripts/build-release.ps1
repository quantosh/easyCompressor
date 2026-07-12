param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("chrome", "edge", "firefox")]
    [string]$target
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$zipName = "Easy.Compressor-$target.zip"
$destinationPath = Join-Path $repoRoot $zipName

# Firefox necesita su manifest específico, Chrome/Edge usan manifest.json directo
if ($target -eq "firefox") {
    $firefoxManifest = Join-Path $repoRoot "manifest.firefox.json"
    if (!(Test-Path $firefoxManifest)) {
        Write-Error "No manifest found for Firefox (manifest.firefox.json)"
        exit 1
    }
    $backup = Join-Path $repoRoot "manifest.json.bak"
    Copy-Item (Join-Path $repoRoot "manifest.json") $backup -Force
    Copy-Item $firefoxManifest (Join-Path $repoRoot "manifest.json") -Force
}

$filesToInclude = @(
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js"
)

$imagesPath = Join-Path $repoRoot "images"
if (Test-Path $imagesPath) {
    $filesToInclude += Get-ChildItem -Path $imagesPath -Filter "*.png" | ForEach-Object { "images/$($_.Name)" }
}

if (Test-Path $destinationPath) {
    Remove-Item $destinationPath
}

$fullPaths = $filesToInclude | ForEach-Object { Join-Path $repoRoot $_ }
Compress-Archive -Path $fullPaths -DestinationPath $destinationPath -CompressionLevel Optimal

# Restaurar manifest.json original después del build de Firefox
if ($target -eq "firefox") {
    $backup = Join-Path $repoRoot "manifest.json.bak"
    if (Test-Path $backup) {
        Move-Item $backup (Join-Path $repoRoot "manifest.json") -Force
    }
}

Write-Host "Release package created: $destinationPath"
