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

if (Test-Path $destinationPath) {
    Remove-Item $destinationPath
}

# Construir el ZIP desde un staging dir para preservar subdirectorios
$stagingDir = Join-Path $repoRoot "_staging"
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null
try {
    Copy-Item (Join-Path $repoRoot "manifest.json") $stagingDir
    Copy-Item (Join-Path $repoRoot "background.js") $stagingDir
    Copy-Item (Join-Path $repoRoot "content.js") $stagingDir
    Copy-Item (Join-Path $repoRoot "popup.html") $stagingDir

    $imagesPath = Join-Path $repoRoot "images"
    if (Test-Path $imagesPath) {
        $stagingImages = Join-Path $stagingDir "images"
        New-Item -ItemType Directory -Path $stagingImages -Force | Out-Null
        Copy-Item (Join-Path $imagesPath "*.png") $stagingImages
    }

    Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $destinationPath -CompressionLevel Optimal
}
finally {
    Remove-Item -Recurse -Force $stagingDir
}

# Restaurar manifest.json original después del build de Firefox
if ($target -eq "firefox") {
    $backup = Join-Path $repoRoot "manifest.json.bak"
    if (Test-Path $backup) {
        Move-Item $backup (Join-Path $repoRoot "manifest.json") -Force
    }
}

Write-Host "Release package created: $destinationPath"
