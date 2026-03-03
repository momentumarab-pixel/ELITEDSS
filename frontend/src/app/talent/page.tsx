"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Zap, 
  Users, 
  Calendar, 
  Clock, 
  Award,
  TrendingUp,
  Search,
  Filter,
  ChevronDown,
  User,
  Target,
  Star,
  BarChart3,
  ChevronRight
} from "lucide-react"

interface TalentPlayer {
  player_name: string
  team_name: string
  age: number
  pos_group: string
  detailed_position: string
  minutes: number
  fair_score: number
  forecast_score: number
  reliability: number
  player_tier: string
}

export default function TalentPage() {
  const [players, setPlayers] = useState<TalentPlayer[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<TalentPlayer[]>([])
  const [loading, setLoading] = useState(true)
  
  const [search, setSearch] = useState("")
  const [selectedPos, setSelectedPos] = useState<string>("Alle")
  const [minMinutes, setMinMinutes] = useState(450)
  const [sortBy, setSortBy] = useState<string>("forecast_score")
  const [showFilters, setShowFilters] = useState(false)

  const posGroups = ["Alle", "MID", "ATT", "DEF", "GK"]
  const sortOptions = [
    { value: "forecast_score", label: "Potensial" },
    { value: "fair_score", label: "Prestasjon" },
    { value: "age", label: "Alder (yngst)" },
    { value: "minutes", label: "Minutter (flest)" }
  ]

  useEffect(() => {
    fetch("http://localhost:8000/api/players")
      .then(res => res.json())
      .then(data => {
        const u23Players = data.filter((p: TalentPlayer) => 
          p.player_tier === 'u23' || p.age <= 23
        )
        setPlayers(u23Players)
        setFilteredPlayers(u23Players)
        setLoading(false)
      })
      .catch(err => {
        console.error("Feil ved heating av spillere:", err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let filtered = players.filter(p => p.age <= 23 && p.minutes >= minMinutes)

    if (selectedPos !== "Alle") {
      filtered = filtered.filter(p => p.pos_group === selectedPos)
    }

    if (search) {
      filtered = filtered.filter(p => 
        p.player_name.toLowerCase().includes(search.toLowerCase())
      )
    }

    filtered.sort((a, b) => {
      if (sortBy === "age") return a.age - b.age
      if (sortBy === "minutes") return (b.minutes || 0) - (a.minutes || 0)
      
      const aVal = a[sortBy as keyof TalentPlayer] ?? 0
      const bVal = b[sortBy as keyof TalentPlayer] ?? 0
      return (bVal as number) - (aVal as number)
    })

    setFilteredPlayers(filtered)
  }, [players, search, selectedPos, minMinutes, sortBy])

  const avgAge = filteredPlayers.reduce((acc, p) => acc + p.age, 0) / (filteredPlayers.length || 1)
  const avgForecast = filteredPlayers.reduce((acc, p) => acc + (p.forecast_score || 0), 0) / (filteredPlayers.length || 1)
  const uniqueTeams = new Set(filteredPlayers.map(p => p.team_name)).size

  const formatMinutes = (minutes: number) => {
    if (!minutes) return "0"
    if (minutes >= 1000) {
      return `${(minutes / 1000).toFixed(1)}k`
    }
    return minutes.toString()
  }

  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "0.00"
    return score.toFixed(2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-6 h-6 text-brand animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  const topPotential = [...filteredPlayers]
    .sort((a, b) => (b.forecast_score || 0) - (a.forecast_score || 0))
    .slice(0, 5)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-brand mb-2 flex items-center gap-3">
          <Zap className="w-8 h-8" />
          U23 Talent
        </h1>
        <p className="text-textMuted">Fremtidens stjerner – unge spillere med høyest potensial</p>
      </div>

      {/* Nøkkeltall - Samme stil som forsiden */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-6">
          <Users className="w-8 h-8 text-brand mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{filteredPlayers.length}</div>
          <div className="text-sm text-textMuted">U23-spillere</div>
          <div className="text-xs text-brand mt-1">I dagens søk</div>
        </div>

        <div className="glass-panel p-6">
          <Calendar className="w-8 h-8 text-green-500 mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{avgAge.toFixed(1)}</div>
          <div className="text-sm text-textMuted">Snitt alder</div>
          <div className="text-xs text-green-500 mt-1">År</div>
        </div>

        <div className="glass-panel p-6">
          <TrendingUp className="w-8 h-8 text-purple-500 mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{avgForecast.toFixed(2)}</div>
          <div className="text-sm text-textMuted">Snitt potensial</div>
          <div className="text-xs text-purple-500 mt-1">Forecast score</div>
        </div>

        <div className="glass-panel p-6">
          <Award className="w-8 h-8 text-amber-500 mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{uniqueTeams}</div>
          <div className="text-sm text-textMuted">Klubber</div>
          <div className="text-xs text-amber-500 mt-1">Representert</div>
        </div>
      </div>

      {/* Filtre */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand" />
            <h2 className="text-xl font-semibold">Filtre</h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-sm text-textMuted hover:text-text"
          >
            <span>{showFilters ? 'Skjul' : 'Vis'}</span>
            <ChevronDown size={16} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm text-textMuted mb-2">Søk etter spiller</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-textMuted" size={18} />
                <input
                  type="text"
                  placeholder="Navn..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-panel border border-white/5 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-textMuted mb-2">Posisjon</label>
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
              <label className="block text-sm text-textMuted mb-2">Min. minutter</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={minMinutes}
                  onChange={(e) => setMinMinutes(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium bg-panel px-3 py-1 rounded-lg">
                  {minMinutes}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-textMuted mb-2">Sorter etter</label>
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
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-textMuted">
            {filteredPlayers.length} spillere funnet
          </span>
          <span className="text-xs text-brand">
            Sortert etter {sortOptions.find(o => o.value === sortBy)?.label}
          </span>
        </div>
      </div>

      {/* Topp 5 potensial */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="text-brand" size={20} />
          Topp 5 potensial
        </h2>

        <div className="space-y-3">
          {topPotential.map((player, idx) => {
            const forecastScore = player.forecast_score || 0
            const percentOfMax = (forecastScore / 0.4) * 100
            const medals = ['🥇', '🥈', '🥉', '4.', '5.']
            
            return (
              <Link
                key={player.player_name}
                href={`/player/${encodeURIComponent(player.player_name)}`}
                className="block glass-panel p-4 hover:bg-panelHover transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 min-w-[60px]">
                    <span className="text-2xl">{medals[idx]}</span>
                    <span className="text-sm font-bold text-brand">#{idx + 1}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-lg">{player.player_name}</span>
                        <span className="text-textMuted text-sm ml-2">{player.team_name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-textMuted">{player.age} år</span>
                        <span className="text-sm text-textMuted">{player.pos_group}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-textMuted">Potensial</span>
                        <span className="font-bold text-brand">{formatScore(forecastScore)}</span>
                      </div>
                      <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-brand to-purple-500"
                          style={{ width: `${Math.min(percentOfMax, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-textMuted">Prestasjon: {formatScore(player.fair_score)}</span>
                    <ChevronRight size={16} className="text-textMuted" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Full liste */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="text-brand" size={20} />
          Komplett U23-liste ({filteredPlayers.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-textMuted text-sm border-b border-white/5">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Spiller</th>
                <th className="pb-3 font-medium">Lag</th>
                <th className="pb-3 font-medium">Alder</th>
                <th className="pb-3 font-medium">Posisjon</th>
                <th className="pb-3 font-medium">Min.</th>
                <th className="pb-3 font-medium">Prestasjon</th>
                <th className="pb-3 font-medium">Potensial</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player, idx) => (
                <tr key={player.player_name} className="border-b border-white/5 hover:bg-panel/30 transition-colors">
                  <td className="py-3 font-medium text-brand">{idx + 1}</td>
                  <td className="py-3 font-medium">
                    <Link href={`/player/${encodeURIComponent(player.player_name)}`} className="hover:text-brand transition-colors">
                      {player.player_name}
                    </Link>
                  </td>
                  <td className="py-3 text-textMuted">{player.team_name}</td>
                  <td className="py-3">{player.age}</td>
                  <td className="py-3">
                    <span className="bg-panel px-2 py-1 rounded text-xs">
                      {player.pos_group}
                    </span>
                  </td>
                  <td className="py-3">{formatMinutes(player.minutes)}</td>
                  <td className="py-3">
                    <span className="text-brand">{formatScore(player.fair_score)}</span>
                  </td>
                  <td className="py-3">
                    <span className="font-bold text-brand">{formatScore(player.forecast_score)}</span>
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
      </div>
    </div>
  )
}
