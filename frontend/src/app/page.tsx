"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Award,
  Shield,
  Target,
  ChevronRight,
  Star,
  Zap,
  Activity
} from "lucide-react"

interface Player {
  player_name: string
  team_name: string
  age: number
  pos_group: string
  minutes: number
  fair_score: number
  forecast_score: number
}

export default function Home() {
  const [topPlayers, setTopPlayers] = useState<Player[]>([])
  const [u23Players, setU23Players] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total_players: 251,
    total_minutes: 25400,
    unique_teams: 16,
    data_quality: 98
  })

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:8000/api/players").then(res => res.json()),
      fetch("http://localhost:8000/api/stats").then(res => res.json())
    ])
      .then(([players, statsData]) => {
        const sorted = [...players].sort((a, b) => b.fair_score - a.fair_score)
        setTopPlayers(sorted.slice(0, 5))
        
        const u23 = players.filter((p: Player) => p.age <= 23)
        setU23Players(u23.slice(0, 5))
        
        if (statsData) {
          setStats(statsData)
        }
        
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand/20 via-purple-500/10 to-transparent p-12 border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <h1 className="text-5xl font-bold mb-4">
            Beslutningsstøtte for <br />
            <span className="text-brand">profesjonell scouting</span>
          </h1>
          <p className="text-textMuted text-lg max-w-2xl mb-6">
            Analyser, sammenlign og identifiser talent i Eliteserien med avanserte metrics og prediktive modeller.
          </p>
          <Link 
            href="/dashboard" 
            className="bg-brand hover:bg-brandDark px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-brand/20 inline-flex items-center gap-2"
          >
            <Target size={20} />
            Start scouting
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-6">
          <Users className="w-8 h-8 text-brand mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{stats.total_players}</div>
          <div className="text-sm text-textMuted">Spillere analysert</div>
        </div>

        <div className="glass-panel p-6">
          <Clock className="w-8 h-8 text-green-500 mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{(stats.total_minutes / 1000).toFixed(1)}k</div>
          <div className="text-sm text-textMuted">Minutter totalt</div>
        </div>

        <div className="glass-panel p-6">
          <Award className="w-8 h-8 text-amber-500 mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{stats.unique_teams}</div>
          <div className="text-sm text-textMuted">Eliteserie-klubber</div>
        </div>

        <div className="glass-panel p-6">
          <Zap className="w-8 h-8 text-purple-500 mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{stats.data_quality}%</div>
          <div className="text-sm text-textMuted">Datakvalitet</div>
        </div>
      </div>

      {/* Topp 5 spillere */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="text-brand" />
            Topp 5 spillere (fair score)
          </h2>
          <Link href="/dashboard" className="text-brand hover:text-brandLight flex items-center gap-1 text-sm">
            Se alle <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {topPlayers.map((player, idx) => (
            <Link
              key={player.player_name}
              href={`/player/${encodeURIComponent(player.player_name)}`}
              className="glass-panel p-4 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`badge ${idx === 0 ? 'badge-top' : ''}`}>
                  #{idx + 1}
                </span>
                {player.pos_group && (
                  <span className="badge bg-panel border-white/5">
                    {player.pos_group}
                  </span>
                )}
              </div>
              
              <h3 className="font-semibold text-lg mb-1">{player.player_name}</h3>
              <p className="text-textMuted text-sm mb-3">{player.team_name}</p>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-textMuted">
                  {player.age} år
                </span>
                <span className="text-xl font-bold text-brand">
                  {player.fair_score?.toFixed(2)}
                </span>
              </div>

              <div className="mt-3 h-1 bg-panel rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-brand to-purple-500"
                  style={{ width: `${Math.min((player.fair_score + 1) * 50, 100)}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* U23 Talent */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="text-purple-500" />
            U23 - Fremtidens stjerner
          </h2>
          <Link href="/talent" className="text-purple-500 hover:text-purple-400 flex items-center gap-1 text-sm">
            Scout rapport <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {u23Players.map((player) => (
            <Link
              key={player.player_name}
              href={`/player/${encodeURIComponent(player.player_name)}`}
              className="glass-panel p-4 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="badge badge-u23">U23</span>
                <span className="badge bg-panel border-white/5">
                  {player.pos_group}
                </span>
              </div>
              
              <h3 className="font-semibold text-lg mb-1">{player.player_name}</h3>
              <p className="text-textMuted text-sm mb-3">
                {player.team_name} • {player.age} år
              </p>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-textMuted">Potensial</span>
                <span className="text-lg font-bold text-purple-500">
                  {player.forecast_score?.toFixed(2)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-textMuted">Legg til shortlist</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-8">
        <div className="text-center text-textMuted text-sm">
          <p>DSS © 2026 - Beslutningsstøtte for profesjonell scouting</p>
        </div>
      </footer>
    </div>
  )
}
