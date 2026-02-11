import { NextRequest, NextResponse } from 'next/server';

type OpenMeteoResponse = {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    precipitation: number;
  };
};

const DEFAULT_LAT = 36.8547; // Marmaris
const DEFAULT_LON = 28.2742;
const DEFAULT_TZ = 'Europe/Istanbul';

function parseNumber(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function weatherCodeToLabel(code: number): string {
  if (code === 0) return 'Acik';
  if ([1, 2, 3].includes(code)) return 'Parcali Bulutlu';
  if ([45, 48].includes(code)) return 'Sisli';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Ciseleme';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Yagmurlu';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Karli';
  if ([95, 96, 99].includes(code)) return 'Firtinali';
  return 'Bilinmiyor';
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latitude = parseNumber(searchParams.get('lat'), DEFAULT_LAT);
  const longitude = parseNumber(searchParams.get('lon'), DEFAULT_LON);
  const timezone = searchParams.get('tz') || process.env.WEATHER_TIMEZONE || DEFAULT_TZ;
  const locationName = searchParams.get('name') || 'Marmaris';

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation` +
    `&wind_speed_unit=kmh` +
    `&timezone=${encodeURIComponent(timezone)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Hava durumu servisi yanit vermedi' }, { status: 502 });
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const current = data.current;

    if (!current) {
      return NextResponse.json({ error: 'Hava durumu verisi bulunamadi' }, { status: 502 });
    }

    return NextResponse.json({
      location: {
        name: locationName,
        latitude,
        longitude,
        timezone,
      },
      current: {
        time: current.time,
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        weatherCode: current.weather_code,
        weatherLabel: weatherCodeToLabel(current.weather_code),
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        precipitation: current.precipitation,
      },
    });
  } catch (error) {
    console.error('GET /api/weather error:', error);
    return NextResponse.json({ error: 'Hava durumu alinamadi' }, { status: 500 });
  }
}
