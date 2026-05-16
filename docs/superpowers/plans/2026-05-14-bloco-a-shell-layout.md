# Bloco A: Shell & Layout — Correções do Design System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 6 divergências na Topbar, Sidebar e AppLayout que quebram silenciosamente o design system — CSS classes erradas, botão com comportamento errado, e ausência de elementos visuais especificados no handoff.

**Architecture:** Todas as correções são puramente frontend (React/TSX). Nenhuma mudança de backend. Os arquivos são independentes entre si e podem ser commitados em sequência. O Bloco A é pré-requisito visual para todos os outros blocos.

**Tech Stack:** React 18, TypeScript, Inertia.js, CSS custom properties (OKLCH design system)

---

### Task 1: Topbar — Corrigir classe da search box

**Files:**
- Modify: `src/resources/js/Components/Topbar.tsx`

A classe `vlt-search` não existe no CSS. O CSS do design system usa `.search`, `.search svg`, `.search input`, `.search kbd`. Trocar também remove o `<span>` wrapper desnecessário do ícone.

- [ ] **Step 1: Editar Topbar.tsx** — substituir container e estrutura do ícone

Localizar as linhas 38–50 de `src/resources/js/Components/Topbar.tsx`:

```tsx
      <div className="vlt-search">
        <span className="search-icon">
          <Icons.Search size={14} />
        </span>
        <input
          type="search"
          placeholder="Buscar em tudo…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Busca global"
        />
        <kbd>⌘K</kbd>
      </div>
```

Substituir por:

```tsx
      <div className="search">
        <Icons.Search size={14} />
        <input
          type="search"
          placeholder="Buscar em tudo…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Busca global"
        />
        <kbd>⌘K</kbd>
      </div>
```

- [ ] **Step 2: Verificar no browser** — abrir `https://vaultus.local`, confirmar que a search box tem fundo, border, largura fixa ~260px e o ícone está posicionado à esquerda do input.

---

### Task 2: Topbar — Corrigir classe do notification dot

**Files:**
- Modify: `src/resources/js/Components/Topbar.tsx`

A classe `notif-dot` não existe no CSS. O seletor correto é `.icon-btn .dot`.

- [ ] **Step 1: Editar Topbar.tsx** — trocar classe do span de notificação

Localizar linha 58:
```tsx
        <span className="notif-dot" />
```

Substituir por:
```tsx
        <span className="dot" />
```

- [ ] **Step 2: Verificar no browser** — o ponto verde/vermelho deve aparecer no canto superior direito do ícone de sino.

---

### Task 3: Topbar — Corrigir botão "Capturar"

**Files:**
- Modify: `src/resources/js/Components/Topbar.tsx`

O botão usa `<Link href="/dashboard">` que navega o usuário para /dashboard ao clicar. Deve ser um `<button>` sem efeito de navegação (a ação de captura será implementada em bloco futuro).

- [ ] **Step 1: Remover import de Link** e ajustar o botão

No topo do arquivo, remover `Link` do import do Inertia se não for usado em mais nenhum lugar:
```tsx
import { Link } from '@inertiajs/react'
```
→ verificar se há outros usos antes de remover.

Localizar linhas 61–63:
```tsx
      <Link href="/dashboard" className="btn btn-primary btn-sm">
        <Icons.Plus size={13} /> Capturar
      </Link>
```

Substituir por:
```tsx
      <button type="button" className="btn btn-primary btn-sm">
        <Icons.Plus size={13} /> Capturar
      </button>
```

- [ ] **Step 2: Verificar no browser** — clicar em "Capturar" não deve navegar a lugar nenhum. O botão deve permanecer visualmente idêntico.

---

### Task 4: Sidebar — Trocar inline style por classe `user-meta-icon`

**Files:**
- Modify: `src/resources/js/Components/Sidebar.tsx`

O ícone ChevronRight no rodapé usa `style={{ color: 'var(--text-4)', marginLeft: 'auto', flexShrink: 0 }}`. O design system tem a classe `.user-meta-icon` que aplica `margin-left: auto` e `color: var(--text-4)`. Usar a classe é o padrão do sistema.

- [ ] **Step 1: Editar Sidebar.tsx** — localizar o ChevronRight no `sidebar-footer` (linha ~89):

```tsx
          <Icons.ChevronRight size={14} style={{ color: 'var(--text-4)', marginLeft: 'auto', flexShrink: 0 }} />
```

Substituir por:
```tsx
          <Icons.ChevronRight size={14} className="user-meta-icon" />
```

- [ ] **Step 2: Verificar visualmente** — o ícone deve estar alinhado à direita no user chip sem mudança visual.

---

### Task 5: AppLayout — Adicionar `renderTitle` com nome em itálico verde

**Files:**
- Modify: `src/resources/js/Layouts/AppLayout.tsx`

O design especifica que no título de saudação ("Boa noite, Victor.") o nome deve aparecer em `<em>` com `color: var(--green); font-style: italic`. CSS: `h1.page-title em { color: var(--green); font-style: italic; }`.

- [ ] **Step 1: Adicionar função `renderTitle` e aplicar no h1**

Em `src/resources/js/Layouts/AppLayout.tsx`, adicionar a função antes do `export default`:

```tsx
function renderTitle(title: string): React.ReactNode {
  if (title.startsWith('Boa noite,') || title.startsWith('Bom dia,') || title.startsWith('Boa tarde,')) {
    const parts = title.split(/(,\s+)([A-ZÀ-Ú][a-zà-ú]+)(\.?)$/)
    if (parts.length >= 4) {
      return <>{parts[0]}{parts[1]}<em>{parts[2]}</em>{parts[3]}</>
    }
  }
  return title
}
```

Localizar linha 48:
```tsx
                {title && <h1 className="page-title">{title}</h1>}
```

Substituir por:
```tsx
                {title && <h1 className="page-title">{renderTitle(title)}</h1>}
```

- [ ] **Step 2: Verificar no Dashboard** — abrir `https://vaultus.local/dashboard`. O nome "Victor" deve aparecer em verde itálico no título de saudação.

---

### Task 6: AppLayout — Adicionar pill "Sincronizado · agora" no eyebrow do Dashboard

**Files:**
- Modify: `src/resources/js/Layouts/AppLayout.tsx`

O design especifica que quando a página é o Dashboard, o eyebrow deve ter um `<span className="pill">Sincronizado · agora</span>` ao lado do texto do eyebrow.

- [ ] **Step 1: Adicionar prop `isDashboard` ou detectar via `eyebrow`**

Adicionar a prop `showSyncPill?: boolean` na interface Props:

```tsx
interface Props {
  children: ReactNode
  title?: string
  eyebrow?: string
  subtitle?: string
  actions?: ReactNode
  showHead?: boolean
  showSyncPill?: boolean
}
```

Atualizar a assinatura da função:
```tsx
export default function AppLayout({ children, title, eyebrow, subtitle, actions, showHead = true, showSyncPill = false }: Props) {
```

Localizar linha 47:
```tsx
                {eyebrow && <div className="eyebrow"><span>{eyebrow}</span></div>}
```

Substituir por:
```tsx
                {eyebrow && (
                  <div className="eyebrow">
                    <span>{eyebrow}</span>
                    {showSyncPill && <span className="pill">Sincronizado · agora</span>}
                  </div>
                )}
```

- [ ] **Step 2: Passar `showSyncPill` no Dashboard/Index.tsx**

Abrir `src/resources/js/Pages/Dashboard/Index.tsx`. Localizar o `<AppLayout` e adicionar a prop:

```tsx
      <AppLayout
        title={greeting}
        eyebrow={eyebrow}
        subtitle="Resumo do dia, focos pendentes e indicadores chave."
        showSyncPill
        actions={...}
      >
```

- [ ] **Step 3: Verificar no browser** — a pill "Sincronizado · agora" deve aparecer ao lado do eyebrow somente no Dashboard.

---

### Task 7: Commit

- [ ] **Step 1: Commit das correções do shell**

```bash
cd /home/andreon/Documentos/Vaultus
git add src/resources/js/Components/Topbar.tsx \
        src/resources/js/Components/Sidebar.tsx \
        src/resources/js/Layouts/AppLayout.tsx \
        src/resources/js/Pages/Dashboard/Index.tsx
git commit -m "fix: corrigir classes CSS e comportamentos do shell (search, dot, capturar, renderTitle, pill)"
```

---

### Checklist de verificação final

- [ ] Search box tem fundo, borda e width corretos
- [ ] Notification dot visível no canto do sino
- [ ] "Capturar" não navega ao ser clicado
- [ ] Nome em verde itálico na saudação do Dashboard
- [ ] Pill "Sincronizado · agora" visível no Dashboard eyebrow
- [ ] Ícone ChevronRight no user chip alinhado à direita
