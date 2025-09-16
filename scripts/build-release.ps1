# build-release.ps1
# Uso: .\build-release.ps1 chrome|edge|firefox

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("chrome", "edge", "firefox")]
    [string]$target
)

$manifest = "manifest.$target.json"
$dest = "manifest.json"

if (!(Test-Path $manifest)) {
    Write-Error "No manifest found for $target ($manifest)"
    exit 1
}

Copy-Item $manifest $dest -Force

$zipName = "Easy.Compressor-$target.zip"

$destinationPath = Join-Path (Get-Location) $zipName

$itemsToExclude = @("*.zip", "build-release.ps1", "manifest.chrome.json", "manifest.edge.json", "manifest.firefox.json")
$itemsToCompress = Get-ChildItem -Path . -Recurse | Where-Object { 
    $_.Name -notin $itemsToExclude -and $_.FullName
}

if (Test-Path $destinationPath) { Remove-Item $destinationPath }
Compress-Archive -Path $itemsToCompress.FullName -DestinationPath $destinationPath -CompressionLevel Optimal

Write-Host "Release package created: $destinationPath"