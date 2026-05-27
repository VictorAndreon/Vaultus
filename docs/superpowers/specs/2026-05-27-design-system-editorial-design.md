# Fechando o gap estético do Vaultus — Design editorial

**Data:** 2026-05-27
**Autor:** Victor Andreon (brainstorm com Claude)
**Referência visual:** `Vaultus — Sistema de controle de vida pessoal (Print).pdf` (13 páginas)

---

## Contexto

O PDF de referência codifica uma tese de design clara: **"cada tela como uma página editorial"**. O design system atual (`src/resources/css/app.css`) já materializa a fundação dessa tese — tokens OKLCH, serifa Instrument Serif, Geist Mono, eyebrow, page-title com `em` verde, cards, tags, segmented, ring, meter, dark+light themes.

O gap **não é fundação** — é **disciplina de aplicação** + alguns componentes editoriais ainda ausentes.

### Estado atual

- **Páginas reais:** Dashboard, Tarefas, Projetos, Hábitos, Diário, Finanças (+ sub-rotas Cards/Reports/Recurring/Statement/Transactions), Biblioteca
- **Stubs:** Notas, Contatos, Revisão

### Fora do escopo (decidido)

- ❌ Capa/cover do PDF (era apenas folha de rosto da apresentação)
- ❌ Footer numerado de página (`01/10`)
- ❌ Quick-capture global (`+ Capturar` no topbar + `⌘N`) — cada tela já tem seu CTA específico

---

## Princípios (do nota "Princípios do design Vaultus", pg. 8 do PDF)

1. **Decisão antes de ornamento.**
2. **Verde é a única cor com chroma alto** — todo o resto é neutro.
3. **Serif para o que importa; mono para o que se conta.**
4. **Espaços negativos são informação.**
5. **Densidade controlada por hierarquia, nunca por linha.**

### Regra operacional do princípio 2 (cor)

O princípio "verde é a única com chroma alto" parece tensionar com pílulas de status (`atrasado`, `em pausa`, `atenção`). A regra real, traduzida:

> **Verde pode dominar áreas grandes. Outras cores (gold/rose/sky) só aparecem em pílulas pequenas, com fundo dessaturado (chroma ~0.03–0.04) e texto saturado.**

Decisão mental ao escolher cor:

- A cor está **comunicando status** (atrasado/atenção/ok/informativo)? → pode ser não-verde (gold/rose/sky), mas como **pill pequena** seguindo o padrão `.tag-*` existente.
- A cor está **decorando** (fundo de chart, linha de série única, accent)? → tem que ser **verde ou neutro**.

Aplicação direta nos componentes data-viz:

| Componente | Paleta permitida |
|---|---|
| Heatmap | Só verde (gradiente `var(--green-wash)` → `var(--green-bright)`) |
| Sparkline | Só verde (ou `var(--text-3)` quando série neutra) |
| AreaChart (série única) | Só verde |
| Donut de alocação (5 fatias categóricas) | Multi-cor permitido — fatias são área pequena e é informação categórica essencial |
| Meter de meta financeira (status) | Cor por status (verde/gold/rose) — pequena área, semântica |

---

## Fase 1 — Componentes editoriais (primitivas)

### Lote A · Data-viz (SVG puro, sem dependências)

Estética compartilhada: stroke 1.5px, sem gridlines, sem tooltips por padrão, paleta via tokens CSS (`var(--green)`/`var(--green-deep)`/`var(--text-3)`), eixos só com labels mono nos extremos.

| Componente | Propósito | Onde usa |
|---|---|---|
| `<Heatmap />` | 12 semanas × N hábitos, células com gradiente verde por intensidade | Dashboard, Hábitos |
| `<Donut />` | Donut de alocação (Ações/Renda fixa/FIIs/Cripto/Caixa), 5 fatias máx, total ao centro em serifa | Finanças |
| `<Sparkline />` | Mini-linha/área embutida no canto inferior-direito do `.stat` (slot `.stat-spark` já existe no CSS) | Dashboard, Tarefas, Finanças, Hábitos, Diário |
| `<AreaChart />` | Linha de área de 12 meses (patrimônio, receitas vs despesas, humor) | Dashboard, Finanças, Hábitos, Diário |
| `<Ring />` (polish do `.ring` CSS atual) | Refinar para aceitar `size`/`progress`/`color` como props | Revisão |

### Lote B · Cromos editoriais

| Componente | Propósito | Onde usa |
|---|---|---|
| `.accent-line` (utility CSS) | Borda esquerda 2px verde + padding-left, para destacar item "hoje", quote, ativo | Diário (entrada hoje), Notas (quote, nota ativa), Contatos (contato ativo) |
| `<MiniCalendar />` | Calendário mensal com células dia, intensidade verde por entrada | Diário (sidebar) |

### Lote C · Comportamento

| Componente | Propósito | Onde usa |
|---|---|---|
| `<Greeting name="Victor" />` | "Bom dia/Boa tarde/Boa noite, *Nome*." com itálico verde no nome, baseado em hora local | Dashboard |

### Lote D · Iconografia fina

| Componente | Propósito | Onde usa |
|---|---|---|
| `<GradientAvatar initials="HC" size={...} />` | Avatar circular com iniciais mono e gradient verde `linear-gradient(135deg, var(--green) 0%, var(--green-deep) 100%)` | Contatos |
| `<GoalIcon variant="shield\|home\|plane\|car" />` | Ícone em quadrado com fundo `var(--<cor>-soft)` e ícone na cor temática | Finanças (cards de meta), Dashboard (lista metas) |

### Estrutura de arquivos

```
src/resources/js/Components/
├── charts/
│   ├── Heatmap.tsx
│   ├── Donut.tsx
│   ├── Sparkline.tsx
│   └── AreaChart.tsx
├── Greeting.tsx
├── MiniCalendar.tsx
├── GradientAvatar.tsx
└── GoalIcon.tsx

src/resources/css/app.css
└── adicionar regra .accent-line + polish .ring
```

### Convenções dos componentes

- TypeScript estrito, props nomeadas, sem `any`
- Sem estado interno em charts (presentational only); pais passam `data` formatada
- API mínima: cada chart aceita `data`, `height`, `accent` (cor opcional)
- Reutilizar tokens existentes (`var(--green)`, `var(--surface)`, etc) — **nunca hex literal**
- Tema dark + light: cada componente testado com `[data-theme="light"]` no `<html>`

---

## Fase 2 — Auditoria + integração nas telas existentes

Escopo: aplicar componentes da Fase 1 onde couber **e** corrigir desvios óbvios (tipografia, spacing, cor). Sem revisão pixel-a-pixel.

| Tela | Adições | Correção de desvios |
|---|---|---|
| **Dashboard** | `<Greeting />`, `<Heatmap />` 12 semanas, `<Sparkline />` nos 4 stats, `<AreaChart />` patrimônio, `<GoalIcon />` nas metas | Conferir hierarquia, eyebrows mono, nome italic-verde no greeting |
| **Tarefas** | `<Sparkline />` em stats | Confirmar `.tag` por prioridade (alta=rose, média=gold, baixa=sky) |
| **Projetos** | `<Sparkline />` em stats | Paleta dos `.meter` (verde/gold/rose/sky por status) |
| **Hábitos** | `<AreaChart />` consistência 12 semanas | Cor dos meters/checks por status (verde/gold/rose) |
| **Diário** | `<MiniCalendar />` na sidebar, `<AreaChart />` mini de humor, `.accent-line` na entrada "hoje" | Tags-mood (calmo/sereno/realizado em verde) |
| **Finanças** | `<Donut />` alocação, `<AreaChart />` receitas vs despesas, `<Sparkline />` em stats, `<GoalIcon />` nas metas | Cores categóricas dos meters de orçamento |
| **Biblioteca** | `<Sparkline />` em stats (ritmo, páginas) | Polimento das capas placeholder |

---

## Fase 3 — Stubs (Notas, Contatos, Revisão)

Construir as três telas que ainda são placeholder (`Pages/Stub/Index.tsx`), usando o vocabulário completo da Fase 1.

### Notas

Split layout: sidebar 320px (lista) + painel principal (leitor).

- **Sidebar:** search no topo + agrupamentos "Fixadas"/"Todas" com `.accent-line` verde na nota ativa.
- **Painel:** eyebrow mono ("FIXADA · DESIGN · ATUALIZADO HOJE, 14:22"), `h-2` serifado, conteúdo em markdown, blockquote com `.accent-line` verde, highlight inline em `var(--green-soft)`.

### Contatos

Split layout idêntico ao de Notas.

- **Sidebar:** agrupada por categoria (FAMÍLIA/TRABALHO/SAÚDE/CASA) com `<GradientAvatar />` por contato.
- **Painel:** header com avatar grande + nome serifado + chips email/telefone, grid de detalhes (mono labels), timeline de atividade recente, card de "PRÓXIMO" (aniversário) com `.accent-line` verde.

### Revisão

Layout vertical, sem sidebar.

- **Card hero:** gradient verde sutil ("Semana 19 · 2026" com 19 italic-verde) + `<Ring />` 68% no canto.
- **Grid 2×2 de seções:** Funcionou bem / Pode melhorar / Aprendizados / Próxima semana — cada uma com `.check` colorido por estado (verde=preenchido, rose=falhou, gold=neutro, vazio=a preencher).
- **Rodapé:** metas trimestrais com `.meter` por status (verde/gold/rose) + tabela de cadência (Diária/Semanal/Mensal/Trimestral/Anual) com toggles.

---

## Ordem de execução

1. **Fase 1** — construir componentes (lotes A, B, C, D em qualquer ordem; A primeiro recomendado por ser o de maior impacto).
2. **Fase 2** — auditoria + integração tela por tela na ordem: Dashboard → Finanças → Hábitos → Diário → Tarefas → Projetos → Biblioteca.
3. **Fase 3** — stubs na ordem: Notas → Contatos → Revisão.

Critério de "pronto" de cada fase: visual diff contra o PDF passa no nível "desvios óbvios eliminados", não pixel-perfect.

---

## Não-objetivos

- Pixel-perfect contra o PDF
- Animações/transições além das já presentes no CSS
- Mobile/responsive específico (foco em desktop, o PDF é desktop)
- Refatoração das telas existentes além do necessário para integrar componentes
- Documentação de Storybook ou design tokens isolados
