"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  LayoutDashboard, TrendingUp, Users, Star, Target,
  Zap, Shield, Activity, Radar, ArrowUpRight,
  CheckCircle, AlertTriangle, Clock, ChevronRight,
  BarChart3, Layers
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────
interface Stats {
  total_players: number
  senior_players: number
  u23_players: number
  elite_count: number
  total_goals: number
  total_assists: number
  avg_age: number
  avg_fair_score: number
  avg_reliability: number
  top_scorer: { name: string; goals: number; team: string }
  top_assister: { name: string; assists: number; team: string }
  top_fair_score: { name: string; fair_score: number; team: string }
  top_scout: { name: string; scout_priority: number; tier: string }
  positions: Record<string, number>
  risk_upside_segments: Record<string, number>
}

interface Player {
  player_name: string
  team_name: string
  pos_group: string
  age: number
  player_tier: string
  fair_score: number
  forecast_score: number
  scout_priority: number
  roi_index: number
  upside_gap_best: number
  value_tier: string
  risk_upside_segment: string
  best_role_no: string
  reliability: number
}

interface ValueTier {
  tier: string
  count: number
  pct: number
  avg_forecast: number
  color: string
  top3: string[]
}

interface AgeGroup {
  range: string
  label: string
  color: string
  count: number
  avg_fair_score: number
  u23_count: number
}

interface Team {
  team_name: string
  player_count: number
  avg_age: number
  avg_fair_score: number
  total_goals: number
  u23_count: number
  top_player: string
}

interface Position {
  pos_group: string
  count: number
  avg_fair_score: number
  avg_age: number
  color: string
  top_player: string
}

interface ClusterOverview {
  pos_group: string
  cluster_label: string
  count: number
  avg_fair_score: number
  avg_age: number
}

// ── Design tokens — restrained premium palette ─────────────────────────────
// Primær: indigo (#6366f1) — brukes sparsomt
// Sekundær: hvit/grå hierarki
// Aksent: kun én ekstra farge per seksjon maks

const POS_LABEL: Record<string, string> = {
  GK: "Keeper", DEF: "Forsvar", MID: "Midtbane", ATT: "Angrep"
}

const SEGMENT_CFG: Record<string, { label: string; icon: React.ElementType }> = {
  Sikker_Vinner:      { label: "Sikker Vinner",  icon: CheckCircle   },
  Risiko_Høy_Oppside: { label: "Høy Oppside",    icon: TrendingUp    },
  Sikker_Middels:     { label: "Sikker Middels",  icon: Shield        },
  Risiko_Lav_Oppside: { label: "Lav Oppside",     icon: AlertTriangle },
}

const MEDAL = ["🥇", "🥈", "🥉"]

// ── Helpers ────────────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, text, action }: {
  icon: React.ElementType; text: string; action?: { label: string; href: string }
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-brand" />
        <span className="text-xs uppercase tracking-widest text-textMuted font-medium">{text}</span>
      </div>
      {action && (
        <Link href={action.href}
          className="text-[11px] text-textMuted hover:text-white flex items-center gap-1 transition-colors">
          {action.label} <ChevronRight size={10} />
        </Link>
      )}
    </div>
  )
}

function Bar({ value, max, dim = false }: { value: number; max: number; dim?: boolean }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="w-full h-1 rounded-full bg-white/6 overflow-hidden">
      <div className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: dim
            ? "rgba(255,255,255,0.2)"
            : "linear-gradient(90deg, #6366f1, #818cf8)",
          boxShadow: dim ? "none" : "0 0 6px rgba(99,102,241,0.4)"
        }} />
    </div>
  )
}

function PosBadge({ pos }: { pos: string }) {
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-textMuted"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
      {pos}
    </span>
  )
}

function U23Badge() {
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
      style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>
      U23
    </span>
  )
}

function SkeletonBlock({ h = "h-32" }: { h?: string }) {
  return <div className={`glass-panel rounded-2xl ${h} animate-pulse opacity-50`} />
}

function PlayerRow({ p, rank, value, sub }: {
  p: Player; rank: number; value: string; sub: string
}) {
  return (
    <Link href={`/player/${encodeURIComponent(p.player_name)}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/4 transition-colors group">
      <span className="w-6 text-center flex-shrink-0 text-sm">
        {rank <= 3 ? MEDAL[rank - 1] : <span className="text-xs text-textMuted font-bold">#{rank}</span>}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate group-hover:text-brand transition-colors">
          {p.player_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-textMuted truncate">{p.team_name}</span>
          <PosBadge pos={p.pos_group} />
          {p.player_tier === "u23_prospect" && <U23Badge />}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-black text-brand">{value}</p>
        <p className="text-[9px] text-textMuted">{sub}</p>
      </div>
    </Link>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats,      setStats]      = useState<Stats | null>(null)
  const [players,    setPlayers]    = useState<Player[]>([])
  const [valueTiers, setValueTiers] = useState<ValueTier[]>([])
  const [ageGroups,  setAgeGroups]  = useState<AgeGroup[]>([])
  const [teams,      setTeams]      = useState<Team[]>([])
  const [positions,  setPositions]  = useState<Position[]>([])
  const [clusters,   setClusters]   = useState<ClusterOverview[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const base = "http://localhost:8000"
    Promise.all([
      fetch(`${base}/api/stats`).then(r => r.json()),
      fetch(`${base}/api/players?limit=254&sort_by=scout_priority`).then(r => r.json()),
      fetch(`${base}/api/value-tiers`).then(r => r.json()),
      fetch(`${base}/api/age-groups`).then(r => r.json()),
      fetch(`${base}/api/teams`).then(r => r.json()),
      fetch(`${base}/api/positions`).then(r => r.json()),
      fetch(`${base}/api/clusters`).then(r => r.json()),
    ])
      .then(([s, p, vt, ag, t, pos, cl]) => {
        setStats(s); setPlayers(p); setValueTiers(vt)
        setAgeGroups(ag); setTeams(t); setPositions(pos)
        setClusters(cl.overview || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const topScout    = [...players].sort((a, b) => b.scout_priority   - a.scout_priority).slice(0, 5)
  const topForecast = [...players].sort((a, b) => b.forecast_score   - a.forecast_score).slice(0, 5)
  const topRoi      = [...players].sort((a, b) => b.roi_index        - a.roi_index).slice(0, 5)
  const topUpside   = [...players].sort((a, b) => b.upside_gap_best  - a.upside_gap_best).slice(0, 5)
  const maxTeamScore = teams[0]?.avg_fair_score || 1
  const maxAge       = Math.max(...ageGroups.map(g => g.count), 1)

  return (
    <div className="min-h-screen bg-bg0" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HEADER ── */}
      <div className="border-b border-white/5" style={{
        background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 70%)"
      }}>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center gap-2 mb-3">
            <LayoutDashboard size={14} className="text-brand" />
            <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Dashboard</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                Ligaoversikt
              </h1>
              <p className="text-textMuted text-sm">
                Eliteserien 2025 — {stats?.total_players || 254} spillere analysert
              </p>
            </div>
            <Link href="/scout"
              className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 text-white"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(79,70,229,0.15))",
                border: "1px solid rgba(99,102,241,0.3)",
                boxShadow: "0 0 20px rgba(99,102,241,0.1)"
              }}>
              <Radar size={14} className="text-brand" />
              <span>Scoutsenteret</span>
              <ArrowUpRight size={13} className="text-textMuted" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">

        {/* ══════════════════════════════════════
            KPI STRIP — indigo aksentlinje øverst, ellers hvit/grå
        ══════════════════════════════════════ */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <SkeletonBlock key={i} h="h-24" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Totalt spillere",    value: String(stats.total_players),              sub: `${stats.senior_players} senior · ${stats.u23_players} U23`,              icon: Users      },
              { label: "Elite-spillere",     value: String(stats.elite_count),                sub: "Topp 15% i ligaen",                                                      icon: Star       },
              { label: "Totale mål",         value: String(stats.total_goals),                sub: `${stats.total_assists} assist totalt`,                                   icon: Target     },
              { label: "Snitt reliabilitet", value: `${(stats.avg_reliability * 100).toFixed(0)}%`, sub: "Gjennomsnittlig datagrunnlag",                                    icon: Shield     },
              { label: "Toppscorer",         value: stats.top_scorer.name,                    sub: `${stats.top_scorer.goals} mål — ${stats.top_scorer.team}`,              icon: Zap        },
              { label: "Beste fair score",   value: stats.top_fair_score.name,                sub: `${stats.top_fair_score.fair_score.toFixed(2)} — ${stats.top_fair_score.team}`, icon: BarChart3 },
              { label: "Scout-prioritet #1", value: stats.top_scout.name,                     sub: `Score ${stats.top_scout.scout_priority.toFixed(2)} · ${stats.top_scout.tier}`,   icon: Radar      },
              { label: "Snitt alder",        value: `${stats.avg_age} år`,                    sub: "Alle posisjoner",                                                        icon: Clock      },
            ].map((kpi, i) => {
              const Icon = kpi.icon
              return (
                <div key={i} className="glass-panel rounded-2xl p-5 relative overflow-hidden border border-white/5">
                  {/* Subtil indigo-linje øverst på alle kort */}
                  <div className="absolute inset-x-0 top-0 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)" }} />
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}>
                    <Icon size={13} className="text-brand" />
                  </div>
                  <p className="text-lg font-black text-white truncate leading-tight mb-1">{kpi.value}</p>
                  <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium mb-1">{kpi.label}</p>
                  <p className="text-[10px] text-textMuted/60 truncate">{kpi.sub}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* ══════════════════════════════════════
            SEKSJON 1 — LIGA SNAPSHOT
        ══════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Posisjonsfordeling */}
          {loading ? <SkeletonBlock h="h-56" /> : (
            <div className="glass-panel rounded-2xl p-6">
              <SectionLabel icon={Activity} text="Posisjoner" />
              <div className="space-y-4">
                {positions.map(pos => (
                  <div key={pos.pos_group}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{POS_LABEL[pos.pos_group]}</span>
                        <span className="text-xs text-textMuted">{pos.count}</span>
                      </div>
                      <span className="text-xs font-bold text-textMuted">{pos.avg_fair_score.toFixed(2)}</span>
                    </div>
                    <Bar value={pos.count} max={110} />
                    <p className="text-[10px] text-textMuted/60 mt-1.5">Beste: {pos.top_player} · {pos.avg_age}år snitt</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Value Tier fordeling */}
          {loading ? <SkeletonBlock h="h-56" /> : (
            <div className="glass-panel rounded-2xl p-6">
              <SectionLabel icon={Star} text="Ligakvalitet" />
              <div className="space-y-4">
                {valueTiers.map((vt, i) => (
                  <div key={vt.tier}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{vt.tier}</span>
                        <span className="text-xs text-textMuted">{vt.count}</span>
                      </div>
                      <span className="text-xs text-textMuted">{vt.pct}%</span>
                    </div>
                    {/* Første tier (Elite) får brand-farge, resten dimmere */}
                    <Bar value={vt.pct} max={100} dim={i > 0} />
                    <p className="text-[10px] text-textMuted/60 mt-1.5 truncate">
                      {vt.top3.slice(0, 2).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk-Upside segmenter */}
          {loading ? <SkeletonBlock h="h-56" /> : stats && (
            <div className="glass-panel rounded-2xl p-6">
              <SectionLabel icon={TrendingUp} text="Risk-Upside"
                action={{ label: "Se frontier", href: "/scout" }} />
              <div className="space-y-2">
                {Object.entries(SEGMENT_CFG).map(([key, cfg]) => {
                  const count = stats.risk_upside_segments?.[key] || 0
                  const Icon = cfg.icon
                  const isTop = key === "Sikker_Vinner"
                  return (
                    <div key={key}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 transition-colors hover:bg-white/3"
                      style={{ background: isTop ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.02)" }}>
                      <Icon size={13} className={isTop ? "text-brand" : "text-textMuted"} />
                      <span className="flex-1 text-sm font-medium text-white">{cfg.label}</span>
                      <span className={`text-lg font-black ${isTop ? "text-brand" : "text-white"}`}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════
            SEKSJON 2 — TOPP SPILLERE
        ══════════════════════════════════════ */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {Array(4).fill(0).map((_, i) => <SkeletonBlock key={i} h="h-72" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {[
              { title: "Scout-prioritet", icon: Radar,      list: topScout,    val: (p: Player) => p.scout_priority.toFixed(2),  sub: "Prioritet"  },
              { title: "Forecast score",  icon: TrendingUp, list: topForecast, val: (p: Player) => p.forecast_score.toFixed(2),  sub: "Forecast"   },
              { title: "ROI-indeks",      icon: BarChart3,  list: topRoi,      val: (p: Player) => p.roi_index.toFixed(2),       sub: "ROI"        },
              { title: "Beste oppside",   icon: Zap,        list: topUpside,   val: (p: Player) => p.upside_gap_best.toFixed(2), sub: "Oppside"    },
            ].map(({ title, icon: Icon, list, val, sub }) => (
              <div key={title} className="glass-panel rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <Icon size={13} className="text-brand" />
                  <span className="text-xs uppercase tracking-widest text-textMuted font-medium">{title}</span>
                </div>
                <div className="py-2">
                  {list.map((p, i) => (
                    <PlayerRow key={p.player_name} p={p} rank={i + 1} value={val(p)} sub={sub} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════
            SEKSJON 3 — ALDERSPROFIL
        ══════════════════════════════════════ */}
        {loading ? <SkeletonBlock h="h-44" /> : (
          <div className="glass-panel rounded-2xl p-6">
            <SectionLabel icon={Clock} text="Aldersprofil" />
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
              {ageGroups.map(g => {
                const barH = Math.round((g.count / maxAge) * 64)
                return (
                  <div key={g.range} className="flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center h-16">
                      <div className="w-full rounded-t-lg"
                        style={{
                          height: barH,
                          background: "linear-gradient(180deg, rgba(99,102,241,0.7), rgba(99,102,241,0.3))",
                        }} />
                    </div>
                    <span className="text-xl font-black text-white">{g.count}</span>
                    <span className="text-[10px] font-semibold text-textMuted">{g.range}</span>
                    <span className="text-[9px] text-textMuted/60 uppercase tracking-wide">{g.label}</span>
                    {g.u23_count > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                        style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
                        {g.u23_count} U23
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            SEKSJON 4 — LAGRANKING
        ══════════════════════════════════════ */}
        {loading ? <SkeletonBlock h="h-64" /> : (
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <SectionLabel icon={Shield} text="Lagranking — snitt fair score"
                action={{ label: "Team Hub", href: "/team" }} />
            </div>
            <div className="divide-y divide-white/4">
              {teams.slice(0, 8).map((team, i) => (
                <div key={team.team_name}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/2 transition-colors">
                  <span className="w-6 text-center flex-shrink-0 text-sm">
                    {i < 3 ? MEDAL[i] : <span className="text-xs text-textMuted font-bold">#{i + 1}</span>}
                  </span>
                  <div className="w-36 flex-shrink-0">
                    <p className="text-sm font-semibold text-white truncate">{team.team_name}</p>
                    <p className="text-[10px] text-textMuted">{team.player_count} sp · {team.u23_count} U23</p>
                  </div>
                  <div className="flex-1 h-1 rounded-full bg-white/6 overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{
                        width: `${(team.avg_fair_score / maxTeamScore) * 100}%`,
                        background: "linear-gradient(90deg, #6366f1, #818cf8)",
                        boxShadow: "0 0 6px rgba(99,102,241,0.4)"
                      }} />
                  </div>
                  <div className="flex items-center gap-5 flex-shrink-0 text-xs">
                    <div className="text-right">
                      <p className="font-black text-brand">{team.avg_fair_score.toFixed(2)}</p>
                      <p className="text-[9px] text-textMuted">Snitt</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="font-bold text-white">{team.total_goals}</p>
                      <p className="text-[9px] text-textMuted">Mål</p>
                    </div>
                    <div className="hidden lg:block text-right">
                      <p className="font-medium text-textMuted truncate max-w-[100px]">{team.top_player}</p>
                      <p className="text-[9px] text-textMuted">Toppspiller</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            SEKSJON 5 — CLUSTER-OVERSIKT
        ══════════════════════════════════════ */}
        {loading ? <SkeletonBlock h="h-44" /> : (
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <SectionLabel icon={Layers} text="Spillerprofiler — K-means klynger" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y divide-white/5">
              {clusters.sort((a, b) => b.count - a.count).map(cl => (
                <div key={cl.cluster_label} className="p-5 hover:bg-white/2 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded text-textMuted"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {cl.pos_group}
                    </span>
                    <span className="text-[9px] text-textMuted/50">sil {cl.silhouette?.toFixed(2)}</span>
                  </div>
                  <p className="text-sm font-bold text-white leading-tight mb-2">{cl.cluster_label}</p>
                  <p className="text-2xl font-black text-brand mb-1">{cl.count}</p>
                  <p className="text-[10px] text-textMuted">⌀ {cl.avg_fair_score?.toFixed(2)} · {cl.avg_age?.toFixed(1)}år</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}