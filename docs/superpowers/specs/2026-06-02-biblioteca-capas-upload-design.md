# Design — Capas de livro: upload de arquivo e download por URL

**Data:** 2026-06-02
**Domínio:** Library
**Status:** aprovado (aguardando revisão do spec)

## Problema

Hoje a capa de um livro é uma **URL externa** (`library_items.cover_url`), renderizada como `<img src={cover_url}>`. O backend valida e armazena a URL corretamente, **mas a imagem não aparece**: o `Caddyfile` aplica uma CSP com `img-src 'self' data: blob:`, que bloqueia qualquer imagem de host externo. Além disso, o `<img>` não tem `onError`, então em vez do placeholder o usuário vê o ícone de imagem quebrada.

## Objetivo

Permitir definir a capa de duas formas, sempre **armazenando a imagem localmente** (servida same-origin, passando na CSP):

1. **Upload de arquivo** do dispositivo.
2. **Colar uma URL**, com o **servidor baixando** a imagem (em vez de hotlink).

Isso resolve o bug da CSP e entrega a funcionalidade pedida com uma única solução.

## Não-objetivos (YAGNI)

- Migração em massa das capas externas já existentes. Elas continuam bloqueadas pela CSP até o livro ser reaberto e salvo (quando a URL é baixada). Opcional, fora deste escopo: liberar `https:` no `img-src` como rede de segurança para o legado.
- Galeria/biblioteca de mídia, recorte (crop) manual, múltiplas imagens por item.
- Suporte a outros tipos de mídia da Library (a coluna `type` já prevê outros, mas o fluxo de capa cobre `book`).

## Restrições do ambiente

- **GD** disponível no container `app` (sem dependência nova, sem mudança no Dockerfile). `curl`/`fileinfo`/`openssl` presentes; `exif` ausente (não usamos orientação EXIF).
- O Caddy monta `src/public` como **read-only** e serve estáticos de lá; `src/storage` **não** está montado no Caddy. Por isso a capa é servida por **rota Laravel**, não por `storage:link`.
- Escritas seguem o padrão do projeto (Inertia, validação pt-BR, autorização por dono).

## Arquitetura

### Armazenamento e entrega

- Arquivos salvos no disco `public` (`storage/app/public`) em `covers/{userId}/{uuid}.webp`.
- Entrega via **rota Laravel autorizada**: `GET /library/{libraryItem}/cover` → `Storage::disk('public')->response($item->cover_path)` com headers de cache. Same-origin (passa na CSP `img-src 'self'`) e só o dono acessa.

### `BookCoverService` (`app/Domains/Library/Services/`)

Responsabilidade única: receber um arquivo enviado **ou** uma URL e produzir uma capa normalizada armazenada, retornando o caminho relativo no disco `public`.

- `fromUpload(UploadedFile $file, int $userId): string`
- `fromUrl(string $url, int $userId): string`
- `processAndStore(string $binary, int $userId): string` (privado) — decodifica com GD; redimensiona mantendo proporção (lado maior ≤ **600px**, sem ampliar); re-encoda **WebP** (qualidade ~80), descartando metadados; salva em `covers/{userId}/{uuid}.webp`; retorna o caminho.
- `delete(?string $path): void` — remove um arquivo de capa do disco, se existir.

**Proteção SSRF em `fromUrl`** (servidor busca URL fornecida pelo usuário):
- Aceita apenas esquemas `http`/`https`.
- Resolve o host e **bloqueia** faixas privadas/loopback/link-local/reservadas (ex.: `127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `::1`, `fc00::/7`).
- Timeout de conexão/leitura curto.
- **Limite de download por streaming (~5 MB)** — aborta se exceder.
- O conteúdo só é aceito se **decodificar como imagem** no GD (não confia em `Content-Type`).

### Model `LibraryItem`

- Nova coluna `cover_path` (string, nullable) — caminho no disco `public`. `cover_url` é mantida para legado/externo.
- Accessor `cover_display_url`: retorna a URL da rota local (`/library/{id}/cover`) se houver `cover_path`; senão o `cover_url` externo (legado); senão `null`.
- `cover_path` adicionado a `$fillable`.

### `LibraryController`

**Contrato de escrita (desambiguação leitura × escrita).** A leitura (`bookPayload`) expõe `cover_url` = URL de **exibição** (a rota local quando há `cover_path`). Para não reenviar essa rota como se fosse "uma URL nova para baixar", a escrita usa campos próprios e o modal **não** pré-preenche o campo de URL com a rota local:

- `cover_file` → `nullable|image|mimes:jpeg,png,webp,gif|max:5120` (5 MB) — arquivo enviado.
- `cover_url` → `nullable|url|max:1024` — **uma nova URL externa a baixar** (vazio = nenhuma).
- `remove_cover` → `nullable|boolean` — remover a capa atual.

- Resolução da capa em `store`/`update`, nesta ordem:
  1. Se `cover_file` presente → `fromUpload` → novo `cover_path` (e apaga o antigo).
  2. Senão, se `cover_url` (nova URL) não-vazio → `fromUrl` → novo `cover_path` (e apaga o antigo).
  3. Senão, se `remove_cover` verdadeiro → apaga o arquivo e zera `cover_path`/`cover_url`.
  4. Senão → **mantém** a capa atual (nenhuma alteração).
- No `destroy`, apaga o arquivo de capa (limpeza).
- O `bookPayload` passa a expor `cover_url => $b->cover_display_url` (contrato de leitura do frontend inalterado).
- Nova action `cover(LibraryItem $libraryItem)` para a rota de entrega (autoriza dono; 404 se sem `cover_path`).

### Rotas (`routes/web.php`)

- `GET /library/{libraryItem}/cover` → `LibraryController@cover` (dentro do grupo `auth`).
- As escritas (`POST /library`, `PATCH /library/{libraryItem}`) já existem; com upload de arquivo o Inertia envia `multipart/form-data` automaticamente (method-spoofing no PATCH tratado pelo Inertia).

### Frontend (`LibraryModal.tsx`)

- Bloco "Capa": **miniatura de preview** + botão **"Enviar arquivo"** (`<input type="file" accept="image/*">`) + campo de URL para uma **nova** URL externa.
- Em modo edição, a miniatura mostra a capa atual (`item.cover_url` de exibição); o **campo de URL começa vazio** (é para inserir uma nova URL, não para reenviar a rota local). Um controle **"Remover capa"** seta `remove_cover`.
- Estado adicional: `File` selecionado, preview local (`URL.createObjectURL`) e flag `remove_cover`.
- No submit, o payload inclui no máximo um entre: `cover_file` (File → Inertia envia `FormData`), `cover_url` (nova URL) ou `remove_cover: true`. Se nenhum, a capa não é tocada.

### Index (`Library/Index.tsx`)

- Adicionar `onError` nos dois `<img>` de capa para cair no placeholder `.ph` quando a imagem falhar (robustez ausente hoje). Contrato `cover_url` inalterado.

## Fluxo de dados

**Upload:** usuário escolhe arquivo → submit (FormData) → `store/update` → `fromUpload` (GD: valida, redimensiona, WebP, salva) → `cover_path` gravado → redirect → Index renderiza `<img src="/library/{id}/cover">` → rota autorizada devolve o WebP.

**URL:** usuário cola URL → submit → `store/update` → `fromUrl` (SSRF guard + download streaming + GD) → `cover_path` gravado → resto igual ao upload.

## Tratamento de erros

- Validação Laravel (tamanho/mime/URL) → erros pt-BR exibidos no modal (padrão atual via `errors`).
- `fromUrl`: URL inacessível, não-imagem, host privado, ou excede o limite → `ValidationException` em `cover_url` com mensagem clara; o livro **não** é salvo com capa inválida.
- Falha ao decodificar/processar no GD → `ValidationException`.

## Testes (PHPUnit)

- `BookCoverService::fromUpload` salva um WebP redimensionado (lado maior ≤ 600).
- `fromUrl` baixa imagem válida (HTTP fake/local) e grava; **rejeita** conteúdo não-imagem; **rejeita** host privado (SSRF); **rejeita** download acima do limite.
- `store` com `cover_file` seta `cover_path`; com `cover_url` remota baixa e seta `cover_path`.
- `update` troca a capa (arquivo ou nova URL) e **apaga** o arquivo antigo; `remove_cover: true` apaga o arquivo e zera `cover_path`; `update` sem nenhum dos três campos **mantém** a capa atual.
- `GET /library/{item}/cover` devolve a imagem para o dono e **403** para outro usuário; **404** sem `cover_path`.
- Mensagens de validação pt-BR para `cover_file` inválido.

## Migration

`add_cover_path_to_library_items` — adiciona `cover_path` (string, nullable) após `cover_url`.

## Decisões assumidas

1. Re-encodar tudo para **WebP** (normaliza formato, reduz tamanho, neutraliza imagem maliciosa).
2. Limites: **5 MB** de upload, lado maior **600px**.
3. Capas externas existentes permanecem bloqueadas pela CSP até reabrir/salvar o livro (sem migração em massa).
4. **CSP não muda** (capas locais já passam por `'self'`).
