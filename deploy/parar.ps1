# ============================================================================
#  Vaultus - Parar
#  Desliga os servicos. Os DADOS (banco/.env) sao PRESERVADOS.
# ============================================================================

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$dc = @("compose", "-f", "docker-compose.yml", "-f", "deploy/docker-compose.simple.yml")

# `down` para os containers mas NAO remove os volumes (pgdata/redisdata),
# entao nada de dados e perdido.
& docker @dc down
