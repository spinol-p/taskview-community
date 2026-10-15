# Restaura un respaldo creado con backup.ps1. REEMPLAZA los datos actuales.
# Uso: .\restore.ps1 backups\taskview-20261015-120000.dump
param([Parameter(Mandatory = $true)][string]$File)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path $File)) { throw "No existe $File" }

$envVars = @{}
Get-Content .env | Where-Object { $_ -match '^\s*([A-Z_]+)=(.*)$' } | ForEach-Object { $envVars[$Matches[1]] = $Matches[2].Trim('"') }

$answer = Read-Host "Se reemplazaran TODOS los datos actuales con $File. Escribe SI para continuar"
if ($answer -ne 'SI') { Write-Host 'Cancelado.'; exit 1 }

# Respaldo de seguridad del estado actual antes de pisarlo
& "$PSScriptRoot\backup.ps1"

docker compose stop taskview-api-server taskview-mcp
docker compose cp $File db:/tmp/restore.dump
docker compose exec -T db pg_restore -U $envVars.POSTGRES_USER -d $envVars.POSTGRES_DB --clean --if-exists --no-owner /tmp/restore.dump
$code = $LASTEXITCODE
docker compose exec -T db rm -f /tmp/restore.dump | Out-Null
docker compose start taskview-api-server taskview-mcp
if ($code -ne 0) { Write-Warning "pg_restore termino con codigo $code; revisa los mensajes de arriba." } else { Write-Host 'Restauracion completa.' }
