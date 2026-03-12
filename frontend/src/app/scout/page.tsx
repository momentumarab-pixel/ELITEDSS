"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  TrendingUp, Shield, Target, Activity,
  ArrowUpRight, Users, AlertTriangle, CheckCircle,
  Info, ChevronDown, ChevronUp, X, HelpCircle, Search
} from "lucide-react"
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────
interface ScoutPlayer {
  player_name: string; age: number; team_name: string; pos_group: string
  player_tier: string; minutes: number; reliability: number; fair_score: number
  forecast_score: number; scout_priority: number; roi_index: number
  value_for_money: number; value_tier: string; risk_upside_segment: string
  upside_gap_best: number; best_role_no: string; cluster_label: string
}
interface FrontierPlayer {
  player_name: string; team_name: string; pos_group: string; age: number
  player_tier: string; reliability: number; forecast_score: number
  risk_upside_segment: string; value_tier: string; best_role_no: string
  scout_priority: number; fair_score: number
}

const C = {
  bg:      "#07080c",
  panel:   "rgba(14, 16, 24, 0.90)",
  border:  "rgba(255,255,255,0.05)",
  indigo:  "#6366f1",
  emerald: "#10b981",
  rose:    "#f43f5e",
  violet:  "#8b5cf6",
  amber:   "#f59e0b",
  blue:    "#3b82f6",
}

const SEG: Record<string, {
  label: string; shortLabel: string; color: string; glow: string
  bg: string; border: string; icon: React.ElementType; forklaring: string
}> = {
  Sikker_Vinner: {
    label: "Trygg toppspiller", shortLabel: "Trygg topp",
    color: C.indigo, glow: "rgba(99,102,241,0.25)", bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)",
    icon: CheckCircle,
    forklaring: "Spilleren leverer stabilt på høyt nivå og har solid datadekning. Lav risiko — det du ser er det du får."
  },
  Risiko_Høy_Oppside: {
    label: "Høyt potensial", shortLabel: "Høyt potensial",
    color: C.emerald, glow: "rgba(16,185,129,0.25)", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)",
    icon: TrendingUp,
    forklaring: "Modellen ser stort potensial, men datagrunnlaget er tynnere. Spennende signeringskandidater — men krev mer scouting."
  },
  Sikker_Middels: {
    label: "Stabil middels", shortLabel: "Stabil middels",
    color: C.amber, glow: "rgba(245,158,11,0.25)", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)",
    icon: Shield,
    forklaring: "Pålitelig spiller med trygt datagrunnlag, men begrenset prestasjonsrom. God på benk eller som rotasjonsspiller."
  },
  Risiko_Lav_Oppside: {
    label: "Under forventning", shortLabel: "Under forventning",
    color: C.rose, glow: "rgba(244,63,94,0.2)", bg: "rgba(244,63,94,0.06)", border: "rgba(244,63,94,0.15)",
    icon: AlertTriangle,
    forklaring: "Svake tall kombinert med lite data. Ikke anbefalt for prioritert rekruttering på nåværende tidspunkt."
  },
}

const POS_COLOR: Record<string, string> = { GK: C.amber, DEF: C.blue, MID: C.violet, ATT: C.rose }
const POS_NB: Record<string, string> = { GK: "Keeper", DEF: "Forsvarer", MID: "Midtbane", ATT: "Angriper" }

const TIER_CFG: Record<string, { color: string; bg: string; border: string }> = {
  "Elite":              { color: C.emerald, bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.25)"  },
  "Over snitt":         { color: C.indigo,  bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.25)"  },
  "Rundt snitt":        { color: C.amber,   bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.25)"  },
  "Under snitt":        { color: C.rose,    bg: "rgba(244,63,94,0.08)",   border: "rgba(244,63,94,0.20)"   },
  "God":                { color: C.indigo,  bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.25)"  },
  "Gjennomsnitt":       { color: C.amber,   bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.25)"  },
  "Under_Gjennomsnitt": { color: C.rose,    bg: "rgba(244,63,94,0.08)",   border: "rgba(244,63,94,0.20)"   },
}

const LOGO_MAP: [string, string][] = [
  ["bodø","/images/Logo/bodo-glimt.png"],["glimt","/images/Logo/bodo-glimt.png"],
  ["brann","/images/Logo/Brann.png"],["bryne","/images/Logo/Bryne.png"],
  ["fredrikstad","/images/Logo/Fredrikstad.png"],
  ["hamkam","/images/Logo/hamkam.png"],["ham-kam","/images/Logo/hamkam.png"],
  ["haugesund","/images/Logo/haugesund.png"],
  ["kfum","/images/Logo/KFUM.png"],["kristiansund","/images/Logo/Kristiansund.png"],
  ["molde","/images/Logo/Molde.png"],["rosenborg","/images/Logo/Rosenborg.png"],
  ["sandefjord","/images/Logo/Sandefjord.png"],["sarpsborg","/images/Logo/sarpsborg-08.png"],
  ["strømsgodset","/images/Logo/stromsgodset.png"],["stromsgodset","/images/Logo/stromsgodset.png"],
  ["godset","/images/Logo/stromsgodset.png"],
  ["tromsø","/images/Logo/tromso.png"],["tromso","/images/Logo/tromso.png"],
  ["vålerenga","/images/Logo/valerenga.png"],["valerenga","/images/Logo/valerenga.png"],
  ["viking","/images/Logo/Viking.png"],
]
const getLogo = (t: string) => LOGO_MAP.find(([k]) => t?.toLowerCase().includes(k))?.[1] ?? null

const pct = (v: number) => (v == null || isNaN(v)) ? "—" : `${Math.round(v * 100)}%`

type TabType = "liste" | "frontier"

const BEGREP = [
  { term: "Scoutprioritet", tekst: "En samlet rangering fra 0 til 1 der vi kombinerer nåværende prestasjoner, fremtidspotensial og datakvalitet. Jo nærmere 1, jo mer anbefaler systemet å prioritere spilleren." },
  { term: "Predikert nivå",  tekst: "Modellens vurdering av spillerens forventede fremtidige prestasjonsnivå — basert på alder, trendutvikling og historiske prestasjoner." },
  { term: "Datapålitelighet", tekst: "Hvor sikker vi er på datagrunnlaget. Basert på antall minutter spilt og kamphistorikk. Høyere % = mer data." },
  { term: "Nåværende nivå", tekst: "Spillerens faktiske prestasjonsnivå i dag, målt på tvers av 30+ statistikker justert per 90 minutter." },
  { term: "Beste rolle", tekst: "Rollen der spilleren scorer høyest basert på rollespesifikke vekter." },
  { term: "Verdinivå", tekst: "Samlet kategorisering: Elite → Over snitt → Rundt snitt → Under snitt. Basert på sammenligning med ligasnittet." },
]

function HjelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl border border-white/10 max-w-xl w-full p-6 overflow-y-auto max-h-[80vh]"
        style={{ background: "rgba(10,10,18,0.99)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <HelpCircle size={15} style={{ color: C.indigo }} />
            <h2 className="text-sm font-black text-white" style={{ fontFamily: "'Syne',sans-serif" }}>Slik leser du scoutlisten</h2>
          </div>
          <button onClick={onClose}><X size={15} className="text-white/35 hover:text-white transition-colors" /></button>
        </div>
        <div className="space-y-3">
          {BEGREP.map(b => (
            <div key={b.term} className="p-3.5 rounded-xl border border-white/[0.06]"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: C.indigo }}>{b.term}</p>
              <p className="text-[11px] text-white/50 leading-relaxed">{b.tekst}</p>
            </div>
          ))}
          <div className="p-3.5 rounded-xl border" style={{ borderColor: "rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.05)" }}>
            <p className="text-[11px] font-bold mb-1" style={{ color: C.indigo }}>Vektingen bak scoutprioritet</p>
            <p className="text-[11px] text-white/45 leading-relaxed">
              35 % predikert nivå + 35 % nåværende nivå + 20 % datapålitelighet + 10 % aldersbonus. Alt normalisert til 0–1.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ value, max = 1, color }: { value: number; max?: number; color: string }) {
  const p = Math.min((value / max) * 100, 100)
  return (
    <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
      <div className="h-full rounded-full" style={{ width: `${p}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
    </div>
  )
}

function SegBadge({ seg }: { seg: string }) {
  const c = SEG[seg]; if (!c) return null
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap border"
      style={{ color: c.color, background: c.bg, borderColor: c.border }}>{c.shortLabel}</span>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const c = TIER_CFG[tier] || TIER_CFG["Rundt snitt"]
  const label = tier === "Under_Gjennomsnitt" ? "Under snitt" : tier
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap"
      style={{ color: c?.color, background: c?.bg, borderColor: c?.border }}>{label}</span>
  )
}

function GlowDot(props: any) {
  const { cx, cy, payload } = props
  const seg = SEG[payload?.risk_upside_segment]
  if (!seg || !cx || !cy) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={seg.color} fillOpacity={0.12} />
      <circle cx={cx} cy={cy} r={4} fill={seg.color} fillOpacity={0.85}
        style={{ filter: `drop-shadow(0 0 4px ${seg.color})` }} />
    </g>
  )
}

function FrontierTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const p: FrontierPlayer = payload[0].payload
  const seg = SEG[p.risk_upside_segment]
  const posColor = POS_COLOR[p.pos_group] ?? C.indigo
  const logo = getLogo(p.team_name)
  return (
    <div className="rounded-2xl border border-white/10 p-4 shadow-2xl" style={{ background: "rgba(8,8,14,0.98)", backdropFilter: "blur(16px)", minWidth: 220 }}>
      <div className="flex items-start gap-3 mb-3">
        {logo && <div className="w-7 h-7 relative flex-shrink-0"><Image src={logo} alt="" fill className="object-contain" /></div>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white leading-tight" style={{ fontFamily: "'Syne',sans-serif" }}>{p.player_name}</p>
          <p className="text-[10px] text-white/35 mt-0.5">{p.team_name} · {p.age} år</p>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${posColor}15`, color: posColor }}>{POS_NB[p.pos_group] ?? p.pos_group}</span>
      </div>
      <div className="space-y-2 mb-3">
        {[
          { l: "Datapålitelighet", v: pct(p.reliability),                             bar: p.reliability,                     color: C.amber   },
          { l: "Predikert nivå",   v: pct(Math.min(p.forecast_score / 2, 1)),         bar: Math.min(p.forecast_score / 2, 1), color: C.indigo  },
          { l: "Scoutprioritet",   v: pct(p.scout_priority),                          bar: p.scout_priority,                  color: C.emerald },
        ].map(row => (
          <div key={row.l}>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-white/35">{row.l}</span>
              <span className="text-[10px] font-bold text-white">{row.v}</span>
            </div>
            <ScoreBar value={row.bar} color={row.color} />
          </div>
        ))}
      </div>
      {seg && <SegBadge seg={p.risk_upside_segment} />}
    </div>
  )
}

export default function ScoutPage() {
  const [scoutData,    setScoutData]    = useState<ScoutPlayer[]>([])
  const [frontierData, setFrontierData] = useState<FrontierPlayer[]>([])
  const [metadata,     setMetadata]     = useState<{ rel_median: number; forecast_median: number } | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState<TabType>("liste")
  const [showHelp,     setShowHelp]     = useState(false)
  const [expandedRow,  setExpandedRow]  = useState<string | null>(null)

  const [filterPos,   setFPos]   = useState("")
  const [filterTier,  setFTier]  = useState("")
  const [filterSeg,   setFSeg]   = useState("")
  const [search,      setSearch] = useState("")
  const [sortBy,      setSortBy] = useState<"priority"|"forecast"|"reliability">("priority")
  const [sortDir,     setSortDir]= useState<"desc"|"asc">("desc")

  useEffect(() => {
    const base = "http://localhost:8000"
    const q = new URLSearchParams()
    if (filterPos)  q.set("pos", filterPos)
    if (filterTier) q.set("tier", filterTier)
    if (filterSeg)  q.set("segment", filterSeg)
    q.set("limit", "254")

    Promise.all([
      fetch(`${base}/api/scout?${q}`).then(r => r.json()),
      fetch(`${base}/api/risk-upside?${filterPos ? `pos=${filterPos}` : ""}${filterTier ? `&tier=${filterTier}` : ""}`).then(r => r.json()),
    ]).then(([scout, frontier]) => {
      setScoutData(Array.isArray(scout) ? scout : [])
      setFrontierData(frontier.players || [])
      setMetadata(frontier.metadata || null)
    }).catch(console.error).finally(() => setLoading(false))
  }, [filterPos, filterTier, filterSeg])

  const filtered = useMemo(() => {
    let arr = scoutData
    if (search) arr = arr.filter(p =>
      (p.player_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.team_name ?? "").toLowerCase().includes(search.toLowerCase())
    )
    return [...arr].sort((a, b) => {
      const key = sortBy === "priority" ? "scout_priority" : sortBy === "forecast" ? "forecast_score" : "reliability"
      return sortDir === "desc" ? b[key] - a[key] : a[key] - b[key]
    })
  }, [scoutData, search, sortBy, sortDir])

  const segCount = useMemo(() => {
    const c: Record<string, number> = {}
    frontierData.forEach(p => { c[p.risk_upside_segment] = (c[p.risk_upside_segment] || 0) + 1 })
    return c
  }, [frontierData])

  const frontierFiltered = useMemo(() =>
    filterSeg ? frontierData.filter(p => p.risk_upside_segment === filterSeg) : frontierData,
    [frontierData, filterSeg]
  )

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) setSortDir(d => d === "desc" ? "asc" : "desc")
    else { setSortBy(key); setSortDir("desc") }
  }
  const clearFilters = () => { setFPos(""); setFTier(""); setFSeg(""); setSearch("") }
  const hasFilters = filterPos || filterTier || filterSeg || search

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: C.bg }}>
      <p className="text-sm text-white/25">Laster scoutdata…</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: "'DM Sans',sans-serif" }}>
      {showHelp && <HjelpModal onClose={() => setShowHelp(false)} />}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full opacity-[0.02]"
          style={{ background: C.indigo, filter: "blur(80px)" }} />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        {/* TABS + Slik fungerer det */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 rounded-xl border w-fit"
            style={{ borderColor: C.border, background: "rgba(255,255,255,0.02)" }}>
            {([
              { id: "liste",    label: "Prioritetsliste", icon: Users      },
              { id: "frontier", label: "Potensialkart",   icon: TrendingUp },
            ] as { id: TabType; label: string; icon: React.ElementType }[]).map(t => {
              const Icon = t.icon; const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: active ? "rgba(255,255,255,0.07)" : "transparent",
                    border: active ? `1px solid ${C.border}` : "1px solid transparent",
                    color: active ? "#fff" : "rgba(255,255,255,0.30)",
                  }}>
                  <Icon size={13} />{t.label}
                </button>
              )
            })}
          </div>
          <button onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs text-white/40 hover:text-white transition-all"
            style={{ borderColor: C.border, background: "rgba(255,255,255,0.02)" }}>
            <HelpCircle size={11} />Slik fungerer det
          </button>
        </div>

        {/* FILTRE */}
        <div className="relative rounded-2xl border overflow-hidden"
          style={{ background: C.panel, borderColor: C.border }}>
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${C.indigo}50, transparent)` }} />
          <div className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Søk spiller eller lag…"
                className="pl-9 pr-3 py-2 rounded-xl text-xs text-white placeholder-white/25 focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${search ? C.indigo + "50" : "rgba(255,255,255,0.07)"}`, width: 200 }} />
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex gap-1">
              {["GK","DEF","MID","ATT"].map(p => {
                const pc = POS_COLOR[p]; const active = filterPos === p
                return (
                  <button key={p} onClick={() => setFPos(active ? "" : p)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                    style={{ background: active ? `${pc}15` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? pc + "40" : "rgba(255,255,255,0.06)"}`, color: active ? pc : "rgba(255,255,255,0.35)" }}>
                    {POS_NB[p]}
                  </button>
                )
              })}
            </div>
            <div className="h-4 w-px bg-white/10" />
            {[{ v: "senior", l: "Senior" }, { v: "u23_prospect", l: "U23" }].map(({ v, l }) => {
              const active = filterTier === v; const tc = v === "u23_prospect" ? C.violet : C.indigo
              return (
                <button key={v} onClick={() => setFTier(active ? "" : v)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: active ? `${tc}15` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? tc + "40" : "rgba(255,255,255,0.06)"}`, color: active ? tc : "rgba(255,255,255,0.35)" }}>
                  {l}
                </button>
              )
            })}
            <div className="h-4 w-px bg-white/10" />
            {Object.entries(SEG).map(([key, cfg]) => {
              const Icon = cfg.icon; const active = filterSeg === key
              return (
                <button key={key} onClick={() => setFSeg(active ? "" : key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: active ? cfg.bg : "rgba(255,255,255,0.03)", border: `1px solid ${active ? cfg.border : "rgba(255,255,255,0.06)"}`, color: active ? cfg.color : "rgba(255,255,255,0.35)" }}>
                  <Icon size={10} />
                  <span className="hidden lg:inline">{cfg.shortLabel}</span>
                  <span className="text-[9px] opacity-60">{segCount[key] || 0}</span>
                </button>
              )
            })}
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors ml-auto">
                Nullstill <X size={9} />
              </button>
            )}
          </div>
        </div>

        {/* PRIORITETSLISTE */}
        {tab === "liste" && (
          <div className="relative rounded-2xl border overflow-hidden"
            style={{ background: C.panel, borderColor: C.border }}>
            <div className="absolute inset-x-0 top-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${C.indigo}40, transparent)` }} />

            <div className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: C.border, background: "rgba(99,102,241,0.03)" }}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.indigo }} />
                <p className="text-[11px] text-white/40">
                  Rangert etter <span className="font-semibold" style={{ color: C.indigo }}>scoutprioritet</span> — nåværende form, fremtidspotensial og datakvalitet
                </p>
              </div>
              <button onClick={() => setShowHelp(true)} className="flex items-center gap-1 text-[10px] transition-colors" style={{ color: C.indigo + "80" }}>
                <Info size={9} />Les mer
              </button>
            </div>

            <div className="grid items-center gap-3 px-5 py-2.5 border-b"
              style={{ gridTemplateColumns: "44px 2.4fr 1fr 1fr 1fr 0.9fr 1.1fr 32px", borderColor: C.border }}>
              {[
                { k: null,          l: "#"                },
                { k: null,          l: "Spiller"          },
                { k: "priority",    l: "Scoutprioritet"   },
                { k: "forecast",    l: "Predikert nivå"   },
                { k: "reliability", l: "Datapålitelighet" },
                { k: null,          l: "Verdinivå"        },
                { k: null,          l: "Kategori"         },
                { k: null,          l: ""                 },
              ].map((col, ci) => (
                <div key={ci}>
                  {col.k ? (
                    <button onClick={() => toggleSort(col.k as any)}
                      className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold text-white/25 hover:text-white/55 transition-colors">
                      {col.l}
                      {sortBy === col.k ? sortDir === "desc" ? <ChevronDown size={9} /> : <ChevronUp size={9} /> : <ChevronDown size={9} className="opacity-20" />}
                    </button>
                  ) : (
                    <span className="text-[9px] uppercase tracking-widest font-bold text-white/20">{col.l}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.03)" }}>
              {filtered.map((p, i) => {
                const seg = SEG[p.risk_upside_segment]
                const posColor = POS_COLOR[p.pos_group] ?? C.indigo
                const logo = getLogo(p.team_name)
                const isExp = expandedRow === p.player_name
                const rank = i + 1
                const rankColor = rank === 1 ? C.amber : rank === 2 ? "#94a3b8" : rank === 3 ? "#cd7c40" : "rgba(255,255,255,0.18)"

                return (
                  <div key={p.player_name} className="border-b" style={{ borderColor: "rgba(255,255,255,0.025)" }}>
                    <div
                      className="grid items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors"
                      style={{ gridTemplateColumns: "44px 2.4fr 1fr 1fr 1fr 0.9fr 1.1fr 32px" }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.018)"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                      onClick={() => setExpandedRow(isExp ? null : p.player_name)}>

                      <div className="text-sm font-black text-center tabular-nums" style={{ color: rankColor }}>{rank}</div>

                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 relative flex-shrink-0">
                          {logo
                            ? <Image src={logo} alt="" fill className="object-contain" />
                            : <div className="w-full h-full rounded-xl flex items-center justify-center text-[10px] font-black text-white"
                                style={{ background: `${posColor}15`, border: `1px solid ${posColor}25` }}>
                                {p.player_name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                              </div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white truncate leading-tight" style={{ fontFamily: "'Syne',sans-serif" }}>{p.player_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-white/30 truncate max-w-[100px]">{p.team_name}</span>
                            <span className="text-[9px] font-semibold px-1.5 py-px rounded-full" style={{ background: `${posColor}12`, color: posColor }}>{POS_NB[p.pos_group]}</span>
                            <span className="text-[10px] text-white/22">{p.age} år</span>
                            {p.player_tier === "u23_prospect" && (
                              <span className="text-[8px] font-bold px-1.5 py-px rounded-full" style={{ background: `${C.violet}15`, color: C.violet, border: `1px solid ${C.violet}25` }}>U23</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-baseline gap-1 mb-1.5">
                          <span className="text-base font-black" style={{ color: C.indigo }}>
                            {p.scout_priority != null ? `${Math.round(p.scout_priority * 100)}%` : "—"}
                          </span>
                        </div>
                        <ScoreBar value={p.scout_priority ?? 0} max={1} color={C.indigo} />
                      </div>

                      <div>
                        <div className="flex items-baseline gap-1 mb-1.5">
                          <span className="text-sm font-bold text-white/75">
                            {p.forecast_score != null ? `${Math.round(Math.min(p.forecast_score / 2, 1) * 100)}%` : "—"}
                          </span>
                        </div>
                        <ScoreBar value={p.forecast_score ?? 0} max={2} color={C.violet} />
                      </div>

                      <div>
                        <div className="flex items-baseline gap-1 mb-1.5">
                          <span className="text-sm font-bold text-white/75">{pct(p.reliability ?? 0)}</span>
                        </div>
                        <ScoreBar value={p.reliability ?? 0} max={1} color={C.amber} />
                      </div>

                      <div><TierBadge tier={p.value_tier} /></div>
                      <div><SegBadge seg={p.risk_upside_segment} /></div>

                      <Link href={`/player/${encodeURIComponent(p.player_name)}`}
                        onClick={e => e.stopPropagation()}
                        className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
                        style={{ borderColor: C.border }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLAnchorElement).style.borderColor = C.indigo + "50"
                          ;(e.currentTarget as HTMLAnchorElement).style.background = C.indigo + "10"
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLAnchorElement).style.borderColor = C.border
                          ;(e.currentTarget as HTMLAnchorElement).style.background = "transparent"
                        }}>
                        <ArrowUpRight size={12} className="text-white/25" />
                      </Link>
                    </div>

                    {/* ── EXPANDED ROW — samme format som kolonnene over ── */}
                    {isExp && (
                      <div className="px-5 py-4 border-t" style={{ background: "rgba(99,102,241,0.025)", borderColor: C.border }}>
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          {[
                            { l: "Scoutprioritet",   v: p.scout_priority != null ? `${Math.round(p.scout_priority * 100)}%` : "—",                        c: C.indigo,  fork: "Samlet rangering: nåværende form, potensial og datakvalitet." },
                            { l: "Predikert nivå",   v: p.forecast_score != null ? `${Math.round(Math.min(p.forecast_score / 2, 1) * 100)}%` : "—",       c: C.violet,  fork: "Modellens vurdering av fremtidig prestasjonsnivå basert på trendutvikling." },
                            { l: "Datapålitelighet", v: p.reliability != null ? `${Math.round(p.reliability * 100)}%` : "—",                               c: C.amber,   fork: "Basert på antall minutter spilt." },
                            { l: "Minutter totalt",  v: `${p.minutes?.toLocaleString("nb-NO")} min`,                                                       c: C.emerald, fork: "Totalt antall minutter spilt i dataperioden." },
                          ].map(s => (
                            <div key={s.l} className="p-3 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: C.border }}>
                              <p className="text-[10px] text-white/30 mb-1">{s.l}</p>
                              <p className="text-lg font-black" style={{ color: s.c }}>{s.v}</p>
                              <p className="text-[9px] text-white/20 mt-1 leading-relaxed">{s.fork}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {p.best_role_no && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: C.border }}>
                              <span className="text-[10px] text-white/30">Beste rolle</span>
                              <span className="text-xs font-bold text-white">{p.best_role_no}</span>
                            </div>
                          )}
                          {p.cluster_label && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: C.border }}>
                              <span className="text-[10px] text-white/30">Spillertype</span>
                              <span className="text-xs font-bold text-white">{p.cluster_label}</span>
                            </div>
                          )}
                          {seg && (
                            <div className="flex-1 px-3 py-2 rounded-xl border text-[10px] leading-relaxed"
                              style={{ borderColor: seg.border, background: seg.bg, color: seg.color + "cc" }}>
                              <span className="font-bold">{seg.shortLabel}: </span>{seg.forklaring}
                            </div>
                          )}
                          <Link href={`/player/${encodeURIComponent(p.player_name)}`}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                            style={{ background: "rgba(99,102,241,0.10)", border: `1px solid rgba(99,102,241,0.25)`, color: "#818cf8" }}>
                            Full profil <ArrowUpRight size={11} />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Users size={24} className="text-white/10" />
                <p className="text-sm text-white/25">Ingen spillere matcher filteret</p>
              </div>
            )}
          </div>
        )}

        {/* POTENSIALKART */}
        {tab === "frontier" && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl border flex items-start gap-3"
              style={{ background: "rgba(99,102,241,0.04)", borderColor: "rgba(99,102,241,0.15)" }}>
              <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: C.indigo }} />
              <div>
                <p className="text-xs font-bold text-white mb-1">Slik leser du potenialkartet</p>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Hver prikk er én spiller. <span className="text-white/60">Høyre på X-aksen</span> = mye og pålitelig data.
                  <span className="text-white/60"> Opp på Y-aksen</span> = modellen spår høyt fremtidig nivå.
                  Øvre høyre = trygge toppsigneringer. Øvre venstre = lovende, men krev mer scouting.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(SEG).map(([key, cfg]) => {
                const count = segCount[key] || 0; const Icon = cfg.icon; const active = filterSeg === key
                return (
                  <button key={key} onClick={() => setFSeg(active ? "" : key)}
                    className="relative rounded-2xl p-4 text-left border transition-all overflow-hidden group"
                    style={{ background: active ? cfg.bg : "rgba(255,255,255,0.02)", borderColor: active ? cfg.border : C.border, boxShadow: active ? `0 0 20px ${cfg.glow}` : "none" }}>
                    {active && <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />}
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <Icon size={14} style={{ color: cfg.color }} />
                      </div>
                      <span className="text-2xl font-black" style={{ color: cfg.color }}>{count}</span>
                    </div>
                    <p className="text-sm font-black text-white mb-1" style={{ fontFamily: "'Syne',sans-serif" }}>{cfg.label}</p>
                    <p className="text-[10px] leading-relaxed text-white/35">{cfg.forklaring.slice(0, 65)}…</p>
                  </button>
                )
              })}
            </div>

            <div className="relative rounded-2xl border overflow-hidden" style={{ background: C.panel, borderColor: C.border }}>
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.indigo}40, transparent)` }} />
              <div className="px-6 py-4 border-b flex items-start justify-between" style={{ borderColor: C.border }}>
                <div>
                  <h2 className="text-sm font-black text-white mb-1" style={{ fontFamily: "'Syne',sans-serif" }}>Potensialkart</h2>
                  <p className="text-[11px] text-white/30">X: <span className="text-white/50">Datapålitelighet</span> · Y: <span className="text-white/50">Predikert fremtidig nivå</span></p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(SEG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }} />
                      <span className="text-[9px] text-white/30">{cfg.shortLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-4 pt-4" style={{ height: 520 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 24, right: 90, bottom: 55, left: 55 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="reliability" type="number" domain={[0, 1]} tickCount={6}
                      tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                      label={{ value: "Datapålitelighet →", position: "insideBottom", offset: -20, fill: "rgba(255,255,255,0.2)", fontSize: 10 }} />
                    <YAxis dataKey="forecast_score" type="number"
                      tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                      label={{ value: "Predikert nivå →", angle: -90, position: "insideLeft", offset: 10, fill: "rgba(255,255,255,0.2)", fontSize: 10 }} />
                    <Tooltip content={<FrontierTooltip />} cursor={false} />
                    {metadata && (
                      <>
                        <ReferenceLine x={metadata.rel_median} stroke="rgba(255,255,255,0.06)" strokeDasharray="5 5"
                          label={{ value: "↑ Snitt pålitelighet", position: "insideTopRight", fill: "rgba(255,255,255,0.22)", fontSize: 9 }} />
                        <ReferenceLine y={metadata.forecast_median} stroke="rgba(255,255,255,0.06)" strokeDasharray="5 5"
                          label={{ value: "Snitt predikert →", position: "insideTopRight", fill: "rgba(255,255,255,0.22)", fontSize: 9 }} />
                      </>
                    )}
                    {Object.entries(SEG).map(([key, cfg]) => {
                      const data = frontierFiltered.filter(p => p.risk_upside_segment === key)
                      if (!data.length) return null
                      return (
                        <Scatter key={key} data={data} shape={<GlowDot />} isAnimationActive={false}>
                          {data.map((_, di) => <Cell key={di} fill={cfg.color} />)}
                        </Scatter>
                      )
                    })}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 border-t" style={{ borderColor: C.border }}>
                {Object.entries(SEG).map(([key, cfg]) => {
                  const players = frontierFiltered.filter(p => p.risk_upside_segment === key)
                  const top4 = [...players].sort((a, b) => b.scout_priority - a.scout_priority).slice(0, 4)
                  const Icon = cfg.icon
                  return (
                    <div key={key} className="rounded-xl p-3.5 border" style={{ background: cfg.bg, borderColor: cfg.border }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
                          <Icon size={12} style={{ color: cfg.color }} />
                        </div>
                        <span className="text-xs font-black" style={{ color: cfg.color, fontFamily: "'Syne',sans-serif" }}>{cfg.label}</span>
                        <span className="text-[9px] ml-auto" style={{ color: cfg.color + "70" }}>{players.length} spillere</span>
                      </div>
                      <div className="space-y-1.5">
                        {top4.length === 0 && <p className="text-[10px] text-white/20">Ingen med valgt filter</p>}
                        {top4.map(p => {
                          const logo = getLogo(p.team_name)
                          return (
                            <Link key={p.player_name} href={`/player/${encodeURIComponent(p.player_name)}`}
                              className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-black/20 transition-colors group/r">
                              <div className="flex items-center gap-2 min-w-0">
                                {logo
                                  ? <div className="w-5 h-5 relative flex-shrink-0"><Image src={logo} alt="" fill className="object-contain" /></div>
                                  : <div className="w-5 h-5 rounded-md flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
                                }
                                <span className="text-xs font-semibold text-white truncate">{p.player_name}</span>
                              </div>
                              <span className="text-[9px] flex-shrink-0" style={{ color: cfg.color + "70" }}>{p.team_name}</span>
                            </Link>
                          )
                        })}
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