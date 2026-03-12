"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  BarChart3, Activity, Layers, Target, Zap, Shield,
  Clock, Plus, Sliders, X, TrendingUp, Users, Info,
  ArrowLeft, ChevronDown, ChevronUp, HelpCircle,
  RotateCcw, Search, ArrowUpRight, Star
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────
interface Player {
  player_name: string; team_name: string; age: number; pos_group: string
  player_tier: string; minutes: number; fair_score: number; forecast_score: number
  scout_priority: number; reliability: number; goals_per90: number; assists_per90: number
  passes_key_per90: number; tackles_total_per90: number; duels_won_per90: number
  intensity_per90: number; interceptions_per90: number; passes_accuracy: number
  shot_efficiency: number; duel_efficiency: number; shots_total_per90: number
  dribbles_success_per90: number; pass_efficiency: number; dribble_efficiency: number
  risk_upside_segment: string; value_tier: string; best_role_no: string
  cluster_label: string; percentile_pos: number; roi_index: number
  goals?: number; assists?: number
}
interface TeamStat {
  team_name: string; player_count: number; avg_age: number
  avg_score: number; top_scorer?: string; u23_count: number
}
interface CustomRole {
  id: string; name: string; description: string
  weights: Record<string, number>
}

type Tab = "liga" | "rangering" | "roller" | "skreddersydd"

// ── Design tokens ──────────────────────────────────────────────────────────
const INDIGO   = { c: "#818cf8", bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.18)", glow: "rgba(129,140,248,0.25)" }
const VIOLET   = { c: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.18)", glow: "rgba(167,139,250,0.25)" }
const EMERALD  = { c: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.18)",  glow: "rgba(52,211,153,0.25)"  }
const AMBER    = { c: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.18)",  glow: "rgba(251,191,36,0.25)"  }
const ROSE     = { c: "#f87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.15)", glow: "rgba(248,113,113,0.2)"  }

const POS_CFG: Record<string, { color: string; label: string }> = {
  GK:  { color: "#fbbf24", label: "Keeper"    },
  DEF: { color: "#60a5fa", label: "Forsvarer"  },
  MID: { color: "#34d399", label: "Midtbane"   },
  ATT: { color: "#f87171", label: "Angriper"   },
}

const AGE_GROUPS = [
  { range: "17–20", label: "Ung talent",    min: 17, max: 20, color: INDIGO.c  },
  { range: "21–23", label: "U23 lovende",   min: 21, max: 23, color: VIOLET.c  },
  { range: "24–26", label: "Etablert",      min: 24, max: 26, color: EMERALD.c },
  { range: "27–29", label: "Toppform",      min: 27, max: 29, color: AMBER.c   },
  { range: "30–32", label: "Erfaren",       min: 30, max: 32, color: "#94a3b8" },
  { range: "33+",   label: "Veteran",       min: 33, max: 99, color: "#64748b" },
]

// ── Rangerings-kategorier (alt vi har) ─────────────────────────────────────
const RANG_KATEGORIER = [
  {
    id: "fair_score",       label: "Nåværende nivå",         enhet: "",   decimaler: 2,
    forklaring: "Samlet prestasjonsnivå i dag, beregnet fra 30+ statistikker per 90 minutter. Sammenligner mot resten av Eliteserien.",
    color: INDIGO.c
  },
  {
    id: "forecast_score",   label: "Predikert fremtidig nivå", enhet: "", decimaler: 2,
    forklaring: "Modellens spådom for spillerens fremtidige nivå basert på alder, trendutvikling og historikk.",
    color: VIOLET.c
  },
  {
    id: "scout_priority",   label: "Scoutprioritet",          enhet: "",  decimaler: 2,
    forklaring: "Samlet rekrutteringsanbefaling. Kombinerer nåværende nivå (35 %), predikert nivå (35 %), datapålitelighet (20 %) og aldersbonus (10 %).",
    color: EMERALD.c
  },
  {
    id: "goals_per90",      label: "Mål per kamp",            enhet: "/90", decimaler: 2,
    forklaring: "Antall mål per 90 minutters spilletid. Normalisert slik at spillere med ulik spilletid er sammenlignbare.",
    color: ROSE.c
  },
  {
    id: "assists_per90",    label: "Målgivende pasninger",    enhet: "/90", decimaler: 2,
    forklaring: "Siste pasning før mål, per 90 min. Viser evne til å sette opp medspillere.",
    color: AMBER.c
  },
  {
    id: "passes_key_per90", label: "Nøkkelpassninger",        enhet: "/90", decimaler: 2,
    forklaring: "Pasninger som direkte leder til avslutning — det beste målet på kreativitet og sjanseskaping.",
    color: VIOLET.c
  },
  {
    id: "passes_accuracy",  label: "Pasningspresisjon",       enhet: "%",   decimaler: 1,
    forklaring: "Andel vellykkede pasninger. Toppspillere i Eliteserien ligger på 80–90 %.",
    color: INDIGO.c
  },
  {
    id: "shots_total_per90",label: "Skudd per kamp",          enhet: "/90", decimaler: 2,
    forklaring: "Antall avslutninger per 90 min. Viser aggressivitet og bevegelse mot mål.",
    color: ROSE.c
  },
  {
    id: "shot_efficiency",  label: "Skuddeffektivitet",       enhet: "%",   decimaler: 1,
    forklaring: "Andel skudd som treffer mål. Høy verdi betyr presis avslutter.",
    color: ROSE.c
  },
  {
    id: "tackles_total_per90", label: "Taklinger",            enhet: "/90", decimaler: 2,
    forklaring: "Antall taklinger per 90 min. Viser defensiv aktivitet og vilje til å gå i duell.",
    color: EMERALD.c
  },
  {
    id: "duels_won_per90",  label: "Dueller vunnet",          enhet: "/90", decimaler: 2,
    forklaring: "Antall vunnede dueller (luft og bakke) per 90 min. Kombinerer styrke og teknikk.",
    color: EMERALD.c
  },
  {
    id: "duel_efficiency",  label: "Duelleffektivitet",       enhet: "%",   decimaler: 1,
    forklaring: "Prosent av dueller spilleren vinner. Forteller om spilleren faktisk dominerer sine dueller.",
    color: EMERALD.c
  },
  {
    id: "interceptions_per90", label: "Avskjæringer",         enhet: "/90", decimaler: 2,
    forklaring: "Antall ganger spilleren bryter motstanderens pasning. Måler taktisk lesing og posisjonering.",
    color: AMBER.c
  },
  {
    id: "intensity_per90",  label: "Arbeidsintensitet",       enhet: "/90", decimaler: 1,
    forklaring: "Høyintense løp og akselerasjoner per 90 min basert på GPS-data. Viser løpsarbeid og pressing.",
    color: AMBER.c
  },
  {
    id: "dribbles_success_per90", label: "Vellykkede driblinger", enhet: "/90", decimaler: 2,
    forklaring: "Driblinger der spilleren kom seg forbi motspilleren per 90 min.",
    color: VIOLET.c
  },
  {
    id: "reliability",      label: "Datapålitelighet",        enhet: "%",   decimaler: 0,
    forklaring: "Hvor mye data vi har på spilleren, basert på spilletid. Høyere = mer sikre tall.",
    color: INDIGO.c, multiply100: true
  },
]

// ── Skreddersydd-vekting config ─────────────────────────────────────────────
const VEKT_FELTER = [
  { key: "fair_score",         label: "Nåværende nivå",      forklaring: "Samlet prestasjonsnivå i dag" },
  { key: "forecast_score",     label: "Predikert nivå",       forklaring: "Forventet fremtidig nivå" },
  { key: "goals_per90",        label: "Mål per kamp",         forklaring: "Målscoring per 90 min" },
  { key: "assists_per90",      label: "Målgivende pasninger", forklaring: "Assist per 90 min" },
  { key: "passes_key_per90",   label: "Nøkkelpass",           forklaring: "Pasninger til avslutning per 90 min" },
  { key: "passes_accuracy",    label: "Pasningspresisjon",    forklaring: "% vellykkede pasninger" },
  { key: "tackles_total_per90",label: "Taklinger",            forklaring: "Taklinger per 90 min" },
  { key: "duels_won_per90",    label: "Dueller vunnet",       forklaring: "Vunnede dueller per 90 min" },
  { key: "interceptions_per90",label: "Avskjæringer",         forklaring: "Pasningsbrytere per 90 min" },
  { key: "intensity_per90",    label: "Arbeidsintensitet",    forklaring: "Høyintense løp per 90 min" },
  { key: "scout_priority",     label: "Scoutprioritet",       forklaring: "Samlet rekrutteringsanbefaling" },
  { key: "reliability",        label: "Datapålitelighet",     forklaring: "Datakvalitet basert på spilletid" },
]

const NORM_MAX: Record<string, number> = {
  fair_score: 2, forecast_score: 2, scout_priority: 1,
  goals_per90: 1.5, assists_per90: 1, passes_key_per90: 4,
  passes_accuracy: 100, shots_total_per90: 6, shot_efficiency: 100,
  tackles_total_per90: 10, duels_won_per90: 14, duel_efficiency: 100,
  interceptions_per90: 6, intensity_per90: 20, dribbles_success_per90: 5,
  reliability: 1,
}

const uid = () => Math.random().toString(36).slice(2, 9)
const fmt = (v: number | undefined, d: number, mult?: boolean) => {
  if (v == null || isNaN(v)) return "—"
  const val = mult ? v * 100 : v
  return val.toFixed(d)
}

// ── Weight slider med manuell input ────────────────────────────────────────
function VektSlider({ label, forklaring, value, onChange }: {
  label: string; forklaring: string; value: number; onChange: (v: number) => void
}) {
  const [inp, setInp] = useState(String(value))
  useEffect(() => setInp(String(value)), [value])
  const commit = (s: string) => {
    const n = parseInt(s)
    if (!isNaN(n)) onChange(Math.min(100, Math.max(0, n)))
    else setInp(String(value))
  }
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <span className="text-xs font-medium text-white/60">{label}</span>
          <p className="text-[9px] text-white/25 mt-0.5">{forklaring}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          <div className="flex items-center rounded-lg border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
            <input type="text" value={inp}
              onChange={e => setInp(e.target.value)}
              onBlur={e => commit(e.target.value)}
              onKeyDown={e => e.key === "Enter" && commit(inp)}
              className="w-10 text-center text-xs font-bold text-white bg-transparent focus:outline-none py-1 tabular-nums"
              style={{ color: INDIGO.c }} />
            <span className="text-[9px] text-white/20 pr-1.5">%</span>
          </div>
        </div>
      </div>
      <input type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full appearance-none h-1 rounded-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${INDIGO.c} 0%, ${INDIGO.c} ${value}%, rgba(255,255,255,0.06) ${value}%, rgba(255,255,255,0.06) 100%)`,
        }} />
    </div>
  )
}

// ── Stat bar ───────────────────────────────────────────────────────────────
function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const p = Math.min(Math.max((value / max) * 100, 0), 100)
  return (
    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
      <div className="h-full rounded-full" style={{ width: `${p}%`, background: color, boxShadow: `0 0 5px ${color}50` }} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
export default function InnsiktPage() {
  const [players, setPlayers]       = useState<Player[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<Tab>("liga")
  const [showHelp, setShowHelp]     = useState(false)
  const [openRangCat, setOpenRangCat] = useState<string | null>(null)

  // Rangering
  const [rangFilter, setRangFilter] = useState<string>("Alle")
  const [posFilter, setPosFilter]   = useState<string>("Alle")
  const [tierFilter, setTierFilter] = useState<string>("Alle")
  const [rangSearch, setRangSearch] = useState("")

  // Roller tab
  const [openCluster, setOpenCluster] = useState<string | null>(null)

  // Skreddersydd
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)
  const [activeCustomId, setActiveCustomId] = useState<string | null>(null)

  useEffect(() => {
    fetch("http://localhost:8000/api/players?limit=254")
      .then(r => r.json()).then((d: Player[]) => setPlayers(d))
      .catch(console.error).finally(() => setLoading(false))
    try {
      const cr = localStorage.getItem("ins_cr"); if (cr) setCustomRoles(JSON.parse(cr))
    } catch {}
  }, [])

  const teamStats: TeamStat[] = useMemo(() => {
    const teams = [...new Set(players.map(p => p.team_name).filter(Boolean))]
    return teams.map(t => {
      const tp = players.filter(p => p.team_name === t)
      return {
        team_name: t, player_count: tp.length,
        avg_age: tp.reduce((a, p) => a + p.age, 0) / tp.length,
        avg_score: tp.reduce((a, p) => a + (p.fair_score || 0), 0) / tp.length,
        top_scorer: [...tp].sort((a, b) => (b.fair_score || 0) - (a.fair_score || 0))[0]?.player_name,
        u23_count: tp.filter(p => p.age <= 23).length,
      }
    }).sort((a, b) => b.avg_score - a.avg_score)
  }, [players])

  const clusters: Record<string, { label: string; color: string; forklaring: string; spillere: Player[] }> = useMemo(() => {
    const groups: Record<string, Player[]> = {}
    players.forEach(p => {
      if (!p.cluster_label) return
      if (!groups[p.cluster_label]) groups[p.cluster_label] = []
      groups[p.cluster_label].push(p)
    })
    const CLUSTER_COLOR: Record<string, string> = {
      "Kreativ playmaker": INDIGO.c, "Ballvinnende stopper": EMERALD.c,
      "Boks-til-boks": VIOLET.c, "Defensiv midtbane": AMBER.c,
      "Presspiller": ROSE.c, "Avslutter": "#f87171",
      "Keeper": "#fbbf24", "Kreativ spiss": "#a78bfa", "Byggende back": "#60a5fa",
    }
    const CLUSTER_FORK: Record<string, string> = {
      "Kreativ playmaker": "Styrer spillet og skaper sjanser via pasning og bevegelse.",
      "Ballvinnende stopper": "Gjenvinner ballen og stopper angrep med taklinger og dueller.",
      "Boks-til-boks": "Allsidig spiller som bidrar defensivt og offensivt — jobber i begge soner.",
      "Defensiv midtbane": "Holder orden foran forsvaret og bryter motstanderens spill.",
      "Presspiller": "Presser høyt, jobber uten ball og skaper kaos for motstanderen.",
      "Avslutter": "Søker mot mål, avslutter og scorer — spesialist på å ligge riktig.",
      "Keeper": "Siste skanse — redder skudd og styrer forsvaret.",
      "Kreativ spiss": "Kombinerer kreativitet med målfare — farlig med og uten ball.",
      "Byggende back": "Stabil forsvarsspiller som også bidrar fremover og i oppbygning.",
    }
    return Object.fromEntries(
      Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([label, spillere]) => [
        label, { label, color: CLUSTER_COLOR[label] || "#94a3b8", forklaring: CLUSTER_FORK[label] || "", spillere }
      ])
    )
  }, [players])

  const saveRole = (role: CustomRole) => {
    const updated = editingRole ? customRoles.map(r => r.id === role.id ? role : r) : [...customRoles, { ...role, id: uid() }]
    setCustomRoles(updated); localStorage.setItem("ins_cr", JSON.stringify(updated))
    setShowBuilder(false); setEditingRole(null)
    if (!editingRole) setActiveCustomId(updated[updated.length - 1]?.id)
  }
  const deleteRole = (id: string) => {
    const updated = customRoles.filter(x => x.id !== id)
    setCustomRoles(updated); localStorage.setItem("ins_cr", JSON.stringify(updated))
    if (activeCustomId === id) setActiveCustomId(updated[0]?.id || null)
  }

  const calcCustomScore = (p: Player, role: CustomRole) => {
    let sum = 0, totalW = 0
    Object.entries(role.weights).forEach(([key, w]) => {
      if (w <= 0) return
      const raw = (p as any)[key] ?? 0
      const max = NORM_MAX[key] || 1
      sum += (raw / max) * w; totalW += w
    })
    return totalW > 0 ? sum / totalW : 0
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "liga",         label: "Ligaoversikt",    icon: Shield    },
    { id: "rangering",    label: "Topprangering",   icon: Star      },
    { id: "roller",       label: "Spillertyper",    icon: Users     },
    { id: "skreddersydd", label: "Min søkeprofil",  icon: Sliders   },
  ]

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-bg0">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-400 animate-spin" />
        </div>
        <p className="text-white/25 text-xs">Laster ligadata...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg0" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:99px}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:white;box-shadow:0 0 6px rgba(129,140,248,0.5);cursor:pointer}
        .sthin::-webkit-scrollbar{width:3px}.sthin::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:99px}
      `}</style>

      {/* ── TOPBAR ── */}
      <div className="border-b border-white/5 bg-bg0/95 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-5 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white transition-colors">
              <ArrowLeft size={13} />Dashboard
            </Link>
            <div className="w-px h-4 bg-white/8" />
            <BarChart3 size={13} className="text-indigo-400" />
            <span className="text-sm font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>Innsikt</span>
            <span className="text-xs text-white/20">{players.length} spillere analysert</span>
          </div>
          <button onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 text-xs text-white/40 hover:text-white transition-all">
            <HelpCircle size={11} />Slik leses statistikken
          </button>
        </div>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="rounded-2xl border border-white/10 max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto sthin"
            style={{ background: "rgba(10,10,18,0.98)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-white" style={{ fontFamily: "'Syne',sans-serif" }}>Slik leses statistikken</h2>
              <button onClick={() => setShowHelp(false)}><X size={14} className="text-white/30 hover:text-white" /></button>
            </div>
            <div className="space-y-3 text-xs text-white/40 leading-relaxed">
              <p><span className="text-indigo-300 font-bold">Per 90 min:</span> All kampstatistikk er justert per 90 minutters spilletid. Det betyr at en spiller med 500 minutter og en med 2000 minutter sammenlignes rettferdig — vi ser på tempo og kvalitet, ikke råtall.</p>
              <p><span className="text-indigo-300 font-bold">Z-score:</span> Brukes på radarkart og i modellen. En z-score på 0 = ligasnitt. Over 0 = bedre enn snittet. Under 0 = under snittet. +1 betyr at spilleren er i topp 16 % i Eliteserien.</p>
              <p><span className="text-indigo-300 font-bold">Nåværende nivå:</span> Beregnet fra 30+ statistikker. Viser faktisk prestasjonsnivå denne sesongen.</p>
              <p><span className="text-indigo-300 font-bold">Predikert nivå:</span> Modellens anslag for spillerens fremtidige nivå. Tar hensyn til alder og trendutvikling.</p>
              <p><span className="text-indigo-300 font-bold">Datapålitelighet:</span> Basert på spilletid. Spillere med lite spilletid kan ha ujevn statistikk. Alltid sjekk denne kolonnen.</p>
              <p><span className="text-indigo-300 font-bold">Min søkeprofil:</span> Lag din egne vekting og finn spillere som passer ditt lags behov. Du bestemmer hva som er viktigst.</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-5 py-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 p-1 rounded-xl border border-white/6 bg-white/2 w-fit">
          {TABS.map(t => {
            const Icon = t.icon; const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? "bg-white/8 text-white border border-white/10" : "text-white/30 hover:text-white/70"}`}>
                <Icon size={13} />{t.label}
              </button>
            )
          })}
        </div>

        {/* ══════════════ LIGAOVERSIKT ══════════════ */}
        {tab === "liga" && (
          <div className="space-y-4">
            {/* Posisjonsfordeling */}
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded-full" style={{ background: INDIGO.c }} />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Posisjonsfordeling</span>
                <span className="text-[10px] text-white/25 ml-1">— fordeling av spillere per posisjon i Eliteserien</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {["GK","DEF","MID","ATT"].map(pos => {
                  const cfg = POS_CFG[pos]
                  const count = players.filter(p => p.pos_group === pos).length
                  const pct = Math.round((count / players.length) * 100)
                  const avgScore = (players.filter(p => p.pos_group === pos).reduce((a, p) => a + (p.fair_score || 0), 0) / count).toFixed(2)
                  return (
                    <div key={pos} className="rounded-2xl p-4 border border-white/6 relative overflow-hidden"
                      style={{ background: `rgba(255,255,255,0.02)` }}>
                      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}50, transparent)` }} />
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
                        <span className="text-2xl font-black text-white">{count}</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color, boxShadow: `0 0 6px ${cfg.color}60` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/25">{pct} % av ligaen</span>
                        <span className="text-[10px] text-white/40">snitt {avgScore}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Aldersprofil */}
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded-full" style={{ background: AMBER.c }} />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Aldersprofil</span>
                <span className="text-[10px] text-white/25 ml-1">— hvordan ligaen fordeler seg på aldersgrupper</span>
              </div>
              <div className="grid grid-cols-6 gap-3">
                {AGE_GROUPS.map(g => {
                  const count = players.filter(p => p.age >= g.min && p.age <= g.max).length
                  const maxC = Math.max(...AGE_GROUPS.map(x => players.filter(p => p.age >= x.min && p.age <= x.max).length))
                  const barH = Math.round((count / maxC) * 64)
                  const avgScore = count > 0 ? (players.filter(p => p.age >= g.min && p.age <= g.max).reduce((a, p) => a + (p.fair_score || 0), 0) / count).toFixed(2) : "—"
                  return (
                    <div key={g.range} className="flex flex-col items-center gap-1.5">
                      <div className="w-full flex items-end justify-center h-16 px-2">
                        <div className="w-full rounded-t-lg" style={{ height: barH, background: `linear-gradient(180deg, ${g.color}, ${g.color}60)`, boxShadow: `0 0 8px ${g.color}30` }} />
                      </div>
                      <span className="text-xl font-black text-white">{count}</span>
                      <span className="text-[10px] font-bold" style={{ color: g.color }}>{g.range}</span>
                      <span className="text-[9px] text-white/25">{g.label}</span>
                      <span className="text-[9px] text-white/15">snitt {avgScore}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Lagrangering */}
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: EMERALD.c }} />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Lagrangering</span>
                <span className="text-[10px] text-white/25 ml-1">— rangert etter snittpoeng blant egne spillere</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {teamStats.map((team, i) => {
                  const maxScore = teamStats[0]?.avg_score || 1
                  const pct = (team.avg_score / maxScore) * 100
                  const rankColor = i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c40" : "rgba(255,255,255,0.15)"
                  return (
                    <div key={team.team_name} className="flex items-center gap-4 px-5 py-2.5 hover:bg-white/2 transition-colors">
                      <span className="text-sm font-black w-6 text-center flex-shrink-0" style={{ color: rankColor }}>
                        {i < 3 ? ["①","②","③"][i] : i + 1}
                      </span>
                      <div className="w-32 flex-shrink-0">
                        <p className="text-sm font-bold text-white truncate">{team.team_name}</p>
                        <p className="text-[10px] text-white/25">{team.player_count} spillere · {team.u23_count} U23</p>
                      </div>
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: INDIGO.c, boxShadow: `0 0 5px ${INDIGO.glow}` }} />
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-black" style={{ color: INDIGO.c }}>{team.avg_score.toFixed(2)}</p>
                          <p className="text-[9px] text-white/20">snitt nivå</p>
                        </div>
                        <div className="text-right w-16">
                          <p className="text-xs text-white/40">{team.avg_age.toFixed(1)} år</p>
                          <p className="text-[9px] text-white/20">snitt alder</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TOPPRANGERING ══════════════ */}
        {tab === "rangering" && (
          <div className="space-y-3">
            {/* Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input value={rangSearch} onChange={e => setRangSearch(e.target.value)}
                  placeholder="Søk spiller..."
                  className="bg-white/3 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/40 w-44" />
              </div>
              <div className="w-px h-5 bg-white/8" />
              {["Alle","GK","DEF","MID","ATT"].map(p => (
                <button key={p} onClick={() => setPosFilter(p)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${posFilter === p ? "bg-white/8 border-white/15 text-white" : "bg-white/2 border-white/6 text-white/30 hover:text-white/60"}`}>
                  {p === "Alle" ? "Alle" : POS_CFG[p]?.label || p}
                </button>
              ))}
              <div className="w-px h-5 bg-white/8" />
              {["Alle","senior","u23_prospect"].map(t => (
                <button key={t} onClick={() => setTierFilter(t)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${tierFilter === t ? "bg-indigo-500/12 border-indigo-500/25 text-indigo-300" : "bg-white/2 border-white/6 text-white/30 hover:text-white/60"}`}>
                  {t === "Alle" ? "Alle" : t === "senior" ? "Senior" : "U23"}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-white/25 mb-1">Trykk på en kategori for å se topp 10 — med forklaring av hva statistikken betyr.</p>

            {RANG_KATEGORIER.map(kat => {
              const isOpen = openRangCat === kat.id
              const filtered = players.filter(p => {
                if (posFilter !== "Alle" && p.pos_group !== posFilter) return false
                if (tierFilter !== "Alle" && p.player_tier !== tierFilter) return false
                if (rangSearch && !p.player_name.toLowerCase().includes(rangSearch.toLowerCase())) return false
                return true
              })
              const sorted = [...filtered].sort((a, b) => {
                const va = (a as any)[kat.id] ?? 0
                const vb = (b as any)[kat.id] ?? 0
                return vb - va
              }).slice(0, 10)
              const top = sorted[0] ? (kat.multiply100 ? ((sorted[0] as any)[kat.id] || 0) * 100 : ((sorted[0] as any)[kat.id] || 0)) : 1

              return (
                <div key={kat.id} className="rounded-2xl border border-white/6 overflow-hidden transition-all"
                  style={{ background: isOpen ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)" }}>
                  <button onClick={() => setOpenRangCat(isOpen ? null : kat.id)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: kat.color, boxShadow: `0 0 5px ${kat.color}` }} />
                      <span className="text-sm font-bold text-white">{kat.label}</span>
                      {kat.enhet && <span className="text-[10px] text-white/25">{kat.enhet}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {sorted[0] && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/25">Best:</span>
                          <span className="text-xs font-bold text-white/50">{sorted[0].player_name.split(" ").pop()}</span>
                          <span className="text-xs font-black" style={{ color: kat.color }}>
                            {fmt((sorted[0] as any)[kat.id], kat.decimaler, kat.multiply100)}
                            {kat.enhet === "%" ? " %" : ""}
                          </span>
                        </div>
                      )}
                      {isOpen ? <ChevronUp size={13} className="text-white/20" /> : <ChevronDown size={13} className="text-white/20" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/5">
                      <div className="px-5 py-3 border-b border-white/4" style={{ background: "rgba(129,140,248,0.03)" }}>
                        <p className="text-[10px] text-white/35 leading-relaxed">{kat.forklaring}</p>
                      </div>
                      <div className="divide-y divide-white/[0.04]">
                        {sorted.map((p, i) => {
                          const raw = (p as any)[kat.id] ?? 0
                          const val = kat.multiply100 ? raw * 100 : raw
                          const barPct = Math.min((val / (kat.multiply100 ? top : top)) * 100, 100)
                          const pc = POS_CFG[p.pos_group]
                          const rankColor = i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c40" : "rgba(255,255,255,0.15)"
                          return (
                            <div key={p.player_name} className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/2 transition-colors">
                              <span className="text-xs font-black w-5 text-center flex-shrink-0" style={{ color: rankColor }}>
                                {i < 3 ? ["①","②","③"][i] : i + 1}
                              </span>
                              <div className="w-36 flex-shrink-0">
                                <Link href={`/player/${encodeURIComponent(p.player_name)}`}
                                  className="text-xs font-bold text-white hover:text-indigo-300 transition-colors truncate block">{p.player_name}</Link>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] text-white/25">{p.team_name}</span>
                                  <span className="text-[8px] font-bold px-1 rounded" style={{ background: `${pc?.color}18`, color: pc?.color }}>{pc?.label}</span>
                                </div>
                              </div>
                              <div className="flex-1 flex items-center gap-2">
                                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: kat.color, boxShadow: `0 0 5px ${kat.color}50` }} />
                                </div>
                                <span className="text-sm font-black w-14 text-right tabular-nums flex-shrink-0" style={{ color: kat.color }}>
                                  {val.toFixed(kat.decimaler)}{kat.enhet === "%" ? " %" : ""}
                                </span>
                              </div>
                              <Link href={`/player/${encodeURIComponent(p.player_name)}`}
                                className="w-7 h-7 flex items-center justify-center rounded-xl border border-white/6 hover:border-indigo-500/25 hover:bg-indigo-500/8 transition-all flex-shrink-0">
                                <ArrowUpRight size={11} className="text-white/25" />
                              </Link>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ══════════════ SPILLERTYPER (CLUSTER) ══════════════ */}
        {tab === "roller" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-white/6 mb-1" style={{ background: "rgba(129,140,248,0.04)" }}>
              <Info size={13} className="text-indigo-400/60 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-white/35 leading-relaxed">
                Spillertypene er beregnet av en klyngealgoritme (K-means) som grupperer spillere etter likhet på tvers av alle statistikker — uavhengig av posisjon. En «Kreativ playmaker» i forsvaret og en på midtbanen kan ha mer til felles spillemessig enn to tradisjonelle midtbane-spillere.
              </p>
            </div>

            {Object.entries(clusters).map(([label, cluster]) => {
              const isOpen = openCluster === label
              const topSpillere = [...cluster.spillere].sort((a, b) => (b.fair_score || 0) - (a.fair_score || 0)).slice(0, 8)
              return (
                <div key={label} className="rounded-2xl border border-white/6 overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.01)" }}>
                  <button onClick={() => setOpenCluster(isOpen ? null : label)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: cluster.color, boxShadow: `0 0 6px ${cluster.color}` }} />
                      <span className="text-sm font-bold text-white">{cluster.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border"
                        style={{ background: `${cluster.color}10`, color: cluster.color, borderColor: `${cluster.color}25` }}>
                        {cluster.spillere.length} spillere
                      </span>
                    </div>
                    {isOpen ? <ChevronUp size={13} className="text-white/20" /> : <ChevronDown size={13} className="text-white/20" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/5">
                      {cluster.forklaring && (
                        <div className="px-5 py-3 border-b border-white/4 flex items-start gap-2" style={{ background: `${cluster.color}08` }}>
                          <Info size={12} style={{ color: cluster.color + "80" }} className="flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] leading-relaxed" style={{ color: cluster.color + "cc" }}>{cluster.forklaring}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-4">
                        {topSpillere.map((p, i) => {
                          const pc = POS_CFG[p.pos_group]
                          return (
                            <Link key={p.player_name} href={`/player/${encodeURIComponent(p.player_name)}`}
                              className="rounded-xl p-3 border border-white/6 hover:border-white/12 transition-all group" style={{ background: "rgba(255,255,255,0.02)" }}>
                              <div className="flex items-start justify-between mb-1.5">
                                <span className="text-[8px] font-bold" style={{ color: cluster.color + "80" }}>#{i + 1}</span>
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${pc?.color}15`, color: pc?.color }}>{pc?.label}</span>
                              </div>
                              <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors leading-tight mb-0.5">{p.player_name}</p>
                              <p className="text-[9px] text-white/25 mb-2">{p.team_name} · {p.age} år</p>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-white/20">Nivå</span>
                                <span className="text-xs font-black" style={{ color: cluster.color }}>{p.fair_score?.toFixed(2)}</span>
                              </div>
                              <div className="mt-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.min((p.fair_score / 2) * 100, 100)}%`, background: cluster.color }} />
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ══════════════ MIN SØKEPROFIL ══════════════ */}
        {tab === "skreddersydd" && (
          <div className="grid grid-cols-12 gap-5">
            {/* Left: Builder / role list */}
            <div className="col-span-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Mine profiler</p>
                <button onClick={() => { setEditingRole(null); setShowBuilder(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-300 border border-indigo-500/25 bg-indigo-500/8 hover:bg-indigo-500/15 transition-colors">
                  <Plus size={11} />Ny profil
                </button>
              </div>

              {customRoles.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center">
                  <Sliders size={24} className="text-white/10 mx-auto mb-3" />
                  <p className="text-sm font-bold text-white mb-1">Ingen søkeprofiler ennå</p>
                  <p className="text-xs text-white/25 mb-4">Lag din første profil og finn spillere som passer</p>
                  <button onClick={() => setShowBuilder(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-300 border border-indigo-500/25 bg-indigo-500/8 hover:bg-indigo-500/15 transition-colors">
                    Opprett søkeprofil
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {customRoles.map(role => (
                    <div key={role.id}
                      className={`rounded-2xl border p-4 cursor-pointer transition-all ${activeCustomId === role.id ? "border-indigo-500/30 bg-indigo-500/5" : "border-white/6 bg-white/2 hover:border-white/12"}`}
                      onClick={() => setActiveCustomId(role.id)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{role.name}</p>
                          {role.description && <p className="text-[10px] text-white/30 mt-0.5">{role.description}</p>}
                        </div>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          <button onClick={e => { e.stopPropagation(); setEditingRole(role); setShowBuilder(true) }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/8 transition-colors">
                            <Sliders size={10} className="text-white/30" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); deleteRole(role.id) }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors">
                            <X size={10} className="text-white/30 hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(role.weights).filter(([, v]) => v > 0).slice(0, 4).map(([k, v]) => {
                          const lbl = VEKT_FELTER.find(f => f.key === k)?.label || k
                          return (
                            <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-full border"
                              style={{ background: INDIGO.bg, color: INDIGO.c, borderColor: INDIGO.border }}>{lbl} {v}%</span>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Results */}
            <div className="col-span-8">
              {activeCustomId ? (() => {
                const role = customRoles.find(r => r.id === activeCustomId)
                if (!role) return null
                const results = players.map(p => ({ p, score: calcCustomScore(p, role) }))
                  .sort((a, b) => b.score - a.score).slice(0, 20)
                const topScore = results[0]?.score || 1
                return (
                  <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-white" style={{ fontFamily: "'Syne',sans-serif" }}>{role.name}</h3>
                        <p className="text-[10px] text-white/30 mt-0.5">{results.length} spillere rangert etter din profil</p>
                      </div>
                      <button onClick={() => { setEditingRole(role); setShowBuilder(true) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/40 hover:text-white border border-white/8 hover:border-white/15 transition-all">
                        <Sliders size={10} />Rediger vekting
                      </button>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {results.map(({ p, score }, i) => {
                        const pc = POS_CFG[p.pos_group]
                        const rankColor = i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c40" : "rgba(255,255,255,0.15)"
                        const barW = (score / topScore) * 100
                        return (
                          <div key={p.player_name} className="flex items-center gap-3 px-5 py-3 hover:bg-white/2 transition-colors">
                            <span className="text-sm font-black w-6 text-center flex-shrink-0" style={{ color: rankColor }}>
                              {i < 3 ? ["①","②","③"][i] : i + 1}
                            </span>
                            <div className="w-44 flex-shrink-0">
                              <Link href={`/player/${encodeURIComponent(p.player_name)}`}
                                className="text-sm font-bold text-white hover:text-indigo-300 transition-colors truncate block">{p.player_name}</Link>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-white/25">{p.team_name}</span>
                                <span className="text-[8px] font-bold px-1 rounded" style={{ background: `${pc?.color}15`, color: pc?.color }}>{pc?.label}</span>
                                <span className="text-[9px] text-white/20">{p.age} år</span>
                              </div>
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                                <div className="h-full rounded-full" style={{ width: `${barW}%`, background: INDIGO.c, boxShadow: `0 0 5px ${INDIGO.glow}` }} />
                              </div>
                              <span className="text-sm font-black w-12 text-right tabular-nums flex-shrink-0" style={{ color: INDIGO.c }}>
                                {(score * 100).toFixed(1)}
                              </span>
                            </div>
                            <Link href={`/player/${encodeURIComponent(p.player_name)}`}
                              className="w-7 h-7 flex items-center justify-center rounded-xl border border-white/6 hover:border-indigo-500/25 hover:bg-indigo-500/8 transition-all flex-shrink-0">
                              <ArrowUpRight size={11} className="text-white/25" />
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })() : (
                <div className="glass-panel rounded-2xl flex items-center justify-center h-full min-h-64">
                  <div className="text-center">
                    <Sliders size={28} className="text-white/8 mx-auto mb-2" />
                    <p className="text-sm text-white/20">Velg eller lag en søkeprofil</p>
                    <p className="text-[10px] text-white/10 mt-1">Resultater vises her</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── ROLE BUILDER MODAL ── */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto sthin"
            style={{ background: "rgba(10,10,18,0.98)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 sticky top-0" style={{ background: "rgba(10,10,18,0.98)" }}>
              <div>
                <h3 className="font-black text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
                  {editingRole ? "Rediger søkeprofil" : "Ny søkeprofil"}
                </h3>
                <p className="text-[10px] text-white/25 mt-0.5">Velg hva som er viktigst for deg — totalen bør være 100 %</p>
              </div>
              <button onClick={() => setShowBuilder(false)}><X size={14} className="text-white/30 hover:text-white" /></button>
            </div>
            <RoleBuilderForm
              initial={editingRole}
              onSave={saveRole}
              onCancel={() => setShowBuilder(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Role Builder Form ────────────────────────────────────────────────────────
function RoleBuilderForm({ initial, onSave, onCancel }: {
  initial?: CustomRole | null
  onSave: (r: CustomRole) => void
  onCancel: () => void
}) {
  const defaultW: Record<string, number> = Object.fromEntries(VEKT_FELTER.map(f => [f.key, 0]))
  if (!initial) { defaultW.fair_score = 30; defaultW.forecast_score = 30; defaultW.scout_priority = 20; defaultW.reliability = 10; defaultW.passes_key_per90 = 10 }

  const [role, setRole] = useState<CustomRole>(initial || { id: "", name: "", description: "", weights: defaultW })
  const total = Object.values(role.weights).reduce((a, b) => a + b, 0)
  const setW = (k: string, v: number) => setRole(r => ({ ...r, weights: { ...r.weights, [k]: v } }))
  const reset = () => setRole(r => ({ ...r, weights: Object.fromEntries(VEKT_FELTER.map(f => [f.key, 0])) }))

  return (
    <div className="px-6 py-5">
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="text-[9px] uppercase tracking-widest text-white/25 font-bold block mb-1.5">Profilnavn</label>
          <input value={role.name} onChange={e => setRole(r => ({ ...r, name: e.target.value }))}
            placeholder="F.eks. Defensiv midtbane"
            className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/15 focus:outline-none focus:border-indigo-500/40" />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-widest text-white/25 font-bold block mb-1.5">Beskrivelse (valgfritt)</label>
          <input value={role.description} onChange={e => setRole(r => ({ ...r, description: e.target.value }))}
            placeholder="Hva leter du etter?"
            className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/15 focus:outline-none focus:border-indigo-500/40" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] uppercase tracking-widest text-white/25 font-bold">Vekting per egenskap</p>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${Math.abs(total - 100) <= 2 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : total > 100 ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"}`}>
            {total} / 100 %
          </span>
          <button onClick={reset} className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white px-2 py-1 rounded-lg border border-white/6 hover:border-white/15 transition-all">
            <RotateCcw size={9} />Nullstill
          </button>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {VEKT_FELTER.map(f => (
          <VektSlider key={f.key} label={f.label} forklaring={f.forklaring}
            value={role.weights[f.key] || 0} onChange={v => setW(f.key, v)} />
        ))}
      </div>

      <div className="flex gap-3 mt-5">
        <button onClick={() => onSave(role)} disabled={!role.name.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-30"
          style={{ background: role.name.trim() ? `linear-gradient(135deg, ${INDIGO.c}, ${VIOLET.c})` : "rgba(255,255,255,0.05)" }}>
          {initial ? "Oppdater profil" : "Lagre søkeprofil"}
        </button>
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-white hover:bg-white/5 transition-all border border-white/6">
          Avbryt
        </button>
      </div>
    </div>
  )
}