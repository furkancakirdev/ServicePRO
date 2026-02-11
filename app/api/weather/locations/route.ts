import { NextRequest, NextResponse } from 'next/server';

type GeocodingResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

type GeocodingResponse = {
  results?: GeocodingResult[];
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(query)}` +
    `&count=8&language=tr&format=json`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ results: [], error: 'Konum servisi yanit vermedi' }, { status: 502 });
    }

    const data = (await response.json()) as GeocodingResponse;
    const results =
      data.results?.map((item) => ({
        id: String(item.id),
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        country: item.country ?? '',
        admin1: item.admin1 ?? '',
      })) ?? [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('GET /api/weather/locations error:', error);
    return NextResponse.json({ results: [], error: 'Konumlar alinamadi' }, { status: 500 });
  }
}
