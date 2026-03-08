"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Radar, TrendingUp, Shield, Target, Activity,
  Filter, ChevronDown, ArrowUpRight, Users, Zap,
  AlertTriangle, CheckCircle, Clock, Star
} from "lucide-react"
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts"

// ── Types ──────────────────────────────────────────────────────────────────
interface ScoutPlayer {
  player_name: string
  age: number
  team_name: string
  pos_group: string
  player_tier: string
  minutes: number
  reliability: number
  fair_score: number
  forecast_score: number
  scout_priority: number
  roi_index: number
  value_for_money: number
  value_tier: string
  risk_upside_segment: string
  upside_gap_best: number
  best_role_no: string
  cluster_label: string
  age_factor: number
}

interface FrontierPlayer {
  player_name: string
  team_name: string
  pos_group: string
  age: number
  player_tier: string
  reliability: number
  forecast_score: number
  risk_upside_segment: string
  value_tier: string
  best_role_no: string
  scout_priority: number
}

// ── Config ─────────────────────────────────────────────────────────────────
const SEGMENT_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType; desc: string }> = {
  Sikker_Vinner:       { label: "Sikker Vinner",      color: "#6366f1", bg: "rgba(99,102,241,0.12)",  icon: CheckCircle,  desc: "Høy reliabilitet + høy score" },
  Risiko_Høy_Oppside:  { label: "Høy Oppside",        color: "#22c55e", bg: "rgba(34,197,94,0.12)",   icon: TrendingUp,   desc: "Usikker, men stort potensial" },
  Sikker_Middels:      { label: "Sikker Middels",      color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: Shield,       desc: "Pålitelig, men begrenset upside" },
  Risiko_Lav_Oppside:  { label: "Lav Oppside",         color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: AlertTriangle,desc: "Usikker + lav score" },
}

const TIER_CFG: Record<string, { color: string; bg: string }> = {
  Elite:              { color: "#6366f1", bg: "rgba(99,102,241,0.15)"  },
  God:                { color: "#22c55e", bg: "rgba(34,197,94,0.15)"   },
  Gjennomsnitt:       { color: "#f59e0b", bg: "rgba(245,158,11,0.15)"  },
  Under_Gjennomsnitt: { color: "#ef4444", bg: "rgba(239,68,68,0.15)"   },
}

const POS_CFG: Record<string, string> = {
  GK: "#f59e0b", DEF: "#6366f1", MID: "#22c55e", ATT: "#ef4444"
}

// ── Helpers ────────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CFG[tier] || { color: "#888", bg: "rgba(136,136,136,0.1)" }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
      {tier}
    </span>
  )
}

function SegmentBadge({ segment }: { segment: string }) {
  const cfg = SEGMENT_CFG[segment]
  if (!cfg) return null
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

function ScoreBar({ value, max = 2, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="w-full h-1 rounded-full bg-white/6 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
    </div>
  )
}

// ── Custom Scatter Tooltip ─────────────────────────────────────────────────
function FrontierTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const p: FrontierPlayer = payload[0].payload
  const seg = SEGMENT_CFG[p.risk_upside_segment]
  return (
    <div className="rounded-xl border border-white/10 p-3 text-xs" style={{ background: "rgba(12,12,20,0.97)", backdropFilter: "blur(12px)", minWidth: 180 }}>
      <p className="font-bold text-white mb-1">{p.player_name}</p>
      <p className="text-textMuted mb-2">{p.team_name} · {p.pos_group} · {p.age}år</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-textMuted">Reliabilitet</span>
          <span className="font-bold text-white">{p.reliability?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-textMuted">Forecast</span>
          <span className="font-bold text-white">{p.forecast_score?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-textMuted">Rolle</span>
          <span className="font-bold text-white">{p.best_role_no}</span>
        </div>
      </div>
      {seg && (
        <div className="mt-2 pt-2 border-t border-white/8">
          <SegmentBadge segment={p.risk_upside_segment} />
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
type TabType = "liste" | "frontier"

export default function ScoutPage() {
  const [scoutData,    setScoutData]    = useState<ScoutPlayer[]>([])
  const [frontierData, setFrontierData] = useState<FrontierPlayer[]>([])
  const [metadata,     setMetadata]     = useState<{ rel_median: number; forecast_median: number } | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState<TabType>("liste")

  // Filtre
  const [filterPos,     setFilterPos]     = useState("")
  const [filterTier,    setFilterTier]    = useState("")
  const [filterSegment, setFilterSegment] = useState("")
  const [filterVTier,   setFilterVTier]   = useState("")
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null)

  useEffect(() => {
    const base = "http://localhost:8000"
    const params = new URLSearchParams()
    if (filterPos)     params.set("pos", filterPos)
    if (filterTier)    params.set("tier", filterTier)
    if (filterSegment) params.set("segment", filterSegment)
    if (filterVTier)   params.set("v_tier", filterVTier)
    params.set("limit", "254")

    Promise.all([
      fetch(`${base}/api/scout?${params}`).then(r => r.json()),
      fetch(`${base}/api/risk-upside?${filterPos ? `pos=${filterPos}` : ""}${filterTier ? `&tier=${filterTier}` : ""}`).then(r => r.json()),
    ])
      .then(([scout, frontier]) => {
        setScoutData(scout)
        setFrontierData(frontier.players || [])
        setMetadata(frontier.metadata || null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filterPos, filterTier, filterSegment, filterVTier])

  // Scatter data gruppert per segment
  const scatterGroups = useMemo(() => {
    const groups: Record<string, FrontierPlayer[]> = {}
    frontierData.forEach(p => {
      const seg = p.risk_upside_segment || "Ukjent"
      if (!groups[seg]) groups[seg] = []
      groups[seg].push(p)
    })
    return groups
  }, [frontierData])

  // Segment-sammendrag
  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    frontierData.forEach(p => {
      counts[p.risk_upside_segment] = (counts[p.risk_upside_segment] || 0) + 1
    })
    return counts
  }, [frontierData])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
        <Radar size={14} className="absolute inset-0 m-auto text-brand" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg0" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HEADER ── */}
      <div className="border-b border-white/5" style={{
        background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)"
      }}>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center gap-2 mb-3">
            <Radar size={14} className="text-brand" />
            <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Scout</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                Scoutsenteret
              </h1>
              <p className="text-textMuted text-sm">
                {scoutData.length} spillere rangert etter scout-prioritet · {frontierData.length} i frontier
              </p>
            </div>

            {/* Segment-oversikt pills */}
            <div className="hidden lg:flex items-center gap-2">
              {Object.entries(SEGMENT_CFG).map(([key, cfg]) => {
                const count = segmentCounts[key] || 0
                const Icon = cfg.icon
                return (
                  <button
                    key={key}
                    onClick={() => setFilterSegment(filterSegment === key ? "" : key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold"
                    style={{
                      background: filterSegment === key ? cfg.bg : "rgba(255,255,255,0.03)",
                      borderColor: filterSegment === key ? cfg.color + "50" : "rgba(255,255,255,0.08)",
                      color: filterSegment === key ? cfg.color : "rgba(148,163,184,0.7)",
                    }}
                  >
                    <Icon size={11} />
                    <span>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-end gap-0">
            {([
              { id: "liste",    label: "Prioritetsliste", icon: Users     },
              { id: "frontier", label: "Risk-Upside",     icon: TrendingUp },
            ] as { id: TabType; label: string; icon: React.ElementType }[]).map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all"
                  style={{ color: active ? "#fff" : "rgba(148,163,184,0.6)" }}>
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

        {/* ── FILTRE ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 text-xs text-textMuted">
            <Filter size={12} />
            <span className="uppercase tracking-widest font-medium">Filter</span>
          </div>

          {/* Posisjon */}
          {["GK", "DEF", "MID", "ATT"].map(pos => (
            <button key={pos} onClick={() => setFilterPos(filterPos === pos ? "" : pos)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={{
                background: filterPos === pos ? `${POS_CFG[pos]}18` : "rgba(255,255,255,0.03)",
                borderColor: filterPos === pos ? `${POS_CFG[pos]}40` : "rgba(255,255,255,0.08)",
                color: filterPos === pos ? POS_CFG[pos] : "rgba(148,163,184,0.7)",
              }}>
              {pos}
            </button>
          ))}

          <div className="w-px h-4 bg-white/10" />

          {/* Tier */}
          {["senior", "u23_prospect"].map(tier => (
            <button key={tier} onClick={() => setFilterTier(filterTier === tier ? "" : tier)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={{
                background: filterTier === tier ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                borderColor: filterTier === tier ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)",
                color: filterTier === tier ? "#a5b4fc" : "rgba(148,163,184,0.7)",
              }}>
              {tier === "senior" ? "Senior" : "U23"}
            </button>
          ))}

          <div className="w-px h-4 bg-white/10" />

          {/* Value tier */}
          {["Elite", "God"].map(vt => (
            <button key={vt} onClick={() => setFilterVTier(filterVTier === vt ? "" : vt)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={{
                background: filterVTier === vt ? TIER_CFG[vt].bg : "rgba(255,255,255,0.03)",
                borderColor: filterVTier === vt ? TIER_CFG[vt].color + "40" : "rgba(255,255,255,0.08)",
                color: filterVTier === vt ? TIER_CFG[vt].color : "rgba(148,163,184,0.7)",
              }}>
              {vt}
            </button>
          ))}

          {(filterPos || filterTier || filterSegment || filterVTier) && (
            <button onClick={() => { setFilterPos(""); setFilterTier(""); setFilterSegment(""); setFilterVTier("") }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-textMuted hover:text-white border border-white/8 hover:border-white/15 transition-all">
              Nullstill
            </button>
          )}
        </div>

        {/* ══════════════════════════════════════
            TAB 1 — PRIORITETSLISTE
        ══════════════════════════════════════ */}
        {tab === "liste" && (
          <div className="glass-panel rounded-2xl overflow-hidden">

            {/* Tabell-header */}
            <div className="grid gap-4 px-5 py-3 border-b border-white/5 text-[10px] uppercase tracking-widest text-textMuted font-medium"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1.2fr 32px" }}>
              <span>Spiller</span>
              <span>Prioritet</span>
              <span>Forecast</span>
              <span>Reliabilitet</span>
              <span>Value</span>
              <span>Segment</span>
              <span>Beste rolle</span>
              <span />
            </div>

            <div className="divide-y divide-white/4">
              {scoutData.map((p, i) => {
                const segCfg = SEGMENT_CFG[p.risk_upside_segment]
                const isHover = hoveredPlayer === p.player_name
                return (
                  <div
                    key={p.player_name}
                    className="grid gap-4 px-5 py-3.5 items-center transition-colors cursor-default"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1.2fr 32px",
                      background: isHover ? "rgba(99,102,241,0.04)" : "transparent"
                    }}
                    onMouseEnter={() => setHoveredPlayer(p.player_name)}
                    onMouseLeave={() => setHoveredPlayer(null)}
                  >
                    {/* Spiller */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-textMuted w-5 flex-shrink-0 text-center font-bold">
                        {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{p.player_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-textMuted truncate">{p.team_name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                            style={{ background: `${POS_CFG[p.pos_group]}18`, color: POS_CFG[p.pos_group] }}>
                            {p.pos_group}
                          </span>
                          <span className="text-[9px] text-textMuted">{p.age}år</span>
                          {p.player_tier === "u23_prospect" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>U23</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Scout priority */}
                    <div>
                      <p className="text-sm font-black text-brand mb-1">{p.scout_priority?.toFixed(2)}</p>
                      <ScoreBar value={p.scout_priority} max={1} color="#6366f1" />
                    </div>

                    {/* Forecast */}
                    <div>
                      <p className="text-sm font-bold text-white mb-1">{p.forecast_score?.toFixed(2)}</p>
                      <ScoreBar value={p.forecast_score} max={2} color="#a855f7" />
                    </div>

                    {/* Reliabilitet */}
                    <div>
                      <p className="text-sm font-bold text-white mb-1">{(p.reliability * 100).toFixed(0)}%</p>
                      <ScoreBar value={p.reliability} max={1} color="#f59e0b" />
                    </div>

                    {/* Value tier */}
                    <div>
                      <TierBadge tier={p.value_tier} />
                    </div>

                    {/* Segment */}
                    <div>
                      <SegmentBadge segment={p.risk_upside_segment} />
                    </div>

                    {/* Rolle */}
                    <div>
                      <p className="text-[11px] text-textMuted leading-tight">{p.best_role_no}</p>
                    </div>

                    {/* Link */}
                    <Link href={`/player/${encodeURIComponent(p.player_name)}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/8 hover:border-brand/30 hover:bg-brand/10 transition-all">
                      <ArrowUpRight size={12} className="text-textMuted" />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 2 — RISK-UPSIDE FRONTIER
        ══════════════════════════════════════ */}
        {tab === "frontier" && (
          <div className="space-y-6">

            {/* Segment-kort */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(SEGMENT_CFG).map(([key, cfg]) => {
                const count = segmentCounts[key] || 0
                const Icon = cfg.icon
                const active = filterSegment === key
                return (
                  <button key={key} onClick={() => setFilterSegment(active ? "" : key)}
                    className="relative rounded-2xl p-5 text-left border transition-all overflow-hidden"
                    style={{
                      background: active ? cfg.bg : "rgba(255,255,255,0.02)",
                      borderColor: active ? cfg.color + "40" : "rgba(255,255,255,0.06)",
                      boxShadow: active ? `0 0 24px ${cfg.color}20` : "none"
                    }}>
                    {active && (
                      <div className="absolute inset-x-0 top-0 h-px"
                        style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
                        <Icon size={14} style={{ color: cfg.color }} />
                      </div>
                      <span className="text-2xl font-black" style={{ color: cfg.color }}>{count}</span>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">{cfg.label}</p>
                    <p className="text-[11px] text-textMuted">{cfg.desc}</p>
                  </button>
                )
              })}
            </div>

            {/* Scatter plot */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-white">Risk-Upside Frontier</p>
                  <p className="text-xs text-textMuted mt-0.5">
                    X = Reliabilitet (datakvalitet) · Y = Forecast score (prestasjonspotensial)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {Object.entries(SEGMENT_CFG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <span className="text-[10px] text-textMuted">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: 420 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="reliability"
                      type="number"
                      domain={[0, 1]}
                      tickCount={6}
                      tick={{ fill: "rgba(148,163,184,0.5)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                      label={{ value: "Reliabilitet →", position: "insideBottom", offset: -10, fill: "rgba(148,163,184,0.4)", fontSize: 10 }}
                    />
                    <YAxis
                      dataKey="forecast_score"
                      type="number"
                      tick={{ fill: "rgba(148,163,184,0.5)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                      label={{ value: "Forecast →", angle: -90, position: "insideLeft", offset: 10, fill: "rgba(148,163,184,0.4)", fontSize: 10 }}
                    />
                    <Tooltip content={<FrontierTooltip />} />

                    {/* Medianlinjene */}
                    {metadata && (
                      <>
                        <ReferenceLine x={metadata.rel_median} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                        <ReferenceLine y={metadata.forecast_median} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                      </>
                    )}

                    {/* En Scatter per segment */}
                    {Object.entries(scatterGroups).map(([seg, players]) => {
                      const cfg = SEGMENT_CFG[seg]
                      if (!cfg) return null
                      return (
                        <Scatter
                          key={seg}
                          data={players}
                          fill={cfg.color}
                          fillOpacity={0.75}
                          r={4}
                        />
                      )
                    })}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Kvadrant-labels */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                {Object.entries(SEGMENT_CFG).map(([key, cfg]) => {
                  const Icon = cfg.icon
                  const players = scatterGroups[key] || []
                  const top3 = [...players].sort((a, b) => b.scout_priority - a.scout_priority).slice(0, 3)
                  return (
                    <div key={key} className="rounded-xl p-3 border border-white/5" style={{ background: cfg.bg + "60" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={11} style={{ color: cfg.color }} />
                        <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                        <span className="text-[10px] text-textMuted ml-auto">{players.length} spillere</span>
                      </div>
                      <div className="space-y-1">
                        {top3.map(p => (
                          <Link key={p.player_name} href={`/player/${encodeURIComponent(p.player_name)}`}
                            className="flex items-center justify-between hover:opacity-80 transition-opacity">
                            <span className="text-[11px] text-white truncate">{p.player_name}</span>
                            <span className="text-[10px] text-textMuted flex-shrink-0 ml-2">{p.team_name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
