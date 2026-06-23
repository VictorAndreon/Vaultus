# ============================================================================
#  Vaultus - Atualizar
#  Baixa a versao mais nova do codigo e reaplica build/migracoes.
#  Os DADOS sao PRESERVADOS:
#    - .env  -> esta no disco e e ignorado pelo git (o pull nunca o sobrescreve)
#    - banco -> vive no volume Docker 'pgdata' (codigo novo nao o toca)
#  Em nenhum momento usamos `down -v` / remocao de volume.
# ============================================================================

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$dc = @("compose", "-f", "docker-compose.yml", "-f", "deploy/docker-compose.simple.yml")

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    $msg" -ForegroundColor Yellow }

function Invoke-Docker {
    param([Parameter(ValueFromRemainingArguments = $true)] $Args)
    & docker @Args
    if ($LASTEXITCODE -ne 0) { throw "Comando falhou: docker $($Args -join ' ')" }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "         Atualizar o Vaultus" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Warn "Seus dados (login, banco) serao mantidos."

try {
    # --- Docker disponivel? ---------------------------------------------------
    & docker version *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Abra o Docker Desktop e tente novamente."
        Read-Host "`nPressione ENTER para sair"; exit 1
    }

    # --- Baixar o codigo novo (git) ------------------------------------------
    Write-Step "Baixando a versao mais nova do codigo..."
    & git --version *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "O 'git' nao esta instalado, entao nao da pra atualizar automaticamente."
        Write-Warn "Peca a versao nova de quem cuida do Vaultus."
        Read-Host "`nPressione ENTER para sair"; exit 1
    }
    $branch = (& git rev-parse --abbrev-ref HEAD).Trim()
    & git pull origin $branch
    if ($LASTEXITCODE -ne 0) { throw "Falha ao baixar o codigo (git pull)." }
    Write-Ok "Codigo atualizado."

    # --- Reconstruir imagem (caso o Dockerfile tenha mudado) -----------------
    Write-Step "Reconstruindo a base do app..."
    Invoke-Docker @($dc + @("build"))

    # --- Dependencias PHP -----------------------------------------------------
    Write-Step "Atualizando dependencias do PHP..."
    Invoke-Docker @($dc + @("run", "--rm", "--no-deps", "app",
        "composer", "install", "--no-interaction", "--no-dev", "--optimize-autoloader"))

    # --- Build do frontend ----------------------------------------------------
    Write-Step "Recompilando a interface..."
    Invoke-Docker @($dc + @("--profile", "dev", "run", "--rm", "node",
        "sh", "-c", "npm install && npm run build"))

    # --- Subir + migrar -------------------------------------------------------
    Write-Step "Reiniciando os servicos e aplicando migracoes..."
    Invoke-Docker @($dc + @("up", "-d"))
    Invoke-Docker @($dc + @("exec", "-T", "app", "php", "artisan", "migrate", "--force"))
    Invoke-Docker @($dc + @("exec", "-T", "app", "php", "artisan", "storage:link"))

    Write-Host "`n============================================" -ForegroundColor Green
    Write-Host "  Vaultus atualizado com sucesso!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Start-Process "http://localhost"
}
catch {
    Write-Host "`n Erro na atualizacao: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host " Seus dados continuam intactos. Tente novamente." -ForegroundColor Red
}
finally {
    Read-Host "`nPressione ENTER para fechar"
}
