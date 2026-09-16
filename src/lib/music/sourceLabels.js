// Rótulos e ordem das fontes/plataformas — compartilhados entre a busca e a
// página de entidade (clique em metatag) para que ambas usem o mesmo formato.
export const TYPE_LABELS = {
  song: 'YouTube Music · Músicas', youtube: 'YouTube', artist: 'YouTube Music · Artistas',
  album: 'YouTube Music · Álbuns', playlist: 'YouTube Music · Playlists', mix: 'YouTube Music · Mixes',
  mb_artist: 'MusicBrainz · Artistas', mb_recording: 'MusicBrainz · Gravações', mb_release: 'MusicBrainz · Lançamentos',
  lastfm_artist: 'Last.fm · Artistas', lastfm_album: 'Last.fm · Álbuns', jamendo_track: 'Jamendo',
  itunes_track: 'iTunes · Músicas', itunes_album: 'iTunes · Álbuns', deezer_track: 'Deezer · Músicas',
  bandcamp_track: 'Bandcamp · Faixas', bandcamp_album: 'Bandcamp · Álbuns', audius_track: 'Audius · Músicas',
  mixcloud_mix: 'Mixcloud · Mixes',
};

export const TYPE_ORDER = [
  'song', 'youtube', 'artist', 'album', 'playlist', 'mix',
  'mb_artist', 'mb_recording', 'mb_release', 'lastfm_artist', 'lastfm_album', 'jamendo_track',
  'itunes_track', 'itunes_album', 'deezer_track', 'bandcamp_track', 'bandcamp_album', 'audius_track', 'mixcloud_mix',
];