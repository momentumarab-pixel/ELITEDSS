"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { GitCompare, Search, X, Info } from "lucide-react"
import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar as RechartsRadar, ResponsiveContainer, Tooltip as RechTooltip,
} from "recharts"

// ── Farger: kun 3 nivå-farger + to spillerfarger ──────────────────
const CA = { c: "#34d399", soft: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.18)" }
const CB = { c: "#818cf8", soft: "rgba(129,140,248,0.06)", border: "rgba(129,140,248,0.18)" }

function tierColor(t: string) {
  if (t === "Elite")       return "#34d399"
  if (t === "Over snitt")  return "#818cf8"
  if (t === "Rundt snitt") return "#fbbf24"
  return "#f87171"
}
function tierLabel(p: number) {
  if (p >= 85) return "Elite"
  if (p >= 67) return "God"
  if (p >= 34) return "Middels"
  return "Svak"
}
function tierCol(p: number) {
  if (p >= 85) return "#34d399"
  if (p >= 67) return "#818cf8"
  if (p >= 34) return "#fbbf24"
  return "#f87171"
}
function zToP(z: number) {
  return Math.round(Math.max(5, Math.min(95, 50 + (z / 3) * 45)))
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
  ["strømsgodset","/images/Logo/stromsgodset.png"],["godset","/images/Logo/stromsgodset.png"],
  ["stromsgodset","/images/Logo/stromsgodset.png"],
  ["tromsø","/images/Logo/tromso.png"],["tromso","/images/Logo/tromso.png"],
  ["vålerenga","/images/Logo/valerenga.png"],["valerenga","/images/Logo/valerenga.png"],
  ["viking","/images/Logo/Viking.png"],
]
const getLogo = (t: string) => LOGO_MAP.find(([k]) => t?.toLowerCase().includes(k))?.[1] ?? null

const POS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  GK:  { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  label: "Keeper"    },
  DEF: { color: "#60a5fa", bg: "rgba(96,165,250,0.10)",  label: "Forsvarer" },
  MID: { color: "#a78bfa", bg: "rgba(167,139,250,0.10)", label: "Midtbane"  },
  ATT: { color: "#f87171", bg: "rgba(248,113,113,0.10)", label: "Angriper"  },
}

// Radar-akser med forklaring
const RADAR_AKSER = [
  { key: "goals",   label: "Mål",         col: "pct_goals_per90_radar",
    info: "Mål per 90 min — sammenlignet mot alle 254 spillere i ligaen" },
  { key: "assists", label: "Assist",       col: "pct_assists_per90_radar",
    info: "Assist per 90 min — mot alle 254 spillere" },
  { key: "shots",   label: "Skudd",        col: "pct_shots_total_per90_radar",
    info: "Skudd per 90 min — mot alle 254 spillere" },
  { key: "keypas",  label: "Nøkkelpass",   col: "pct_passes_key_per90_radar",
    info: "Nøkkelpasninger per 90 min — mot alle 254 spillere" },
  { key: "duels",   label: "Dueller",      col: "pct_duels_won_per90_radar",
    info: "Vunnede dueller per 90 min — mot spillere i samme posisjon" },
  { key: "tackle",  label: "Taklinger",    col: "pct_tackles_total_per90_radar",
    info: "Taklinger per 90 min — mot spillere i samme posisjon" },
  { key: "inter",   label: "Avskjæringer", col: "pct_interceptions_per90_radar",
    info: "Avskjæringer per 90 min — mot spillere i samme posisjon" },
  { key: "intense", label: "Intensitet",   col: "pct_intensity_per90_radar",
    info: "Dueller + avskjæringer kombinert — mot spillere i samme posisjon" },
  { key: "dueff",   label: "Duelleff.",    col: "pct_duel_efficiency_radar",
    info: "Andel vunnede dueller — mot spillere i samme posisjon" },
  { key: "paseff",  label: "Pass%",        col: "pct_pass_efficiency_radar",
    info: "Pasningspresisjon — mot spillere i samme posisjon" },
]

interface Player {
  player_name: string; age: number; nationality: string; team_name: string
  pos_group: string; player_tier: string; minutes: number; games: number
  goals: number; assists: number
  goals_per90: number; assists_per90: number
  fair_score: number; forecast_score: number; scout_priority: number
  reliability: number; best_role_no: string; cluster_label: string
  risk_upside_segment: string; value_tier: string
  percentile_pos: number; percentile_all: number
  [key: string]: any
}
interface SearchResult { player_name: string; team_name: string; pos_group: string; age: number }

// ── Tooltip ───────────────────────────────────────────────────────
function Tip({ text }: { text: string }) {
  const [v, setV] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1">
      <button onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)}
        className="cursor-help" style={{ color: "rgba(255,255,255,0.22)" }}>
        <Info size={10} />
      </button>
      {v && (
        <span className="absolute z-50 bottom-5 left-0 w-52 rounded-xl px-3 py-2.5 text-[10px] leading-relaxed pointer-events-none"
          style={{ background: "rgba(6,6,14,0.98)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.50)" }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ── Søk ──────────────────────────────────────────────────────────
function SpillerSok({ farge, onVelg, valgt, nr }: {
  farge: typeof CA; onVelg: (n: string) => void; valgt: Player | null; nr: 1 | 2
}) {
  const [q, setQ] = useState("")
  const [res, setRes] = useState<SearchResult[]>([])
  useEffect(() => {
    if (q.length < 2) { setRes([]); return }
    const t = setTimeout(async () => {
      try {
        const d = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(q)}&limit=8`).then(r => r.json())
        setRes(Array.isArray(d) ? d : [])
      } catch {}
    }, 120)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="relative">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all"
        style={{
          background: valgt ? farge.soft : "rgba(255,255,255,0.02)",
          borderColor: valgt ? farge.border : "rgba(255,255,255,0.06)",
          boxShadow: valgt ? `0 0 0 1px ${farge.border}` : "none",
        }}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
          style={{ background: farge.c, color: "#000" }}>{nr}</div>
        <input
          value={valgt ? valgt.player_name : q}
          onChange={e => { setQ(e.target.value); if (valgt) onVelg("") }}
          placeholder={`Søk spiller ${nr}…`}
          style={{ background: "transparent", color: "#fff", caretColor: farge.c }}
          className="flex-1 text-sm font-medium placeholder-white/20 focus:outline-none"
        />
        {(valgt || q) && (
          <button onClick={() => { onVelg(""); setQ(""); setRes([]) }}>
            <X size={12} className="text-white/25 hover:text-white/50 transition-colors" />
          </button>
        )}
      </div>
      {res.length > 0 && !valgt && (
        <div className="absolute z-30 w-full mt-1 rounded-xl border overflow-hidden shadow-2xl"
          style={{ background: "rgba(6,6,14,0.99)", borderColor: "rgba(255,255,255,0.07)" }}>
          {res.map(p => {
            const pc = POS_CFG[p.pos_group] || { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: p.pos_group }
            const logo = getLogo(p.team_name)
            return (
              <button key={p.player_name}
                onClick={() => { onVelg(p.player_name); setQ(""); setRes([]) }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] last:border-0 text-left">
                {logo
                  ? <div className="w-5 h-5 relative flex-shrink-0"><Image src={logo} alt="" fill className="object-contain" /></div>
                  : <div className="w-5 h-5 rounded flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{p.player_name}</p>
                  <p className="text-[10px] text-white/30 truncate">{p.team_name} · {p.age} år</p>
                </div>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: pc.bg, color: pc.color }}>{pc.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Spillerkort ───────────────────────────────────────────────────
function SpillerKort({ p, farge }: { p: Player | null; farge: typeof CA }) {
  if (!p) return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed min-h-[160px] gap-2"
      style={{ borderColor: `${farge.c}12` }}>
      <Search size={14} style={{ color: `${farge.c}20` }} />
      <p className="text-[10px]" style={{ color: `${farge.c}25` }}>Ingen spiller valgt</p>
    </div>
  )

  const logo = getLogo(p.team_name)
  const pc   = POS_CFG[p.pos_group] || { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: p.pos_group }
  const tc   = tierColor(p.value_tier ?? "")
  const pct  = Math.round((p.percentile_pos ?? 0) * 100)

  return (
    <div className="rounded-xl border p-4 relative overflow-hidden"
      style={{ borderColor: farge.border, background: `${farge.c}04` }}>
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${farge.c}70, transparent)` }} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {logo
          ? <div className="w-9 h-9 relative flex-shrink-0"><Image src={logo} alt="" fill className="object-contain" /></div>
          : <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
              style={{ background: farge.soft, color: farge.c }}>{p.player_name.charAt(0)}</div>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white truncate" style={{ fontFamily: "'Syne',sans-serif" }}>
            {p.player_name}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {p.team_name} · {p.age} år
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: pc.bg, color: pc.color }}>{pc.label}</span>
        {p.player_tier === "u23_prospect" && (
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: farge.soft, color: farge.c, border: `1px solid ${farge.border}` }}>U23</span>
        )}
        {p.best_role_no && (
          <span className="text-[9px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>{p.best_role_no}</span>
        )}
      </div>

      {/* Stats-grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { l: "Nivå",        v: p.value_tier ?? "—",   vc: tc },
          { l: "Pålitelighet",v: p.reliability != null ? `${(p.reliability*100).toFixed(0)}%` : "—", vc: null },
          { l: "Mål",         v: p.goals != null ? String(p.goals) : "—",     vc: null },
          { l: "Assist",      v: p.assists != null ? String(p.assists) : "—", vc: null },
          { l: "Mål/90",      v: p.goals_per90 != null ? p.goals_per90.toFixed(2) : "—", vc: null },
          { l: "Assist/90",   v: p.assists_per90 != null ? p.assists_per90.toFixed(2) : "—", vc: null },
          { l: "Minutter",    v: p.minutes != null ? p.minutes.toLocaleString("nb") : "—", vc: null },
          { l: "Percentil",   v: `${pct}%`, vc: tierColor(p.value_tier ?? "") },
        ].map(({ l, v, vc }) => (
          <div key={l} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="text-[9px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.30)" }}>{l}</span>
            <span className="text-[10px] font-bold" style={{ color: vc ?? "rgba(255,255,255,0.70)" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Statistikk-rad ────────────────────────────────────────────────
function StatRad({ label, pctA, pctB, cA, cB, info }: {
  label: string; pctA: number; pctB: number; cA: string; cB: string; info: string
}) {
  const colA   = tierCol(pctA)
  const colB   = tierCol(pctB)
  const winner = pctA > pctB ? "A" : pctB > pctA ? "B" : null

  return (
    <div className="grid grid-cols-[1fr_100px_1fr] items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
      {/* A-side */}
      <div className="flex items-center gap-2 justify-end">
  
        <span className="text-[12px] font-bold tabular-nums" style={{ color: colA }}>{pctA}%</span>
        <div className="w-20 h-1 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="absolute inset-y-0 w-px" style={{ left: "50%", background: "rgba(255,255,255,0.15)" }} />
          <div className="absolute inset-y-0 right-0 rounded-full"
            style={{ width: `${pctA}%`, background: colA, opacity: 0.85 }} />
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center justify-center gap-0.5">
        <span className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.30)" }}>{label}</span>
        <Tip text={info} />
      </div>

      {/* B-side */}
      <div className="flex items-center gap-2">
        <div className="w-20 h-1 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="absolute inset-y-0 w-px" style={{ left: "50%", background: "rgba(255,255,255,0.15)" }} />
          <div className="h-full rounded-full" style={{ width: `${pctB}%`, background: colB, opacity: 0.85 }} />
        </div>
        <span className="text-[12px] font-bold tabular-nums" style={{ color: colB }}>{pctB}%</span>

      </div>
    </div>
  )
}

// ── Hoved ────────────────────────────────────────────────────────
export default function DuellPage() {
  const [spillerA, setSpillerA] = useState<Player | null>(null)
  const [spillerB, setSpillerB] = useState<Player | null>(null)

  const lastDuell = async (navnA: string, navnB: string) => {
    try {
      const d = await fetch(
        `http://localhost:8000/api/duell?player_a=${encodeURIComponent(navnA)}&player_b=${encodeURIComponent(navnB)}`
      ).then(r => r.json())
      setSpillerA(d.player_a); setSpillerB(d.player_b)
    } catch {}
  }
  const lastEnkelt = async (navn: string, setter: (p: Player | null) => void) => {
    if (!navn) { setter(null); return }
    try {
      const d = await fetch(
        `http://localhost:8000/api/duell?player_a=${encodeURIComponent(navn)}&player_b=${encodeURIComponent(navn)}`
      ).then(r => r.json())
      setter(d.player_a)
    } catch {}
  }
  const velgA = (n: string) => {
    if (!n) { setSpillerA(null); return }
    spillerB ? lastDuell(n, spillerB.player_name) : lastEnkelt(n, setSpillerA)
  }
  const velgB = (n: string) => {
    if (!n) { setSpillerB(null); return }
    spillerA ? lastDuell(spillerA.player_name, n) : lastEnkelt(n, setSpillerB)
  }

  const begge = !!(spillerA && spillerB)
  const radarData = RADAR_AKSER.map(ax => ({
    label: ax.label,
    A: begge ? Math.round((spillerA as any)[ax.col] ?? 50) : 0,
    B: begge ? Math.round((spillerB as any)[ax.col] ?? 50) : 0,
  }))

  return (
    <div className="min-h-screen" style={{ background: "#07080c" }} style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Innhold */}
      <div className="max-w-[1400px] mx-auto px-8 py-6">
        <div className="grid grid-cols-12 gap-6">

          {/* Venstre — søk + kort */}
          <div className="col-span-4 space-y-3">
            <SpillerSok farge={CA} onVelg={velgA} valgt={spillerA} nr={1} />
            <SpillerKort p={spillerA} farge={CA} />
            <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
            <SpillerSok farge={CB} onVelg={velgB} valgt={spillerB} nr={2} />
            <SpillerKort p={spillerB} farge={CB} />
          </div>

          {/* Høyre — analyse */}
          <div className="col-span-8 space-y-5">
            {!begge ? (
              <div className="rounded-xl border border-dashed flex flex-col items-center justify-center min-h-[520px] gap-3"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <GitCompare size={20} style={{ color: "rgba(255,255,255,0.08)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.20)" }}>
                  Søk opp to spillere for å sammenligne
                </p>
              </div>
            ) : (
              <>
                {/* Radarkart */}
                <div className="rounded-xl border relative overflow-hidden"
                  style={{ background: "rgba(14, 16, 24, 0.90)", borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${CA.c}50, transparent, ${CB.c}50, transparent)` }} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
                          Radarkart
                        </p>
                        <Tip text="Percentil 1–99. Offensiv (mål, assist, skudd, nøkkelpass) sammenlignes mot alle 254 spillere. Defensiv og effektivitet sammenlignes mot spillere i samme posisjon." />
                      </div>
                      <div className="flex items-center gap-5">
                        {[{ p: spillerA, f: CA }, { p: spillerB, f: CB }].map(({ p, f }) => (
                          <div key={p.player_name} className="flex items-center gap-2">
                            <div className="h-[2px] w-4 rounded-full" style={{ background: f.c, boxShadow: `0 0 6px ${f.c}` }} />
                            <span className="text-xs font-bold" style={{ color: f.c }}>
                              {p.player_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} margin={{ top: 8, right: 50, bottom: 8, left: 50 }}>
                          <PolarGrid stroke="rgba(255,255,255,0.05)" />
                          <PolarAngleAxis dataKey="label"
                            tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10, fontFamily: "'DM Sans',sans-serif" }} />
                          <RechartsRadar dataKey="A" stroke={CA.c} fill={CA.c} fillOpacity={0.12} strokeWidth={2}
                            style={{ filter: `drop-shadow(0 0 8px ${CA.c}80)` }} />
                          <RechartsRadar dataKey="B" stroke={CB.c} fill={CB.c} fillOpacity={0.10} strokeWidth={2}
                            style={{ filter: `drop-shadow(0 0 8px ${CB.c}80)` }} />
                          <RechTooltip
                            contentStyle={{ background: "rgba(4,4,10,0.98)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, fontSize: 11, padding: "8px 12px" }}
                            labelStyle={{ color: "rgba(255,255,255,0.40)", marginBottom: 4 }}
                            formatter={(v: number, name: string) => [
                              `${v}%`,
                              name === "A" ? spillerA.player_name.split(" ").pop() : spillerB.player_name.split(" ").pop()
                            ]} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Statistikk-sammenligning */}
                <div className="rounded-xl border relative overflow-hidden"
                  style={{ background: "rgba(14, 16, 24, 0.90)", borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${CA.c}40, transparent, ${CB.c}40, transparent)` }} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
                          Statistikk per 90 min
                        </p>
                        <Tip text="Percentil viser rangeringen i ligaen. Streken midt på baren er ligasnittet (50%). Prikken markerer vinneren." />
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Nivå-forklaring */}
                        {[
                          { c: "#34d399", l: "Elite",   r: "85–99%" },
                          { c: "#818cf8", l: "God",     r: "67–84%" },
                          { c: "#fbbf24", l: "Middels", r: "34–66%" },
                          { c: "#f87171", l: "Svak",    r: "1–33%"  },
                        ].map(({ c, l, r }) => (
                          <div key={l} className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                            <span className="text-[9px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{l}</span>
                            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.15)" }}>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Spillernavn-header — stor og tydelig */}
                    <div className="grid grid-cols-[1fr_100px_1fr] mb-4 pb-4 border-b border-white/[0.06]">
                      <div className="text-right pr-3">
                        <p className="text-base font-black text-white leading-tight"
                          style={{ fontFamily: "'Syne',sans-serif", textShadow: `0 0 20px ${CA.c}60` }}>
                          {spillerA.player_name}
                        </p>
                        <p className="text-[10px] mt-0.5 text-white/50">
                          {spillerA.team_name} · {spillerA.age} år
                        </p>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-[10px] font-black text-white/15 tracking-widest">VS</span>
                      </div>
                      <div className="pl-3">
                        <p className="text-base font-black text-white leading-tight"
                          style={{ fontFamily: "'Syne',sans-serif", textShadow: `0 0 20px ${CB.c}60` }}>
                          {spillerB.player_name}
                        </p>
                        <p className="text-[10px] mt-0.5 text-white/50">
                          {spillerB.team_name} · {spillerB.age} år
                        </p>
                      </div>
                    </div>

                    {RADAR_AKSER.map(ax => (
                      <StatRad key={ax.key}
                        label={ax.label}
                        info={ax.info}
                        pctA={Math.round((spillerA as any)[ax.col] ?? 50)}
                        pctB={Math.round((spillerB as any)[ax.col] ?? 50)}
                        cA={CA.c} cB={CB.c}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}