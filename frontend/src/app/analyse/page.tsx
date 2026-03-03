"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Activity,
  Layers,
  Target,
  Zap,
  Award,
  Shield,
  Map,
  Clock,
  Eye,
  Save,
  Plus,
  Sliders,
  ChevronDown,
  X
} from "lucide-react"

interface Player {
  player_name: string
  team_name: string
  age: number
  pos_group: string
  minutes: number
  fair_score: number
  forecast_score: number
  goals: number
  assists: number
  passes_key_per90: number
  tackles_total_per90: number
  duels_won_per90: number
  intensity_per90: number
  cluster?: number
  role_profile?: string
}

interface CustomRole {
  id: string
  name: string
  description: string
  weights: {
    goals: number
    assists: number
    key_passes: number
    tackles: number
    duels: number
    intensity: number
  }
}

export default function AnalysePage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"liga" | "rolle" | "statistikk" | "skreddersydd">("liga")
  
  // Klyngeanalyse state
  const [selectedCluster, setSelectedCluster] = useState<string>("playmaker")
  const [clusterPlayers, setClusterPlayers] = useState<Player[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  // Skreddersydde roller
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([])
  const [showRoleBuilder, setShowRoleBuilder] = useState(false)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)
  const [roleMatches, setRoleMatches] = useState<Array<{player: Player, score: number}>>([])
  
  const [teamStats, setTeamStats] = useState<TeamStat[]>([])

  useEffect(() => {
    fetch("http://localhost:8000/api/players")
      .then(res => res.json())
      .then(data => {
        setPlayers(data)
        
        // Beregn lagstatistikk
        const uniqueTeams = [...new Set(data.map((p: Player) => p.team_name).filter(Boolean))] as string[]
        const stats = uniqueTeams.map(team => {
          const teamPlayers = data.filter((p: Player) => p.team_name === team)
          return {
            team_name: team,
            player_count: teamPlayers.length,
            avg_age: teamPlayers.reduce((acc, p) => acc + p.age, 0) / teamPlayers.length,
            avg_score: teamPlayers.reduce((acc, p) => acc + (p.fair_score || 0), 0) / teamPlayers.length,
            top_scorer: teamPlayers.sort((a, b) => (b.fair_score || 0) - (a.fair_score || 0))[0]?.player_name
          }
        }).sort((a, b) => b.avg_score - a.avg_score)
        
        setTeamStats(stats)
        
        // Hent playmaker-spillere som standard
        const playmakers = data.filter((p: Player) => p.cluster === 0)
        setClusterPlayers(playmakers)
        
        // Last lagrede roller fra localStorage
        const savedRoles = localStorage.getItem('eliteserien_custom_roles')
        if (savedRoles) {
          setCustomRoles(JSON.parse(savedRoles))
        }
        
        setLoading(false)
      })
      .catch(err => {
        console.error("Feil ved heating av data:", err)
        setLoading(false)
      })
  }, [])

  // Oppdater klynge-spillere når selectedCluster endres
  useEffect(() => {
    if (players.length === 0) return
    
    let filtered: Player[] = []
    
    switch(selectedCluster) {
      case "playmaker":
        filtered = players.filter(p => p.cluster === 0)
        break
      case "ballvinner":
        filtered = players.filter(p => p.cluster === 1)
        break
      case "bokstilboks":
        filtered = players.filter(p => p.cluster === 2)
        break
      default:
        filtered = players.filter(p => p.cluster === 0)
    }
    
    setClusterPlayers(filtered)
  }, [selectedCluster, players])

  // Beregn match-score for en skreddersydd rolle
  const calculateRoleMatches = (role: CustomRole) => {
    const matches = players.map(player => {
      let score = 0
      let totalWeight = 0
      
      Object.entries(role.weights).forEach(([key, weight]) => {
        if (weight > 0) {
          totalWeight += weight
          switch(key) {
            case 'goals':
              score += (player.goals || 0) * weight
              break
            case 'assists':
              score += (player.assists || 0) * weight
              break
            case 'key_passes':
              score += (player.passes_key_per90 || 0) * weight
              break
            case 'tackles':
              score += (player.tackles_total_per90 || 0) * weight
              break
            case 'duels':
              score += (player.duels_won_per90 || 0) * weight
              break
            case 'intensity':
              score += (player.intensity_per90 || 0) * weight
              break
          }
        }
      })
      
      return {
        player,
        score: totalWeight > 0 ? score / totalWeight : 0
      }
    })
    
    return matches.sort((a, b) => b.score - a.score).slice(0, 10)
  }

  // Lagre ny rolle
  const saveCustomRole = (role: CustomRole) => {
    const updated = editingRole 
      ? customRoles.map(r => r.id === role.id ? role : r)
      : [...customRoles, { ...role, id: Date.now().toString() }]
    
    setCustomRoles(updated)
    localStorage.setItem('eliteserien_custom_roles', JSON.stringify(updated))
    setShowRoleBuilder(false)
    setEditingRole(null)
  }

  // Slett rolle
  const deleteCustomRole = (id: string) => {
    if (confirm("Er du sikker på at du vil slette denne rollen?")) {
      const updated = customRoles.filter(r => r.id !== id)
      setCustomRoles(updated)
      localStorage.setItem('eliteserien_custom_roles', JSON.stringify(updated))
    }
  }

  // Aldersfordeling
  const ageGroups = [
    { range: "17-20", count: players.filter(p => p.age >= 17 && p.age <= 20).length, color: "bg-blue-500", label: "Ung" },
    { range: "21-23", count: players.filter(p => p.age >= 21 && p.age <= 23).length, color: "bg-green-500", label: "Talent" },
    { range: "24-26", count: players.filter(p => p.age >= 24 && p.age <= 26).length, color: "bg-amber-500", label: "Etablert" },
    { range: "27-29", count: players.filter(p => p.age >= 27 && p.age <= 29).length, color: "bg-purple-500", label: "Prime" },
    { range: "30-32", count: players.filter(p => p.age >= 30 && p.age <= 32).length, color: "bg-pink-500", label: "Erfaren" },
    { range: "33+", count: players.filter(p => p.age >= 33).length, color: "bg-red-500", label: "Veteran" },
  ]

  // Posisjonsfordeling
  const posGroups = [
    { name: "Keeper", count: players.filter(p => p.pos_group === 'GK').length, color: "bg-red-500", icon: Shield },
    { name: "Forsvar", count: players.filter(p => p.pos_group === 'DEF').length, color: "bg-blue-500", icon: Shield },
    { name: "Midtbane", count: players.filter(p => p.pos_group === 'MID').length, color: "bg-green-500", icon: Activity },
    { name: "Angrep", count: players.filter(p => p.pos_group === 'ATT').length, color: "bg-amber-500", icon: Target },
  ]

  const maxCount = Math.max(...posGroups.map(g => g.count))
  const maxAgeCount = Math.max(...ageGroups.map(g => g.count))

  // Topp scorere
  const topScorers = [...players]
    .sort((a, b) => (b.goals || 0) - (a.goals || 0))
    .slice(0, 5)
    .filter(p => p.goals > 0)

  const topAssisters = [...players]
    .sort((a, b) => (b.assists || 0) - (a.assists || 0))
    .slice(0, 5)
    .filter(p => p.assists > 0)

  const topPassers = [...players]
    .sort((a, b) => (b.passes_key_per90 || 0) - (a.passes_key_per90 || 0))
    .slice(0, 5)

  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "0"
    return score.toFixed(1)
  }

  const getClusterColor = (cluster: string) => {
    switch(cluster) {
      case "playmaker": return "bg-blue-500"
      case "ballvinner": return "bg-red-500"
      case "bokstilboks": return "bg-purple-500"
      default: return "bg-brand"
    }
  }

  const getClusterLabel = (cluster: string) => {
    switch(cluster) {
      case "playmaker": return "Kreativ playmaker"
      case "ballvinner": return "Defensiv ballvinner"
      case "bokstilboks": return "Boks-til-boks"
      default: return cluster
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-brand animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  const midtbaneCount = players.filter(p => p.pos_group === 'MID').length

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-brand mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8" />
          Analyse
        </h1>
        <p className="text-textMuted">Innsikt fra Eliteserien - basert på sesongens data</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("liga")}
          className={`px-6 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === "liga" 
              ? "bg-brand text-white" 
              : "text-textMuted hover:text-text hover:bg-panel"
          }`}
        >
          <Map className="w-4 h-4 inline mr-2" />
          Ligaoversikt
        </button>
        <button
          onClick={() => setActiveTab("rolle")}
          className={`px-6 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === "rolle" 
              ? "bg-brand text-white" 
              : "text-textMuted hover:text-text hover:bg-panel"
          }`}
        >
          <Layers className="w-4 h-4 inline mr-2" />
          Rolleanalyse
        </button>
        <button
          onClick={() => setActiveTab("skreddersydd")}
          className={`px-6 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === "skreddersydd" 
              ? "bg-brand text-white" 
              : "text-textMuted hover:text-text hover:bg-panel"
          }`}
        >
          <Sliders className="w-4 h-4 inline mr-2" />
          Skreddersydde roller
        </button>
        <button
          onClick={() => setActiveTab("statistikk")}
          className={`px-6 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === "statistikk" 
              ? "bg-brand text-white" 
              : "text-textMuted hover:text-text hover:bg-panel"
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Topp statistikk
        </button>
      </div>

      {/* TAB 1: Ligaoversikt */}
      {activeTab === "liga" && (
        <div className="space-y-6">
          {/* Posisjonsfordeling */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Map className="text-brand" />
              Posisjonsfordeling
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posGroups.map((pos) => {
                const Icon = pos.icon
                return (
                  <div key={pos.name} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${pos.color} bg-opacity-20 flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${pos.color.replace('bg-', 'text-')}`} />
                        </div>
                        <div>
                          <span className="font-medium">{pos.name}</span>
                          <p className="text-xs text-textMuted">{pos.count} spillere</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-white">{pos.count}</span>
                    </div>
                    <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${pos.color}`}
                        style={{ width: `${(pos.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Aldersfordeling */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock className="text-brand" />
              Aldersfordeling
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {ageGroups.map((group) => (
                <div key={group.range} className="relative p-4 bg-panel rounded-lg text-center">
                  <div className={`absolute top-0 left-0 w-full h-1 ${group.color} rounded-t-lg`} />
                  <div className="text-3xl font-bold text-white mb-1">{group.count}</div>
                  <div className="text-xs text-brand font-medium mb-1">{group.range} år</div>
                  <div className="text-[10px] text-textMuted uppercase tracking-wider">{group.label}</div>
                  <div className="mt-3 w-full h-1 bg-panelHover rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${group.color}`}
                      style={{ width: `${(group.count / maxAgeCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topp 5 lag */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Shield className="text-brand" />
              Topp 5 lag (snitt score)
            </h2>
            
            <div className="space-y-3">
              {teamStats.slice(0, 5).map((team, idx) => (
                <div key={team.team_name} className="flex items-center justify-between p-4 bg-panel rounded-lg hover:bg-panelHover transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{team.team_name}</p>
                      <p className="text-xs text-textMuted">{team.player_count} spillere • Topp: {team.top_scorer?.split(' ').pop()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-brand">{team.avg_score.toFixed(2)}</span>
                    <p className="text-xs text-textMuted">snitt score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Rolleanalyse (eksisterende) */}
      {activeTab === "rolle" && (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Layers className="text-brand" />
              Klyngeanalyse - Midtbane ({midtbaneCount} spillere)
            </h2>
            
            {/* Klyngevelger */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setSelectedCluster("playmaker")}
                className={`p-4 rounded-lg transition-all ${
                  selectedCluster === "playmaker" 
                    ? "bg-blue-500/20 border-2 border-blue-500" 
                    : "bg-panel hover:bg-panelHover border border-white/5"
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500 mb-1">52</div>
                  <div className="font-semibold">Kreativ playmaker</div>
                  <div className="text-xs text-textMuted mt-2">Styrer spillet, skaper sjanser</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedCluster("ballvinner")}
                className={`p-4 rounded-lg transition-all ${
                  selectedCluster === "ballvinner" 
                    ? "bg-red-500/20 border-2 border-red-500" 
                    : "bg-panel hover:bg-panelHover border border-white/5"
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500 mb-1">41</div>
                  <div className="font-semibold">Defensiv ballvinner</div>
                  <div className="text-xs text-textMuted mt-2">Gjenvinner ball, vinner dueller</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedCluster("bokstilboks")}
                className={`p-4 rounded-lg transition-all ${
                  selectedCluster === "bokstilboks" 
                    ? "bg-purple-500/20 border-2 border-purple-500" 
                    : "bg-panel hover:bg-panelHover border border-white/5"
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500 mb-1">30</div>
                  <div className="font-semibold">Boks-til-boks</div>
                  <div className="text-xs text-textMuted mt-2">Allsidig, jobber i begge bokser</div>
                </div>
              </button>
            </div>

            {/* Visningsmodus */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">
                {getClusterLabel(selectedCluster)} ({clusterPlayers.length} spillere)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "grid" ? "bg-brand text-white" : "bg-panel text-textMuted"
                  }`}
                  title="Grid-visning"
                >
                  <Layers size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "list" ? "bg-brand text-white" : "bg-panel text-textMuted"
                  }`}
                  title="Listevisning"
                >
                  <Activity size={16} />
                </button>
              </div>
            </div>

            {/* Spillerliste */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clusterPlayers.slice(0, 9).map((player) => (
                  <Link
                    key={player.player_name}
                    href={`/player/${encodeURIComponent(player.player_name)}`}
                    className="glass-panel p-4 hover:scale-[1.02] transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg">{player.player_name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${getClusterColor(selectedCluster)}/20 text-${getClusterColor(selectedCluster).replace('bg-', '')}`}>
                        {player.fair_score?.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-textMuted mb-3">{player.team_name}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-textMuted">Nøkkel/90</span>
                        <p className="font-medium">{player.passes_key_per90?.toFixed(1) || '0.0'}</p>
                      </div>
                      <div>
                        <span className="text-textMuted">Dueller</span>
                        <p className="font-medium">{player.duels_won_per90?.toFixed(1) || '0.0'}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-textMuted text-sm border-b border-white/5">
                      <th className="pb-3 font-medium">Spiller</th>
                      <th className="pb-3 font-medium">Lag</th>
                      <th className="pb-3 font-medium">Score</th>
                      <th className="pb-3 font-medium">Nøkkel/90</th>
                      <th className="pb-3 font-medium">Dueller/90</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusterPlayers.slice(0, 10).map((player) => (
                      <tr key={player.player_name} className="border-b border-white/5 hover:bg-panel/30 transition-colors">
                        <td className="py-3 font-medium">{player.player_name}</td>
                        <td className="py-3 text-textMuted">{player.team_name}</td>
                        <td className="py-3 text-brand">{player.fair_score?.toFixed(2)}</td>
                        <td className="py-3">{player.passes_key_per90?.toFixed(1) || '0.0'}</td>
                        <td className="py-3">{player.duels_won_per90?.toFixed(1) || '0.0'}</td>
                        <td className="py-3">
                          <Link 
                            href={`/player/${encodeURIComponent(player.player_name)}`}
                            className="text-brand hover:underline text-sm flex items-center gap-1"
                          >
                            <Eye size={14} />
                            <span>Vis</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Skreddersydde roller (NYTT!) */}
      {activeTab === "skreddersydd" && (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sliders className="text-brand" />
                Skreddersydde roller
              </h2>
              <button
                onClick={() => {
                  setEditingRole(null)
                  setShowRoleBuilder(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand rounded-lg transition-all"
              >
                <Plus size={18} />
                <span>Ny rolle</span>
              </button>
            </div>

            {customRoles.length === 0 ? (
              <div className="text-center py-12">
                <Sliders className="w-16 h-16 text-textMuted/30 mx-auto mb-4" />
                <p className="text-textMuted mb-4">Du har ingen skreddersydde roller ennå</p>
                <button
                  onClick={() => setShowRoleBuilder(true)}
                  className="bg-brand hover:bg-brandDark px-6 py-3 rounded-xl text-white font-semibold transition-all"
                >
                  Opprett din første rolle
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {customRoles.map((role) => {
                  const matches = calculateRoleMatches(role)
                  
                  return (
                    <div key={role.id} className="bg-panel rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold">{role.name}</h3>
                          <p className="text-sm text-textMuted">{role.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingRole(role)
                              setShowRoleBuilder(true)
                            }}
                            className="p-2 hover:bg-panelHover rounded-lg transition-all"
                          >
                            <Sliders size={16} className="text-brand" />
                          </button>
                          <button
                            onClick={() => deleteCustomRole(role.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <X size={16} className="text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Vekter */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        {Object.entries(role.weights).map(([key, value]) => (
                          value > 0 && (
                            <div key={key} className="text-sm">
                              <span className="text-textMuted">{key.replace('_', ' ')}: </span>
                              <span className="font-bold text-brand">{value}%</span>
                            </div>
                          )
                        ))}
                      </div>

                      {/* Topp 5 matches */}
                      <h4 className="font-semibold mb-3">Beste matches</h4>
                      <div className="space-y-2">
                        {matches.slice(0, 5).map((match, idx) => (
                          <Link
                            key={match.player.player_name}
                            href={`/player/${encodeURIComponent(match.player.player_name)}`}
                            className="flex items-center justify-between p-3 bg-panelHover rounded-lg hover:scale-[1.01] transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-brand font-bold w-6">#{idx + 1}</span>
                              <div>
                                <p className="font-medium">{match.player.player_name}</p>
                                <p className="text-xs text-textMuted">{match.player.team_name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-brand">{match.score.toFixed(2)}</span>
                              <p className="text-xs text-textMuted">match score</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Topp statistikk */}
      {activeTab === "statistikk" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Flest mål */}
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target className="text-brand" />
                Flest mål
              </h2>
              
              <div className="space-y-3">
                {topScorers.map((player, idx) => (
                  <Link
                    key={player.player_name}
                    href={`/player/${encodeURIComponent(player.player_name)}`}
                    className="flex items-center justify-between p-2 hover:bg-panelHover rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-brand font-bold w-6">#{idx + 1}</span>
                      <div>
                        <p className="font-medium">{player.player_name}</p>
                        <p className="text-xs text-textMuted">{player.team_name}</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-brand">{player.goals}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Flest assist */}
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Zap className="text-green-500" />
                Flest assist
              </h2>
              
              <div className="space-y-3">
                {topAssisters.map((player, idx) => (
                  <Link
                    key={player.player_name}
                    href={`/player/${encodeURIComponent(player.player_name)}`}
                    className="flex items-center justify-between p-2 hover:bg-panelHover rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-green-500 font-bold w-6">#{idx + 1}</span>
                      <div>
                        <p className="font-medium">{player.player_name}</p>
                        <p className="text-xs text-textMuted">{player.team_name}</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-green-500">{player.assists}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Flest nøkkelpasninger/90 */}
            <div className="glass-panel p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Activity className="text-purple-500" />
                Flest nøkkelpasninger/90
              </h2>
              
              <div className="space-y-3">
                {topPassers.map((player, idx) => (
                  <Link
                    key={player.player_name}
                    href={`/player/${encodeURIComponent(player.player_name)}`}
                    className="flex items-center justify-between p-2 hover:bg-panelHover rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-purple-500 font-bold w-6">#{idx + 1}</span>
                      <div>
                        <p className="font-medium">{player.player_name}</p>
                        <p className="text-xs text-textMuted">{player.team_name}</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-purple-500">
                      {player.passes_key_per90?.toFixed(1)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for å bygge skreddersydd rolle */}
      {showRoleBuilder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editingRole ? 'Rediger rolle' : 'Opprett ny rolle'}
              </h3>
              <button
                onClick={() => setShowRoleBuilder(false)}
                className="p-2 hover:bg-panelHover rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <RoleBuilder
              initialRole={editingRole}
              onSave={saveCustomRole}
              onCancel={() => setShowRoleBuilder(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// RoleBuilder-komponent
function RoleBuilder({ initialRole, onSave, onCancel }: { 
  initialRole?: CustomRole | null, 
  onSave: (role: CustomRole) => void,
  onCancel: () => void 
}) {
  const [role, setRole] = useState<CustomRole>(initialRole || {
    id: "",
    name: "",
    description: "",
    weights: {
      goals: 20,
      assists: 20,
      key_passes: 20,
      tackles: 10,
      duels: 15,
      intensity: 15
    }
  })

  const updateWeight = (key: string, value: number) => {
    setRole({
      ...role,
      weights: {
        ...role.weights,
        [key]: value
      }
    })
  }

  const totalWeight = Object.values(role.weights).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-textMuted mb-2">Rollenavn</label>
        <input
          type="text"
          value={role.name}
          onChange={(e) => setRole({...role, name: e.target.value})}
          className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
          placeholder="F.eks. Min 4-3-3 playmaker"
        />
      </div>

      <div>
        <label className="block text-sm text-textMuted mb-2">Beskrivelse</label>
        <input
          type="text"
          value={role.description}
          onChange={(e) => setRole({...role, description: e.target.value})}
          className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
          placeholder="Hva kjennetegner denne rollen?"
        />
      </div>

      <div>
        <h4 className="font-semibold mb-4">Vekting av egenskaper</h4>
        <p className="text-xs text-textMuted mb-4">Total: {totalWeight}% {totalWeight !== 100 && <span className="text-red-500">(må være 100%)</span>}</p>
        
        <div className="space-y-4">
          <WeightSlider
            label="Mål"
            value={role.weights.goals}
            onChange={(v) => updateWeight('goals', v)}
          />
          <WeightSlider
            label="Assist"
            value={role.weights.assists}
            onChange={(v) => updateWeight('assists', v)}
          />
          <WeightSlider
            label="Nøkkelpasninger"
            value={role.weights.key_passes}
            onChange={(v) => updateWeight('key_passes', v)}
          />
          <WeightSlider
            label="Taklinger"
            value={role.weights.tackles}
            onChange={(v) => updateWeight('tackles', v)}
          />
          <WeightSlider
            label="Dueller"
            value={role.weights.duels}
            onChange={(v) => updateWeight('duels', v)}
          />
          <WeightSlider
            label="Intensitet"
            value={role.weights.intensity}
            onChange={(v) => updateWeight('intensity', v)}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => onSave(role)}
          disabled={!role.name || totalWeight !== 100}
          className="flex-1 bg-brand hover:bg-brandDark text-white py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Lagre rolle
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-panel hover:bg-panelHover py-3 rounded-lg transition-all"
        >
          Avbryt
        </button>
      </div>
    </div>
  )
}

function WeightSlider({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-brand font-bold">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full"
      />
    </div>
  )
}
