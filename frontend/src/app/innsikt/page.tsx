"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BarChart3, Activity, Layers, Target,
  Zap, Shield, Map, Clock, Eye,
  Plus, Sliders, X, TrendingUp, Users
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────
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
}

interface TeamStat {
  team_name: string
  player_count: number
  avg_age: number
  avg_score: number
  top_scorer?: string
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

type Tab = "liga" | "rolle" | "statistikk" | "skreddersydd"

// ── Helpers ────────────────────────────────────────────────────────────
const CLUSTER_CFG = {
  playmaker: { label: "Kreativ Playmaker", color: "#6366f1", glow: "rgba(99,102,241,0.3)", desc: "Styrer spillet, skaper sjanser", count: 52 },
  ballvinner: { label: "Defensiv Ballvinner", color: "#ef4444", glow: "rgba(239,68,68,0.3)", desc: "Gjenvinner ball, vinner dueller", count: 41 },
  bokstilboks: { label: "Boks-til-boks", color: "#a855f7", glow: "rgba(168,85,247,0.3)", desc: "Allsidig, jobber i begge bokser", count: 30 },
} as const

const POS_CFG = [
  { key: "GK",  label: "Keeper",   color: "#f59e0b", icon: Shield },
  { key: "DEF", label: "Forsvar",  color: "#6366f1", icon: Shield },
  { key: "MID", label: "Midtbane", color: "#22c55e", icon: Activity },
  { key: "ATT", label: "Angrep",   color: "#ef4444", icon: Target },
]

const AGE_GROUPS = [
  { range: "17–20", label: "Ung",      color: "#6366f1", min: 17, max: 20 },
  { range: "21–23", label: "Talent",   color: "#22c55e", min: 21, max: 23 },
  { range: "24–26", label: "Etablert", color: "#f59e0b", min: 24, max: 26 },
  { range: "27–29", label: "Prime",    color: "#a855f7", min: 27, max: 29 },
  { range: "30–32", label: "Erfaren",  color: "#ec4899", min: 30, max: 32 },
  { range: "33+",   label: "Veteran",  color: "#ef4444", min: 33, max: 99 },
]

const RANK_MEDAL = ["🥇", "🥈", "🥉"]

// ── Sub-components ─────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <Icon size={14} className="text-brand" />
      <span className="text-xs uppercase tracking-widest font-medium text-textMuted">{text}</span>
    </div>
  )
}

function StatRow({
  rank, name, team, value, color, href,
}: { rank: number; name: string; team: string; value: string; color: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/4 transition-colors group"
    >
      <span className="w-6 text-center text-base flex-shrink-0">
        {rank <= 3 ? RANK_MEDAL[rank - 1] : <span className="text-xs text-textMuted font-bold">#{rank}</span>}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate group-hover:text-brand transition-colors">{name}</p>
        <p className="text-[10px] text-textMuted truncate">{team}</p>
      </div>
      <span className="text-lg font-black flex-shrink-0" style={{ color }}>{value}</span>
    </Link>
  )
}

function WeightSlider({ label, value, color, onChange }: {
  label: string; value: number; color: string; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-textMuted font-medium">{label}</span>
        <span className="font-black" style={{ color }}>{value}%</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/6">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
        />
        <input
          type="range" min={0} max={100} value={value}
          onChange={e => onChange(+e.target.value)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────
export default function InnsiktPage() {
  const [players, setPlayers]           = useState<Player[]>([])
  const [teamStats, setTeamStats]       = useState<TeamStat[]>([])
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState<Tab>("liga")
  const [cluster, setCluster]           = useState<keyof typeof CLUSTER_CFG>("playmaker")
  const [viewMode, setViewMode]         = useState<"grid" | "list">("grid")
  const [customRoles, setCustomRoles]   = useState<CustomRole[]>([])
  const [showBuilder, setShowBuilder]   = useState(false)
  const [editingRole, setEditingRole]   = useState<CustomRole | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("http://localhost:8000/api/players")
      .then(r => r.json())
      .then((data: Player[]) => {
        setPlayers(data)
        const teams = [...new Set(data.map(p => p.team_name).filter(Boolean))]
        setTeamStats(
          teams.map(t => {
            const tp = data.filter(p => p.team_name === t)
            return {
              team_name: t,
              player_count: tp.length,
              avg_age: tp.reduce((a, p) => a + p.age, 0) / tp.length,
              avg_score: tp.reduce((a, p) => a + (p.fair_score || 0), 0) / tp.length,
              top_scorer: [...tp].sort((a, b) => (b.fair_score || 0) - (a.fair_score || 0))[0]?.player_name,
            }
          }).sort((a, b) => b.avg_score - a.avg_score)
        )
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────
  const clusterPlayers = players.filter(p =>
    cluster === "playmaker" ? p.cluster === 0 :
    cluster === "ballvinner" ? p.cluster === 1 : p.cluster === 2
  )

  const topScorers  = [...players].sort((a, b) => (b.goals || 0) - (a.goals || 0)).slice(0, 5).filter(p => p.goals > 0)
  const topAssists  = [...players].sort((a, b) => (b.assists || 0) - (a.assists || 0)).slice(0, 5).filter(p => p.assists > 0)
  const topPassers  = [...players].sort((a, b) => (b.passes_key_per90 || 0) - (a.passes_key_per90 || 0)).slice(0, 5)

  const calcMatches = (role: CustomRole) =>
    players.map(p => {
      let score = 0, total = 0
      Object.entries(role.weights).forEach(([k, w]) => {
        if (w > 0) {
          total += w
          if (k === "goals")     score += (p.goals || 0) * w
          if (k === "assists")   score += (p.assists || 0) * w
          if (k === "key_passes") score += (p.passes_key_per90 || 0) * w
          if (k === "tackles")   score += (p.tackles_total_per90 || 0) * w
          if (k === "duels")     score += (p.duels_won_per90 || 0) * w
          if (k === "intensity") score += (p.intensity_per90 || 0) * w
        }
      })
      return { player: p, score: total > 0 ? score / total : 0 }
    }).sort((a, b) => b.score - a.score).slice(0, 5)

  const saveRole = (role: CustomRole) => {
    const updated = editingRole
      ? customRoles.map(r => r.id === role.id ? role : r)
      : [...customRoles, { ...role, id: Date.now().toString() }]
    setCustomRoles(updated)
    setShowBuilder(false)
    setEditingRole(null)
  }

  const deleteRole = (id: string) => setCustomRoles(r => r.filter(x => x.id !== id))

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <BarChart3 size={14} className="text-brand" />
        </div>
      </div>
    </div>
  )

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "liga",         label: "Ligaoversikt",      icon: Map      },
    { id: "rolle",        label: "Rolleanalyse",      icon: Layers   },
    { id: "skreddersydd", label: "Skreddersydde",     icon: Sliders  },
    { id: "statistikk",   label: "Topp statistikk",   icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-bg0" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HEADER ── */}
      <div className="border-b border-white/5" style={{
        background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 70%)"
      }}>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-brand" />
            <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Innsikt</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
            Ligaanalyse
          </h1>
          <p className="text-textMuted text-sm">Dybdeinnsikt fra Eliteserien — {players.length} spillere analysert</p>
        </div>

        {/* ── TABS ── */}
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-end gap-0">
            {TABS.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all"
                  style={{ color: active ? "#fff" : "rgba(148,163,184,0.6)" }}
                >
                  <Icon size={13} />
                  <span>{t.label}</span>
                  {active && (
                    <div className="absolute bottom-0 inset-x-4 h-0.5 rounded-t-full"
                      style={{ background: "linear-gradient(90deg, #818cf8, #6366f1)", boxShadow: "0 0 8px rgba(99,102,241,0.6)" }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">

        {/* ══════════════════════════════════════════════
            TAB 1 — LIGAOVERSIKT
        ══════════════════════════════════════════════ */}
        {tab === "liga" && (
          <div className="space-y-6">

            {/* Posisjonsfordeling */}
            <div className="glass-panel rounded-2xl p-6">
              <SectionLabel icon={Map} text="Posisjonsfordeling" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {POS_CFG.map(pos => {
                  const count = players.filter(p => p.pos_group === pos.key).length
                  const pct   = Math.round((count / players.length) * 100)
                  const Icon  = pos.icon
                  return (
                    <div key={pos.key} className="rounded-xl p-4 border border-white/6"
                      style={{ background: `linear-gradient(135deg, ${pos.color}0a 0%, transparent 60%)` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `${pos.color}18` }}>
                          <Icon size={14} style={{ color: pos.color }} />
                        </div>
                        <span className="text-2xl font-black text-white">{count}</span>
                      </div>
                      <p className="text-sm font-semibold text-white mb-2">{pos.label}</p>
                      <div className="h-1 rounded-full bg-white/6 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pos.color, boxShadow: `0 0 8px ${pos.color}60` }} />
                      </div>
                      <p className="text-[10px] text-textMuted mt-1.5">{pct}% av troppen</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Aldersfordeling */}
            <div className="glass-panel rounded-2xl p-6">
              <SectionLabel icon={Clock} text="Aldersfordeling" />
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                {AGE_GROUPS.map(g => {
                  const count = players.filter(p => p.age >= g.min && p.age <= g.max).length
                  const maxC  = Math.max(...AGE_GROUPS.map(x => players.filter(p => p.age >= x.min && p.age <= x.max).length))
                  const barH  = Math.round((count / maxC) * 56)
                  return (
                    <div key={g.range} className="flex flex-col items-center gap-2">
                      {/* Bar */}
                      <div className="w-full flex items-end justify-center h-16 px-1">
                        <div className="w-full rounded-t-lg transition-all"
                          style={{ height: barH, background: `linear-gradient(180deg, ${g.color}, ${g.color}80)`, boxShadow: `0 0 10px ${g.color}40` }} />
                      </div>
                      <span className="text-xl font-black text-white">{count}</span>
                      <span className="text-[10px] font-semibold" style={{ color: g.color }}>{g.range}</span>
                      <span className="text-[9px] text-textMuted uppercase tracking-wide">{g.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Topp lag */}
            <div className="glass-panel rounded-2xl p-6">
              <SectionLabel icon={Shield} text="Topp lag — snittpoeng" />
              <div className="space-y-2">
                {teamStats.slice(0, 8).map((team, i) => {
                  const maxScore = teamStats[0]?.avg_score || 1
                  const pct = (team.avg_score / maxScore) * 100
                  return (
                    <div key={team.team_name}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/3 transition-colors group">
                      <span className="w-6 text-center flex-shrink-0">
                        {i < 3 ? RANK_MEDAL[i] : <span className="text-xs text-textMuted font-bold">#{i+1}</span>}
                      </span>
                      <div className="w-28 flex-shrink-0">
                        <p className="text-sm font-semibold text-white truncate">{team.team_name}</p>
                        <p className="text-[10px] text-textMuted">{team.player_count} spillere</p>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full bg-white/6 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #6366f1, #818cf8)", boxShadow: "0 0 6px rgba(99,102,241,0.5)" }} />
                      </div>
                      <span className="text-base font-black text-brand flex-shrink-0 w-12 text-right">
                        {team.avg_score.toFixed(2)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB 2 — ROLLEANALYSE
        ══════════════════════════════════════════════ */}
        {tab === "rolle" && (
          <div className="space-y-6">
            {/* Cluster cards */}
            <div className="grid grid-cols-3 gap-4">
              {(Object.entries(CLUSTER_CFG) as [keyof typeof CLUSTER_CFG, typeof CLUSTER_CFG[keyof typeof CLUSTER_CFG]][]).map(([key, cfg]) => {
                const active = cluster === key
                return (
                  <button key={key} onClick={() => setCluster(key)}
                    className="relative rounded-2xl p-5 text-left transition-all border overflow-hidden"
                    style={{
                      background: active ? `linear-gradient(135deg, ${cfg.color}15, ${cfg.color}08)` : "rgba(255,255,255,0.02)",
                      borderColor: active ? `${cfg.color}40` : "rgba(255,255,255,0.06)",
                      boxShadow: active ? `0 0 24px ${cfg.glow}` : "none"
                    }}>
                    {active && (
                      <div className="absolute inset-x-0 top-0 h-px"
                        style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />
                    )}
                    <div className="text-3xl font-black mb-1" style={{ color: cfg.color }}>{cfg.count}</div>
                    <div className="text-sm font-bold text-white mb-1">{cfg.label}</div>
                    <div className="text-xs text-textMuted">{cfg.desc}</div>
                  </button>
                )
              })}
            </div>

            {/* Players */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm font-bold text-white">{CLUSTER_CFG[cluster].label}</p>
                  <p className="text-xs text-textMuted">{clusterPlayers.length} spillere i denne klyngen</p>
                </div>
                <div className="flex gap-1 p-1 rounded-lg bg-white/4">
                  {(["grid", "list"] as const).map(m => (
                    <button key={m} onClick={() => setViewMode(m)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                      style={{ background: viewMode === m ? "rgba(99,102,241,0.2)" : "transparent", color: viewMode === m ? "#a5b4fc" : "rgba(148,163,184,0.6)" }}>
                      {m === "grid" ? "Grid" : "Liste"}
                    </button>
                  ))}
                </div>
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {clusterPlayers.slice(0, 9).map(p => (
                    <Link key={p.player_name} href={`/player/${encodeURIComponent(p.player_name)}`}
                      className="rounded-xl p-4 border border-white/6 hover:border-brand/30 transition-all hover:bg-white/2 group">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-bold text-white group-hover:text-brand transition-colors leading-tight">{p.player_name}</p>
                        <span className="text-xs font-black flex-shrink-0 ml-2"
                          style={{ color: CLUSTER_CFG[cluster].color }}>{p.fair_score?.toFixed(1)}</span>
                      </div>
                      <p className="text-[10px] text-textMuted mb-3">{p.team_name}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[9px] text-textMuted uppercase tracking-wide">Nøkkel/90</p>
                          <p className="text-xs font-bold text-white">{p.passes_key_per90?.toFixed(1) || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-textMuted uppercase tracking-wide">Dueller</p>
                          <p className="text-xs font-bold text-white">{p.duels_won_per90?.toFixed(1) || "—"}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-white/4">
                  {clusterPlayers.slice(0, 12).map((p, i) => (
                    <div key={p.player_name} className="flex items-center gap-4 py-3 hover:bg-white/2 rounded-lg px-2 transition-colors">
                      <span className="text-xs text-textMuted w-5 text-center">#{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <Link href={`/player/${encodeURIComponent(p.player_name)}`}
                          className="text-sm font-semibold text-white hover:text-brand transition-colors">{p.player_name}</Link>
                        <p className="text-[10px] text-textMuted">{p.team_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0 flex gap-6 text-xs">
                        <div><p className="text-textMuted text-[9px]">Score</p><p className="font-bold text-brand">{p.fair_score?.toFixed(1)}</p></div>
                        <div><p className="text-textMuted text-[9px]">Nøkkel</p><p className="font-bold text-white">{p.passes_key_per90?.toFixed(1) || "—"}</p></div>
                        <div><p className="text-textMuted text-[9px]">Dueller</p><p className="font-bold text-white">{p.duels_won_per90?.toFixed(1) || "—"}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB 3 — SKREDDERSYDDE ROLLER
        ══════════════════════════════════════════════ */}
        {tab === "skreddersydd" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Skreddersydde roller</p>
                <p className="text-xs text-textMuted">Definer egne vektinger og finn de beste matchene</p>
              </div>
              <button onClick={() => { setEditingRole(null); setShowBuilder(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-brand border transition-all hover:bg-brand/10"
                style={{ borderColor: "rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.06)" }}>
                <Plus size={14} /> Ny rolle
              </button>
            </div>

            {customRoles.length === 0 ? (
              <div className="glass-panel rounded-2xl p-16 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <Sliders size={18} className="text-brand" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">Ingen roller ennå</p>
                <p className="text-xs text-textMuted mb-5">Bygg din første rolle og finn spillere som passer</p>
                <button onClick={() => setShowBuilder(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                  Opprett rolle
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {customRoles.map(role => {
                  const matches = calcMatches(role)
                  return (
                    <div key={role.id} className="glass-panel rounded-2xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-white/5 flex items-start justify-between">
                        <div>
                          <p className="font-bold text-white">{role.name}</p>
                          {role.description && <p className="text-xs text-textMuted mt-0.5">{role.description}</p>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-4">
                          <button onClick={() => { setEditingRole(role); setShowBuilder(true) }}
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <Sliders size={13} className="text-brand" />
                          </button>
                          <button onClick={() => deleteRole(role.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                            <X size={13} className="text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Weight pills */}
                      <div className="px-6 py-3 border-b border-white/5 flex flex-wrap gap-2">
                        {Object.entries(role.weights).map(([k, v]) => v > 0 && (
                          <span key={k} className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                            style={{ background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}>
                            {k.replace("_", " ")} {v}%
                          </span>
                        ))}
                      </div>

                      {/* Matches */}
                      <div className="px-6 py-4">
                        <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium mb-3">Beste matcher</p>
                        <div className="space-y-1">
                          {matches.map((m, i) => (
                            <Link key={m.player.player_name}
                              href={`/player/${encodeURIComponent(m.player.player_name)}`}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/3 transition-colors group">
                              <span className="w-5 text-center text-sm flex-shrink-0">
                                {i < 3 ? RANK_MEDAL[i] : <span className="text-xs text-textMuted">#{i+1}</span>}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white group-hover:text-brand transition-colors truncate">{m.player.player_name}</p>
                                <p className="text-[10px] text-textMuted">{m.player.team_name}</p>
                              </div>
                              <span className="text-base font-black text-brand">{m.score.toFixed(2)}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB 4 — TOPP STATISTIKK
        ══════════════════════════════════════════════ */}
        {tab === "statistikk" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Mål */}
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                <Target size={13} className="text-brand" />
                <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Flest mål</span>
              </div>
              <div className="py-2">
                {topScorers.map((p, i) => (
                  <StatRow key={p.player_name} rank={i+1} name={p.player_name} team={p.team_name}
                    value={String(p.goals)} color="#6366f1"
                    href={`/player/${encodeURIComponent(p.player_name)}`} />
                ))}
              </div>
            </div>

            {/* Assist */}
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                <Zap size={13} className="text-green-400" />
                <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Flest assist</span>
              </div>
              <div className="py-2">
                {topAssists.map((p, i) => (
                  <StatRow key={p.player_name} rank={i+1} name={p.player_name} team={p.team_name}
                    value={String(p.assists)} color="#22c55e"
                    href={`/player/${encodeURIComponent(p.player_name)}`} />
                ))}
              </div>
            </div>

            {/* Nøkkelpasninger */}
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                <Activity size={13} className="text-purple-400" />
                <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Nøkkelpasninger/90</span>
              </div>
              <div className="py-2">
                {topPassers.map((p, i) => (
                  <StatRow key={p.player_name} rank={i+1} name={p.player_name} team={p.team_name}
                    value={p.passes_key_per90?.toFixed(1) || "—"} color="#a855f7"
                    href={`/player/${encodeURIComponent(p.player_name)}`} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          ROLE BUILDER MODAL
      ══════════════════════════════════════════════ */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div>
                <p className="font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {editingRole ? "Rediger rolle" : "Ny skreddersydd rolle"}
                </p>
                <p className="text-xs text-textMuted mt-0.5">Vektingen må summere til 100%</p>
              </div>
              <button onClick={() => setShowBuilder(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">
                <X size={14} className="text-textMuted" />
              </button>
            </div>
            <RoleBuilder
              initialRole={editingRole}
              onSave={saveRole}
              onCancel={() => setShowBuilder(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── RoleBuilder ────────────────────────────────────────────────────────
function RoleBuilder({ initialRole, onSave, onCancel }: {
  initialRole?: CustomRole | null
  onSave: (r: CustomRole) => void
  onCancel: () => void
}) {
  const [role, setRole] = useState<CustomRole>(initialRole || {
    id: "", name: "", description: "",
    weights: { goals: 20, assists: 20, key_passes: 20, tackles: 10, duels: 15, intensity: 15 }
  })

  const setW = (k: string, v: number) => setRole(r => ({ ...r, weights: { ...r.weights, [k]: v } }))
  const total = Object.values(role.weights).reduce((a, b) => a + b, 0)
  const ok = !!role.name && total === 100

  const SLIDERS = [
    { key: "goals",      label: "Mål",              color: "#6366f1" },
    { key: "assists",    label: "Assist",            color: "#22c55e" },
    { key: "key_passes", label: "Nøkkelpasninger",   color: "#a855f7" },
    { key: "tackles",    label: "Taklinger",         color: "#ef4444" },
    { key: "duels",      label: "Dueller vunnet",    color: "#f59e0b" },
    { key: "intensity",  label: "Intensitet",        color: "#ec4899" },
  ]

  return (
    <div className="px-6 py-5 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-textMuted font-medium block mb-1.5">Rollenavn</label>
          <input value={role.name} onChange={e => setRole(r => ({ ...r, name: e.target.value }))}
            placeholder="F.eks. Dyp playmaker"
            className="w-full bg-bg0/60 border border-white/8 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand text-white placeholder-textMuted" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-textMuted font-medium block mb-1.5">Beskrivelse</label>
          <input value={role.description} onChange={e => setRole(r => ({ ...r, description: e.target.value }))}
            placeholder="Valgfri beskrivelse"
            className="w-full bg-bg0/60 border border-white/8 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand text-white placeholder-textMuted" />
        </div>
      </div>

      {/* Total indicator */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-textMuted font-medium">Vekting</span>
        <span className="text-xs font-black" style={{ color: total === 100 ? "#22c55e" : total > 100 ? "#ef4444" : "#f59e0b" }}>
          {total}/100%
        </span>
      </div>

      <div className="space-y-4">
        {SLIDERS.map(s => (
          <WeightSlider key={s.key} label={s.label} color={s.color}
            value={role.weights[s.key as keyof typeof role.weights]}
            onChange={v => setW(s.key, v)} />
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave(role)} disabled={!ok}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed text-white"
          style={{ background: ok ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "rgba(255,255,255,0.05)" }}>
          Lagre rolle
        </button>
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-textMuted hover:text-white hover:bg-white/5 transition-all">
          Avbryt
        </button>
      </div>
    </div>
  )
}
