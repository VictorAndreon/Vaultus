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
    if ($LASTEXITCODE -ne 0) {
        # Achata arrays aninhados (as chamadas passam UM argumento que e um
        # array); sem isso a mensagem sairia como "docker System.Object[]".
        $flat = @($Args | ForEach-Object { $_ })
        throw "Comando falhou (codigo $LASTEXITCODE): docker $($flat -join ' ')"
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "         Atualizar o Vaultus" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Warn "Seus dados (login, banco) serao mantidos."

try {
    # --- Docker disponivel? ---------------------------------------------------
    # Get-Command primeiro: com ErrorActionPreference=Stop, invocar um comando
    # inexistente lancaria excecao e pularia direto pro catch generico.
    $dockerOk = [bool](Get-Command docker -ErrorAction SilentlyContinue)
    if ($dockerOk) { & docker version *> $null; $dockerOk = ($LASTEXITCODE -eq 0) }
    if (-not $dockerOk) {
        Write-Warn "Abra o Docker Desktop e tente novamente."
        Read-Host "`nPressione ENTER para sair"; exit 1
    }

    # --- Baixar o codigo novo (git) ------------------------------------------
    Write-Step "Baixando a versao mais nova do codigo..."
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Warn "O 'git' nao esta instalado, entao nao da pra atualizar automaticamente."
        Write-Warn "Peca a versao nova de quem cuida do Vaultus."
        Read-Host "`nPressione ENTER para sair"; exit 1
    }
    # Descarta mudancas acidentais em arquivos RASTREADOS (ex.: package-lock
    # reescrito por um npm antigo), senao o pull falha com "local changes would
    # be overwritten". .env, banco e uploads nao sao rastreados - ficam intactos.
    & git restore . *> $null
    $branch = (& git rev-parse --abbrev-ref HEAD).Trim()
    & git pull origin $branch
    if ($LASTEXITCODE -ne 0) { throw "Falha ao baixar o codigo (git pull)." }
    Write-Ok "Codigo atualizado."

    # --- Reconstruir imagem (caso o Dockerfile tenha mudado) -----------------
    Write-Step "Reconstruindo a base do app..."
    Invoke-Docker @($dc + @("build"))

    # --- Dependencias PHP -----------------------------------------------------
    Write-Step "Atualizando dependencias do PHP..."
    # Producao: --no-dev (igual ao instalar). Sem seed de demo no update.
    Invoke-Docker @($dc + @("run", "--rm", "--no-deps", "app",
        "composer", "install", "--no-interaction", "--no-dev", "--optimize-autoloader"))

    # --- Build do frontend ----------------------------------------------------
    Write-Step "Recompilando a interface..."
    # npm ci: instala exatamente o package-lock.json SEM reescreve-lo (um lock
    # alterado sujaria o working tree e quebraria o proximo git pull).
    Invoke-Docker @($dc + @("--profile", "dev", "run", "--rm", "node",
        "sh", "-c", "npm ci && npm run build"))

    # --- Subir + migrar -------------------------------------------------------
    Write-Step "Reiniciando os servicos e aplicando migracoes..."
    Invoke-Docker @($dc + @("up", "-d"))
    Invoke-Docker @($dc + @("exec", "-T", "app", "php", "artisan", "migrate", "--force"))
    # storage:link cria symlink e pode falhar em mount NTFS sem o Modo
    # Desenvolvedor do Windows. Nao e fatal (as capas sao servidas por rota).
    & docker @($dc + @("exec", "-T", "app", "php", "artisan", "storage:link"))
    if ($LASTEXITCODE -ne 0) { Write-Warn "Aviso: 'storage:link' falhou; o app funciona mesmo assim." }

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
