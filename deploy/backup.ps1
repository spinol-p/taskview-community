# Respaldo de la base de datos en deploy\backups\taskview-AAAAMMDD-HHMMSS.dump (formato custom de pg_dump).
# Uso: .\backup.ps1 [-Keep 30]   (conserva los N respaldos mas recientes)
param([int]$Keep = 30)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$envVars = @{}
Get-Content .env | Where-Object { $_ -match '^\s*([A-Z_]+)=(.*)$' } | ForEach-Object { $envVars[$Matches[1]] = $Matches[2].Trim('"') }

New-Item -ItemType Directory -Force backups | Out-Null
$name = "taskview-$(Get-Date -Format 'yyyyMMdd-HHmmss').dump"

docker compose exec -T db pg_dump -U $envVars.POSTGRES_USER -d $envVars.POSTGRES_DB -Fc -f /tmp/backup.dump
if ($LASTEXITCODE -ne 0) { throw "pg_dump fallo (el contenedor db esta levantado?)" }
docker compose cp db:/tmp/backup.dump "backups/$name"
if ($LASTEXITCODE -ne 0) { throw "No se pudo copiar el respaldo" }
docker compose exec -T db rm -f /tmp/backup.dump | Out-Null

Get-ChildItem backups -Filter 'taskview-*.dump' | Sort-Object Name -Descending | Select-Object -Skip $Keep | Remove-Item
$size = [math]::Round((Get-Item "backups/$name").Length / 1KB, 1)
Write-Host "Respaldo creado: deploy\backups\$name ($size KB)"
