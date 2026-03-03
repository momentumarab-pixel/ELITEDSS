"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  User, 
  Search,
  ArrowRight,
  Shield,
  Star
} from "lucide-react"

interface Player {
  player_name: string
  team_name: string
  pos_group: string
  fair_score: number
  player_tier: string
}

export default function PlayerSelectPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedTier, setSelectedTier] = useState<string>("Alle")

  useEffect(() => {
    fetch("http://localhost:8000/api/players")
      .then(res => res.json())
      .then(data => {
        setPlayers(data)
        setFilteredPlayers(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Feil ved heating av spillere:", err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let filtered = [...players]

    if (search) {
      filtered = filtered.filter(p => 
        p.player_name.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (selectedTier !== "Alle") {
      filtered = filtered.filter(p => p.player_tier === selectedTier)
    }

    setFilteredPlayers(filtered)
  }, [search, selectedTier, players])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <User className="text-brand" size={32} />
          Spillerkort
        </h1>
        <p className="text-textMuted mt-2">
          Velg en spiller for å se detaljert analyse og rolleprofil
        </p>
      </div>

      {/* Søk og filtre */}
      <div className="glass-panel p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-textMuted mb-2">Søk etter spiller</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-textMuted" size={18} />
              <input
                type="text"
                placeholder="Skriv inn navn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-panel border border-white/5 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-brand"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-textMuted mb-2">Kategori</label>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full bg-panel border border-white/5 rounded-lg px-4 py-3 focus:outline-none focus:border-brand"
            >
              <option value="Alle">Alle spillere</option>
              <option value="senior">Senior</option>
              <option value="u23">U23</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-textMuted mt-4">
          {filteredPlayers.length} spillere funnet
        </p>
      </div>

      {/* Spillerliste */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.slice(0, 30).map((player) => (
          <Link
            key={player.player_name}
            href={`/player/${encodeURIComponent(player.player_name)}`}
            className="glass-panel p-5 hover:scale-[1.02] transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand/10 rounded-lg">
                  <User className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h3 className="font-bold text-lg group-hover:text-brand transition-colors">
                    {player.player_name}
                  </h3>
                  <p className="text-sm text-textMuted">
                    {player.team_name} • {player.pos_group}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-textMuted group-hover:text-brand transition-colors" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber" />
                <span className="text-sm">{player.fair_score.toFixed(2)}</span>
              </div>
              {player.player_tier === 'u23' && (
                <span className="badge badge-u23 text-xs">U23</span>
              )}
            </div>

            {/* Mini progress bar */}
            <div className="mt-3 h-1 bg-panel rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brand to-purple-500"
                style={{ width: `${Math.min((player.fair_score + 1) * 50, 100)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>

      {filteredPlayers.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <p className="text-textMuted">Ingen spillere matcher ditt søk</p>
        </div>
      )}
    </div>
  )
}
