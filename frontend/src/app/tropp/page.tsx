"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Users, 
  User, 
  Shield,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  Zap,
  X,
  Save,
  RefreshCw,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Star,
  DollarSign,
  FileText,
  Edit3,
  MessageSquare,
  Goal,
  Footprints,
  BarChart3,
  Euro
} from "lucide-react"

interface Player {
  player_name: string
  team_name: string
  age: number
  pos_group: string
  position: string
  fair_score: number
  forecast_score: number
  minutes: number
  shirt_number?: number
  salary?: number
  market_value?: number
}

interface SquadPlayer extends Player {
  position_on_pitch?: string
}

export default function TroppPage() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [squad, setSquad] = useState<SquadPlayer[]>([])
  const [bench, setBench] = useState<SquadPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [showPlayerSelector, setShowPlayerSelector] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>("Alle")
  const [showFilters, setShowFilters] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  
  const [coachNotes, setCoachNotes] = useState("")
  const [selectedPlayerForNotes, setSelectedPlayerForNotes] = useState<SquadPlayer | null>(null)
  const [playerNotes, setPlayerNotes] = useState<Record<string, string>>({})

  // Ny spiller registrering
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    position: "",
    age: 25,
    salary: 500000,
    market_value: 1000000
  })

  const posGroups = ["Alle", "MID", "ATT", "DEF", "GK"]

  const pitchPositions = [
    { id: 'gk', label: 'Keeper', x: 50, y: 90, color: 'bg-red-500' },
    { id: 'rb', label: 'Høyre back', x: 20, y: 70, color: 'bg-blue-500' },
    { id: 'cb1', label: 'Stopper', x: 40, y: 70, color: 'bg-blue-500' },
    { id: 'cb2', label: 'Stopper', x: 60, y: 70, color: 'bg-blue-500' },
    { id: 'lb', label: 'Venstre back', x: 80, y: 70, color: 'bg-blue-500' },
    { id: 'rm', label: 'Høyre midt', x: 20, y: 45, color: 'bg-green-500' },
    { id: 'cm1', label: 'Sentral midt', x: 40, y: 45, color: 'bg-green-500' },
    { id: 'cm2', label: 'Sentral midt', x: 60, y: 45, color: 'bg-green-500' },
    { id: 'lm', label: 'Venstre midt', x: 80, y: 45, color: 'bg-green-500' },
    { id: 'st1', label: 'Spiss', x: 40, y: 20, color: 'bg-amber-500' },
    { id: 'st2', label: 'Spiss', x: 60, y: 20, color: 'bg-amber-500' },
  ]

  useEffect(() => {
    fetch("http://localhost:8000/api/players")
      .then(res => res.json())
      .then(data => {
        const playersWithDetails = data.map((p: Player) => ({
          ...p,
          shirt_number: 10,
          salary: Math.floor(Math.random() * 2000000) + 500000, // 500k - 2.5M
          market_value: Math.floor(Math.random() * 10000000) + 2000000 // 2M - 12M
        }))
        setAllPlayers(playersWithDetails)
        setLoading(false)
      })
      .catch(err => {
        console.error("Feil ved heating av spillere:", err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('eliteserien_squad')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSquad(parsed.squad || [])
        setBench(parsed.bench || [])
      } catch (e) {
        console.error("Feil ved parsing av tropp:", e)
      }
    }

    const savedNotes = localStorage.getItem('eliteserien_coach_notes')
    if (savedNotes) {
      setCoachNotes(savedNotes)
    }

    const savedPlayerNotes = localStorage.getItem('eliteserien_player_notes')
    if (savedPlayerNotes) {
      setPlayerNotes(JSON.parse(savedPlayerNotes))
    }
  }, [])

  const saveTropp = () => {
    localStorage.setItem('eliteserien_squad', JSON.stringify({ squad, bench }))
  }

  const saveNotes = () => {
    localStorage.setItem('eliteserien_coach_notes', coachNotes)
  }

  const savePlayerNote = (playerName: string, note: string) => {
    const updated = { ...playerNotes, [playerName]: note }
    setPlayerNotes(updated)
    localStorage.setItem('eliteserien_player_notes', JSON.stringify(updated))
  }

  const resetTropp = () => {
    if (confirm("Er du sikker på at du vil nullstille troppen?")) {
      setSquad([])
      setBench([])
      localStorage.removeItem('eliteserien_squad')
    }
  }

  const addPlayerToPosition = (positionId: string) => {
    setSelectedPosition(positionId)
    setShowPlayerSelector(true)
    setSearchTerm("")
  }

  const selectPlayer = (player: Player) => {
    if (!selectedPosition) return

    const newPlayer = { ...player, position_on_pitch: selectedPosition }

    if (selectedPosition.startsWith('bench-')) {
      if (bench.length < 7) {
        setBench([...bench, newPlayer])
      } else {
        alert("Benken er full (maks 7 spillere)")
      }
    } else {
      const updatedSquad = squad.filter(p => p.position_on_pitch !== selectedPosition)
      setSquad([...updatedSquad, newPlayer])
    }

    setShowPlayerSelector(false)
    setSelectedPosition(null)
    setSearchTerm("")
  }

  const removePlayer = (player: SquadPlayer, isBench: boolean) => {
    if (isBench) {
      setBench(bench.filter(p => p.player_name !== player.player_name))
    } else {
      setSquad(squad.filter(p => p.player_name !== player.player_name))
    }
    if (selectedPlayerForNotes?.player_name === player.player_name) {
      setSelectedPlayerForNotes(null)
    }
  }

  const addCustomPlayer = () => {
    const customPlayer: SquadPlayer = {
      player_name: newPlayer.name,
      team_name: "Egen klubb",
      age: newPlayer.age,
      pos_group: newPlayer.position.substring(0, 3).toUpperCase(),
      position: newPlayer.position,
      fair_score: 0,
      forecast_score: 0,
      minutes: 0,
      shirt_number: squad.length + bench.length + 1,
      salary: newPlayer.salary,
      market_value: newPlayer.market_value
    }

    if (squad.length < 11) {
      setSquad([...squad, customPlayer])
    } else if (bench.length < 7) {
      setBench([...bench, customPlayer])
    } else {
      alert("Troppen er full (11+7)")
    }

    setShowRegisterModal(false)
    setNewPlayer({ name: "", position: "", age: 25, salary: 500000, market_value: 1000000 })
  }

  const filteredPlayers = allPlayers
    .filter(p => {
      const isInSquad = squad.some(s => s.player_name === p.player_name)
      const isInBench = bench.some(b => b.player_name === p.player_name)
      if (isInSquad || isInBench) return false

      if (searchTerm && !p.player_name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !p.team_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      if (selectedPosFilter !== "Alle" && p.pos_group !== selectedPosFilter) {
        return false
      }

      return true
    })
    .slice(0, 15)

  const getPositionColor = (posId: string) => {
    const pos = pitchPositions.find(p => p.id === posId)
    return pos?.color || 'bg-gray-500'
  }

  const formatSalary = (salary?: number) => {
    if (!salary) return "0"
    if (salary >= 1000000) {
      return `${(salary / 1000000).toFixed(1)} mill`
    }
    return `${(salary / 1000).toFixed(0)}k`
  }

  const formatMinutes = (minutes: number) => {
    if (minutes >= 1000) {
      return `${(minutes / 1000).toFixed(1)}k`
    }
    return minutes.toString()
  }

  // Beregn total lønn og markedsverdi
  const totalSalary = [...squad, ...bench].reduce((acc, p) => acc + (p.salary || 0), 0)
  const totalMarketValue = [...squad, ...bench].reduce((acc, p) => acc + (p.market_value || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-500 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Venstre kolonne - Fotballbane og benk */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <Users className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Stall</h1>
                <p className="text-textMuted">
                  {squad.length}/11 på banen • {bench.length}/7 på benken
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowRegisterModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand rounded-lg transition-all"
                title="Registrer ny spiller"
              >
                <Plus size={18} />
                <span className="hidden md:inline">Registrer</span>
              </button>
              <button
                onClick={saveTropp}
                className="flex items-center gap-2 px-4 py-2 bg-panel hover:bg-panelHover rounded-lg transition-all"
                title="Lagre tropp"
              >
                <Save size={18} />
                <span className="hidden md:inline">Lagre</span>
              </button>
              <button
                onClick={resetTropp}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                title="Nullstill tropp"
              >
                <RefreshCw size={18} />
                <span className="hidden md:inline">Nullstill</span>
              </button>
            </div>
          </div>

          {/* Økonomisk oversikt */}
          <div className="glass-panel p-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="text-green-500" size={18} />
              Økonomisk oversikt
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-panel rounded-lg p-3">
                <p className="text-xs text-textMuted">Total lønn</p>
                <p className="text-xl font-bold text-green-500">{formatSalary(totalSalary)} kr</p>
              </div>
              <div className="bg-panel rounded-lg p-3">
                <p className="text-xs text-textMuted">Total markedsverdi</p>
                <p className="text-xl font-bold text-brand">{formatSalary(totalMarketValue)} kr</p>
              </div>
            </div>
          </div>

          {/* Fotballbane */}
          <div className="glass-panel p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Goal className="text-green-500" size={20} />
              Startellever
            </h2>
            
            <div className="relative w-full aspect-[1.5/1] rounded-2xl overflow-hidden border-4 border-white/10 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-b from-green-600 to-green-800">
                <div className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 80px)'
                  }}
                />
              </div>
              
              <div className="absolute inset-0">
                <div className="absolute left-4 right-4 top-4 bottom-4 border-2 border-white/30 rounded-2xl"></div>
                <div className="absolute left-1/2 top-4 bottom-4 w-0.5 bg-white/30 -translate-x-1/2"></div>
                <div className="absolute left-1/2 top-1/2 w-32 h-32 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute left-1/2 bottom-4 w-48 h-24 border-2 border-white/30 -translate-x-1/2 rounded-b-2xl"></div>
                <div className="absolute left-1/2 top-4 w-48 h-24 border-2 border-white/30 -translate-x-1/2 rounded-t-2xl"></div>
                <div className="absolute left-1/2 bottom-0 w-20 h-4 bg-white/20 -translate-x-1/2 rounded-t-lg border-t-2 border-l-2 border-r-2 border-white/30"></div>
                <div className="absolute left-1/2 top-0 w-20 h-4 bg-white/20 -translate-x-1/2 rounded-b-lg border-b-2 border-l-2 border-r-2 border-white/30"></div>
              </div>

              {pitchPositions.map((pos) => {
                const player = squad.find(p => p.position_on_pitch === pos.id)
                
                return (
                  <div
                    key={pos.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    {player ? (
                      <div className="relative group">
                        <button
                          onClick={() => setSelectedPlayerForNotes(player)}
                          className={`w-20 p-2 rounded-lg border-2 border-white/30 shadow-xl hover:scale-110 transition-all cursor-pointer text-center ${getPositionColor(pos.id)} bg-opacity-80`}
                        >
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white/20 rounded-full border border-white/40 flex items-center justify-center text-xs font-bold">
                            {player.shirt_number}
                          </div>
                          <p className="text-xs font-bold truncate mt-2 text-white">{player.player_name.split(' ').pop()}</p>
                          <p className="text-[10px] text-white/80">{formatSalary(player.salary)}</p>
                        </button>
                        <button
                          onClick={() => removePlayer(player, false)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500/20 hover:bg-red-500/40 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X size={12} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addPlayerToPosition(pos.id)}
                        className="w-14 h-14 bg-white/10 border-2 border-dashed border-white/30 rounded-full hover:border-green-400/50 hover:bg-white/20 transition-all flex items-center justify-center group backdrop-blur-sm"
                        title={`Legg til ${pos.label}`}
                      >
                        <Plus className="w-6 h-6 text-white/50 group-hover:text-green-400" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Benk */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="text-purple-500" size={20} />
              Benk ({bench.length}/7)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, index) => {
                const player = bench[index]
                
                return (
                  <div key={`bench-${index}`} className="relative">
                    {player ? (
                      <div className="relative group">
                        <button
                          onClick={() => setSelectedPlayerForNotes(player)}
                          className="w-full p-3 bg-panel rounded-lg border border-purple-500/30 hover:scale-105 transition-all text-center"
                        >
                          <div className="w-6 h-6 bg-white/10 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold">
                            {player.shirt_number}
                          </div>
                          <p className="font-bold text-sm truncate">{player.player_name.split(' ').pop()}</p>
                          <p className="text-xs text-textMuted truncate">{formatSalary(player.salary)}</p>
                          <p className="text-xs text-brand mt-1">{player.fair_score?.toFixed(1) || '-'}</p>
                        </button>
                        <button
                          onClick={() => removePlayer(player, true)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500/20 hover:bg-red-500/40 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X size={12} className="text-red-500" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addPlayerToPosition(`bench-${index}`)}
                        className="w-full p-4 bg-panel/30 border-2 border-dashed border-white/10 rounded-lg hover:border-purple-500/30 hover:bg-panel transition-all flex flex-col items-center gap-2 group"
                      >
                        <Plus className="w-6 h-6 text-textMuted/30 group-hover:text-purple-400" />
                        <span className="text-xs text-textMuted">Ledig</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Høyre kolonne - Notisblokk og spillerinfo */}
        <div className="w-full lg:w-80 space-y-6">
          {/* Trenerens notisblokk */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="text-amber-500" size={20} />
              Trenerens notater
            </h2>
            <textarea
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Skriv notater om kamp, formasjon, bytter..."
              className="w-full h-40 bg-panel border border-white/5 rounded-lg p-4 text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
            <p className="text-xs text-textMuted mt-2">
              Notater lagres automatisk
            </p>
          </div>

          {/* Spillerinfo (hvis en spiller er valgt) */}
          {selectedPlayerForNotes ? (
            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <User className="text-brand" size={20} />
                  {selectedPlayerForNotes.player_name.split(' ').pop()}
                </h2>
                <button
                  onClick={() => setSelectedPlayerForNotes(null)}
                  className="p-1 hover:bg-panelHover rounded-lg"
                >
                  <X size={16} className="text-textMuted" />
                </button>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-textMuted">Draktnummer</span>
                  <span className="font-bold text-2xl text-brand">{selectedPlayerForNotes.shirt_number}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-textMuted">Posisjon</span>
                  <span className="font-bold">{selectedPlayerForNotes.position || selectedPlayerForNotes.pos_group}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-textMuted">Alder</span>
                  <span className="font-bold">{selectedPlayerForNotes.age} år</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-textMuted">Lønn</span>
                  <span className="font-bold text-green-400">{formatSalary(selectedPlayerForNotes.salary)} kr</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-textMuted">Markedsverdi</span>
                  <span className="font-bold text-brand">{formatSalary(selectedPlayerForNotes.market_value)} kr</span>
                </div>
              </div>

              {/* Notater om spesifikk spiller */}
              <div>
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <Edit3 size={14} className="text-amber-500" />
                  Notater om {selectedPlayerForNotes.player_name.split(' ').pop()}
                </h3>
                <textarea
                  value={playerNotes[selectedPlayerForNotes.player_name] || ''}
                  onChange={(e) => savePlayerNote(selectedPlayerForNotes.player_name, e.target.value)}
                  placeholder="Skriv notater om denne spilleren..."
                  className="w-full h-24 bg-panel border border-white/5 rounded-lg p-3 text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <Link
                href={`/player/${encodeURIComponent(selectedPlayerForNotes.player_name)}`}
                className="mt-4 block text-center bg-brand/10 hover:bg-brand/20 text-brand py-2 rounded-lg transition-all text-sm"
              >
                Se full spillerprofil
              </Link>
            </div>
          ) : (
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="text-brand" size={20} />
                Lønn vs Markedsverdi
              </h2>
              
              <div className="space-y-3">
                {squad.slice(0, 5).map((player) => {
                  const salaryPercent = ((player.salary || 0) / 2000000) * 100
                  const valuePercent = ((player.market_value || 0) / 10000000) * 100
                  
                  return (
                    <div key={player.player_name} className="space-y-1">
                      <p className="text-xs font-medium">{player.player_name.split(' ').pop()}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-panel rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500"
                            style={{ width: `${Math.min(salaryPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-green-500">{formatSalary(player.salary)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-panel rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-brand"
                            style={{ width: `${Math.min(valuePercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-brand">{formatSalary(player.market_value)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for å registrere ny spiller */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Registrer ny spiller</h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-2 hover:bg-panelHover rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-textMuted mb-2">Navn</label>
                <input
                  type="text"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                  className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
                  placeholder="Ola Nordmann"
                />
              </div>

              <div>
                <label className="block text-sm text-textMuted mb-2">Posisjon</label>
                <input
                  type="text"
                  value={newPlayer.position}
                  onChange={(e) => setNewPlayer({...newPlayer, position: e.target.value})}
                  className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
                  placeholder="Sentral midtbane"
                />
              </div>

              <div>
                <label className="block text-sm text-textMuted mb-2">Alder</label>
                <input
                  type="number"
                  value={newPlayer.age}
                  onChange={(e) => setNewPlayer({...newPlayer, age: parseInt(e.target.value)})}
                  className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-sm text-textMuted mb-2">Lønn (kr)</label>
                <input
                  type="number"
                  value={newPlayer.salary}
                  onChange={(e) => setNewPlayer({...newPlayer, salary: parseInt(e.target.value)})}
                  className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-sm text-textMuted mb-2">Markedsverdi (kr)</label>
                <input
                  type="number"
                  value={newPlayer.market_value}
                  onChange={(e) => setNewPlayer({...newPlayer, market_value: parseInt(e.target.value)})}
                  className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
                />
              </div>

              <button
                onClick={addCustomPlayer}
                className="w-full bg-brand hover:bg-brandDark text-white py-3 rounded-lg transition-all"
                disabled={!newPlayer.name || !newPlayer.position}
              >
                Legg til i tropp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spillerveleger (modal) */}
      {showPlayerSelector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-2xl p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Velg spiller</h3>
              <button
                onClick={() => {
                  setShowPlayerSelector(false)
                  setSelectedPosition(null)
                }}
                className="p-2 hover:bg-panelHover rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-textMuted" size={18} />
                <input
                  type="text"
                  placeholder="Søk etter spiller eller lag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-panel border border-white/5 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-green-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-2 bg-panel rounded-lg flex items-center gap-1 text-sm"
                >
                  <Filter size={14} />
                  Filter
                  <ChevronDown size={14} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
                <select
                  value={selectedPosFilter}
                  onChange={(e) => setSelectedPosFilter(e.target.value)}
                  className="bg-panel border border-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                >
                  {posGroups.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredPlayers.length > 0 ? (
                <div className="space-y-2">
                  {filteredPlayers.map((player) => (
                    <button
                      key={player.player_name}
                      onClick={() => selectPlayer(player)}
                      className="w-full flex items-center justify-between p-3 hover:bg-panelHover rounded-lg transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <User size={18} className="text-green-500" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{player.player_name}</p>
                          <p className="text-xs text-textMuted">
                            {player.team_name} • {player.pos_group} • #{player.shirt_number}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-green-500">{formatSalary(player.salary)}</p>
                        <p className="text-xs text-brand">{formatSalary(player.market_value)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-textMuted">Ingen flere spillere tilgjengelig</p>
                  <button
                    onClick={() => {
                      setShowPlayerSelector(false)
                      setShowRegisterModal(true)
                    }}
                    className="mt-4 text-brand hover:underline text-sm"
                  >
                    Registrer ny spiller
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
