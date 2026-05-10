'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

type SortKey = 'name' | 'yearPublished' | 'numplays' | 'myRating';

type SortState = { key: SortKey; asc: boolean };

type BGGRank = {
  type: string | null;
  id: number | null;
  name: string | null;
  friendlyname: string | null;
  value: string | null;
  bayesaverage: string | null;
};

type BGGRating = {
  value: string | null;
  average: string | null;
  ranks: BGGRank[];
};

type BGGStats = {
  minplayers: number | null;
  maxplayers: number | null;
  minplaytime: number | null;
  maxplaytime: number | null;
  playingtime: number | null;
  numowned: number | null;
  rating: BGGRating | null;
};

type BGGStatus = {
  own: string | null;
  prevowned: string | null;
  fortrade: string | null;
  want: string | null;
  wanttoplay: string | null;
  wanttobuy: string | null;
  wishlist: string | null;
  preordered: string | null;
  lastmodified: string | null;
};

type Game = {
  id: number;
  name: string;
  yearPublished?: number | null;
  thumbnail?: string | null;
  image?: string | null;
  objecttype?: string | null;
  subtype?: string | null;
  collid?: string | null;
  numplays?: number | null;
  status?: BGGStatus | null;
  stats?: BGGStats | null;
};

function isOn(v: string | null | undefined) {
  return v === '1';
}

function formatStatus(s: BGGStatus | null | undefined): string {
  if (!s) return '—';
  const labels: [keyof BGGStatus, string][] = [
    ['own', 'Own'],
    ['prevowned', 'Prev. owned'],
    ['fortrade', 'For trade'],
    ['want', 'Want'],
    ['wanttoplay', 'Want to play'],
    ['wanttobuy', 'Want to buy'],
    ['wishlist', 'Wishlist'],
    ['preordered', 'Preordered'],
  ];
  const parts = labels.filter(([key]) => isOn(s[key] as string | null)).map(([, label]) => label);
  return parts.length ? parts.join(' · ') : '—';
}

function formatPlayers(stats: BGGStats | null | undefined): string {
  if (!stats) return '—';
  const { minplayers: min, maxplayers: max } = stats;
  if (min != null && max != null) return min === max ? `${min}` : `${min}–${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return '—';
}

function formatPlaytime(stats: BGGStats | null | undefined): string {
  if (!stats) return '—';
  const { minplaytime: min, maxplaytime: max, playingtime: listed } = stats;
  const range = min != null && max != null ? (min === max ? `${min}` : `${min}–${max}`) : null;
  if (range && listed != null && listed !== min && listed !== max) {
    return `${range} min (listed ${listed})`;
  }
  if (range) return `${range} min`;
  if (listed != null) return `${listed} min`;
  return '—';
}

function formatRanks(rating: BGGRating | null | undefined): string {
  if (!rating?.ranks?.length) return '—';
  return rating.ranks
    .map((r) => {
      const title = r.friendlyname || r.name || r.type || 'Rank';
      const val = r.value ?? '—';
      return `${title}: ${val}`;
    })
    .join('; ');
}

function em(v: string | number | null | undefined) {
  if (v == null || v === '') return '—';
  return String(v);
}

function formatMyAndAvgRating(rt: BGGRating | null | undefined): string {
  const rawMine = rt?.value?.trim();
  const mine = rawMine && rawMine.toUpperCase() !== 'N/A' ? rawMine : 'N/A';
  const rawAvg = rt?.average?.trim();
  const bgg = rawAvg && rawAvg !== '' && rawAvg.toUpperCase() !== 'N/A' ? rawAvg : 'N/A';
  return `${mine} / ${bgg}`;
}

function RanksCell({ rating }: { rating: BGGRating | null | undefined }) {
  const text = formatRanks(rating ?? undefined);
  if (text === '—') return '—';
  const parts = text.split('; ');
  return (
    <>
      {parts.map((part, i) => (
        <span key={i} style={{ display: 'block' }}>
          {part}
          {i < parts.length - 1 ? ';' : ''}
        </span>
      ))}
    </>
  );
}

function parseMyRatingScore(rt: BGGRating | null | undefined): number | null {
  const raw = rt?.value?.trim();
  if (!raw || raw.toUpperCase() === 'N/A') return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

/** Null / missing values sort after any real number (asc or desc). */
function cmpOptionalNumber(a: number | null, b: number | null, asc: boolean): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return asc ? a - b : b - a;
}

function sortGames(games: Game[], sort: SortState): Game[] {
  const { key, asc } = sort;
  const next = [...games];
  next.sort((ga, gb) => {
    switch (key) {
      case 'name':
        return (asc ? 1 : -1) * ga.name.localeCompare(gb.name, undefined, { sensitivity: 'base' });
      case 'yearPublished':
        return cmpOptionalNumber(ga.yearPublished ?? null, gb.yearPublished ?? null, asc);
      case 'numplays':
        return cmpOptionalNumber(ga.numplays ?? null, gb.numplays ?? null, asc);
      case 'myRating':
        return cmpOptionalNumber(
          parseMyRatingScore(ga.stats?.rating ?? null),
          parseMyRatingScore(gb.stats?.rating ?? null),
          asc,
        );
      default:
        return 0;
    }
  });
  return next;
}

function SortColumnHeader({
  sortKey,
  sort,
  onSort,
  children,
}: {
  sortKey: SortKey;
  sort: SortState;
  onSort: (k: SortKey) => void;
  children: ReactNode;
}) {
  const active = sort.key === sortKey;
  return (
    <th aria-sort={active ? (sort.asc ? 'ascending' : 'descending') : undefined}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="field-label unstyled"
        style={{
          cursor: 'pointer',
          border: 'none',
          background: 'none',
          font: 'inherit',
          padding: 0,
          textAlign: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: 'inherit',
        }}
      >
        <span>{children}</span>
        {active ? <span aria-hidden>{sort.asc ? '▲' : '▼'}</span> : null}
      </button>
    </th>
  );
}

export function BGGView() {
  const [games, setGames] = useState<Game[]>([]);
  const [state, setState] = useState<'loading' | 'pending' | 'ready'>('loading');
  const [sort, setSort] = useState<SortState>({ key: 'name', asc: true });

  const sortedGames = useMemo(() => sortGames(games, sort), [games, sort]);

  function handleSort(nextKey: SortKey) {
    setSort((s) =>
      s.key === nextKey ? { key: nextKey, asc: !s.asc } : { key: nextKey, asc: true },
    );
  }

  async function load() {
    const res = await fetch('/api/bgg/collection?username=moose517&stats=1');

    if (res.status === 202) {
      setState('pending');
      return;
    }

    const json = await res.json();
    setGames(json.docs);
    setState('ready');
  }

  useEffect(() => {
    void load();
  }, [state]);

  return (
    <>
      {state === 'pending' && <p>Fetching from BoardGameGeek…</p>}
      <div className="collection-list__tables">
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <div className="table">
            <table cellPadding={0} cellSpacing={0}>
              <thead>
                <tr>
                  <th>
                    <span className="field-label unstyled">Thumbnail</span>
                  </th>
                  <SortColumnHeader sortKey="name" sort={sort} onSort={handleSort}>
                    Name
                  </SortColumnHeader>
                  <SortColumnHeader sortKey="yearPublished" sort={sort} onSort={handleSort}>
                    Year
                  </SortColumnHeader>
                  <SortColumnHeader sortKey="numplays" sort={sort} onSort={handleSort}>
                    Plays
                  </SortColumnHeader>
                  <th>
                    <span className="field-label unstyled">Collection flags</span>
                  </th>
                  <th>
                    <span className="field-label unstyled">Players</span>
                  </th>
                  <th>
                    <span className="field-label unstyled">Playtime (min)</span>
                  </th>
                  <SortColumnHeader sortKey="myRating" sort={sort} onSort={handleSort}>
                    Your rating / BGG avg
                  </SortColumnHeader>
                  <th style={{ minWidth: 240 }}>
                    <span className="field-label unstyled">Ranks</span>
                  </th>
                  <th>
                    <span className="field-label unstyled">BGG</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedGames.map((game, index) => {
                  const st = game.stats;
                  const rt = st?.rating ?? null;
                  return (
                    <tr key={game.id} className={`row-${index + 1}`} data-id={game.id}>
                      <td className="cell-thumbnail">
                        {game.thumbnail ? (
                          <img
                            src={game.thumbnail}
                            alt=""
                            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
                          />
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td>
                        <span>{game.name}</span>
                      </td>
                      <td>{em(game.yearPublished)}</td>
                      <td>{em(game.numplays)}</td>
                      <td style={{ maxWidth: 180, whiteSpace: 'normal', fontSize: 12 }}>
                        {formatStatus(game.status ?? undefined)}
                      </td>
                      <td>{formatPlayers(st)}</td>
                      <td>{formatPlaytime(st)}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                        {formatMyAndAvgRating(rt)}
                      </td>
                      <td
                        style={{
                          minWidth: 280,
                          maxWidth: 420,
                          whiteSpace: 'normal',
                          fontSize: 12,
                          lineHeight: 1.45,
                          verticalAlign: 'top',
                        }}
                      >
                        <RanksCell rating={rt} />
                      </td>
                      <td>
                        <a
                          href={`https://boardgamegeek.com/boardgame/${game.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
