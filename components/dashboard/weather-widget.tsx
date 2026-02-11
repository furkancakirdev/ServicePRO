'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CloudRain, Compass, Search, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type QuickLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type LocationCandidate = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

type WeatherApiResponse = {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  current: {
    time: string;
    temperature: number;
    humidity: number;
    weatherCode: number;
    weatherLabel: string;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
  };
};

const QUICK_LOCATIONS: QuickLocation[] = [
  { id: 'marmaris', name: 'Marmaris', latitude: 36.8547, longitude: 28.2742 },
  { id: 'gocek', name: 'Gocek', latitude: 36.7517, longitude: 28.9425 },
  { id: 'bodrum', name: 'Bodrum', latitude: 37.0348, longitude: 27.4292 },
  { id: 'istanbul', name: 'Istanbul', latitude: 41.0082, longitude: 28.9784 },
];

function kmhToKnots(kmh: number): number {
  return Math.round(kmh * 0.539957);
}

function windDirectionLabel(degrees: number): string {
  const labels = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  const index = Math.round(degrees / 45) % 8;
  return labels[index];
}

function getRiskLevel(windKnots: number, precipitation: number): {
  label: string;
  className: string;
} {
  if (windKnots >= 30 || precipitation >= 7) {
    return { label: 'Yuksek risk', className: 'bg-red-500/15 text-red-300 border-red-500/40' };
  }

  if (windKnots >= 20 || precipitation >= 2) {
    return { label: 'Orta risk', className: 'bg-amber-500/15 text-amber-300 border-amber-500/40' };
  }

  return { label: 'Normal', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' };
}

function formatLocationLabel(candidate: LocationCandidate): string {
  const region = [candidate.admin1, candidate.country].filter(Boolean).join(', ');
  return region ? `${candidate.name}, ${region}` : candidate.name;
}

export default function WeatherWidget() {
  const [selectedLocation, setSelectedLocation] = useState<QuickLocation>(QUICK_LOCATIONS[0]);
  const [searchText, setSearchText] = useState<string>(QUICK_LOCATIONS[0].name);
  const [searchResults, setSearchResults] = useState<LocationCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [weather, setWeather] = useState<WeatherApiResponse['current'] | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = searchText.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await fetch(`/api/weather/locations?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Konum aramasi basarisiz');
        }

        const payload = (await response.json()) as { results: LocationCandidate[] };
        setSearchResults(payload.results ?? []);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        console.error(fetchError);
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 280);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchText]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchWeather = async () => {
      try {
        setLoadingWeather(true);
        setError(null);

        const params = new URLSearchParams({
          lat: String(selectedLocation.latitude),
          lon: String(selectedLocation.longitude),
          name: selectedLocation.name,
        });

        const response = await fetch(`/api/weather?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Hava durumu alinamadi');
        }

        const payload = (await response.json()) as WeatherApiResponse;
        setWeather(payload.current);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        console.error(fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'Hava durumu alinamadi');
      } finally {
        if (!controller.signal.aborted) {
          setLoadingWeather(false);
        }
      }
    };

    fetchWeather();

    return () => {
      controller.abort();
    };
  }, [selectedLocation]);

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    },
    []
  );

  const windKnots = useMemo(() => (weather ? kmhToKnots(weather.windSpeed) : 0), [weather]);
  const windDirection = useMemo(
    () => (weather ? windDirectionLabel(weather.windDirection) : '--'),
    [weather]
  );
  const risk = useMemo(
    () => getRiskLevel(windKnots, weather?.precipitation ?? 0),
    [weather?.precipitation, windKnots]
  );
  const ventuskyUrl = useMemo(() => {
    return `https://www.ventusky.com/?p=${selectedLocation.latitude};${selectedLocation.longitude};10&l=temperature`;
  }, [selectedLocation.latitude, selectedLocation.longitude]);

  const showSearchResults = isSearchFocused && searchText.trim().length >= 2;

  return (
    <Card className="border-slate-700 bg-slate-900/55 backdrop-blur-sm">
      <CardHeader className="space-y-4 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold text-white">Saha Hava Durumu</CardTitle>
          <div className="flex items-center gap-2">
            <a
              href={ventuskyUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700/80"
            >
              Ventusky'de ac
            </a>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${risk.className}`}>
              {risk.label}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_LOCATIONS.map((location) => {
            const isActive = selectedLocation.id === location.id;
            return (
              <Button
                key={location.id}
                type="button"
                size="sm"
                variant="outline"
                className={
                  isActive
                    ? 'border-sky-500/50 bg-sky-500/15 text-sky-100'
                    : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                }
                onClick={() => {
                  setSelectedLocation(location);
                  setSearchText(location.name);
                  setSearchResults([]);
                }}
              >
                {location.name}
              </Button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onFocus={() => {
              if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
              }
              setIsSearchFocused(true);
            }}
            onBlur={() => {
              // allow click on result buttons before closing
              if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
              }
              blurTimeoutRef.current = setTimeout(() => setIsSearchFocused(false), 120);
            }}
            placeholder="Konum ara (or. Fethiye, Antalya, Izmir)"
            className="border-slate-700 bg-slate-800/80 pl-9 text-slate-100 placeholder:text-slate-500"
          />

          {showSearchResults && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-slate-700 bg-slate-900 shadow-xl">
              <div className="max-h-64 overflow-y-auto p-1">
                {isSearching && <div className="px-3 py-2 text-xs text-slate-400">Konumlar araniyor...</div>}

                {!isSearching && searchResults.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-500">Konum bulunamadi.</div>
                )}

                {searchResults.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className="w-full rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      const nextLocation: QuickLocation = {
                        id: `search-${candidate.id}`,
                        name: formatLocationLabel(candidate),
                        latitude: candidate.latitude,
                        longitude: candidate.longitude,
                      };

                      setSelectedLocation(nextLocation);
                      setSearchText(nextLocation.name);
                      setSearchResults([]);
                    }}
                  >
                    {formatLocationLabel(candidate)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loadingWeather ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full bg-slate-800" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Skeleton className="h-24 bg-slate-800" />
              <Skeleton className="h-24 bg-slate-800" />
              <Skeleton className="h-24 bg-slate-800" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        ) : weather ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-800/50 p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{selectedLocation.name}</p>
                <p className="text-3xl font-bold text-white">{Math.round(weather.temperature)} C</p>
                <p className="text-sm text-slate-400">{weather.weatherLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Guncelleme</p>
                <p className="text-sm text-slate-300">
                  {new Date(weather.time).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <Wind className="h-3.5 w-3.5" />
                  Ruzgar
                </div>
                <p className="text-xl font-semibold text-white">{windKnots} kt</p>
                <p className="text-xs text-slate-400">
                  {Math.round(weather.windSpeed)} km/h - {windDirection}
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <CloudRain className="h-3.5 w-3.5" />
                  Yagis
                </div>
                <p className="text-xl font-semibold text-white">{weather.precipitation.toFixed(1)} mm</p>
                <p className="text-xs text-slate-400">Anlik yagis siddeti</p>
              </div>

              <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <Compass className="h-3.5 w-3.5" />
                  Nem
                </div>
                <p className="text-xl font-semibold text-white">%{Math.round(weather.humidity)}</p>
                <p className="text-xs text-slate-400">Operasyon konfor indikatori</p>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
