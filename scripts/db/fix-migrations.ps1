param(
  [switch]$Apply
)

$root = Join-Path (Get-Location) "src\prisma\migrations"
if (-not (Test-Path $root)) { Write-Output "No migrations directory"; exit 0 }

$bad = @()
Get-ChildItem -Path $root -Directory | ForEach-Object {
  $sql = Join-Path $_.FullName 'migration.sql'
  if (-not (Test-Path $sql)) { $bad += $_.FullName }
}

if ($bad.Count -eq 0) { Write-Output "No broken migrations"; exit 0 }

Write-Output "Broken migrations:"; $bad | ForEach-Object { Write-Output $_ }

if (-not $Apply) { Write-Output "Dry-run. Use -Apply to delete."; exit 0 }

foreach ($dir in $bad) {
  Remove-Item -Recurse -Force $dir
}
Write-Output "Deleted broken migrations"

