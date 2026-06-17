# Pack files needed for Cloudflare Pages deploy
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $root "deploy-pack"
$zipPath = Join-Path $root "anime-season-calendar-deploy.zip"

if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

New-Item -ItemType Directory -Path $outDir | Out-Null

Copy-Item (Join-Path $root "standalone") (Join-Path $outDir "standalone") -Recurse
Copy-Item (Join-Path $root "functions") (Join-Path $outDir "functions") -Recurse
Copy-Item (Join-Path $root "wrangler.toml") $outDir
Copy-Item (Join-Path $root "DEPLOY.md") $outDir
Copy-Item (Join-Path $root ".gitignore") $outDir
Copy-Item (Join-Path $root "README.md") $outDir

Compress-Archive -Path (Join-Path $outDir "*") -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "Done: $zipPath"
Write-Host "Next: push to GitHub and connect Cloudflare Pages. See DEPLOY.md"
