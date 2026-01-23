import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

export function parseBGGCollection(xml: string) {
  const json = parser.parse(xml);

  if (!json.items?.item) {
    return { docs: [], totalDocs: 0 };
  }

  const items = Array.isArray(json.items.item) ? json.items.item : [json.items.item];

  return {
    docs: items.map((item: any) => ({
      id: Number(item.objectid),
      name: typeof item.name === 'object' ? item.name['#text'] : item.name,
      yearPublished: item.yearpublished ? Number(item.yearpublished) : null,
      thumbnail: item.thumbnail ?? null,
      image: item.image ?? null,
    })),
    totalDocs: items.length,
  };
}
