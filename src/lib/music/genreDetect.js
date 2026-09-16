// Classificação de gênero musical — camada de tags.
// Combina evidências de metadados das fontes (iTunes primaryGenreName, Audius
// genre, Bandcamp tags, Last.fm tags do artista) com detecção por palavras-chave.
// Devolve um ARRAY de gêneros independentes (1 gênero = 1 tag). Nunca junta
// gêneros numa só tag. Desambigua brasileiros vs internacionais (Funk Brasileiro,
// Rap Nacional). "MC" não é gênero. Rótulos contextuais (Festa, Em alta, etc.)
// não viram tag — só casam padrões de gênero reais.

// Padrões (palavras-chave) -> rótulo canônico. Cada padrão é testado de forma
// independente, então uma faixa acumula todos os gêneros que casarem.
const PATTERNS = [
  { re: /\bpop[\s-]?rock\b/i, label: 'Pop Rock' },
  { re: /\balternative(?:[\s-]?rock)?\b|\balt[\s-]?rock\b/i, label: 'Alternative Rock' },
  { re: /\bindie rock\b/i, label: 'Indie Rock' },
  { re: /\bhard rock\b/i, label: 'Hard Rock' },
  { re: /\bsoft rock\b/i, label: 'Soft Rock' },
  { re: /\bpunk rock\b/i, label: 'Punk Rock' },
  { re: /\bpop[\s-]?punk\b/i, label: 'Pop Punk' },
  { re: /\brock\b/i, label: 'Rock' },
  { re: /\bpunk\b/i, label: 'Punk' },
  { re: /\bmetal\b|\bheavy metal\b/i, label: 'Metal' },
  { re: /\bpop\b(?![\s-]?(?:rock|punk))/i, label: 'Pop' },
  { re: /\bhip[\s-]?hop\b/i, label: 'Hip Hop' },
  { re: /\brap\b/i, label: 'Rap' },
  { re: /\br&b\b|\brnb\b|\brhythm and blues\b/i, label: 'R&B' },
  { re: /\bfunk carioca\b|\bmandel[ãa]o\b|\bfunk ousadia\b/i, label: 'Funk Brasileiro' },
  { re: /\bfunk\b/i, label: 'Funk' },
  { re: /\bsertanejo\b/i, label: 'Sertanejo' },
  { re: /\bcountry\b/i, label: 'Country' },
  { re: /\bpagode\b/i, label: 'Pagode' },
  { re: /\bsamba\b/i, label: 'Samba' },
  { re: /\bbossa nova\b/i, label: 'Bossa Nova' },
  { re: /\bforr[óo]\b/i, label: 'Forró' },
  { re: /\bpiseiro\b/i, label: 'Piseiro' },
  { re: /\barrocha\b/i, label: 'Arrocha' },
  { re: /\bax[ée]\b/i, label: 'Axé' },
  { re: /\bbrega\b/i, label: 'Brega' },
  { re: /\bmpb\b/i, label: 'MPB' },
  { re: /\btropic[áa]lia\b/i, label: 'Tropicália' },
  { re: /\btrap\b/i, label: 'Trap' },
  { re: /\bdrum[\s-]?and[\s-]?bass\b|\bdnb\b/i, label: 'Drum and Bass' },
  { re: /\beletr[ôo]nica\b|\belectronic\b|\bedm\b|\bhouse\b|\btechno\b|\btrance\b|\bdubstep\b/i, label: 'Eletrônica' },
  { re: /\breggaeton\b/i, label: 'Reggaeton' },
  { re: /\breggae\b/i, label: 'Reggae' },
  { re: /\bgospel\b|\bcrist[ãa]o\b|\bworship\b/i, label: 'Gospel' },
  { re: /\bjazz\b/i, label: 'Jazz' },
  { re: /\bblues\b/i, label: 'Blues' },
  { re: /\bsoul\b/i, label: 'Soul' },
  { re: /\bdisco\b/i, label: 'Disco' },
  { re: /\bdance\b/i, label: 'Dance' },
  { re: /\blo[\s-]?fi\b|\bchillhop\b/i, label: 'Lo-fi' },
  { re: /\bclassical\b|\bcl[áa]ssica\b|\borchestral\b|\bsymphony\b/i, label: 'Clássica' },
  { re: /\blatin\b/i, label: 'Latin' },
  { re: /\bindie\b/i, label: 'Indie' },
  { re: /\bfolk\b/i, label: 'Folk' },
  { re: /\bk[\s-]?pop\b/i, label: 'K-Pop' },
  { re: /\bj[\s-]?pop\b/i, label: 'J-Pop' },
];

// Indicadores de origem brasileira — usados só para desambiguar (não viram tag).
const BR_HINTS = /\b(brasil|brazil|brazilian|carioca|sertanejo|pagode|forr[óo]|piseiro|samba|bossa nova|mpb|funk carioca|mandel[ãa]o|arrocha|ax[ée]|brega|tropic[áa]lia|nacional)\b/i;

function extractFromText(text, into) {
  if (!text) return;
  for (const p of PATTERNS) {
    if (p.re.test(text)) into.add(p.label);
  }
}

// Classifica e devolve um array de gêneros independentes para o item.
// item: pode trazer `genres` (iTunes/Audius) e `sourceTags` (Bandcamp).
// extraTags: tags adicionais (ex: Last.fm do artista — artist-level).
export function classifyGenres(item, extraTags = []) {
  const title = item.title || '';
  const artist = item.artist || item.channelTitle || '';
  const genres = new Set();

  const metaText = `${(item.genres || []).join(' ')} ${(item.sourceTags || []).join(' ')} ${extraTags.join(' ')}`;
  const isBR = BR_HINTS.test(`${artist} ${title} ${metaText}`);

  // 1. Metadados das fontes (evidência primária — por faixa quando disponível)
  for (const g of (item.genres || [])) extractFromText(g, genres);
  for (const t of (item.sourceTags || [])) extractFromText(t, genres);
  // 2. Tags adicionais (ex: Last.fm do artista)
  for (const t of extraTags) extractFromText(t, genres);
  // 3. Palavras-chave do título/artista (fallback/complemento)
  extractFromText(`${artist} ${title}`, genres);

  // Desambiguação brasileira
  if (genres.has('Funk') && isBR) { genres.delete('Funk'); genres.add('Funk Brasileiro'); }
  if (genres.has('Rap') && isBR) { genres.delete('Rap'); genres.add('Rap Nacional'); }

  return [...genres];
}