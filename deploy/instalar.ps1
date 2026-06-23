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

# Executa `docker <args...>` e aborta se o exit code não for 0.
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
    & docker version *> $null
    if ($LASTEXITCODE -ne 0) {
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
    Invoke-Docker @($dc + @("run", "--rm", "--no-deps", "app",
        "composer", "install", "--no-interaction", "--no-dev", "--optimize-autoloader"))
    Write-Ok "Dependencias PHP instaladas."

    # --- 5. Build do frontend -------------------------------------------------
    Write-Step "Compilando a interface (npm). Isto demora na 1a vez..."
    Invoke-Docker @($dc + @("--profile", "dev", "run", "--rm", "node",
        "sh", "-c", "npm install && npm run build"))
    Write-Ok "Interface compilada."

    # --- 6. Subir o stack -----------------------------------------------------
    Write-Step "Iniciando os servicos..."
    Invoke-Docker @($dc + @("up", "-d"))
    Write-Ok "Servicos no ar."

    # --- 7. Banco de dados ----------------------------------------------------
    Write-Step "Preparando o banco de dados..."
    Invoke-Docker @($dc + @("exec", "-T", "app", "php", "artisan", "migrate", "--force"))
    Invoke-Docker @($dc + @("exec", "-T", "app", "php", "artisan", "db:seed", "--force"))
    Invoke-Docker @($dc + @("exec", "-T", "app", "php", "artisan", "storage:link"))
    Write-Ok "Banco pronto."

    # --- 8. Permissoes (salvaguarda) ------------------------------------------
    Invoke-Docker @($dc + @("exec", "-T", "app", "sh", "-c",
        "chmod -R ug+rw storage bootstrap/cache"))

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
    Write-Host "  Endereco: http://localhost"
    Write-Host "  Login:    teste@vaultus.local"
    Write-Host "  Senha:    senha123"
    Write-Host ""
    Write-Host "  No dia a dia, use o atalho 'Vaultus' na Area de Trabalho."
    Write-Host ""
    Start-Process "http://localhost"
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
