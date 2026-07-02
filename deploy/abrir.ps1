# ============================================================================
#  Vaultus - Abrir (uso diario)
#  Garante o Docker no ar, sobe o stack e abre o navegador. Janela oculta.
# ============================================================================

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$dc = @("compose", "-f", "docker-compose.yml", "-f", "deploy/docker-compose.simple.yml")
$Url = "http://localhost"

# A janela roda oculta (-WindowStyle Hidden no .bat), entao erros precisam
# aparecer como caixa de dialogo - senao "nada acontece" e o usuario fica perdido.
function Show-Alert($msg) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($msg, "Vaultus",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Warning) | Out-Null
}

# --- 1. Docker Desktop no ar? -----------------------------------------------
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Show-Alert "O Docker Desktop nao esta instalado. Rode 'Instalar Vaultus' novamente."
    exit 1
}
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

if (-not $ready) {
    Show-Alert "O Vaultus nao respondeu. Confira se o Docker Desktop esta aberto (icone da baleia) e clique no atalho de novo. Se continuar, rode 'Instalar Vaultus' novamente."
    exit 1
}

# --- 4. Abrir o navegador ---------------------------------------------------
Start-Process $Url
