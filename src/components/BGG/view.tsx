'use client';

import { useEffect, useState } from 'react';
type Game = {
  id: number;
  name: string;
  thumbnail?: string;
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
  }, []);
  return (
    <>
      {state === 'pending' && <p>Fetching from BoardGameGeek…</p>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '1rem',
        }}
      >
        {games.map((game) => (
          <div key={game.id}>
            {game.thumbnail && (
              <img
                src={game.thumbnail}
                style={{
                  width: '100%',
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              />
            )}
            <strong>{game.name}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
