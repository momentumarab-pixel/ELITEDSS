"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Award,
  Search,
  Filter,
  ChevronRight,
  BarChart3,
  Shield,
  Zap
} from "lucide-react"
import dynamic from "next/dynamic"

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface Player {
  player_name: string
  team_name: string
  age: number
  pos_group: string
  detailed_position: string
  minutes: number
  fair_score: number
  forecast_score: number
  total_score: number
  reliability: number
  player_tier: string
}

interface Stats {
  total_players: number
  senior_players: number
  u23_players: number
  total_minutes: number
  unique_teams: number
  data_quality: number
}

export default function DashboardPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [stats, setStats] = useState<Stats>({
    total_players: 0,
    senior_players: 0,
    u23_players: 0,
    total_minutes: 0,
    unique_teams: 0,
    data_quality: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedPos, setSelectedPos] = useState<string>("Alle")
  const [selectedTier, setSelectedTier] = useState<string>("Alle")
  const [minMinutes, setMinMinutes] = useState(0)
  const [sortBy, setSortBy] = useState<string>("fair_score")
  const [scatterData, setScatterData] = useState<any[]>([])

  const posGroups = ["Alle", "MID", "ATT", "DEF", "GK"]
  const tiers = ["Alle", "senior", "u23"]
  const sortOptions = [
    { value: "fair_score", label: "Prestasjon (fair_score)" },
    { value: "forecast_score", label: "Potensial (forecast_score)" },
    { value: "total_score", label: "Total score" },
    { value: "reliability", label: "Datagrunnlag" },
    { value: "minutes", label: "Minutter" },
    { value: "age", label: "Alder" }
  ]

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:8000/api/players").then(res => res.json()),
      fetch("http://localhost:8000/api/stats").then(res => res.json()),
      fetch("http://localhost:8000/api/scatter").then(res => res.json())
    ])
      .then(([playersData, statsData, scatterData]) => {
        setPlayers(playersData)
        setFilteredPlayers(playersData)
        setStats(statsData)
        setScatterData(scatterData)
        setLoading(false)
      })
      .catch(err => {
        console.error("Feil ved heating av data:", err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let filtered = [...players]

    if (search) {
      filtered = filtered.filter(p => 
        p.player_name?.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (selectedPos !== "Alle") {
      filtered = filtered.filter(p => p.pos_group === selectedPos)
    }

    if (selectedTier !== "Alle") {
      filtered = filtered.filter(p => p.player_tier === selectedTier)
    }

    if (minMinutes > 0) {
      filtered = filtered.filter(p => (p.minutes || 0) >= minMinutes)
    }

    filtered.sort((a, b) => {
      const aVal = a[sortBy as keyof Player] || 0
      const bVal = b[sortBy as keyof Player] || 0
      return (bVal as number) - (aVal as number)
    })

    setFilteredPlayers(filtered)
  }, [players, search, selectedPos, selectedTier, minMinutes, sortBy])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="glass-panel p-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="text-brand" size={32} />
          Dashboard
        </h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-panel rounded-lg p-4">
            <div className="text-textMuted text-sm mb-1">Spillere totalt</div>
            <div className="text-2xl font-bold">{stats.total_players}</div>
          </div>
          <div className="bg-panel rounded-lg p-4">
            <div className="text-textMuted text-sm mb-1">Senior</div>
            <div className="text-2xl font-bold">{stats.senior_players}</div>
          </div>
          <div className="bg-panel rounded-lg p-4">
            <div className="text-textMuted text-sm mb-1">U23</div>
            <div className="text-2xl font-bold">{stats.u23_players}</div>
          </div>
          <div className="bg-panel rounded-lg p-4">
            <div className="text-textMuted text-sm mb-1">Lag</div>
            <div className="text-2xl font-bold">{stats.unique_teams}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="text-brand" size={20} />
          Talent Map (Prestasjon vs Potensial)
        </h2>
        <div className="h-[500px]">
          {scatterData.length > 0 ? (
            <Plot
              data={scatterData}
              layout={{
                title: "",
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                font: { color: "#eaeef5" },
                xaxis: { 
                  title: "Prestasjon (fair_score)", 
                  gridcolor: "#1e293b",
                  zeroline: false
                },
                yaxis: { 
                  title: "Potensial (forecast_score)", 
                  gridcolor: "#1e293b",
                  zeroline: false
                },
                hovermode: "closest",
                showlegend: true,
                legend: {
                  orientation: "h",
                  yanchor: "bottom",
                  y: 1.02,
                  xanchor: "right",
                  x: 1
                }
              }}
              config={{ responsive: true }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-textMuted">
              Ingen data tilgjengelig for Talent Map
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-brand" />
          <h2 className="text-xl font-bold">Filtre</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-textMuted mb-1">Søk etter spiller</label>
            <input
              type="text"
              placeholder="Navn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
            />
          </div>
          
          <div>
            <label className="block text-sm text-textMuted mb-1">Posisjon</label>
            <select
              value={selectedPos}
              onChange={(e) => setSelectedPos(e.target.value)}
              className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
            >
              {posGroups.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-textMuted mb-1">Kategori</label>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
            >
              {tiers.map(tier => (
                <option key={tier} value={tier}>
                  {tier === 'senior' ? 'Senior' : tier === 'u23' ? 'U23' : 'Alle'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-textMuted mb-1">Min. minutter</label>
            <input
              type="range"
              min="0"
              max="3000"
              step="50"
              value={minMinutes}
              onChange={(e) => setMinMinutes(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-textMuted mt-1">{minMinutes} minutter</div>
          </div>

          <div>
            <label className="block text-sm text-textMuted mb-1">Sorter etter</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-textMuted">
          {filteredPlayers.length} spillere funnet
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Award className="text-brand" size={20} />
            Kandidatliste ({filteredPlayers.length})
          </h2>
          <Link href="/player" className="text-brand hover:underline text-sm flex items-center gap-1">
            Se alle spillere <ChevronRight size={16} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-textMuted text-sm border-b border-white/5">
                <th className="pb-3">#</th>
                <th className="pb-3">Spiller</th>
                <th className="pb-3">Lag</th>
                <th className="pb-3">Posisjon</th>
                <th className="pb-3">Detaljert posisjon</th>
                <th className="pb-3">Alder</th>
                <th className="pb-3">Min.</th>
                <th className="pb-3">Prestasjon</th>
                <th className="pb-3">Potensial</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Data</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player, idx) => (
                <tr key={player.player_name + idx} className="border-b border-white/5 hover:bg-panel/30 transition-colors">
                  <td className="py-3 font-bold text-brand">{idx + 1}</td>
                  <td className="py-3 font-medium">{player.player_name}</td>
                  <td className="py-3 text-textMuted">{player.team_name}</td>
                  <td className="py-3">
                    <span className="bg-panel px-2 py-1 rounded text-xs">
                      {player.pos_group}
                    </span>
                  </td>
                  <td className="py-3 text-textMuted">{player.detailed_position || '-'}</td>
                  <td className="py-3">{player.age}</td>
                  <td className="py-3">{player.minutes?.toLocaleString()}</td>
                  <td className="py-3">
                    <span className="font-bold text-brand">
                      {player.fair_score?.toFixed(2) || '0.00'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="font-bold text-purple">
                      {player.forecast_score?.toFixed(2) || '0.00'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="font-bold">
                      {player.total_score?.toFixed(2) || '0.00'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="w-16 h-2 bg-panel rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green" 
                        style={{ width: `${(player.reliability || 0) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3">
                    <Link 
                      href={`/player/${encodeURIComponent(player.player_name)}`}
                      className="text-brand hover:underline text-sm"
                    >
                      Åpne
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-8 text-textMuted">
            Ingen spillere matcher dine filtre
          </div>
        )}
      </div>
    </div>
  )
}
