# Vaultus — Progresso da Fase 0

**Branch de implementação:** `phase-0-foundation`
**Worktree:** `.worktrees/phase-0/`
**Última atualização:** 2026-05-10

## Como retomar

```bash
# O worktree já existe — trabalhe diretamente nele:
cd /home/andreon/Documentos/Vaultus/.worktrees/phase-0/

# Docker: use sg docker para contornar grupo não carregado na sessão
sg docker -c "docker compose ps"
sg docker -c "docker compose run --rm app php artisan ..."

# Serviços já rodando: db (postgres:16), redis
# Para subir os demais: sg docker -c "docker compose up -d"
```

## Nota de ambiente

- PHP 8.4 (host tem 8.4, Dockerfile ajustado para 8.4 — Laravel 11 suporta)
- `vendor/` NÃO comitado (instalado dentro do container)
- Node: `@vitejs/plugin-react@^4` (compatível com Vite 6; v6+ exige Vite 8)
- CSRF desabilitado nos testes via `tests/TestCase.php` (withoutMiddleware)
- `newFactory()` sobrescrito no User model para apontar para `Database\Factories\UserFactory`

---

## Status das Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Docker Compose + Dockerfile + Caddy | ✅ Concluída |
| 2 | Laravel 11 + Configuração Inicial | ✅ Concluída |
| 3 | Inertia.js + React + TypeScript | ✅ Concluída |
| 4 | Estrutura de Pastas dos Domínios | ✅ Concluída |
| 5 | Migrations — Fundação (users, tokens, audit_logs) | ✅ Concluída |
| 6–10 | Migrations — Todos os domínios (33 migrations) | ✅ Concluída |
| 11 | EncryptedCast (TDD) | ✅ Concluída |
| 12 | User Model + AuditLog Model | ✅ Concluída |
| 13 | TwoFactorService (TDD) | ✅ Concluída |
| 14 | AuditLogger + AuthController (TDD) | ✅ Concluída |
| 15 | Testes de 2FA e Sessão | ✅ Concluída |
| 16 | BackupService + BackupDatabase Command (TDD) | ✅ Concluída |
| 17 | Scheduler | ✅ Concluída |
| 18 | Horizon | ✅ Concluída |
| 19 | Frontend — Páginas de Auth | ✅ Concluída |
| 20 | Verificação Final da Fase 0 | ✅ Concluída |

---

## Fase 0 — COMPLETA ✅

- 24 testes passando, zero falhando
- 36 migrations rodando sem erro
- Login com credenciais funcionando
- 2FA TOTP com sessão pendente implementado
- Rate limiting no login (5 tentativas/IP/minuto)
- Audit log registrando eventos de auth
- Tokens Sanctum para API mobile
- EncryptedCast para campos financeiros sensíveis
- BackupService com GPG + retenção
- Scheduler: backups diário (03:00), semanal (dom 03:30), mensal (dia 1 04:00)
- Horizon configurado com auth gate
- Páginas React: Login, TwoFactor, Dashboard

## Próximo passo

Fase 1 — implementação dos módulos de domínio (Tasks, Projects, Habits, Journal, Finance, Library, Notes, Contacts, Reviews).
