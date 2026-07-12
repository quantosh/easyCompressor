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

$filesToInclude = @(
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js"
) + (Get-ChildItem -Path (Join-Path $repoRoot "images") -Filter "*.png" | ForEach-Object { $_.Name } | ForEach-Object { "images/$_" })

if (Test-Path $destinationPath) {
    Remove-Item $destinationPath
}

$fullPaths = $filesToInclude | ForEach-Object { Join-Path $repoRoot $_ }
Compress-Archive -Path $fullPaths -DestinationPath $destinationPath -CompressionLevel Optimal

Write-Host "Release package created: $destinationPath"
