"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft, Activity, Target, Shield, Zap,
  TrendingUp, BarChart3, Radar, Star, Users,
  CheckCircle, AlertTriangle, Clock, ChevronRight
} from "lucide-react"
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar as RechartsRadar,
  ResponsiveContainer, Tooltip
} from "recharts"

// ── Logo mapping ───────────────────────────────────────────────────────────
const TEAM_LOGO: Record<string, string> = {
  "Bodø/Glimt":    "/images/Logo/bodo-glimt.png",
  "Brann":         "/images/Logo/Brann.png",
  "Bryne":         "/images/Logo/Bryne.png",
  "Fredrikstad":   "/images/Logo/Fredrikstad.png",
  "HamKam":        "/images/Logo/hamkam.png",
  "Haugesund":     "/images/Logo/haugesund.png",
  "KFUM Oslo":     "/images/Logo/KFUM.png",
  "Kristiansund":  "/images/Logo/Kristiansund.png",
  "Molde":         "/images/Logo/Molde.png",
  "Rosenborg":     "/images/Logo/Rosenborg.png",
  "Sandefjord":    "/images/Logo/Sandefjord.png",
  "Sarpsborg 08":  "/images/Logo/sarpsborg-08.png",
  "Strømsgodset":  "/images/Logo/stromsgodset.png",
  "Tromsø":        "/images/Logo/tromso.png",
  "Vålerenga":     "/images/Logo/valerenga.png",
  "Viking":        "/images/Logo/Viking.png",
}

function getLogoPath(teamName: string): string | null {
  if (!teamName) return null
  // Direkte match
  if (TEAM_LOGO[teamName]) return TEAM_LOGO[teamName]
  // Fuzzy match — finn første nøkkel som er substring
  const key = Object.keys(TEAM_LOGO).find(k =>
    teamName.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(teamName.toLowerCase())
  )
  return key ? TEAM_LOGO[key] : null
}

// ── Types ──────────────────────────────────────────────────────────────────
interface PlayerData {
  player_name: string
  age: number
  nationality: string
  team_name: string
  pos_group: string
  role_raw: string
  player_tier: string
  minutes: number
  games: number
  starts: number
  rating: number

  // Scores
  fair_score: number
  forecast_score: number
  shrunk_score: number
  reliability: number
  age_factor: number
  total_score: number
  percentile_pos: number
  value_tier: string
  risk_upside_segment: string
  roi_index: number
  scout_priority: number
  value_for_money: number

  // Per-90
  goals_per90: number
  assists_per90: number
  passes_key_per90: number
  tackles_total_per90: number
  duels_won_per90: number
  interceptions_per90: number
  intensity_per90: number
  shots_per90: number
  dribbles_per90: number

  // Efficiency
  shot_efficiency: number
  duel_efficiency: number
  pass_efficiency: number
  dribble_efficiency: number
  risk_rate: number

  // Z-scores
  z_goals_per90_pos: number
  z_assists_per90_pos: number
  z_passes_key_per90_pos: number
  z_tackles_total_per90_pos: number
  z_duels_won_per90_pos: number
  z_intensity_per90_pos: number
  z_shot_efficiency_pos: number
  z_duel_efficiency_pos: number
  z_pass_efficiency_pos: number
  z_dribble_efficiency_pos: number

  // Roller
  best_role_no: string
  cluster_label: string
  silhouette: number
  upside_gap_best: number
  upside_gap_playmaker: number
  upside_gap_ballwinner: number
  upside_gap_finisher: number
  upside_gap_pressplayer: number
  raw_score_playmaker: number
  raw_score_ballwinner: number
  raw_score_finisher: number
  raw_score_pressplayer: number
  value_score_playmaker: number
  value_score_ballwinner: number
  value_score_finisher: number
  value_score_pressplayer: number
  whatif_900min_playmaker: number
  whatif_900min_ballwinner: number
  whatif_900min_finisher: number
  whatif_900min_pressplayer: number
}

interface SimilarPlayer {
  player_name: string
  team_name: string
  pos_group: string
  age: number
  player_tier: string
  fair_score: number
  value_tier: string
  distance: number
}

interface RadarData {
  subject: string
  value: number
  fullMark: number
}

// ── Config ─────────────────────────────────────────────────────────────────
const SEGMENT_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  Sikker_Vinner:      { label: "Sikker Vinner",  color: "#6366f1", icon: CheckCircle   },
  Risiko_Høy_Oppside: { label: "Høy Oppside",    color: "#6366f1", icon: TrendingUp    },
  Sikker_Middels:     { label: "Sikker Middels",  color: "#94a3b8", icon: Shield        },
  Risiko_Lav_Oppside: { label: "Lav Oppside",     color: "#94a3b8", icon: AlertTriangle },
}

const TIER_CFG: Record<string, { color: string; bg: string }> = {
  Elite:              { color: "#6366f1", bg: "rgba(99,102,241,0.15)"  },
  God:                { color: "#a5b4fc", bg: "rgba(165,180,252,0.12)" },
  Gjennomsnitt:       { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  Under_Gjennomsnitt: { color: "#64748b", bg: "rgba(100,116,139,0.12)" },
}

const POS_COLOR: Record<string, string> = {
  GK: "#f59e0b", DEF: "#6366f1", MID: "#a5b4fc", ATT: "#818cf8"
}

const ROLLE_CFG = [
  { key: "playmaker",   label: "Kreativ playmaker",  raw: "raw_score_playmaker",   val: "value_score_playmaker",   upside: "upside_gap_playmaker",   whatif: "whatif_900min_playmaker"   },
  { key: "ballwinner",  label: "Defensiv ballvinner", raw: "raw_score_ballwinner",  val: "value_score_ballwinner",  upside: "upside_gap_ballwinner",  whatif: "whatif_900min_ballwinner"  },
  { key: "finisher",    label: "Avslutter",           raw: "raw_score_finisher",    val: "value_score_finisher",    upside: "upside_gap_finisher",    whatif: "whatif_900min_finisher"    },
  { key: "pressplayer", label: "Presspiller",         raw: "raw_score_pressplayer", val: "value_score_pressplayer", upside: "upside_gap_pressplayer", whatif: "whatif_900min_pressplayer" },
]

// ── Helpers ────────────────────────────────────────────────────────────────
function StatBar({ label, value, max, unit = "" }: { label: string; value: number; max: number; unit?: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-textMuted">{label}</span>
        <span className="text-xs font-bold text-white">{value?.toFixed(2)}{unit}</span>
      </div>
      <div className="h-1 rounded-full bg-white/6 overflow-hidden">
        <div className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #6366f1, #818cf8)",
            boxShadow: "0 0 6px rgba(99,102,241,0.3)"
          }} />
      </div>
    </div>
  )
}

function EffGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.min(value * 100, 100)
  const r = 26, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none"
          stroke="#6366f1" strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
          style={{ filter: "drop-shadow(0 0 4px rgba(99,102,241,0.5))" }}
        />
        <text x="32" y="37" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">
          {pct.toFixed(0)}%
        </text>
      </svg>
      <span className="text-[10px] text-textMuted text-center leading-tight">{label}</span>
    </div>
  )
}

function KpiCard({ label, value, sub, highlight = false }: {
  label: string; value: string; sub?: string; highlight?: boolean
}) {
  return (
    <div className="glass-panel rounded-2xl p-5 relative overflow-hidden border border-white/5">
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: highlight
          ? "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)"
          : "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)"
        }} />
      <p className={`text-2xl font-black mb-1 ${highlight ? "text-brand" : "text-white"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium">{label}</p>
      {sub && <p className="text-[10px] text-textMuted/60 mt-1">{sub}</p>}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function PlayerProfilePage() {
  const params = useParams()
  const name = decodeURIComponent(params.name as string)

  const [player,  setPlayer]  = useState<PlayerData | null>(null)
  const [similar, setSimilar] = useState<SimilarPlayer[]>([])
  const [radar,   setRadar]   = useState<RadarData[]>([])
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    const base = "http://localhost:8000"
    Promise.all([
      fetch(`${base}/api/player/${encodeURIComponent(name)}`).then(r => r.json()),
      fetch(`${base}/api/similar/${encodeURIComponent(name)}`).then(r => r.json()),
      fetch(`${base}/api/radar/${encodeURIComponent(name)}`).then(r => r.json()),
    ])
      .then(([p, sim, rad]) => {
        setPlayer(p)
        setSimilar(sim.similar || [])
        setRadar(rad.radar || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [name])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
        <Radar size={14} className="absolute inset-0 m-auto text-brand" />
      </div>
    </div>
  )

  if (!player) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-white font-bold">Spiller ikke funnet</p>
      <Link href="/player" className="text-brand text-sm hover:opacity-80">← Tilbake til oversikt</Link>
    </div>
  )

  const logoPath  = getLogoPath(player.team_name)
  const segCfg    = SEGMENT_CFG[player.risk_upside_segment]
  const tierCfg   = TIER_CFG[player.value_tier]
  const isU23     = player.player_tier === "u23_prospect"
  const SegIcon   = segCfg?.icon || Shield

  // Beste rolle
  const bestRolleKey = ROLLE_CFG.find(r =>
    r.label.toLowerCase().includes(player.best_role_no?.toLowerCase()) ||
    player.best_role_no?.toLowerCase().includes(r.key)
  )?.key || ROLLE_CFG[0].key

  return (
    <div className="min-h-screen bg-bg0" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HERO HEADER ── */}
      <div className="border-b border-white/5 relative overflow-hidden" style={{
        background: "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(99,102,241,0.1) 0%, transparent 60%)"
      }}>
        {/* Subtil bakgrunnslogo */}
        {logoPath && !imgError && (
          <div className="absolute right-0 top-0 h-full w-64 pointer-events-none select-none overflow-hidden">
            <Image src={logoPath} alt="" fill
              className="object-contain object-right opacity-[0.04] scale-110"
              onError={() => setImgError(true)} />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-8 py-8 relative">
          {/* Tilbake */}
          <Link href="/player"
            className="inline-flex items-center gap-2 text-xs text-textMuted hover:text-white transition-colors mb-6">
            <ArrowLeft size={13} />
            Tilbake til spilleroversikt
          </Link>

          <div className="flex items-start gap-8">

            {/* Klubblogo */}
            <div className="flex-shrink-0">
              {logoPath && !imgError ? (
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center border border-white/8 relative overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <Image src={logoPath} alt={player.team_name}
                    width={80} height={80}
                    className="object-contain p-2"
                    onError={() => setImgError(true)} />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center border border-white/8"
                  style={{ background: "rgba(99,102,241,0.08)" }}>
                  <span className="text-3xl font-black text-brand">
                    {player.player_name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Navn & info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {/* Posisjon-badge */}
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                  style={{
                    background: `${POS_COLOR[player.pos_group]}15`,
                    color: POS_COLOR[player.pos_group],
                    border: `1px solid ${POS_COLOR[player.pos_group]}25`
                  }}>
                  {player.pos_group}
                </span>
                {/* Value tier */}
                {tierCfg && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: tierCfg.bg, color: tierCfg.color, border: `1px solid ${tierCfg.color}25` }}>
                    {player.value_tier}
                  </span>
                )}
                {/* U23 */}
                {isU23 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>
                    U23 Prospect
                  </span>
                )}
                {/* Segment */}
                {segCfg && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                    style={{ background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <SegIcon size={10} />
                    {segCfg.label}
                  </span>
                )}
              </div>

              <h1 className="text-4xl font-black text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                {player.player_name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-textMuted">
                {/* Klubblogo liten + navn */}
                <div className="flex items-center gap-2">
                  {logoPath && !imgError ? (
                    <Image src={logoPath} alt={player.team_name} width={18} height={18} className="object-contain" />
                  ) : null}
                  <span className="font-medium text-white">{player.team_name}</span>
                </div>
                <span>·</span>
                <span>{player.nationality}</span>
                <span>·</span>
                <span>{player.age} år</span>
                <span>·</span>
                <span>{player.minutes?.toLocaleString()} min</span>
                <span>·</span>
                <span>{player.games} kamper</span>
                {player.cluster_label && (
                  <>
                    <span>·</span>
                    <span className="text-brand font-medium">{player.cluster_label}</span>
                  </>
                )}
              </div>
            </div>

            {/* Scout-prioritet stor */}
            <div className="hidden lg:flex flex-col items-end gap-1 flex-shrink-0">
              <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium">Scout-prioritet</p>
              <p className="text-5xl font-black text-brand" style={{ fontFamily: "'Syne', sans-serif" }}>
                {player.scout_priority?.toFixed(2)}
              </p>
              <p className="text-xs text-textMuted">#{Math.round((1 - player.percentile_pos / 100) * 254) || "—"} i ligaen</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">

        {/* ══════════════════════════════════════
            KPI STRIP
        ══════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <KpiCard label="Fair Score"      value={player.fair_score?.toFixed(2)}      highlight />
          <KpiCard label="Forecast Score"  value={player.forecast_score?.toFixed(2)}  highlight />
          <KpiCard label="Reliabilitet"    value={`${(player.reliability * 100).toFixed(0)}%`} sub="Datagrunnlag" />
          <KpiCard label="ROI-indeks"      value={player.roi_index?.toFixed(2)}       sub="Risikojustert verdi" />
          <KpiCard label="Percentil"       value={`${player.percentile_pos?.toFixed(0)}%`} sub={`Blant ${player.pos_group}`} />
          <KpiCard label="Beste rolle"     value={player.best_role_no || "—"} />
        </div>

        {/* ══════════════════════════════════════
            RADAR + PER-90
        ══════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Radar */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity size={13} className="text-brand" />
              <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Styrker vs. posisjonssnitt</span>
            </div>
            {radar.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radar}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="subject"
                    tick={{ fill: "rgba(148,163,184,0.7)", fontSize: 10 }} />
                  <RechartsRadar name={player.player_name}
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{ background: "rgba(12,12,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }}
                    labelStyle={{ color: "#fff", fontWeight: "bold" }}
                    itemStyle={{ color: "#a5b4fc" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-textMuted text-sm">
                Radardata ikke tilgjengelig
              </div>
            )}
          </div>

          {/* Per-90 stats */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={13} className="text-brand" />
              <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Per-90 produksjon</span>
            </div>
            <div className="space-y-4">
              <StatBar label="Mål per 90"          value={player.goals_per90}         max={1.2} />
              <StatBar label="Assist per 90"        value={player.assists_per90}       max={0.8} />
              <StatBar label="Nøkkelpassninger / 90" value={player.passes_key_per90}  max={3}   />
              <StatBar label="Taklingsvunnet / 90"  value={player.tackles_total_per90} max={8}   />
              <StatBar label="Dueller vunnet / 90"  value={player.duels_won_per90}    max={12}  />
              <StatBar label="Skudd per 90"         value={player.shots_per90}         max={4}   />
              <StatBar label="Driblinger / 90"      value={player.dribbles_per90}      max={5}   />
              <StatBar label="Intensitet / 90"      value={player.intensity_per90}     max={15}  />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            EFFEKTIVITET
        ══════════════════════════════════════ */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap size={13} className="text-brand" />
            <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Effektivitet per handling</span>
          </div>
          <div className="flex items-center justify-around flex-wrap gap-6">
            <EffGauge label="Skuddeff."    value={player.shot_efficiency}    />
            <EffGauge label="Duelleeff."   value={player.duel_efficiency}    />
            <EffGauge label="Pasningseff." value={player.pass_efficiency}    />
            <EffGauge label="Dribbleff."   value={player.dribble_efficiency} />
            <EffGauge label="Risikoandel"  value={player.risk_rate}          />
          </div>
        </div>

        {/* ══════════════════════════════════════
            ROLLEANALYSE
        ══════════════════════════════════════ */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Star size={13} className="text-brand" />
            <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Rolleanalyse — WSM</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {ROLLE_CFG.map(rolle => {
              const rawVal  = (player as any)[rolle.raw]  || 0
              const valVal  = (player as any)[rolle.val]  || 0
              const upside  = (player as any)[rolle.upside] || 0
              const isBest  = player.best_role_no?.toLowerCase().includes(rolle.key) ||
                              rolle.label.toLowerCase().includes(player.best_role_no?.toLowerCase())
              return (
                <div key={rolle.key}
                  className="rounded-2xl p-5 border transition-all relative overflow-hidden"
                  style={{
                    background: isBest ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                    borderColor: isBest ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)"
                  }}>
                  {isBest && (
                    <div className="absolute inset-x-0 top-0 h-px"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)" }} />
                  )}
                  {isBest && (
                    <span className="absolute top-3 right-3 text-[9px] font-black px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>BESTE</span>
                  )}
                  <p className="text-sm font-bold text-white mb-4 pr-12">{rolle.label}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-textMuted">Raw score</span>
                      <span className="font-bold text-white">{rawVal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-textMuted">Value score</span>
                      <span className="font-bold text-brand">{valVal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-textMuted">Oppside vs snitt</span>
                      <span className={`font-bold ${upside > 0 ? "text-white" : "text-textMuted"}`}>
                        {upside > 0 ? "+" : ""}{upside.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════
            WHATIF — kun U23
        ══════════════════════════════════════ */}
        {isU23 && (
          <div className="glass-panel rounded-2xl p-6 border border-brand/10" style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, transparent 60%)"
          }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={13} className="text-brand" />
              <span className="text-xs uppercase tracking-widest text-textMuted font-medium">What-if — simulert ved 900 min</span>
            </div>
            <p className="text-xs text-textMuted mb-6">Hva ville scorene vært om spilleren hadde 900 minutters spilletid?</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {ROLLE_CFG.map(rolle => {
                const val = (player as any)[rolle.whatif]
                if (!val) return null
                return (
                  <div key={rolle.key} className="text-center p-4 rounded-xl border border-white/6"
                    style={{ background: "rgba(99,102,241,0.05)" }}>
                    <p className="text-2xl font-black text-brand mb-1">{val.toFixed(2)}</p>
                    <p className="text-[11px] text-textMuted">{rolle.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            LIGNENDE SPILLERE
        ══════════════════════════════════════ */}
        {similar.length > 0 && (
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users size={13} className="text-brand" />
              <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Lignende spillere</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {similar.map(s => {
                const sLogo = getLogoPath(s.team_name)
                return (
                  <Link key={s.player_name} href={`/player/${encodeURIComponent(s.player_name)}`}
                    className="rounded-2xl p-4 border border-white/5 hover:border-brand/20 hover:bg-brand/5 transition-all group text-center">
                    <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center border border-white/8"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      {sLogo ? (
                        <Image src={sLogo} alt={s.team_name} width={36} height={36} className="object-contain p-1" />
                      ) : (
                        <span className="text-lg font-black text-textMuted">{s.player_name.charAt(0)}</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors mb-1">
                      {s.player_name}
                    </p>
                    <p className="text-[10px] text-textMuted truncate mb-2">{s.team_name}</p>
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-textMuted"
                        style={{ background: "rgba(255,255,255,0.06)" }}>{s.pos_group}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                        style={{ background: TIER_CFG[s.value_tier]?.bg || "rgba(255,255,255,0.06)", color: TIER_CFG[s.value_tier]?.color || "#888" }}>
                        {s.value_tier}
                      </span>
                    </div>
                    <p className="text-[10px] text-textMuted mt-2">
                      FS {s.fair_score?.toFixed(2)}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
