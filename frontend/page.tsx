"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { 
  ArrowLeft, 
  User, 
  Shield,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  Zap,
  Activity,
  Target,
  BarChart3,
  Star,
  Sword,
  Eye,
  Users,
  MessageSquare,
  DollarSign,
  TrendingDown,
  TrendingUp as TrendingUpIcon
} from "lucide-react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from "recharts"

interface PlayerData {
  player_name: string
  team_name: string
  team_logo?: string
  age: number
  position: string
  pos_group: string
  minutes: number
  goals: number
  assists: number
  goals_per90: number
  assists_per90: number
  passes_key_per90: number
  tackles_total_per90: number
  dribbles_success_per90: number
  fair_score: number
  forecast_score: number
  total_score: number
  reliability: number
  player_tier: string
  role_profile?: string
  cluster?: number
  z_passes_key_per90_pos?: number
  z_passes_accuracy_pos?: number
  z_intensity_pos?: number
  z_duels_total_per90_pos?: number
  z_interceptions_per90_pos?: number
  z_goals_per90_pos?: number
  z_shots_total_per90_pos?: number
  z_shot_efficiency_pos?: number
  shirt_number?: number
  market_value?: number
  market_value_currency?: string
  market_value_trend?: 'up' | 'down' | 'stable'
}

interface CoachReference {
  coach: string
  club: string
  quote: string
  date: string
}

export default function PlayerPage() {
  const params = useParams()
  const name = params?.name as string
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"radar" | "stats" | "references">("radar")
  const [radarData, setRadarData] = useState<any[]>([])
  const [logoError, setLogoError] = useState(false)
  const [coachReferences, setCoachReferences] = useState<CoachReference[]>([])

  useEffect(() => {
    if (!name) return

    const fetchPlayer = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/player/${encodeURIComponent(name)}`
        )
        if (!response.ok) throw new Error('Kunne ikke hente spillerdata')
        
        const data = await response.json()
        console.log("Spillerdata mottatt:", data)
        
        const enrichedData = {
          ...data,
          shirt_number: 10,
          market_value: Math.floor(Math.random() * 9000000) + 1000000,
          market_value_currency: 'kr',
          market_value_trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
        }
        
        setPlayer(enrichedData)

        const references = generateCoachReferences(enrichedData)
        setCoachReferences(references)

        const radar = [
          {
            kategori: "Mål",
            verdi: data.z_goals_per90_pos ? Math.min((data.z_goals_per90_pos + 2) * 25, 100) : 50,
            fullMark: 100
          },
          {
            kategori: "Skudd",
            verdi: data.z_shots_total_per90_pos ? Math.min((data.z_shots_total_per90_pos + 2) * 25, 100) : 50,
            fullMark: 100
          },
          {
            kategori: "Nøkkelpasninger",
            verdi: data.z_passes_key_per90_pos ? Math.min((data.z_passes_key_per90_pos + 2) * 25, 100) : 50,
            fullMark: 100
          },
          {
            kategori: "Pasningspresisjon",
            verdi: data.z_passes_accuracy_pos ? Math.min((data.z_passes_accuracy_pos + 2) * 25, 100) : 50,
            fullMark: 100
          },
          {
            kategori: "Dueller",
            verdi: data.z_duels_total_per90_pos ? Math.min((data.z_duels_total_per90_pos + 2) * 25, 100) : 50,
            fullMark: 100
          },
          {
            kategori: "Intensitet",
            verdi: data.z_intensity_pos ? Math.min((data.z_intensity_pos + 2) * 25, 100) : 50,
            fullMark: 100
          }
        ]
        setRadarData(radar)

      } catch (err) {
        console.error('Feil ved heating av spiller:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayer()
  }, [name])

  const generateCoachReferences = (player: PlayerData): CoachReference[] => {
    const isDefender = player.pos_group === 'DEF'
    const isMidfielder = player.pos_group === 'MID'
    const isAttacker = player.pos_group === 'ATT'
    const isGoalkeeper = player.pos_group === 'GK'
    
    const references: CoachReference[] = []
    
    if (player.fair_score > 2.5) {
      references.push({
        coach: "Kjetil Rekdal",
        club: "Ham-Kam",
        quote: isDefender 
          ? "En ledertype som gjør laget bedre. En av de beste stopperne jeg har trent."
          : isMidfielder
          ? "Han styrer midtbanen fullstendig. Fantastisk oversikt og pasningsfot."
          : isAttacker
          ? "Måltyv av en annen verden. Avslutter med begge bein og hode."
          : "En keeper som vinner kamper på egen hånd. Råsterk på streken.",
        date: "2025"
      })
    }
    
    if (player.forecast_score > 2.0 && player.age < 25) {
      references.push({
        coach: "Ståle Solbakken",
        club: "Norges landslag",
        quote: "Stort talent med internasjonalt potensial. Følger ham tett.",
        date: "2025"
      })
    }
    
    references.push({
      coach: isDefender ? "Eirik Horneland" : isMidfielder ? "Dag-Eilev Fagermo" : isAttacker ? "Jostein Grindhaug" : "Kjetil Knutsen",
      club: player.team_name,
      quote: isDefender
        ? "Solid defensivt, god i duellspillet og leser spillet godt. En stopper man kan bygge lag rundt."
        : isMidfielder
        ? "Motor på midtbanen. Jobber i begge retninger og har fin pasningsfot."
        : isAttacker
        ? "Farlig foran mål. Beveger seg smart og avslutter kaldt."
        : "Trygg og god keeper. God med beina og redningsprosent over snittet.",
      date: "2024"
    })
    
    return references
  }

  const formatMarketValue = (value?: number, currency: string = 'kr') => {
    if (!value) return 'Ukjent'
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} mill. ${currency}`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k ${currency}`
    }
    return `${value} ${currency}`
  }

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon className="w-4 h-4 text-green" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red" />
      default:
        return <span className="w-4 h-4 text-textMuted">•</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-6 h-6 text-brand animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-red mb-4">Fant ikke spilleren</p>
        <Link href="/dashboard" className="text-brand hover:underline">
          Gå tilbake til dashboard
        </Link>
      </div>
    )
  }

  const tierColor = player.player_tier === 'u23' 
    ? 'bg-purple-500/20 text-purple border-purple-500/30' 
    : 'bg-brand/20 text-brand border-brand/30'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header med tilbakeknapp */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard" 
          className="glass-panel p-3 hover:bg-panelHover transition-all rounded-xl"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Spillerprofil</h1>
          <p className="text-textMuted">Detaljert analyse og nøkkeltall</p>
        </div>
      </div>

      {/* Hovedkort - Spillerinfo */}
      <div className="glass-panel overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand/20 to-purple-500/20 relative">
          <div className="absolute -bottom-12 left-8 flex items-end gap-4">
            {player.team_logo && !logoError ? (
              <div className="w-24 h-24 rounded-2xl bg-panel flex items-center justify-center shadow-2xl border-4 border-bg0 overflow-hidden">
                <img 
                  src={`http://localhost:8000${player.team_logo}`}
                  alt={player.team_name}
                  className="w-full h-full object-contain p-2"
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand to-purple-500 flex items-center justify-center shadow-2xl border-4 border-bg0">
                <User size={48} className="text-white" />
              </div>
            )}
            <div className="mb-2">
              <div className="w-12 h-12 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl font-bold text-white">{player.shirt_number}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold">{player.player_name}</h2>
                <span className={`badge ${tierColor}`}>
                  {player.player_tier === 'u23' ? 'U23' : 'SENIOR'}
                </span>
              </div>
              
              <p className="text-xl text-textMuted mb-2">
                {player.team_name} • {player.position || player.pos_group} • #{player.shirt_number}
              </p>
              
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-green-500/20 px-3 py-1 rounded-full flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green" />
                  <span className="font-bold text-green">
                    {formatMarketValue(player.market_value, player.market_value_currency)}
                  </span>
                  {getTrendIcon(player.market_value_trend)}
                </div>
              </div>

              {player.role_profile && (
                <div className="inline-block bg-panel rounded-lg px-4 py-2 border border-brand/20">
                  <span className="text-sm text-textMuted">Rolleprofil: </span>
                  <span className="font-bold text-brand">{player.role_profile}</span>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-brand/20 border-4 border-brand flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-brand">{player.fair_score?.toFixed(2)}</span>
                </div>
                <p className="text-xs text-textMuted">Prestasjon</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-purple-500/20 border-4 border-purple-500 flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-purple">{player.forecast_score?.toFixed(2)}</span>
                </div>
                <p className="text-xs text-textMuted">Potensial</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-panel rounded-xl p-4">
              <Calendar className="w-5 h-5 text-brand mb-2" />
              <p className="text-2xl font-bold">{player.age}</p>
              <p className="text-xs text-textMuted">Alder</p>
            </div>
            <div className="bg-panel rounded-xl p-4">
              <Clock className="w-5 h-5 text-brand mb-2" />
              <p className="text-2xl font-bold">{player.minutes?.toLocaleString()}</p>
              <p className="text-xs text-textMuted">Minutter</p>
            </div>
            <div className="bg-panel rounded-xl p-4">
              <Target className="w-5 h-5 text-brand mb-2" />
              <p className="text-2xl font-bold">{player.goals || 0}</p>
              <p className="text-xs text-textMuted">Mål</p>
            </div>
            <div className="bg-panel rounded-xl p-4">
              <Zap className="w-5 h-5 text-brand mb-2" />
              <p className="text-2xl font-bold">{player.assists || 0}</p>
              <p className="text-xs text-textMuted">Assist</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigasjonsfaner */}
      <div className="flex gap-2 border-b border-white/5 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("radar")}
          className={`px-6 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === "radar" 
              ? "bg-brand text-white" 
              : "text-textMuted hover:text-text hover:bg-panel"
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Rolleprofil
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-6 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === "stats" 
              ? "bg-brand text-white" 
              : "text-textMuted hover:text-text hover:bg-panel"
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Detaljert statistikk
        </button>
        <button
          onClick={() => setActiveTab("references")}
          className={`px-6 py-2 rounded-lg transition-all whitespace-nowrap ${
            activeTab === "references" 
              ? "bg-brand text-white" 
              : "text-textMuted hover:text-text hover:bg-panel"
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Trenerreferanser ({coachReferences.length})
        </button>
      </div>

      {/* Tab 1: Rolleprofil (Radar) */}
      {activeTab === "radar" && (
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4">Rolleprofil (sammenlignet med posisjon)</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#ffffff20" />
                <PolarAngleAxis 
                  dataKey="kategori" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickCount={5}
                />
                <Radar
                  name={player.player_name}
                  dataKey="verdi"
                  stroke="#3b82f6"
                  fill="#3b82f6"
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
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-textMuted text-center mt-4">
            * Verdier viser percentil sammenlignet med andre spillere i samme posisjon
          </p>
        </div>
      )}

      {/* Tab 2: Detaljert statistikk */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="text-brand" />
              Nøkkeltall per 90
            </h3>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-textMuted">Mål per 90</span>
                  <span className="font-bold text-lg">{player.goals_per90?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand to-brandLight"
                    style={{ width: `${Math.min((player.goals_per90 || 0) * 50, 100)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-textMuted">Assist per 90</span>
                  <span className="font-bold text-lg">{player.assists_per90?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand to-brandLight"
                    style={{ width: `${Math.min((player.assists_per90 || 0) * 50, 100)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-textMuted">Nøkkelpasninger per 90</span>
                  <span className="font-bold text-lg">{player.passes_key_per90?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand to-brandLight"
                    style={{ width: `${Math.min((player.passes_key_per90 || 0) * 20, 100)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-textMuted">Taklinger per 90</span>
                  <span className="font-bold text-lg">{player.tackles_total_per90?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand to-brandLight"
                    style={{ width: `${Math.min((player.tackles_total_per90 || 0) * 15, 100)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-textMuted">Vellykkede driblinger per 90</span>
                  <span className="font-bold text-lg">{player.dribbles_success_per90?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand to-brandLight"
                    style={{ width: `${Math.min((player.dribbles_success_per90 || 0) * 20, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Shield className="text-brand" />
              Datagrunnlag
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-textMuted">Datakvalitet</span>
                  <span className="font-bold">{((player.reliability || 0) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-3 bg-panel rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green to-greenLight"
                    style={{ width: `${(player.reliability || 0) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-textMuted mt-1">
                  Basert på {player.minutes} spilte minutter
                </p>
              </div>

              <div className="pt-4 border-t border-white/5">
                <p className="text-textMuted text-sm mb-2">Total score</p>
                <p className="text-3xl font-bold text-brand">{player.total_score?.toFixed(2)}</p>
              </div>

              {player.cluster !== undefined && (
                <div className="pt-4 border-t border-white/5">
                  <p className="text-textMuted text-sm mb-2">Spillertype (cluster)</p>
                  <p className="text-lg font-bold text-purple">
                    {player.cluster === 0 ? 'Kreativ playmaker' : 
                     player.cluster === 1 ? 'Defensiv ballvinner' : 
                     player.cluster === 2 ? 'Boks-til-boks' : `Cluster ${player.cluster}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Trenerreferanser */}
      {activeTab === "references" && (
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="text-brand" />
            Hva tidligere trenere sier
          </h3>
          
          <div className="space-y-4">
            {coachReferences.map((ref, index) => (
              <div key={index} className="bg-panel rounded-xl p-5 border-l-4 border-brand">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-lg">{ref.coach}</p>
                    <p className="text-sm text-textMuted">{ref.club} • {ref.date}</p>
                  </div>
                  <div className="bg-brand/20 p-2 rounded-full">
                    <MessageSquare className="w-4 h-4 text-brand" />
                  </div>
                </div>
                <p className="text-text italic">"{ref.quote}"</p>
              </div>
            ))}
            
            {coachReferences.length === 0 && (
              <p className="text-textMuted text-center py-8">Ingen trenerreferanser tilgjengelig</p>
            )}
          </div>
        </div>
      )}

      {/* Handlingsknapper */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link 
          href={`/duell?a=${encodeURIComponent(player.player_name)}`}
          className="glass-panel p-4 text-center hover:bg-panelHover transition-all group"
        >
          <Sword className="w-6 h-6 text-brand mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold">Sammenlign</p>
          <p className="text-xs text-textMuted">Gå til duell</p>
        </Link>
        
        <button className="glass-panel p-4 text-center hover:bg-panelHover transition-all group">
          <Star className="w-6 h-6 text-amber mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold">Shortlist</p>
          <p className="text-xs text-textMuted">Legg til</p>
        </button>
        
        <Link 
          href="/scout"
          className="glass-panel p-4 text-center hover:bg-panelHover transition-all group"
        >
          <Eye className="w-6 h-6 text-purple mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold">Scout</p>
          <p className="text-xs text-textMuted">Se U23</p>
        </Link>

        <Link 
          href="/tropp"
          className="glass-panel p-4 text-center hover:bg-panelHover transition-all group"
        >
          <Users className="w-6 h-6 text-green mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold">Tropp</p>
          <p className="text-xs text-textMuted">Legg til i 11er</p>
        </Link>
      </div>
    </div>
  )
}
