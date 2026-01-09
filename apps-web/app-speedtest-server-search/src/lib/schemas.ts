import { z } from 'zod';

const speedtestServerRawSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  name: z.string(),
  country: z.string(),
  cc: z.string(),
  sponsor: z.string(),
  id: z.string(),
  host: z.string(),
});

export const speedtestServersRawSchema = z.array(speedtestServerRawSchema);

export type SpeedtestServerRaw = z.infer<typeof speedtestServerRawSchema>;

export interface SpeedtestServer {
  lat: string;
  lon: string;
  name: string;
  country: string;
  countryCode: string;
  sponsor: string;
  id: string;
  host: string;
}

export function transformServer(raw: SpeedtestServerRaw): SpeedtestServer {
  return {
    lat: raw.lat,
    lon: raw.lon,
    name: raw.name,
    country: raw.country,
    countryCode: raw.cc,
    sponsor: raw.sponsor,
    id: raw.id,
    host: raw.host,
  };
}
