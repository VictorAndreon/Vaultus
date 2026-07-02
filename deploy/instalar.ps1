# ============================================================================
#  Vaultus - Instalador (rodar UMA vez)
#  Sobe o stack Docker em http://localhost, prepara o banco e cria os atalhos.
# ============================================================================

$ErrorActionPreference = "Stop"

# Raiz do projeto = pasta-pai de deploy/ (onde este script vive).
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

# Comando base do Compose no "modo simples" (ignora o override -> localhost).
$dc = @(
    "compose",
    "-f", "docker-compose.yml",
    "-f", "deploy/docker-compose.simple.yml"
)

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    $msg" -ForegroundColor Yellow }

# Executa `docker <args...>` e aborta se o exit code nao for 0.
function Invoke-Docker {
    param([Parameter(ValueFromRemainingArguments = $true)] $Args)
    & docker @Args
    if ($LASTEXITCODE -ne 0) {
        throw "Comando falhou (codigo $LASTEXITCODE): docker $($Args -join ' ')"
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "         Instalador do Vaultus" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Warn "A PRIMEIRA instalacao baixa imagens e compila o app."
Write-Warn "Pode levar VARIOS MINUTOS. Nao feche esta janela."

try {
    # --- 1. Docker disponivel? ------------------------------------------------
    Write-Step "Verificando o Docker Desktop..."
    # Get-Command primeiro: com ErrorActionPreference=Stop, invocar um comando
    # inexistente lancaria excecao e cairia no catch generico, sem mostrar a
    # mensagem amigavel abaixo (com o link de download).
    $dockerOk = [bool](Get-Command docker -ErrorAction SilentlyContinue)
    if ($dockerOk) { & docker version *> $null; $dockerOk = ($LASTEXITCODE -eq 0) }
    if (-not $dockerOk) {
        Write-Warn "O Docker Desktop nao esta instalado ou nao esta rodando."
        Write-Warn "Vou abrir a pagina de download. Instale, ABRA o Docker Desktop"
        Write-Warn "e rode este instalador novamente."
        Start-Process "https://www.docker.com/products/docker-desktop/"
        Read-Host "`nPressione ENTER para sair"
        exit 1
    }
    Write-Ok "Docker OK."

    # --- 2. Arquivo .env ------------------------------------------------------
    Write-Step "Preparando configuracao (.env)..."
    $envPath = Join-Path $Root ".env"
    if (-not (Test-Path $envPath)) {
        Copy-Item (Join-Path $PSScriptRoot ".env.simple.example") $envPath
        Write-Ok ".env criado a partir do modelo."
    } else {
        Write-Ok ".env ja existe (mantido)."
    }

    # --- 3. APP_KEY -----------------------------------------------------------
    Write-Step "Gerando chave de seguranca (APP_KEY)..."
    $content = Get-Content $envPath -Raw
    if ($content -match "(?m)^APP_KEY=.+$") {
        Write-Ok "APP_KEY ja definida (mantida)."
    } else {
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $key = "base64:" + [Convert]::ToBase64String($bytes)
        $content = $content -replace "(?m)^APP_KEY=.*$", "APP_KEY=$key"
        Set-Content -Path $envPath -Value $content -NoNewline
        Write-Ok "APP_KEY gerada."
    }

    # --- 4. composer install (dependencias PHP) -------------------------------
    Write-Step "Instalando dependencias do PHP (composer)..."
    # Producao: --no-dev (sem dependencias de desenvolvimento, ex.: faker).
    # Nao ha seed: o proprio app cria a conta no primeiro acesso (tela de
    # cadastro, que trava apos o 1o usuario).
    Invoke-Docker @($dc + @("run", "--rm", "--no-deps", "app",
        "composer", "install", "--no-interaction", "--no-dev", "--optimize-autoloader"))
    Write-Ok "Dependencias PHP instaladas."

    # --- 5. Build do frontend -------------------------------------------------
    Write-Step "Compilando a interface (npm). Isto demora na 1a vez..."
    # npm ci: instala exatamente o package-lock.json SEM reescreve-lo (um lock
    # alterado sujaria o working tree e quebraria o git pull do atualizador).
    Invoke-Docker @($dc + @("--profile", "dev", "run", "--rm", "node",
        "sh", "-c", "npm ci && npm run build"))
    Write-Ok "Interface compilada."

    # --- 6. Subir o stack -----------------------------------------------------
    Write-Step "Iniciando os servicos..."
    Invoke-Docker @($dc + @("up", "-d"))
    Write-Ok "Servicos no ar."

    # --- 7. Banco de dados ----------------------------------------------------
    Write-Step "Preparando o banco de dados..."
    Invoke-Docker @($dc + @("exec", "-T", "app", "php", "artisan", "migrate", "--force"))
    # Sem seed: a conta e criada pelo proprio usuario no primeiro acesso.
    # storage:link cria symlink e pode falhar em mount NTFS sem o Modo
    # Desenvolvedor do Windows. Nao e fatal (as capas sao servidas por rota),
    # entao so avisa em vez de abortar a instalacao com o banco ja pronto.
    & docker @($dc + @("exec", "-T", "app", "php", "artisan", "storage:link"))
    if ($LASTEXITCODE -ne 0) { Write-Warn "Aviso: 'storage:link' falhou; o app funciona mesmo assim." }
    Write-Ok "Banco pronto."

    # --- 8. Permissoes (salvaguarda) ------------------------------------------
    # Roda como root: o container "app" usa um usuario fixo (1000:1000) e, em
    # mounts do Windows (Docker Desktop/WSL2), os arquivos podem aparecer com
    # dono diferente desse uid, fazendo chmod falhar com "Operation not
    # permitted". Nao e fatal (mesmo motivo do storage:link acima): so avisa.
    & docker @($dc + @("exec", "-T", "--user", "root", "app", "sh", "-c",
        "chmod -R ug+rw storage bootstrap/cache"))
    if ($LASTEXITCODE -ne 0) { Write-Warn "Aviso: ajuste de permissoes falhou; o app funciona mesmo assim." }

    # --- 9. Atalhos na Area de Trabalho ---------------------------------------
    Write-Step "Criando atalhos na Area de Trabalho..."
    $desktop = [Environment]::GetFolderPath("Desktop")
    $icon = Join-Path $PSScriptRoot "vaultus.ico"
    $shell = New-Object -ComObject WScript.Shell

    function New-Shortcut($name, $batFile, $desc) {
        $lnk = $shell.CreateShortcut((Join-Path $desktop $name))
        $lnk.TargetPath       = Join-Path $PSScriptRoot $batFile
        $lnk.WorkingDirectory = $Root
        $lnk.Description       = $desc
        if (Test-Path $icon) { $lnk.IconLocation = $icon }
        $lnk.Save()
    }

    New-Shortcut "Vaultus.lnk"           "Abrir Vaultus.bat"     "Abrir o Vaultus"
    New-Shortcut "Parar Vaultus.lnk"     "Parar Vaultus.bat"     "Desligar o Vaultus"
    New-Shortcut "Atualizar Vaultus.lnk" "Atualizar Vaultus.bat" "Atualizar o Vaultus"
    Write-Ok "Atalhos 'Vaultus', 'Parar Vaultus' e 'Atualizar Vaultus' criados."

    # --- 10. Final ------------------------------------------------------------
    Write-Host "`n============================================" -ForegroundColor Green
    Write-Host "  Pronto! O Vaultus esta instalado." -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Vou abrir http://localhost no navegador."
    Write-Host "  CRIE SUA CONTA na primeira tela (seu nome, email e senha)."
    Write-Host "  Esse cadastro funciona so uma vez: a conta criada e a sua." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  No dia a dia, use o atalho 'Vaultus' na Area de Trabalho."
    Write-Host ""
    Start-Process "http://localhost/register"
}
catch {
    Write-Host "`n--------------------------------------------" -ForegroundColor Red
    Write-Host " Algo deu errado na instalacao:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    Write-Host " Verifique se o Docker Desktop esta aberto e" -ForegroundColor Red
    Write-Host " rode o instalador novamente." -ForegroundColor Red
    Write-Host "--------------------------------------------" -ForegroundColor Red
}
finally {
    Read-Host "`nPressione ENTER para fechar"
}
