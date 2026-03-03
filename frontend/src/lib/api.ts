const API_BASE = "http://localhost:8000";

export interface Player {
  name: string;
  team: string;
  age: number;
  position: string;
  pos_group: string;
  fair_score: number;
  player_tier: string;
  minutes: number;
}

export interface PlayerDetail {
  [key: string]: any;
}

export interface Candidate {
  rank: number;
  name: string;
  team: string;
  pos_group: string;
  minutes: number;
  total_score: number;
  cluster?: number;
  role_profile?: string;
  z_passes_key_per90_pos?: number;
  z_passes_accuracy_pos?: number;
  z_intensity_pos?: number;
}

export interface DuellData {
  player_a: {
    name: string;
    team: string;
    pos_group: string;
    minutes: number;
    fair_score: number;
    forecast_score: number;
    features: Record<string, number>;
  };
  player_b: {
    name: string;
    team: string;
    pos_group: string;
    minutes: number;
    fair_score: number;
    forecast_score: number;
    features: Record<string, number>;
  };
  role: string;
  features: string[];
}

export async function getPlayers(): Promise<Player[]> {
  const res = await fetch(`${API_BASE}/api/players`);
  if (!res.ok) throw new Error("Kunne ikke hente spillere");
  return res.json();
}

export async function getTop(limit: number = 5): Promise<{ name: string; team: string; score: number }[]> {
  const res = await fetch(`${API_BASE}/api/top?limit=${limit}`);
  if (!res.ok) throw new Error("Kunne ikke hente toppliste");
  return res.json();
}

export async function getScatter(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/scatter`);
  if (!res.ok) throw new Error("Kunne ikke hente scatter data");
  return res.json();
}

export async function getPlayer(name: string): Promise<PlayerDetail> {
  const res = await fetch(`${API_BASE}/api/player/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error("Kunne ikke hente spiller");
  return res.json();
}

export async function filterPlayers(params: {
  pos_group?: string;
  minutes_min?: number;
  age_min?: number;
  age_max?: number;
  team?: string;
  search?: string;
  player_tier?: string;
}): Promise<Player[]> {
  const url = new URL(`${API_BASE}/api/filter`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Kunne ikke filtrere spillere");
  return res.json();
}

export async function getCandidates(
  role: string,
  pos_group: string,
  minutes_min: number = 900,
  top_n: number = 20
): Promise<Candidate[]> {
  const url = new URL(`${API_BASE}/api/candidates`);
  url.searchParams.append("role", role);
  url.searchParams.append("pos_group", pos_group);
  url.searchParams.append("minutes_min", String(minutes_min));
  url.searchParams.append("top_n", String(top_n));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Kunne ikke hente kandidater");
  return res.json();
}

export async function getClusterProfiles(pos_group?: string, minutes_min: number = 0): Promise<any[]> {
  const url = new URL(`${API_BASE}/api/cluster_profiles`);
  if (pos_group) url.searchParams.append("pos_group", pos_group);
  url.searchParams.append("minutes_min", String(minutes_min));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Kunne ikke hente klyngeprofiler");
  return res.json();
}

export async function getDuell(player_a: string, player_b: string, role: string = "playmaker"): Promise<DuellData> {
  const url = new URL(`${API_BASE}/api/duell`);
  url.searchParams.append("player_a", player_a);
  url.searchParams.append("player_b", player_b);
  url.searchParams.append("role", role);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Kunne ikke hente duell-data");
  return res.json();
}
