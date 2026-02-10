import { NextResponse } from 'next/server';

type OpenMeteoResponse = {
  current?: {
    time: string;
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
};

const DEFAULT_LAT = 36.8547; // Marmaris
const DEFAULT_LON = 28.2742;
const DEFAULT_TZ = 'Europe/Istanbul';

function weatherCodeToLabel(code: number): string {
  if (code === 0) return 'Açık';
  if ([1, 2, 3].includes(code)) return 'Parçalı Bulutlu';
  if ([45, 48].includes(code)) return 'Sisli';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Çiseleme';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Yağmurlu';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Karlı';
  if ([95, 96, 99].includes(code)) return 'Fırtınalı';
  return 'Bilinmiyor';
}

export async function GET() {
  const latitude = Number(process.env.WEATHER_LAT ?? DEFAULT_LAT);
  const longitude = Number(process.env.WEATHER_LON ?? DEFAULT_LON);
  const timezone = process.env.WEATHER_TIMEZONE ?? DEFAULT_TZ;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&timezone=${encodeURIComponent(timezone)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Hava durumu servisi yanıt vermedi' }, { status: 502 });
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const current = data.current;

    if (!current) {
      return NextResponse.json({ error: 'Hava durumu verisi bulunamadı' }, { status: 502 });
    }

    return NextResponse.json({
      location: { latitude, longitude, timezone },
      current: {
        time: current.time,
        temperature: current.temperature_2m,
        weatherCode: current.weather_code,
        weatherLabel: weatherCodeToLabel(current.weather_code),
        windSpeed: current.wind_speed_10m,
      },
    });
  } catch (error) {
    console.error('GET /api/weather error:', error);
    return NextResponse.json({ error: 'Hava durumu alınamadı' }, { status: 500 });
  }
}


