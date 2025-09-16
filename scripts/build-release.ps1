# build-release.ps1
# Usage: .\build-release.ps1 chrome|edge|firefox

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("chrome", "edge", "firefox")]
    [string]$target
)

$repoRoot = Get-Location

$manifest = "manifest.$target.json"
$dest = "manifest.json"
$zipName = "Easy.Compressor-$target.zip"
$destinationPath = Join-Path $repoRoot $zipName

if (!(Test-Path $manifest)) {
    Write-Error "No manifest found for $target ($manifest)"
    exit 1
}

Copy-Item $manifest $dest -Force

$itemsToExclude = @("*.zip", "build-release.ps1", "manifest.chrome.json", "manifest.edge.json", "manifest.firefox.json")
$itemsToCompress = Get-ChildItem -Path $repoRoot -Recurse | Where-Object { 
    $_.Name -notin $itemsToExclude -and $_.FullName -notmatch "manifest.json"
}

if (Test-Path $destinationPath) { 
    Remove-Item $destinationPath 
}

Compress-Archive -Path $itemsToCompress.FullName -DestinationPath $destinationPath -CompressionLevel Optimal

Write-Host "Release package created: $destinationPath"