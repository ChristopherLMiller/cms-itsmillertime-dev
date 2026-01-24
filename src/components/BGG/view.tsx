'use client';

import { useEffect, useState } from 'react';

type Game = {
  id: number;
  name: string;
  thumbnail?: string;
  yearPublished?: number | null;
};

export function BGGView() {
  const [games, setGames] = useState<Game[]>([]);
  const [state, setState] = useState<'loading' | 'pending' | 'ready'>('loading');

  async function load() {
    const res = await fetch('/api/bgg/collection?username=moose517');

    if (res.status === 202) {
      setState('pending');
      return;
    }

    const json = await res.json();
    setGames(json.docs);
    setState('ready');
  }

  useEffect(() => {
    load();
  }, [state]);

  return (
    <>
      {state === 'pending' && <p>Fetching from BoardGameGeek…</p>}
      <div className="collection-list__tables">
        <div className="table-wrap">
          <div className="table">
            <table cellPadding={0} cellSpacing={0}>
              <thead>
                <tr>
                  <th id="heading-thumbnail">
                    <span className="field-label unstyled">Thumbnail</span>
                  </th>
                  <th id="heading-title">
                    <span className="field-label unstyled">Name</span>
                  </th>
                  <th id="heading-yearPublished">
                    <span className="field-label unstyled">Year Published</span>
                  </th>
                  <th id="heading-bggLink">
                    <span className="field-label unstyled">BGG Link</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {games.map((game, index) => (
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
                    <td className="cell-title">
                      <span>{game.name}</span>
                    </td>
                    <td className="cell-yearPublished">
                      <span>{game.yearPublished ?? '—'}</span>
                    </td>
                    <td className="cell-bggLink">
                      <a
                        href={`https://boardgamegeek.com/boardgame/${game.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on BGG
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
