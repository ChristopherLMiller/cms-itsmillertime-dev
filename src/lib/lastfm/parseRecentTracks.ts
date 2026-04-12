export type NowPlayingResponse = {
  isPlaying: boolean;
  track: {
    name: string;
    artist: string;
    album: string | null;
    url: string;
    image: string | null;
  } | null;
};

type LastFmImage = { '#text'?: string; size?: string };

type LastFmTrackRaw = {
  name?: string;
  url?: string;
  artist?: string | { name?: string; '#text'?: string };
  album?: { '#text'?: string } | string;
  image?: LastFmImage | LastFmImage[];
  '@attr'?: { nowplaying?: string };
};

function asImageArray(image: LastFmImage | LastFmImage[] | undefined): LastFmImage[] {
  if (!image) return [];
  return Array.isArray(image) ? image : [image];
}

function pickImage(images: LastFmImage[]): string | null {
  if (!images.length) return null;
  const order = ['extralarge', 'large', 'medium', 'small'] as const;
  for (const size of order) {
    const img = images.find((i) => i.size === size && i['#text']?.trim());
    if (img?.['#text']) return img['#text'];
  }
  for (const img of images) {
    if (img['#text']?.trim()) return img['#text'];
  }
  return null;
}

function normalizeArtist(artist: LastFmTrackRaw['artist']): string {
  if (artist == null) return '';
  if (typeof artist === 'string') return artist.trim();
  const name = artist.name ?? artist['#text'];
  return typeof name === 'string' ? name.trim() : '';
}

function normalizeAlbum(album: LastFmTrackRaw['album']): string | null {
  if (album == null) return null;
  if (typeof album === 'string') {
    const t = album.trim();
    return t ? t : null;
  }
  const t = album['#text'];
  if (typeof t === 'string' && t.trim()) return t.trim();
  return null;
}

function normalizeTrack(raw: LastFmTrackRaw): NowPlayingResponse['track'] {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const url = typeof raw.url === 'string' ? raw.url.trim() : '';
  if (!name || !url) return null;

  return {
    name,
    artist: normalizeArtist(raw.artist),
    album: normalizeAlbum(raw.album),
    url,
    image: pickImage(asImageArray(raw.image)),
  };
}

function asTrackArray(track: LastFmTrackRaw | LastFmTrackRaw[] | undefined): LastFmTrackRaw[] {
  if (!track) return [];
  return Array.isArray(track) ? track : [track];
}

/** Parses Last.fm `user.getrecenttracks` JSON (format=json). */
export function parseRecentTracksPayload(body: unknown): NowPlayingResponse {
  if (!body || typeof body !== 'object') {
    return { isPlaying: false, track: null };
  }

  const err = body as { error?: number; message?: string };
  if (typeof err.error === 'number') {
    return { isPlaying: false, track: null };
  }

  const recent = (body as { recenttracks?: { track?: LastFmTrackRaw | LastFmTrackRaw[] } })
    .recenttracks;
  const tracks = asTrackArray(recent?.track);
  const first = tracks[0];
  if (!first) {
    return { isPlaying: false, track: null };
  }

  const isPlaying = first['@attr']?.nowplaying === 'true';
  const track = normalizeTrack(first);

  return { isPlaying, track };
}
