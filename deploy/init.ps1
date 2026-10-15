# Crea .env y .env.taskview a partir de los .example con secretos aleatorios.
# No sobrescribe archivos existentes: se puede ejecutar sin riesgo.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function New-Secret([int]$bytes) {
    $buf = New-Object byte[] $bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
    return -join ($buf | ForEach-Object { $_.ToString('x2') })
}

$utf8 = New-Object System.Text.UTF8Encoding($false)

foreach ($pair in @(@('.env.example', '.env'), @('.env.taskview.example', '.env.taskview'))) {
    $src, $dst = $pair
    if (Test-Path $dst) { Write-Host "$dst ya existe, se conserva."; continue }
    $text = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $src))
    $text = $text -replace 'POSTGRES_PASSWORD=__GENERATE__', "POSTGRES_PASSWORD=$(New-Secret 24)"
    $text = $text -replace 'JWT_SIGN="__GENERATE__"', "JWT_SIGN=`"$(New-Secret 64)`""
    $text = $text -replace 'ENCRYPTION_KEY="__GENERATE__"', "ENCRYPTION_KEY=`"$(New-Secret 32)`""
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot $dst), $text, $utf8)
    Write-Host "$dst creado con secretos nuevos."
}
