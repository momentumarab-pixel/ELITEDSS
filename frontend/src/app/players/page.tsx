"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search } from "lucide-react"

interface Player {
  name: string
  team: string
  age: number
  position: string
  fair_score: number
  player_tier: string
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedTier, setSelectedTier] = useState<"all" | "senior" | "u23">("all")

  useEffect(() => {
    fetch("http://localhost:8000/api/players")
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const filteredPlayers = players.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesTier = selectedTier === "all" || p.player_tier === selectedTier
    return matchesSearch && matchesTier
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Alle spillere</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
          <input
            type="text"
            placeholder="Søk etter spiller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg1 border border-panel rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "senior", "u23"] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded-lg border ${
                selectedTier === tier
                  ? "bg-brand text-white border-brand"
                  : "bg-bg1 border-panel text-muted hover:text-text"
              }`}
            >
              {tier === "all" ? "Alle" : tier === "senior" ? "Senior" : "U23"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPlayers.map((player) => (
          <Link
            key={player.name}
            href={`/player/${encodeURIComponent(player.name)}`}
            className="bg-bg1 border border-panel rounded-xl p-4 hover:border-brand transition-all hover:scale-105"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{player.name}</h3>
              {player.player_tier === "u23" && (
                <span className="bg-u23/20 text-u23 text-xs px-2 py-1 rounded">U23</span>
              )}
            </div>
            <p className="text-sm text-muted">{player.team}</p>
            <p className="text-sm text-muted">{player.position}</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-sm">Alder: {player.age}</span>
              <span className="text-lg font-bold text-brand">{player.fair_score.toFixed(1)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
