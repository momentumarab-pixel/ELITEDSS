"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  User, 
  Target, 
  Clock, 
  Award,
  Shield,
  TrendingUp,
  Zap,
  Activity,
  Search,
  X,
  BarChart3,
  Sword,
  Calendar,
  DollarSign,
  ChevronDown
} from "lucide-react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Cell
} from "recharts"

interface Player {
  player_name: string
  team_name: string
}

interface PlayerData {
  name: string
  team: string
  age: number
  pos_group: string
  minutes: number
  fair_score: number
  forecast_score: number
  goals_per90: number
  assists_per90: number
  passes_key_per90: number
  tackles_total_per90: number
  dribbles_success_per90: number
  shirt_number?: number
  salary?: number
  z_goals_per90_pos?: number
  z_assists_per90_pos?: number
  z_passes_key_per90_pos?: number
  z_passes_accuracy_pos?: number
  z_intensity_pos?: number
  z_duels_total_per90_pos?: number
  z_tackles_total_per90_pos?: number
  z_interceptions_per90_pos?: number
}

interface DuellData {
  player_a: PlayerData
  player_b: PlayerData
}

export default function DuellPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [duellData, setDuellData] = useState<DuellData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [radarData, setRadarData] = useState<any[]>([])
  
  const [searchA, setSearchA] = useState("")
  const [searchB, setSearchB] = useState("")
  const [showDropdownA, setShowDropdownA] = useState(false)
  const [showDropdownB, setShowDropdownB] = useState(false)
  const [selectedA, setSelectedA] = useState(searchParams.get('a') || "")
  const [selectedB, setSelectedB] = useState(searchParams.get('b') || "")

  useEffect(() => {
    fetch("http://localhost:8000/api/players")
      .then(res => res.json())
      .then(data => {
        const playersWithDetails = data.map((p: any) => ({
          player_name: p.player_name,
          team_name: p.team_name,
          shirt_number: 10,
          salary: 100000
        }))
        setAllPlayers(playersWithDetails)
      })
      .catch(err => console.error("Feil ved heating av spillerliste:", err))
  }, [])

  useEffect(() => {
    if (!selectedA || !selectedB) {
      setLoading(false)
      return
    }

    const fetchDuellData = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `http://localhost:8000/api/duell?player_a=${encodeURIComponent(selectedA)}&player_b=${encodeURIComponent(selectedB)}`
        )
        
        if (!response.ok) {
          throw new Error('Kunne ikke hente data for duell')
        }
        
        const data = await response.json()
        console.log("Duell data mottatt:", data)
        
        if (data.player_a) {
          data.player_a.shirt_number = 10
          data.player_a.salary = 100000
        }
        if (data.player_b) {
          data.player_b.shirt_number = 10
          data.player_b.salary = 100000
        }
        
        setDuellData(data)
        
        if (data.player_a && data.player_b) {
          const categories = [
            { key: 'z_goals_per90_pos', label: 'Mål', a: 0, b: 0 },
            { key: 'z_assists_per90_pos', label: 'Assist', a: 0, b: 0 },
            { key: 'z_passes_key_per90_pos', label: 'Nøkkelpasninger', a: 0, b: 0 },
            { key: 'z_passes_accuracy_pos', label: 'Pasningspresisjon', a: 0, b: 0 },
            { key: 'z_duels_total_per90_pos', label: 'Dueller', a: 0, b: 0 },
            { key: 'z_intensity_pos', label: 'Intensitet', a: 0, b: 0 },
            { key: 'z_tackles_total_per90_pos', label: 'Taklinger', a: 0, b: 0 },
            { key: 'z_interceptions_per90_pos', label: 'Brytninger', a: 0, b: 0 }
          ]
          
          const radarFormatted = categories.map(cat => {
            const aVal = data.player_a[cat.key] !== undefined && data.player_a[cat.key] !== null 
              ? Math.min(Math.max((data.player_a[cat.key] + 2) * 25, 0), 100) 
              : 50
            const bVal = data.player_b[cat.key] !== undefined && data.player_b[cat.key] !== null 
              ? Math.min(Math.max((data.player_b[cat.key] + 2) * 25, 0), 100) 
              : 50
            
            return {
              kategori: cat.label,
              A: aVal,
              B: bVal,
              fullMark: 100
            }
          })
          
          setRadarData(radarFormatted)
        }
        
        setError(null)
      } catch (err) {
        console.error('Feil ved heating av duell-data:', err)
        setError('Kunne ikke laste data for sammenligning')
      } finally {
        setLoading(false)
      }
    }

    fetchDuellData()
  }, [selectedA, selectedB])

  const filteredPlayersA = allPlayers
    .filter(p => p.player_name?.toLowerCase().includes(searchA.toLowerCase()))
    .filter(p => p.player_name !== selectedB)
    .slice(0, 8)

  const filteredPlayersB = allPlayers
    .filter(p => p.player_name?.toLowerCase().includes(searchB.toLowerCase()))
    .filter(p => p.player_name !== selectedA)
    .slice(0, 8)

  const handleSelectA = (playerName: string) => {
    setSelectedA(playerName)
    setSearchA("")
    setShowDropdownA(false)
    const params = new URLSearchParams(searchParams.toString())
    params.set('a', playerName)
    if (selectedB) params.set('b', selectedB)
    router.push(`/duell?${params.toString()}`)
  }

  const handleSelectB = (playerName: string) => {
    setSelectedB(playerName)
    setSearchB("")
    setShowDropdownB(false)
    const params = new URLSearchParams(searchParams.toString())
    if (selectedA) params.set('a', selectedA)
    params.set('b', playerName)
    router.push(`/duell?${params.toString()}`)
  }

  const clearSelection = (player: 'a' | 'b') => {
    if (player === 'a') {
      setSelectedA("")
      setDuellData(null)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('a')
      router.push(`/duell?${params.toString()}`)
    } else {
      setSelectedB("")
      setDuellData(null)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('b')
      router.push(`/duell?${params.toString()}`)
    }
  }

  const formatMinutes = (minutes: number) => {
    if (minutes >= 1000) {
      return `${(minutes / 1000).toFixed(1)}k`
    }
    return minutes.toString()
  }

  const getDifferenceColor = (aVal: number, bVal: number) => {
    if (aVal > bVal) return 'text-green-400'
    if (bVal > aVal) return 'text-red-400'
    return 'text-textMuted'
  }

  const getDifferenceIcon = (aVal: number, bVal: number) => {
    if (aVal > bVal) return '▲'
    if (bVal > aVal) return '▼'
    return '•'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header med tilbakeknapp */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard" 
          className="glass-panel p-3 hover:bg-panelHover transition-all rounded-xl"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-brand">Sammenligning</h1>
          <p className="text-textMuted">Sammenlign to spillere side om side</p>
        </div>
      </div>

      {/* Spillervelgere */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-textMuted">Spiller A</label>
          {selectedA ? (
            <div className="glass-panel p-4 border-l-4 border-brand flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center">
                  <span className="text-brand font-bold">10</span>
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedA}</p>
                  <p className="text-sm text-textMuted">
                    {allPlayers.find(p => p.player_name === selectedA)?.team_name}
                  </p>
                </div>
              </div>
              <button onClick={() => clearSelection('a')} className="p-2 hover:bg-panelHover rounded-lg">
                <X size={18} className="text-textMuted" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 glass-panel px-4 py-3">
                <Search size={18} className="text-textMuted" />
                <input
                  type="text"
                  placeholder="Søk etter spiller A..."
                  value={searchA}
                  onChange={(e) => {
                    setSearchA(e.target.value)
                    setShowDropdownA(true)
                  }}
                  onFocus={() => setShowDropdownA(true)}
                  className="w-full bg-transparent border-none focus:outline-none text-text"
                />
                {searchA && <ChevronDown size={18} className="text-textMuted" />}
              </div>
              {showDropdownA && searchA && filteredPlayersA.length > 0 && (
                <div className="absolute z-10 w-full mt-2 glass-panel p-2 max-h-60 overflow-y-auto">
                  {filteredPlayersA.map((player) => (
                    <button
                      key={player.player_name}
                      onClick={() => handleSelectA(player.player_name)}
                      className="w-full text-left px-4 py-3 hover:bg-panelHover rounded-lg transition-all"
                    >
                      <div className="font-medium">{player.player_name}</div>
                      <div className="text-xs text-textMuted">{player.team_name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-textMuted">Spiller B</label>
          {selectedB ? (
            <div className="glass-panel p-4 border-l-4 border-purple-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-500 font-bold">10</span>
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedB}</p>
                  <p className="text-sm text-textMuted">
                    {allPlayers.find(p => p.player_name === selectedB)?.team_name}
                  </p>
                </div>
              </div>
              <button onClick={() => clearSelection('b')} className="p-2 hover:bg-panelHover rounded-lg">
                <X size={18} className="text-textMuted" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 glass-panel px-4 py-3">
                <Search size={18} className="text-textMuted" />
                <input
                  type="text"
                  placeholder="Søk etter spiller B..."
                  value={searchB}
                  onChange={(e) => {
                    setSearchB(e.target.value)
                    setShowDropdownB(true)
                  }}
                  onFocus={() => setShowDropdownB(true)}
                  className="w-full bg-transparent border-none focus:outline-none text-text"
                />
                {searchB && <ChevronDown size={18} className="text-textMuted" />}
              </div>
              {showDropdownB && searchB && filteredPlayersB.length > 0 && (
                <div className="absolute z-10 w-full mt-2 glass-panel p-2 max-h-60 overflow-y-auto">
                  {filteredPlayersB.map((player) => (
                    <button
                      key={player.player_name}
                      onClick={() => handleSelectB(player.player_name)}
                      className="w-full text-left px-4 py-3 hover:bg-panelHover rounded-lg transition-all"
                    >
                      <div className="font-medium">{player.player_name}</div>
                      <div className="text-xs text-textMuted">{player.team_name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sammenligning */}
      {selectedA && selectedB ? (
        loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
          </div>
        ) : error || !duellData ? (
          <div className="glass-panel p-8 text-center">
            <p className="text-red mb-4">{error || 'Kunne ikke laste data'}</p>
          </div>
        ) : (
          <>
            {/* Edderkoppdiagram */}
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="text-brand" />
                Rolleprofil – Sammenligning
              </h2>
              
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#ffffff20" />
                    <PolarAngleAxis 
                      dataKey="kategori" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickCount={5}
                    />
                    <Radar
                      name={duellData.player_a.name}
                      dataKey="A"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name={duellData.player_b.name}
                      dataKey="B"
                      stroke="#a855f7"
                      fill="#a855f7"
                      fillOpacity={0.3}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0a0e17', 
                        border: '1px solid #ffffff20',
                        borderRadius: '8px'
                      }}
                      formatter={(value: any) => [`${value.toFixed(1)}%`, 'Percentil']}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#94a3b8' }}
                      formatter={(value) => <span style={{ color: '#eaeef5' }}>{value}</span>}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-textMuted text-center mt-4">
                * Verdier viser percentil sammenlignet med andre spillere i samme posisjon
              </p>
            </div>

            {/* 2-kolonners sammenligning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel p-6 border-t-4 border-brand">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-brand">{duellData.player_a.name}</h2>
                    <p className="text-textMuted">{duellData.player_a.team} • {duellData.player_a.pos_group || 'Ukjent'}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
                    <span className="text-brand font-bold text-xl">10</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-panel rounded-lg p-3">
                    <p className="text-textMuted text-xs">Alder</p>
                    <p className="text-xl font-bold">{duellData.player_a.age} år</p>
                  </div>
                  <div className="bg-panel rounded-lg p-3">
                    <p className="text-textMuted text-xs">Minutter</p>
                    <p className="text-xl font-bold">{formatMinutes(duellData.player_a.minutes)}</p>
                  </div>
                  <div className="bg-panel rounded-lg p-3">
                    <p className="text-textMuted text-xs">Prestasjon</p>
                    <p className="text-xl font-bold text-brand">{duellData.player_a.fair_score?.toFixed(2)}</p>
                  </div>
                  <div className="bg-panel rounded-lg p-3">
                    <p className="text-textMuted text-xs">Potensial</p>
                    <p className="text-xl font-bold text-purple-500">{duellData.player_a.forecast_score?.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <DollarSign size={16} />
                    {duellData.player_a.salary?.toLocaleString()} kr
                  </p>
                </div>
              </div>

              <div className="glass-panel p-6 border-t-4 border-purple-500">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-purple-500">{duellData.player_b.name}</h2>
                    <p className="text-textMuted">{duellData.player_b.team} • {duellData.player_b.pos_group || 'Ukjent'}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-500 font-bold text-xl">10</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-panel rounded-lg p-3">
                    <p className="text-textMuted text-xs">Alder</p>
                    <p className="text-xl font-bold">{duellData.player_b.age} år</p>
                  </div>
                  <div className="bg-panel rounded-lg p-3">
                    <p className="text-textMuted text-xs">Minutter</p>
                    <p className="text-xl font-bold">{formatMinutes(duellData.player_b.minutes)}</p>
                  </div>
                  <div className="bg-panel rounded-lg p-3">
                    <p className="text-textMuted text-xs">Prestasjon</p>
                    <p className="text-xl font-bold text-brand">{duellData.player_b.fair_score?.toFixed(2)}</p>
                  </div>
                  <div className="bg-panel rounded-lg p-3">
                    <p className="text-textMuted text-xs">Potensial</p>
                    <p className="text-xl font-bold text-purple-500">{duellData.player_b.forecast_score?.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <DollarSign size={16} />
                    {duellData.player_b.salary?.toLocaleString()} kr
                  </p>
                </div>
              </div>
            </div>

            {/* Forskjeller-tabell */}
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target className="text-brand" />
                Forskjeller per metrikk
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-textMuted text-sm border-b border-white/5">
                      <th className="pb-3 font-medium">Metrikk</th>
                      <th className="pb-3 font-medium text-brand">{duellData.player_a.name.split(' ').pop()}</th>
                      <th className="pb-3 font-medium text-purple-500">{duellData.player_b.name.split(' ').pop()}</th>
                      <th className="pb-3 font-medium">Forskjell</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="py-3">Mål per 90</td>
                      <td className="py-3 font-medium text-brand">{duellData.player_a.goals_per90?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 font-medium text-purple-500">{duellData.player_b.goals_per90?.toFixed(2) || '0.00'}</td>
                      <td className={`py-3 font-medium ${getDifferenceColor(duellData.player_a.goals_per90 || 0, duellData.player_b.goals_per90 || 0)}`}>
                        {getDifferenceIcon(duellData.player_a.goals_per90 || 0, duellData.player_b.goals_per90 || 0)} {(duellData.player_a.goals_per90 - duellData.player_b.goals_per90).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3">Assist per 90</td>
                      <td className="py-3 font-medium text-brand">{duellData.player_a.assists_per90?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 font-medium text-purple-500">{duellData.player_b.assists_per90?.toFixed(2) || '0.00'}</td>
                      <td className={`py-3 font-medium ${getDifferenceColor(duellData.player_a.assists_per90 || 0, duellData.player_b.assists_per90 || 0)}`}>
                        {getDifferenceIcon(duellData.player_a.assists_per90 || 0, duellData.player_b.assists_per90 || 0)} {(duellData.player_a.assists_per90 - duellData.player_b.assists_per90).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3">Nøkkelpasninger per 90</td>
                      <td className="py-3 font-medium text-brand">{duellData.player_a.passes_key_per90?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 font-medium text-purple-500">{duellData.player_b.passes_key_per90?.toFixed(2) || '0.00'}</td>
                      <td className={`py-3 font-medium ${getDifferenceColor(duellData.player_a.passes_key_per90 || 0, duellData.player_b.passes_key_per90 || 0)}`}>
                        {getDifferenceIcon(duellData.player_a.passes_key_per90 || 0, duellData.player_b.passes_key_per90 || 0)} {(duellData.player_a.passes_key_per90 - duellData.player_b.passes_key_per90).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3">Taklinger per 90</td>
                      <td className="py-3 font-medium text-brand">{duellData.player_a.tackles_total_per90?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 font-medium text-purple-500">{duellData.player_b.tackles_total_per90?.toFixed(2) || '0.00'}</td>
                      <td className={`py-3 font-medium ${getDifferenceColor(duellData.player_a.tackles_total_per90 || 0, duellData.player_b.tackles_total_per90 || 0)}`}>
                        {getDifferenceIcon(duellData.player_a.tackles_total_per90 || 0, duellData.player_b.tackles_total_per90 || 0)} {(duellData.player_a.tackles_total_per90 - duellData.player_b.tackles_total_per90).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lenker til spillerkort */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link 
                href={`/player/${encodeURIComponent(duellData.player_a.name)}`}
                className="text-center bg-brand/10 hover:bg-brand/20 text-brand py-3 rounded-xl transition-all border border-brand/20"
              >
                Se fullt spillerkort for {duellData.player_a.name.split(' ').pop()}
              </Link>
              <Link 
                href={`/player/${encodeURIComponent(duellData.player_b.name)}`}
                className="text-center bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 py-3 rounded-xl transition-all border border-purple-500/20"
              >
                Se fullt spillerkort for {duellData.player_b.name.split(' ').pop()}
              </Link>
            </div>
          </>
        )
      ) : (
        <div className="glass-panel p-12 text-center">
          <div className="flex justify-center mb-4">
            <Sword className="w-16 h-16 text-textMuted/30" />
          </div>
          <p className="text-textMuted text-lg mb-2">Velg to spillere for å sammenligne</p>
          <p className="text-sm text-textMuted">Søk etter spillere i boksene over</p>
        </div>
      )}
    </div>
  )
}
