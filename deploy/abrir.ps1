# ============================================================================
#  Vaultus - Abrir (uso diario)
#  Garante o Docker no ar, sobe o stack e abre o navegador. Janela oculta.
# ============================================================================

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$dc = @("compose", "-f", "docker-compose.yml", "-f", "deploy/docker-compose.simple.yml")
$Url = "http://localhost"

# --- 1. Docker Desktop no ar? -----------------------------------------------
& docker version *> $null
if ($LASTEXITCODE -ne 0) {
    $candidates = @(
        (Join-Path $Env:ProgramFiles "Docker\Docker\Docker Desktop.exe"),
        (Join-Path ${Env:ProgramFiles(x86)} "Docker\Docker\Docker Desktop.exe")
    )
    $exe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($exe) { Start-Process $exe }

    # Aguarda o engine responder (timeout ~120s).
    $deadline = (Get-Date).AddSeconds(120)
    do {
        Start-Sleep -Seconds 3
        & docker version *> $null
    } while ($LASTEXITCODE -ne 0 -and (Get-Date) -lt $deadline)
}

# --- 2. Subir o stack -------------------------------------------------------
& docker @dc up -d *> $null

# --- 3. Aguardar o app responder (timeout ~120s) ----------------------------
$deadline = (Get-Date).AddSeconds(120)
$ready = $false
do {
    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 3
} while ((Get-Date) -lt $deadline)

# --- 4. Abrir o navegador ---------------------------------------------------
Start-Process $Url
