"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Star, 
  User, 
  X, 
  Calendar,
  Clock,
  Award,
  TrendingUp,
  Trash2,
  Download,
  Eye,
  ChevronRight,
  Filter,
  Search
} from "lucide-react"

interface ShortlistPlayer {
  player_name: string
  team_name: string
  age: number
  pos_group: string
  detailed_position: string
  fair_score: number
  forecast_score: number
  minutes: number
}

export default function ShortlistPage() {
  const [shortlist, setShortlist] = useState<ShortlistPlayer[]>([])
  const [allPlayers, setAllPlayers] = useState<ShortlistPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<string>("fair_score")

  const sortOptions = [
    { value: "fair_score", label: "Prestasjon" },
    { value: "forecast_score", label: "Potensial" },
    { value: "age", label: "Alder" },
    { value: "minutes", label: "Minutter" }
  ]

  useEffect(() => {
    fetch("http://localhost:8000/api/players")
      .then(res => res.json())
      .then(data => {
        setAllPlayers(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Feil ved heating av spillere:", err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('eliteserien_shortlist')
    if (saved) {
      try {
        const names = JSON.parse(saved)
        const players = allPlayers.filter(p => names.includes(p.player_name))
        setShortlist(players)
      } catch (e) {
        console.error("Feil ved parsing av shortlist:", e)
      }
    }
  }, [allPlayers])

  const saveShortlist = (players: ShortlistPlayer[]) => {
    const names = players.map(p => p.player_name)
    localStorage.setItem('eliteserien_shortlist', JSON.stringify(names))
    setShortlist(players)
  }

  const removeFromShortlist = (playerName: string) => {
    const updated = shortlist.filter(p => p.player_name !== playerName)
    saveShortlist(updated)
  }

  const clearShortlist = () => {
    if (confirm("Er du sikker på at du vil fjerne alle kandidater?")) {
      saveShortlist([])
    }
  }

  const exportShortlist = () => {
    const dataStr = JSON.stringify(shortlist, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `kandidater_${new Date().toISOString().slice(0,10)}.json`
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const filteredAndSortedShortlist = [...shortlist]
    .filter(p => p.player_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortBy as keyof ShortlistPlayer] || 0
      const bVal = b[sortBy as keyof ShortlistPlayer] || 0
      return (bVal as number) - (aVal as number)
    })

  const avgFair = shortlist.reduce((acc, p) => acc + (p.fair_score || 0), 0) / (shortlist.length || 1)
  const avgForecast = shortlist.reduce((acc, p) => acc + (p.forecast_score || 0), 0) / (shortlist.length || 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-amber-500 mb-2 flex items-center gap-3">
          <Star className="w-8 h-8" />
          Kandidater
        </h1>
        <p className="text-textMuted">Dine favorittspillere – lagret for rask tilgang</p>
      </div>

      {/* Statistikk og handlinger */}
      <div className="glass-panel p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold">{shortlist.length}</span>
              <span className="text-textMuted">kandidater</span>
            </div>
            {shortlist.length > 0 && (
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-textMuted">Snitt prestasjon: </span>
                  <span className="font-bold text-brand">{avgFair.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-textMuted">Snitt potensial: </span>
                  <span className="font-bold text-purple-500">{avgForecast.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          
          {shortlist.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={exportShortlist}
                className="flex items-center gap-2 px-4 py-2 bg-panel hover:bg-panelHover rounded-lg transition-all"
              >
                <Download size={18} />
                <span>Eksporter</span>
              </button>
              <button
                onClick={clearShortlist}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
              >
                <Trash2 size={18} />
                <span>Tøm liste</span>
              </button>
            </div>
          )}
        </div>

        {/* Søk og sorter (kun hvis det er kandidater) */}
        {shortlist.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-textMuted" size={18} />
              <input
                type="text"
                placeholder="Søk i kandidater..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-panel border border-white/5 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-textMuted text-sm">Sorter etter:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Kandidatliste */}
      {shortlist.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Star className="w-12 h-12 text-amber-500/50" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Ingen kandidater ennå</h2>
          <p className="text-textMuted mb-6 max-w-md mx-auto">
            Legg til spillere fra dashboard, spillerprofil eller talent-siden for å bygge din shortlist
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/dashboard"
              className="bg-brand hover:bg-brandDark px-6 py-3 rounded-xl font-semibold transition-all"
            >
              Gå til dashboard
            </Link>
            <Link 
              href="/talent"
              className="bg-purple-500 hover:bg-purple-600 px-6 py-3 rounded-xl font-semibold transition-all"
            >
              Se talent
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Grid med kandidater */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedShortlist.map((player) => (
              <div key={player.player_name} className="glass-panel p-6 hover:scale-[1.02] transition-all duration-300 group relative">
                {/* Fjern-knapp (viser på hover) */}
                <button
                  onClick={() => removeFromShortlist(player.player_name)}
                  className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Fjern fra kandidater"
                >
                  <X size={16} className="text-red-500" />
                </button>

                {/* Header med ikon */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Star className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{player.player_name}</h3>
                    <p className="text-sm text-textMuted">{player.team_name}</p>
                  </div>
                </div>

                {/* Detaljer */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-textMuted">Posisjon</span>
                    <span className="font-medium">{player.pos_group} • {player.detailed_position || '–'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-textMuted">Alder</span>
                    <span className="font-medium">{player.age} år</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-textMuted">Minutter</span>
                    <span className="font-medium">{player.minutes?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Score-grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-panel rounded-lg p-3 text-center">
                    <div className="text-xs text-textMuted mb-1">Prestasjon</div>
                    <div className="text-lg font-bold text-brand">{player.fair_score?.toFixed(2)}</div>
                  </div>
                  <div className="bg-panel rounded-lg p-3 text-center">
                    <div className="text-xs text-textMuted mb-1">Potensial</div>
                    <div className="text-lg font-bold text-purple-500">{player.forecast_score?.toFixed(2)}</div>
                  </div>
                </div>

                {/* Handlingsknapper */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/player/${encodeURIComponent(player.player_name)}`}
                    className="flex items-center justify-center gap-1 bg-brand/10 hover:bg-brand/20 text-brand py-2 rounded-lg transition-all text-sm"
                  >
                    <Eye size={14} />
                    <span>Profil</span>
                  </Link>
                  <Link
                    href={`/duell?a=${encodeURIComponent(player.player_name)}`}
                    className="flex items-center justify-center gap-1 bg-panel hover:bg-panelHover py-2 rounded-lg transition-all text-sm"
                  >
                    <span>Sammenlign</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Viser antall */}
          {search && filteredAndSortedShortlist.length !== shortlist.length && (
            <div className="text-center text-sm text-textMuted">
              Viser {filteredAndSortedShortlist.length} av {shortlist.length} kandidater
            </div>
          )}
        </>
      )}
    </div>
  )
}
