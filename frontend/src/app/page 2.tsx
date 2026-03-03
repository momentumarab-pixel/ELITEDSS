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
    total_minutes: 396700,
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
    <div className="space-y-8 pb-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand/20 via-purple-500/10 to-transparent p-8 border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Beslutningsstøtte for<br />
            <span className="text-brand">profesjonell scouting</span>
          </h1>
          <p className="text-textMuted text-lg max-w-2xl mb-6">
            Analyser, sammenlign og identifiser talent i Eliteserien med avanserte metrics og prediktive modeller.
          </p>
          <div className="flex gap-4">
            <Link 
              href="/dashboard" 
              className="bg-brand hover:bg-brandDark px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-brand/20 flex items-center gap-2"
            >
              <Target size={20} />
              Start scouting
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <Users className="w-5 h-5 text-brand mb-2" />
          <span className="text-2xl font-bold">{stats.total_players}</span>
          <span className="text-sm text-textMuted block">Spillere analysert</span>
        </div>
        <div className="glass-panel p-4">
          <Clock className="w-5 h-5 text-green mb-2" />
          <span className="text-2xl font-bold">{(stats.total_minutes / 1000).toFixed(1)}k</span>
          <span className="text-sm text-textMuted block">Minutter totalt</span>
        </div>
        <div className="glass-panel p-4">
          <Award className="w-5 h-5 text-amber mb-2" />
          <span className="text-2xl font-bold">{stats.unique_teams}</span>
          <span className="text-sm text-textMuted block">Eliteserie-klubber</span>
        </div>
        <div className="glass-panel p-4">
          <Zap className="w-5 h-5 text-purple mb-2" />
          <span className="text-2xl font-bold">{stats.data_quality}%</span>
          <span className="text-sm text-textMuted block">Datakvalitet</span>
        </div>
      </div>

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
                <span className="text-brand font-bold">#{idx + 1}</span>
                <span className="text-xs bg-panel px-2 py-1 rounded">{player.pos_group}</span>
              </div>
              
              <h3 className="font-semibold text-lg mb-1">{player.player_name}</h3>
              <p className="text-textMuted text-sm mb-3">{player.team_name}</p>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-textMuted">{player.age} år</span>
                <span className="text-xl font-bold text-brand">{player.fair_score?.toFixed(2)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="text-purple" />
            U23 - Fremtidens stjerner
          </h2>
          <Link href="/scout" className="text-purple hover:text-purple/80 flex items-center gap-1 text-sm">
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
                <span className="text-purple font-bold">U23</span>
                <span className="text-xs bg-panel px-2 py-1 rounded">{player.pos_group}</span>
              </div>
              
              <h3 className="font-semibold text-lg mb-1">{player.player_name}</h3>
              <p className="text-textMuted text-sm mb-3">{player.team_name} • {player.age} år</p>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-textMuted">Potensial</span>
                <span className="text-lg font-bold text-purple">{player.forecast_score?.toFixed(2)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
