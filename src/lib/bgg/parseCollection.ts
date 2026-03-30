import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

function numAttr(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strAttr(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  return String(v);
}

function normalizeRanks(ranks: { rank?: unknown } | undefined) {
  if (!ranks?.rank) return [];
  const raw = ranks.rank;
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((r: Record<string, unknown>) => ({
    type: strAttr(r.type),
    id: r.id != null ? Number(r.id) : null,
    name: strAttr(r.name),
    friendlyname: strAttr(r.friendlyname),
    value: strAttr(r.value),
    bayesaverage: strAttr(r.bayesaverage),
  }));
}

function parseStatsBlock(stats: Record<string, unknown> | undefined) {
  if (!stats) return null;

  const rating = stats.rating as Record<string, unknown> | undefined;
  let ratingOut: Record<string, unknown> | null = null;

  if (rating) {
    const ur = rating.usersrated as { value?: string } | string | undefined;
    const avg = rating.average as { value?: string } | string | undefined;
    const bay = rating.bayesaverage as { value?: string } | string | undefined;
    const sd = rating.stddev as { value?: string } | string | undefined;
    const med = rating.median as { value?: string } | string | undefined;

    ratingOut = {
      value: strAttr(rating.value),
      usersrated: numAttr(typeof ur === 'object' && ur ? ur.value : ur),
      average: strAttr(typeof avg === 'object' && avg ? avg.value : avg),
      bayesaverage: strAttr(typeof bay === 'object' && bay ? bay.value : bay),
      stddev: strAttr(typeof sd === 'object' && sd ? sd.value : sd),
      median: strAttr(typeof med === 'object' && med ? med.value : med),
      ranks: normalizeRanks(rating.ranks as { rank?: unknown }),
    };
  }

  return {
    minplayers: numAttr(stats.minplayers),
    maxplayers: numAttr(stats.maxplayers),
    minplaytime: numAttr(stats.minplaytime),
    maxplaytime: numAttr(stats.maxplaytime),
    playingtime: numAttr(stats.playingtime),
    numowned: numAttr(stats.numowned),
    rating: ratingOut,
  };
}

function parseStatus(status: Record<string, unknown> | undefined) {
  if (!status) return null;
  return {
    own: strAttr(status.own),
    prevowned: strAttr(status.prevowned),
    fortrade: strAttr(status.fortrade),
    want: strAttr(status.want),
    wanttoplay: strAttr(status.wanttoplay),
    wanttobuy: strAttr(status.wanttobuy),
    wishlist: strAttr(status.wishlist),
    preordered: strAttr(status.preordered),
    lastmodified: strAttr(status.lastmodified),
  };
}

function baseDoc(item: Record<string, unknown>) {
  return {
    id: Number(item.objectid),
    name: typeof item.name === 'object' && item.name !== null ? (item.name as { '#text'?: string })['#text'] : (item.name as string),
    yearPublished: item.yearpublished ? Number(item.yearpublished) : null,
    thumbnail: (item.thumbnail as string) ?? null,
    image: (item.image as string) ?? null,
  };
}

export function parseBGGCollection(xml: string, options?: { includeStats?: boolean }) {
  const includeStats = options?.includeStats === true;
  const json = parser.parse(xml);

  if (!json.items?.item) {
    return { docs: [], totalDocs: 0 };
  }

  const items = Array.isArray(json.items.item) ? json.items.item : [json.items.item];

  return {
    docs: items.map((item: Record<string, unknown>) => {
      const doc = baseDoc(item) as Record<string, unknown>;

      if (!includeStats) {
        return doc;
      }

      doc.objecttype = strAttr(item.objecttype);
      doc.subtype = strAttr(item.subtype);
      doc.collid = strAttr(item.collid);

      const np = item.numplays;
      doc.numplays = np === undefined || np === null || np === '' ? null : Number(np);

      const st = parseStatus(item.status as Record<string, unknown> | undefined);
      if (st) doc.status = st;

      const statsParsed = parseStatsBlock(item.stats as Record<string, unknown> | undefined);
      if (statsParsed) doc.stats = statsParsed;

      return doc;
    }),
    totalDocs: items.length,
  };
}
