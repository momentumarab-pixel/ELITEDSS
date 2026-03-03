"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Eye,
  TrendingUp, 
  Calendar, 
  Clock, 
  Award,
  Shield,
  Zap,
  Target,
  Star,
  Filter,
  ChevronDown,
  Search,
  User
} from "lucide-react"

interface ScoutPlayer {
  player_name: string
  team_name: string
  age: number
  pos_group: string
  minutes: number
  fair_score: number
  forecast_score: number
  reliability: number
  best_role?: string
}

export default function ScoutPage() {
  const [players, setPlayers] = useState<ScoutPlayer[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<ScoutPlayer[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter state
  const [maxAge, setMaxAge] = useState(23)
  const [minMinutes, setMinMinutes] = useState(450)
  const [selectedPos, setSelectedPos] = useState<string>("Alle")
  const [sortBy, setSortBy] = useState<string>("forecast_score")
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const posGroups = ["Alle", "MID", "ATT", "DEF", "GK"]
  const sortOptions = [
    { value: "forecast_score", label: "Potensial (høyest)" },
    { value: "fair_score", label: "Prestasjon (høyest)" },
    { value: "age", label: "Alder (yngst)" },
    { value: "minutes", label: "Minutter (flest)" }
  ]

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/players")
        if (!response.ok) throw new Error('Kunne ikke hente spillere')
        
        const data = await response.json()
        setPlayers(data)
      } catch (err) {
        console.error('Feil ved heating av spillere:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  // Filtrer og sorter spillere
  useEffect(() => {
    let filtered = players.filter(p => p.age <= maxAge && p.minutes >= minMinutes)

    if (selectedPos !== "Alle") {
      filtered = filtered.filter(p => p.pos_group === selectedPos)
    }

    if (search) {
      filtered = filtered.filter(p => 
        p.player_name.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Sortering
    filtered.sort((a, b) => {
      if (sortBy === "age") return a.age - b.age
      if (sortBy === "minutes") return (b.minutes || 0) - (a.minutes || 0)
      return (b[sortBy as keyof ScoutPlayer] as number) - (a[sortBy as keyof ScoutPlayer] as number)
    })

    setFilteredPlayers(filtered)
  }, [players, maxAge, minMinutes, selectedPos, sortBy, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Eye className="w-6 h-6 text-brand animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Eye className="w-8 h-8 text-purple" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Scout-rapport</h1>
            <p className="text-textMuted">
              {filteredPlayers.length} U23-spillere funnet
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="glass-panel px-4 py-2 flex items-center gap-2 hover:bg-panelHover transition-all"
        >
          <Filter size={18} />
          <span>Filtre</span>
          <ChevronDown size={18} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filterpanel */}
      {showFilters && (
        <div className="glass-panel p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm text-textMuted mb-2">Maks alder</label>
              <input
                type="range"
                min="17"
                max="25"
                value={maxAge}
                onChange={(e) => setMaxAge(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm mt-1">
                <span>{maxAge} år</span>
                <span className="text-textMuted">17-25</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-textMuted mb-2">Min. minutter</label>
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={minMinutes}
                onChange={(e) => setMinMinutes(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm mt-1">
                <span>{minMinutes} min</span>
                <span className="text-textMuted">0-2000</span>
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

          {/* Søk */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-textMuted" size={18} />
              <input
                type="text"
                placeholder="Søk etter spiller..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-panel border border-white/5 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>
      )}

      {/* Statistikk-kort */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <p className="text-textMuted text-sm mb-1">Gj.snitt alder</p>
          <p className="text-2xl font-bold">
            {(filteredPlayers.reduce((acc, p) => acc + p.age, 0) / filteredPlayers.length || 0).toFixed(1)} år
          </p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-textMuted text-sm mb-1">Gj.snitt potensial</p>
          <p className="text-2xl font-bold text-purple">
            {(filteredPlayers.reduce((acc, p) => acc + p.forecast_score, 0) / filteredPlayers.length || 0).toFixed(2)}
          </p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-textMuted text-sm mb-1">Gj.snitt minutter</p>
          <p className="text-2xl font-bold">
            {Math.round(filteredPlayers.reduce((acc, p) => acc + p.minutes, 0) / filteredPlayers.length || 0).toLocaleString()}
          </p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-textMuted text-sm mb-1">Antall lag</p>
          <p className="text-2xl font-bold">
            {new Set(filteredPlayers.map(p => p.team_name)).size}
          </p>
        </div>
      </div>

      {/* Topp 3 potensial */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredPlayers.slice(0, 3).map((player, idx) => (
          <Link
            key={player.player_name}
            href={`/player/${encodeURIComponent(player.player_name)}`}
            className="glass-panel p-6 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <span className={`badge ${idx === 0 ? 'badge-top' : 'badge-u23'}`}>
                #{idx + 1} potensial
              </span>
              <span className="badge bg-panel border-white/5">
                {player.pos_group}
              </span>
            </div>
            
            <h3 className="text-xl font-bold mb-1">{player.player_name}</h3>
            <p className="text-textMuted text-sm mb-4">{player.team_name}</p>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-textMuted" />
                <span className="text-sm">{player.age} år</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-textMuted">Potensial</span>
                <p className="text-xl font-bold text-purple">{player.forecast_score.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="mt-3 h-1 bg-panel rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple to-purpleLight"
                style={{ width: `${Math.min(player.forecast_score * 50, 100)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>

      {/* Full liste */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="text-purple" />
          Komplett U23-liste ({filteredPlayers.length} spillere)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-textMuted text-sm border-b border-white/5">
                <th className="pb-3">#</th>
                <th className="pb-3">Spiller</th>
                <th className="pb-3">Lag</th>
                <th className="pb-3">Alder</th>
                <th className="pb-3">Posisjon</th>
                <th className="pb-3">Minutter</th>
                <th className="pb-3">Prestasjon</th>
                <th className="pb-3">Potensial</th>
                <th className="pb-3">Data</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player, idx) => (
                <tr key={player.player_name} className="border-b border-white/5 hover:bg-panel/30 transition-colors">
                  <td className="py-3 font-bold text-purple">{idx + 1}</td>
                  <td className="py-3 font-medium">{player.player_name}</td>
                  <td className="py-3 text-textMuted">{player.team_name}</td>
                  <td className="py-3">{player.age}</td>
                  <td className="py-3">
                    <span className="bg-panel px-2 py-1 rounded text-xs">
                      {player.pos_group}
                    </span>
                  </td>
                  <td className="py-3">{player.minutes?.toLocaleString()}</td>
                  <td className="py-3 text-brand">{player.fair_score?.toFixed(2)}</td>
                  <td className="py-3 text-purple font-bold">{player.forecast_score?.toFixed(2)}</td>
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
                      className="text-purple hover:underline text-sm"
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
          <div className="text-center py-8">
            <p className="text-textMuted">Ingen spillere matcher dine filtre</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="glass-panel p-6 text-center">
        <h3 className="text-xl font-bold mb-2">Klar for å identifisere neste stjerne?</h3>
        <p className="text-textMuted mb-4">
          Analyser disse U23-spillerne i detalj med våre scouting-verktøy
        </p>
        <Link 
          href="/dashboard"
          className="inline-block bg-purple hover:bg-purpleDark px-6 py-3 rounded-xl font-semibold transition-all"
        >
          Gå til fullt dashboard
        </Link>
      </div>
    </div>
  )
}
