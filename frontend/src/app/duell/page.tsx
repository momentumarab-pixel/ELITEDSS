"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Search, X, Activity, ArrowLeft,
  TrendingUp, TrendingDown, Minus,
  Swords, Trophy, Shield, Target,
  ChevronRight
} from "lucide-react"
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend
} from "recharts"

interface Player { player_name: string; team_name: string }

interface PlayerData {
  name: string
  team: string
  team_logo: string | null
  age: number
  pos_group: string
  minutes: number
  fair_score: number
  forecast_score: number | null
  goals_per90: number
  assists_per90: number
  passes_key_per90: number
  tackles_total_per90: number
  dribbles_success_per90: number
  interceptions_per90?: number
  passes_accuracy?: number
  shot_efficiency?: number
  intensity_per90?: number
  z_goals_per90_pos?: number | null
  z_assists_per90_pos?: number | null
  z_passes_key_per90_pos?: number | null
  z_passes_accuracy_pos?: number | null
  z_duels_total_per90_pos?: number | null
  z_intensity_per90_pos?: number | null
  z_tackles_total_per90_pos?: number | null
  z_interceptions_per90_pos?: number | null
  z_dribbles_success_per90_pos?: number | null
  physical: {
    top_speed: number
    distance_per90: number
    sprints_per90: number
    high_intensity_per90: number
  }
}

interface DuellData {
  player_a: PlayerData
  player_b: PlayerData
}

function zToPercent(z: number | null | undefined): number {
  if (z === null || z === undefined) return 50
  return Math.min(Math.max(Math.round((z + 2.5) * 20), 5), 99)
}

function getReliability(minutes: number) {
  if (minutes >= 900) return { dot: "#22c55e", label: "Pålitelig" }
  if (minutes >= 450) return { dot: "#fbbf24", label: "Usikker" }
  return { dot: "#ef4444", label: "Lite data" }
}

const posLabel: Record<string, string> = {
  DEF: "Forsvarer", MID: "Midtbane", ATT: "Angriper", GK: "Keeper"
}

export default function DuellPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [duellData, setDuellData] = useState<DuellData | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchA, setSearchA] = useState("")
  const [searchB, setSearchB] = useState("")
  const [showDropA, setShowDropA] = useState(false)
  const [showDropB, setShowDropB] = useState(false)
  const [selectedA, setSelectedA] = useState(searchParams.get("a") || "")
  const [selectedB, setSelectedB] = useState(searchParams.get("b") || "")

  useEffect(() => {
    fetch("http://localhost:8000/api/players")
      .then(r => r.json())
      .then(data => setAllPlayers(data.map((p: any) => ({ player_name: p.player_name, team_name: p.team_name }))))
  }, [])

  useEffect(() => {
    if (!selectedA || !selectedB) { setDuellData(null); return }
    setLoading(true)
    fetch(`http://localhost:8000/api/duell?player_a=${encodeURIComponent(selectedA)}&player_b=${encodeURIComponent(selectedB)}`)
      .then(r => r.json())
      .then(data => { setDuellData(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedA, selectedB])

  const filtA = allPlayers.filter(p =>
    p.player_name.toLowerCase().includes(searchA.toLowerCase()) && p.player_name !== selectedB
  ).slice(0, 8)

  const filtB = allPlayers.filter(p =>
    p.player_name.toLowerCase().includes(searchB.toLowerCase()) && p.player_name !== selectedA
  ).slice(0, 8)

  const selectA = (name: string) => {
    setSelectedA(name); setSearchA(""); setShowDropA(false)
    const p = new URLSearchParams(searchParams.toString()); p.set("a", name)
    if (selectedB) p.set("b", selectedB)
    router.push(`/duell?${p.toString()}`)
  }

  const selectB = (name: string) => {
    setSelectedB(name); setSearchB(""); setShowDropB(false)
    const p = new URLSearchParams(searchParams.toString())
    if (selectedA) p.set("a", selectedA); p.set("b", name)
    router.push(`/duell?${p.toString()}`)
  }

  const clearA = () => { setSelectedA(""); setDuellData(null) }
  const clearB = () => { setSelectedB(""); setDuellData(null) }

  // Head-to-head score
  const h2h = duellData ? (() => {
    const a = (duellData.player_a.fair_score || 0) * 0.7 + (duellData.player_a.forecast_score || 0) * 0.3
    const b = (duellData.player_b.fair_score || 0) * 0.7 + (duellData.player_b.forecast_score || 0) * 0.3
    const total = a + b || 1
    return { a: Math.round((a / total) * 100), b: Math.round((b / total) * 100) }
  })() : null

  // Radar
  const radarData = duellData ? [
    { k: "Mål",        a: zToPercent(duellData.player_a.z_goals_per90_pos),        b: zToPercent(duellData.player_b.z_goals_per90_pos) },
    { k: "Assist",     a: zToPercent(duellData.player_a.z_assists_per90_pos),       b: zToPercent(duellData.player_b.z_assists_per90_pos) },
    { k: "Nøkkelpas.", a: zToPercent(duellData.player_a.z_passes_key_per90_pos),    b: zToPercent(duellData.player_b.z_passes_key_per90_pos) },
    { k: "Dueller",    a: zToPercent(duellData.player_a.z_duels_total_per90_pos),   b: zToPercent(duellData.player_b.z_duels_total_per90_pos) },
    { k: "Taklinger",  a: zToPercent(duellData.player_a.z_tackles_total_per90_pos), b: zToPercent(duellData.player_b.z_tackles_total_per90_pos) },
    { k: "Intensitet", a: zToPercent(duellData.player_a.z_intensity_per90_pos),     b: zToPercent(duellData.player_b.z_intensity_per90_pos) },
    { k: "Dribbling",  a: zToPercent(duellData.player_a.z_dribbles_success_per90_pos), b: zToPercent(duellData.player_b.z_dribbles_success_per90_pos) },
    { k: "Pasn.pres.", a: zToPercent(duellData.player_a.z_passes_accuracy_pos),     b: zToPercent(duellData.player_b.z_passes_accuracy_pos) },
  ] : []

  // Metrics for side-by-side
  const metrics = duellData ? [
    { label: "Prestasjon",       a: duellData.player_a.fair_score,          b: duellData.player_b.fair_score,          fmt: (v: number) => v?.toFixed(2) },
    { label: "Mål per 90",       a: duellData.player_a.goals_per90,         b: duellData.player_b.goals_per90,         fmt: (v: number) => v?.toFixed(2) },
    { label: "Assist per 90",    a: duellData.player_a.assists_per90,       b: duellData.player_b.assists_per90,       fmt: (v: number) => v?.toFixed(2) },
    { label: "Nøkkelpas./90",    a: duellData.player_a.passes_key_per90,    b: duellData.player_b.passes_key_per90,    fmt: (v: number) => v?.toFixed(2) },
    { label: "Taklinger/90",     a: duellData.player_a.tackles_total_per90, b: duellData.player_b.tackles_total_per90, fmt: (v: number) => v?.toFixed(2) },
    { label: "Dribbling/90",     a: duellData.player_a.dribbles_success_per90, b: duellData.player_b.dribbles_success_per90, fmt: (v: number) => v?.toFixed(2) },
    { label: "Topphastighet",    a: duellData.player_a.physical?.top_speed, b: duellData.player_b.physical?.top_speed, fmt: (v: number) => `${v} km/t` },
    { label: "Distanse/90",      a: duellData.player_a.physical?.distance_per90, b: duellData.player_b.physical?.distance_per90, fmt: (v: number) => `${v} km` },
  ] : []

  // Count wins
  const aWins = metrics.filter(m => (m.a || 0) > (m.b || 0)).length
  const bWins = metrics.filter(m => (m.b || 0) > (m.a || 0)).length

  // Scout conclusion
  const scoutConclusion = duellData ? (() => {
    const aOff = (duellData.player_a.goals_per90 || 0) + (duellData.player_a.assists_per90 || 0)
    const bOff = (duellData.player_b.goals_per90 || 0) + (duellData.player_b.assists_per90 || 0)
    const aDef = (duellData.player_a.tackles_total_per90 || 0)
    const bDef = (duellData.player_b.tackles_total_per90 || 0)
    const aName = duellData.player_a.name.split(" ")[0]
    const bName = duellData.player_b.name.split(" ")[0]
    const offWinner = aOff > bOff ? aName : bName
    const defWinner = aDef > bDef ? aName : bName
    const overall = (duellData.player_a.fair_score || 0) > (duellData.player_b.fair_score || 0) ? aName : bName
    return `${offWinner} er sterkere offensivt, mens ${defWinner} dominerer defensivt. Totalt sett skiller ${overall} seg ut med høyere prestasjonscore.`
  })() : ""

  return (
    <div className="min-h-screen bg-bg0" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HEADER ───────────────────────────────────── */}
      <div
        className="border-b border-white/5"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)" }}
      >
        <div className="max-w-7xl mx-auto px-8 py-10">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-textMuted hover:text-white transition-colors mb-6">
            <ArrowLeft size={14} /> Tilbake til dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Swords className="w-5 h-5 text-brand" />
            <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Duell</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
            Sammenlign spillere
          </h1>
          <p className="text-textMuted">Velg to spillere og se hvem som vinner på hver metrikk</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

        {/* ── PLAYER PICKERS ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Spiller A */}
          <div className="glass-panel p-5 border-t-2 border-blue-500/50">
            <div className="text-xs uppercase tracking-widest text-blue-400 font-medium mb-3">Spiller A</div>
            {selectedA ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{selectedA}</div>
                  <div className="text-xs text-textMuted mt-0.5">
                    {allPlayers.find(p => p.player_name === selectedA)?.team_name}
                  </div>
                </div>
                <button onClick={clearA} className="p-1.5 hover:bg-white/8 rounded-lg transition-colors">
                  <X size={16} className="text-textMuted" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 bg-bg0/60 border border-white/8 rounded-xl px-3 py-2.5">
                  <Search size={15} className="text-textMuted" />
                  <input
                    type="text"
                    placeholder="Søk etter spiller..."
                    value={searchA}
                    onChange={e => { setSearchA(e.target.value); setShowDropA(true) }}
                    onFocus={() => setShowDropA(true)}
                    className="w-full bg-transparent focus:outline-none text-sm text-white placeholder-textMuted"
                  />
                </div>
                {showDropA && searchA && filtA.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 glass-panel p-1.5 max-h-52 overflow-y-auto">
                    {filtA.map(p => (
                      <button
                        key={p.player_name}
                        onClick={() => selectA(p.player_name)}
                        className="w-full text-left px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <div className="text-sm font-medium text-white">{p.player_name}</div>
                        <div className="text-xs text-textMuted">{p.team_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Spiller B */}
          <div className="glass-panel p-5 border-t-2 border-red-500/50">
            <div className="text-xs uppercase tracking-widest text-red-400 font-medium mb-3">Spiller B</div>
            {selectedB ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{selectedB}</div>
                  <div className="text-xs text-textMuted mt-0.5">
                    {allPlayers.find(p => p.player_name === selectedB)?.team_name}
                  </div>
                </div>
                <button onClick={clearB} className="p-1.5 hover:bg-white/8 rounded-lg transition-colors">
                  <X size={16} className="text-textMuted" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 bg-bg0/60 border border-white/8 rounded-xl px-3 py-2.5">
                  <Search size={15} className="text-textMuted" />
                  <input
                    type="text"
                    placeholder="Søk etter spiller..."
                    value={searchB}
                    onChange={e => { setSearchB(e.target.value); setShowDropB(true) }}
                    onFocus={() => setShowDropB(true)}
                    className="w-full bg-transparent focus:outline-none text-sm text-white placeholder-textMuted"
                  />
                </div>
                {showDropB && searchB && filtB.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 glass-panel p-1.5 max-h-52 overflow-y-auto">
                    {filtB.map(p => (
                      <button
                        key={p.player_name}
                        onClick={() => selectB(p.player_name)}
                        className="w-full text-left px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <div className="text-sm font-medium text-white">{p.player_name}</div>
                        <div className="text-xs text-textMuted">{p.team_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── EMPTY STATE ──────────────────────────────── */}
        {!selectedA && !selectedB && (
          <div className="glass-panel p-16 text-center">
            <Swords className="w-12 h-12 text-textMuted/30 mx-auto mb-4" />
            <p className="text-textMuted text-lg mb-2">Velg to spillere for å sammenligne</p>
            <p className="text-textMuted text-sm">Søk i boksene over</p>
          </div>
        )}

        {/* ── LOADING ──────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="w-5 h-5 text-brand animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYSIS ─────────────────────────────────── */}
        {!loading && duellData && (

          <div className="space-y-6">

            {/* Head-to-Head bar */}
            <div className="glass-panel p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} className="text-brand" />
                <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Head-to-Head
                </h2>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-white font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>{duellData.player_a.name}</div>
                  <div className="text-xs text-textMuted">{duellData.player_a.team} · {posLabel[duellData.player_a.pos_group] || duellData.player_a.pos_group}</div>
                </div>
                <div className="text-center px-6">
                  <div className="text-xs text-textMuted uppercase tracking-widest">VS</div>
                  <div className="text-xs text-brand mt-1">{aWins}–{bWins} kategorier</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>{duellData.player_b.name}</div>
                  <div className="text-xs text-textMuted">{duellData.player_b.team} · {posLabel[duellData.player_b.pos_group] || duellData.player_b.pos_group}</div>
                </div>
              </div>

              {h2h && (
                <div className="flex h-10 rounded-xl overflow-hidden gap-0.5">
                  <div
                    className="flex items-center justify-center text-sm font-bold text-white transition-all duration-700"
                    style={{ width: `${h2h.a}%`, background: "linear-gradient(90deg, #3b82f6, #6366f1)" }}
                  >
                    {h2h.a}%
                  </div>
                  <div
                    className="flex items-center justify-center text-sm font-bold text-white transition-all duration-700"
                    style={{ width: `${h2h.b}%`, background: "linear-gradient(90deg, #f43f5e, #ef4444)" }}
                  >
                    {h2h.b}%
                  </div>
                </div>
              )}

              {/* Scout conclusion */}
              <div className="mt-4 p-3.5 rounded-xl bg-white/3 border border-white/5">
                <div className="text-xs text-textMuted uppercase tracking-wide mb-1.5 font-medium">Scout-konklusjon</div>
                <p className="text-sm text-white/80 leading-relaxed">{scoutConclusion}</p>
              </div>
            </div>

            {/* Radar + Metrics grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Radar */}
              <div className="glass-panel p-6">
                <h2 className="text-base font-semibold text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Rolleprofil
                </h2>
                <p className="text-xs text-textMuted mb-4">Percentil vs. samme posisjon</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="k" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 99]} tick={{ fill: "#94a3b8", fontSize: 9 }} tickCount={3} />
                      <Radar name={duellData.player_a.name} dataKey="a" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                      <Radar name={duellData.player_b.name} dataKey="b" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0a0e17", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }}
                        formatter={(v: any) => [`${v}. pctl`]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px" }}
                        formatter={(v) => <span style={{ color: "#e2e8f0" }}>{v}</span>}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Metrics side by side */}
              <div className="glass-panel p-6">
                <h2 className="text-base font-semibold text-white mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Metrikk-sammenligning
                </h2>
                <div className="space-y-1">
                  {metrics.map(m => {
                    const aVal = m.a || 0
                    const bVal = m.b || 0
                    const aWins = aVal > bVal
                    const bWins = bVal > aVal
                    const total = aVal + bVal || 1
                    const aPct = Math.round((aVal / total) * 100)
                    const bPct = 100 - aPct

                    return (
                      <div key={m.label} className="py-2.5 border-b border-white/5">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-sm font-semibold ${aWins ? "text-blue-400" : "text-textMuted"}`}>
                            {m.fmt(aVal)}
                          </span>
                          <span className="text-xs text-textMuted">{m.label}</span>
                          <span className={`text-sm font-semibold ${bWins ? "text-red-400" : "text-textMuted"}`}>
                            {m.fmt(bVal)}
                          </span>
                        </div>
                        <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${aWins ? "bg-blue-500" : "bg-blue-500/30"}`}
                            style={{ width: `${aPct}%` }}
                          />
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${bWins ? "bg-red-500" : "bg-red-500/30"}`}
                            style={{ width: `${bPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Player cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { data: duellData.player_a, color: "border-blue-500/40", accent: "text-blue-400", label: "Spiller A" },
                { data: duellData.player_b, color: "border-red-500/40",  accent: "text-red-400",  label: "Spiller B" },
              ].map(({ data, color, accent, label }) => {
                const rel = getReliability(data.minutes)
                const initials = data.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")
                return (
                  <div key={label} className={`glass-panel p-6 border-t-2 ${color}`}>
                    <div className="flex items-start gap-4 mb-5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold border border-white/10 flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)" }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className={`text-xs uppercase tracking-widest ${accent} font-medium mb-1`}>{label}</div>
                        <div className="font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{data.name}</div>
                        <div className="text-xs text-textMuted">{data.team} · {data.age} år · {posLabel[data.pos_group] || data.pos_group}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: "Prestasjon", value: data.fair_score?.toFixed(2) },
                        { label: "Minutter",   value: data.minutes >= 1000 ? `${(data.minutes/1000).toFixed(1)}k` : data.minutes },
                        { label: "Alder",      value: `${data.age} år` },
                      ].map(s => (
                        <div key={s.label} className="bg-white/3 rounded-lg py-2 px-2 text-center border border-white/5">
                          <div className="text-sm font-bold text-white">{s.value}</div>
                          <div className="text-xs text-textMuted">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: rel.dot, boxShadow: `0 0 5px ${rel.dot}` }} />
                        <span className="text-xs text-textMuted">{rel.label}</span>
                      </div>
                      <Link
                        href={`/player/${encodeURIComponent(data.name)}`}
                        className={`flex items-center gap-1 text-xs ${accent} hover:underline`}
                      >
                        Se full profil <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
