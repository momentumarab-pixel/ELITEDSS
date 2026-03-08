"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Activity, TrendingUp, TrendingDown, Minus, Users } from "lucide-react"

interface Player {
  player_id: number
  player_name: string
  team_name: string
  team_logo: string | null
  age: number
  pos_group: string
  minutes: number
  fair_score: number | null
  forecast_score: number | null
  player_tier: string
  goals: number
  assists: number
  market_value: number
  market_value_trend: string
  reliability: number
}

const posLabel: Record<string, string> = {
  DEF: "Forsvarer",
  MID: "Midtbane",
  ATT: "Angriper",
  GK:  "Keeper"
}

const posColor: Record<string, string> = {
  DEF: "text-blue-400 bg-blue-500/10 border-blue-500/25",
  MID: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  ATT: "text-green-400 bg-green-500/10 border-green-500/25",
  GK:  "text-purple-400 bg-purple-500/10 border-purple-500/25"
}

function getReliability(minutes: number) {
  if (minutes >= 900) return { dot: "#22c55e", label: "Pålitelig" }
  if (minutes >= 450) return { dot: "#fbbf24", label: "Usikker"  }
  return                     { dot: "#ef4444", label: "Lite data" }
}

function getScoreColor(score: number | null) {
  if (score === null || score === undefined) return "text-textMuted"
  if (score > 0.6) return "text-green-400"
  if (score > 0.3) return "text-brand"
  if (score > 0)   return "text-amber-400"
  return "text-red-400"
}

function formatValue(val: number) {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
  return `${(val / 1000).toFixed(0)}k`
}

function PlayerCard({ player }: { player: Player }) {
  const reliability = getReliability(player.minutes)
  const isU23 = player.player_tier === "u23" || player.age <= 23
  const TrendIcon = player.market_value_trend === "up" ? TrendingUp
    : player.market_value_trend === "down" ? TrendingDown : Minus
  const trendColor = player.market_value_trend === "up" ? "text-green-400"
    : player.market_value_trend === "down" ? "text-red-400" : "text-textMuted"

  const initials = (player.player_name || "")
    .split(" ").map(n => n[0]).slice(0, 2).join("")

  return (
    <Link href={`/player/${encodeURIComponent(player.player_name)}`}>
      <div className="glass-panel p-5 hover:bg-white/5 transition-all duration-200 cursor-pointer group h-full flex flex-col">

        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold border border-white/10 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.12) 100%)" }}
          >
            {initials}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5">
            {isU23 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">
                U23
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${posColor[player.pos_group] || "text-textMuted bg-white/5 border-white/10"}`}>
              {posLabel[player.pos_group] || player.pos_group}
            </span>
          </div>
        </div>

        {/* Name + team */}
        <div className="mb-4">
          <h3
            className="font-semibold text-white text-sm leading-tight mb-1 group-hover:text-brand transition-colors"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {player.player_name}
          </h3>
          <p className="text-xs text-textMuted">{player.team_name} · {player.age} år</p>
        </div>

        {/* Score */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-textMuted mb-0.5">Prestasjon</div>
            <span className={`text-xl font-bold ${getScoreColor(player.fair_score)}`} style={{ fontFamily: "'Syne', sans-serif" }}>
              {player.fair_score !== null ? player.fair_score.toFixed(2) : "—"}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-textMuted mb-0.5">Markedsverdi</div>
            <div className="flex items-center gap-1 justify-end">
              <TrendIcon size={12} className={trendColor} />
              <span className="text-sm font-semibold text-white">{formatValue(player.market_value)} kr</span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Mål",    value: player.goals   ?? 0 },
            { label: "Assist", value: player.assists  ?? 0 },
            { label: "Min",    value: player.minutes >= 1000 ? `${(player.minutes/1000).toFixed(1)}k` : player.minutes },
          ].map(s => (
            <div key={s.label} className="bg-white/3 rounded-lg py-1.5 px-2 text-center border border-white/5">
              <div className="text-xs font-semibold text-white">{s.value}</div>
              <div className="text-xs text-textMuted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Reliability */}
        <div className="flex items-center gap-1.5 mt-auto">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: reliability.dot, boxShadow: `0 0 5px ${reliability.dot}` }}
          />
          <span className="text-xs text-textMuted">{reliability.label}</span>
          <span className="text-xs text-textMuted ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            Se profil →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function PlayerOverviewPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [filtered, setFiltered] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedPos, setSelectedPos] = useState("Alle")
  const [selectedTier, setSelectedTier] = useState("Alle")

  const posGroups = ["Alle", "MID", "ATT", "DEF", "GK"]
  const tiers = ["Alle", "senior", "u23"]

  useEffect(() => {
    fetch("http://localhost:8000/api/players")
      .then(res => res.json())
      .then(data => {
        // Shuffle for "random" feel on load
        const shuffled = [...data].sort(() => Math.random() - 0.5)
        setPlayers(shuffled)
        setFiltered(shuffled)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = [...players]

    if (search)
      result = result.filter(p =>
        p.player_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.team_name?.toLowerCase().includes(search.toLowerCase())
      )

    if (selectedPos !== "Alle")
      result = result.filter(p => p.pos_group === selectedPos)

    if (selectedTier !== "Alle")
      result = result.filter(p => p.player_tier === selectedTier)

    setFiltered(result)
  }, [search, selectedPos, selectedTier, players])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg0">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="w-6 h-6 text-brand animate-pulse" />
            </div>
          </div>
          <p className="text-textMuted text-sm tracking-widest uppercase animate-pulse">Laster spillere</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg0" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HEADER ───────────────────────────────────── */}
      <div
        className="border-b border-white/5"
        style={{ background: "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)" }}
      >
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-brand" />
            <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Spillerprofiler</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>
            Alle spillere
          </h1>
          <p className="text-textMuted text-lg max-w-xl">
            Søk, filtrer og utforsk alle {players.length} spillere i Eliteserien.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">

        {/* ── SEARCH + FILTERS ─────────────────────────── */}
        <div className="glass-panel p-5 mb-8">
          <div className="flex flex-col md:flex-row gap-3">

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
              <input
                type="text"
                placeholder="Søk på navn eller lag..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-bg0/60 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand transition-all text-white placeholder-textMuted"
                autoFocus
              />
            </div>

            {/* Pos filter */}
            <div className="flex gap-2 flex-wrap">
              {posGroups.map(pos => (
                <button
                  key={pos}
                  onClick={() => setSelectedPos(pos)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                    selectedPos === pos
                      ? "bg-brand/15 text-brand border-brand/30"
                      : "bg-white/3 text-textMuted border-white/5 hover:text-white hover:bg-white/8"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>

            {/* Tier filter */}
            <div className="flex gap-2">
              {tiers.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTier(t)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                    selectedTier === t
                      ? "bg-brand/15 text-brand border-brand/30"
                      : "bg-white/3 text-textMuted border-white/5 hover:text-white hover:bg-white/8"
                  }`}
                >
                  {t === "senior" ? "Senior" : t === "u23" ? "U23" : "Alle"}
                </button>
              ))}
            </div>
          </div>

          {/* Result count */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-textMuted">
              Viser <span className="text-white font-medium">{filtered.length}</span> spillere
            </span>
            {(search || selectedPos !== "Alle" || selectedTier !== "Alle") && (
              <button
                onClick={() => { setSearch(""); setSelectedPos("Alle"); setSelectedTier("Alle") }}
                className="text-xs text-textMuted hover:text-white transition-colors"
              >
                Nullstill filtre ×
              </button>
            )}
          </div>
        </div>

        {/* ── PLAYER GRID ──────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-10 h-10 text-textMuted mx-auto mb-4 opacity-30" />
            <p className="text-textMuted">Ingen spillere matcher søket ditt</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.slice(0, 80).map(player => (
              <PlayerCard key={player.player_id || player.player_name} player={player} />
            ))}
          </div>
        )}

        {filtered.length > 80 && (
          <div className="text-center mt-8 text-xs text-textMuted">
            Viser 80 av {filtered.length} spillere — bruk søk for å finne flere
          </div>
        )}

      </div>
    </div>
  )
}
