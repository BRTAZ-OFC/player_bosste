# player_bosste — Player de Música Standalone

Backup standalone do player de música e pesquisa de músicas do projeto LiveNexus/StreamSpeak.
Funciona de forma independente, sem TTS, overlays, login, autenticação ou pagamentos.

## Objetivo

Preservar exatamente o módulo de player de música e busca de músicas como existe hoje.

## Arquivos principais

### Player (componentes visuais)
- `src/components/music/MusicPlayerContainer.jsx` — container oculto do iframe
- `src/components/music/MusicPlayerBar.jsx` — barra do player (play/pause/next/prev/volume/busca)
- `src/components/music/MusicQueue.jsx` — fila de reprodução visual
- `src/components/music/MusicHistory.jsx` — histórico de faixas tocadas
- `src/components/music/MusicDirectUrl.jsx` — input de URL de áudio direto (fallback HTML5)
- `src/components/music/MusicOverlayConfig.jsx` — configuração de overlay e ducking

### Busca
- `src/components/music/MusicSearch.jsx` — UI de busca (termo + URL + tabs + histórico)
- `src/lib/music/musicSearch.js` — serviço de busca (r.jina.ai, zero-credit)

### Lógica (lib)
- `src/lib/music/youtubePlayer.js` — player YouTube iframe + postMessage + fallback HTML5
- `src/lib/music/useMusicPlayer.js` — hook React
- `src/lib/music/playerEvents.js` — event emitter central
- `src/lib/music/musicSettings.js` — configurações (localStorage)
- `src/lib/music/queueManager.js` — fila (repeat/shuffle)
- `src/lib/music/historyManager.js` — histórico (localStorage)
- `src/lib/music/html5AudioPlayer.js` — backend HTML5 audio (fallback)
- `src/lib/music/migrationFlag.js` — flag youtube-nocookie
- `src/lib/music/musicUrlManager.js` — validação de URLs
- `src/lib/music/searchHistoryManager.js` — histórico de buscas (localStorage)
- `src/lib/music/ttsMusicIntegration.js` — ducking TTS (stub — sem TTS neste pacote)

### UI primitives
- `src/components/ui/input.jsx`, `button.jsx`, `label.jsx`

### Stub
- `src/api/base44Client.js` — stub (import morto em musicSearch.js)

## Como iniciar

```bash
npm install
npm run dev
```

## Dependências

- react, react-dom, lucide-react
- @radix-ui/react-slot, @radix-ui/react-label
- class-variance-authority, clsx, tailwind-merge
- vite, @vitejs/plugin-react, tailwindcss, autoprefixer (dev)

## Como funciona a busca

A busca usa **r.jina.ai** (proxy de leitura gratuito) direto do frontend — zero Integration Credits.

1. Usuário digita um termo na aba ativa (Músicas, Artistas, Álbuns, Playlists, Mixes)
2. `musicSearch.js` busca `https://music.youtube.com/search?q=TERMO` via `https://r.jina.ai/...`
3. r.jina.ai renderiza server-side e devolve markdown
4. `parseSearchMarkdown()` extrai músicas, artistas, álbuns, playlists e mixes
5. Resultados filtrados client-side conforme a aba ativa

## Como funciona o player

O player usa um **iframe do YouTube** (`youtube-nocookie.com/embed`) com controle via **postMessage**:

1. `MusicPlayerContainer` cria iframe oculto `id="yt-music-player"`
2. `youtubePlayer.js` envia comandos postMessage (playVideo, pauseVideo, seekTo, setVolume)
3. Iframe responde via infoDelivery (currentTime, duration, playerState)
4. `useMusicPlayer` escuta eventos via `playerEvents` e atualiza a UI
5. Fila, histórico, repeat e shuffle gerenciados por `queueManager` e `historyManager`
6. Fallback HTML5 audio para fontes diretas (MP3/OGG/WAV) via `html5AudioPlayer.js`

## Variáveis de ambiente necessárias

**Nenhuma.** O player e a busca funcionam sem variáveis de ambiente.

## Limitações conhecidas

1. **Paginação não suportada** — r.jina.ai não suporta continuation tokens. `searchMore()` retorna vazio.
2. **r.jina.ai pode ser rate-limited** — sob uso intenso, pode retornar erro 429.
3. **Parser de markdown frágil** — se o YouTube Music mudar a estrutura HTML, o parser pode falhar.
4. **Autoplay bloqueado** — iframe inicia mudo (mute=1), desbloqueia na primeira interação do usuário.
5. **youtube-nocookie.com** — usado em vez de youtube.com para compatibilidade com ambientes restritos.

## Bug conhecido da pesquisa

- **Paginação (continuation) não funciona** — `fetchSearch()` retorna `{ results: [], continuation: '' }`
  quando `continuation` é fornecido. O botão "Carregar mais" não carrega novos resultados.
- **Import morto do Base44** — `musicSearch.js` linha 8 importa `base44` mas não o utiliza.
  Substituído por stub (`src/api/base44Client.js`) neste pacote standalone.

## Dependências externas

- **r.jina.ai** — proxy de leitura gratuito (sem API key)
- **YouTube Music** — catálogo de músicas
- **youtube-nocookie.com** — iframe de reprodução

## Dependências Base44 ainda existente

- `src/api/base44Client.js` é um **stub** — import morto em `musicSearch.js`, não usado em runtime.
  Nenhuma chamada a `base44.functions.invoke` ou `base44.integrations` é feita em modo zero-credit.
