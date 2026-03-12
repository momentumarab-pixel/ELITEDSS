"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft, Info, GitCompare, Users,
  TrendingUp, Brain, Shield, Target, Zap,
  ChevronDown, ChevronUp
} from "lucide-react"
import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar as RechartsRadar, ResponsiveContainer, Tooltip as RechTooltip
} from "recharts"

// ── Logo mapping — robust ──────────────────────────────────────────────────
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
  ["tromsø","/images/Logo/tromso.png"],["tromso","/images/Logo/tromso.png"],
  ["vålerenga","/images/Logo/valerenga.png"],["valerenga","/images/Logo/valerenga.png"],
  ["viking","/images/Logo/Viking.png"],
]
const getLogo = (t: string) => {
  if (!t) return null
  const tl = t.toLowerCase()
  return LOGO_MAP.find(([k]) => tl.includes(k))?.[1] ?? null
}

// ── Types ──────────────────────────────────────────────────────────────────
interface PlayerData {
  player_name: string; age: number; nationality: string
  team_name: string; pos_group: string; role_raw: string
  player_tier: string; minutes: number; games: number; starts: number
  fair_score: number; forecast_score: number; shrunk_score: number
  reliability: number; age_factor: number; total_score: number
  percentile_pos: number; value_tier: string; risk_upside_segment: string
  roi_index: number; scout_priority: number; value_for_money: number
  goals_per90: number; assists_per90: number; passes_key_per90: number
  tackles_total_per90: number; duels_won_per90: number; interceptions_per90: number
  intensity_per90: number; shots_per90: number; dribbles_per90: number
  shot_efficiency: number; duel_efficiency: number; pass_efficiency: number
  dribble_efficiency: number; risk_rate: number
  z_goals_per90_pos: number; z_assists_per90_pos: number; z_passes_key_per90_pos: number
  z_tackles_total_per90_pos: number; z_duels_won_per90_pos: number
  z_intensity_per90_pos: number; z_shot_efficiency_pos: number
  z_duel_efficiency_pos: number; z_pass_efficiency_pos: number
  z_dribble_efficiency_pos: number; z_interceptions_per90_pos: number
  z_shots_total_per90_pos: number
  best_role_no: string; cluster_label: string; silhouette: number
  upside_gap_best: number; upside_gap_playmaker: number
  upside_gap_ballwinner: number; upside_gap_finisher: number; upside_gap_pressplayer: number
  raw_score_playmaker: number; raw_score_ballwinner: number
  raw_score_finisher: number; raw_score_pressplayer: number
  value_score_playmaker: number; value_score_ballwinner: number
  value_score_finisher: number; value_score_pressplayer: number
  whatif_900min_playmaker: number; whatif_900min_ballwinner: number
  whatif_900min_finisher: number; whatif_900min_pressplayer: number
}
interface SimilarPlayer {
  player_name: string; team_name: string; pos_group: string
  age: number; player_tier: string; fair_score: number; value_tier: string; distance: number
}

// ── Design tokens — identisk med duell ────────────────────────────────────
const BRAND = "#818cf8"
const BRAND_SOFT = "rgba(129,140,248,0.08)"
const BRAND_BORDER = "rgba(129,140,248,0.2)"
const BRAND_GLOW = "rgba(129,140,248,0.25)"

const POS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  GK:  { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   label: "Keeper"    },
  DEF: { color: "#60a5fa", bg: "rgba(96,165,250,0.1)",   label: "Forsvarer" },
  MID: { color: "#34d399", bg: "rgba(52,211,153,0.1)",   label: "Midtbane"  },
  ATT: { color: "#f87171", bg: "rgba(248,113,113,0.1)",  label: "Angriper"  },
}

const SEG_LABEL: Record<string, string> = {
  Sikker_Vinner: "Trygg toppspiller", Risiko_Høy_Oppside: "Høyt potensial",
  Sikker_Middels: "Stabil middels",   Risiko_Lav_Oppside: "Under forventning",
}

const ROLLE_CFG = [
  { key: "playmaker",   label: "Kreativ Playmaker",  ikon: Brain,  raw: "raw_score_playmaker",   val: "value_score_playmaker",   upside: "upside_gap_playmaker",   whatif: "whatif_900min_playmaker"   },
  { key: "ballwinner",  label: "Defensiv Ballvinner", ikon: Shield, raw: "raw_score_ballwinner",  val: "value_score_ballwinner",  upside: "upside_gap_ballwinner",  whatif: "whatif_900min_ballwinner"  },
  { key: "finisher",    label: "Avslutter",           ikon: Target, raw: "raw_score_finisher",    val: "value_score_finisher",    upside: "upside_gap_finisher",    whatif: "whatif_900min_finisher"    },
  { key: "pressplayer", label: "Presspiller",         ikon: Zap,    raw: "raw_score_pressplayer", val: "value_score_pressplayer", upside: "upside_gap_pressplayer", whatif: "whatif_900min_pressplayer" },
]

// Per-90 statistikker med z-nøkkel for percentil
const STAT_KAT = [
  {
    id: "angrep", label: "Angrep & Mål", ikon: "⚽",
    stats: [
      { key: "goals_per90",         zKey: "z_goals_per90_pos",        label: "Mål",                  enhet: "/90", fork: "Mål per 90 min — justert mot samme posisjon." },
      { key: "assists_per90",       zKey: "z_assists_per90_pos",       label: "Assist",               enhet: "/90", fork: "Målgivende pasninger per 90 min." },
      { key: "shots_per90",         zKey: "z_shots_total_per90_pos",   label: "Skudd",                enhet: "/90", fork: "Avslutninger per 90 min." },
      { key: "shot_efficiency",     zKey: "z_shot_efficiency_pos",     label: "Skuddeffektivitet",    enhet: "%",   fork: "Andel skudd som treffer mål." },
    ]
  },
  {
    id: "pasning", label: "Pasning & Kreativitet", ikon: "🎯",
    stats: [
      { key: "passes_key_per90",    zKey: "z_passes_key_per90_pos",    label: "Nøkkelpass",           enhet: "/90", fork: "Pasninger som leder til avslutning." },
      { key: "pass_efficiency",     zKey: "z_pass_efficiency_pos",     label: "Pasningseffektivitet", enhet: "",    fork: "Kombinert pasningskvalitet." },
      { key: "dribbles_per90",      zKey: "z_dribble_efficiency_pos",  label: "Driblinger",           enhet: "/90", fork: "Vellykkede driblinger per 90 min." },
      { key: "dribble_efficiency",  zKey: "z_dribble_efficiency_pos",  label: "Driblingseff.",        enhet: "%",   fork: "Andel vellykkede driblinger." },
    ]
  },
  {
    id: "forsvar", label: "Forsvar & Dueller", ikon: "🛡️",
    stats: [
      { key: "tackles_total_per90", zKey: "z_tackles_total_per90_pos", label: "Taklinger",            enhet: "/90", fork: "Taklinger per 90 min." },
      { key: "duels_won_per90",     zKey: "z_duels_won_per90_pos",     label: "Dueller vunnet",       enhet: "/90", fork: "Vunnede dueller per 90 min." },
      { key: "duel_efficiency",     zKey: "z_duel_efficiency_pos",     label: "Duelleffektivitet",    enhet: "%",   fork: "Prosent vunnede dueller." },
      { key: "interceptions_per90", zKey: "z_interceptions_per90_pos", label: "Avskjæringer",         enhet: "/90", fork: "Pasningsbrytere per 90 min." },
    ]
  },
  {
    id: "intensitet", label: "Intensitet & Løp", ikon: "⚡",
    stats: [
      { key: "intensity_per90",     zKey: "z_intensity_per90_pos",     label: "Arbeidsintensitet",    enhet: "/90", fork: "Høyintense løp og akselerasjoner per 90 min." },
    ]
  },
]

const RADAR_AKSER = [
  { key: "z_goals_per90_pos",        label: "Mål"          },
  { key: "z_assists_per90_pos",       label: "Assist"       },
  { key: "z_shots_total_per90_pos",   label: "Skudd"        },
  { key: "z_passes_key_per90_pos",    label: "Nøkkelpass"   },
  { key: "z_duels_won_per90_pos",     label: "Dueller"      },
  { key: "z_tackles_total_per90_pos", label: "Taklinger"    },
  { key: "z_interceptions_per90_pos", label: "Avskjæringer" },
  { key: "z_intensity_per90_pos",     label: "Intensitet"   },
  { key: "z_duel_efficiency_pos",     label: "Duelleff."    },
  { key: "z_pass_efficiency_pos",     label: "Pasningseff." },
]

// ── Percentilsystem — identisk med duell ──────────────────────────────────
function zToPercentile(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-0.5 * z * z)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))))
  const cdf = z >= 0 ? 1 - p : p
  return Math.round(Math.max(1, Math.min(99, cdf * 100)))
}
function pctColor(p: number) {
  if (p >= 85) return "#34d399"
  if (p >= 67) return "#818cf8"
  if (p >= 34) return "#fbbf24"
  return "#f87171"
}
function pctBg(p: number) {
  if (p >= 85) return "rgba(52,211,153,0.1)"
  if (p >= 67) return "rgba(129,140,248,0.1)"
  if (p >= 34) return "rgba(251,191,36,0.08)"
  return "rgba(248,113,113,0.08)"
}
function pctLabel(p: number) {
  if (p >= 85) return "Toppnivå"
  if (p >= 67) return "Over snitt"
  if (p >= 34) return "Rundt snitt"
  return "Under snitt"
}
function zNorm(z: number) { return Math.max(0, Math.min(100, ((z + 3) / 6) * 100)) }
const fp = (v?: number) => (v == null || isNaN(v)) ? "—" : `${(v * 100).toFixed(0)} %`

// ── Percentilsirkel — identisk med duell ──────────────────────────────────
function PctSirkel({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = (size / 2) - 5
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const col = pctColor(pct)
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col}
          strokeWidth={4} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 4px ${col}80)` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-black tabular-nums leading-none" style={{ color: col }}>{pct}</span>
      </div>
    </div>
  )
}

// ── Stor percentilsirkel for hero ──────────────────────────────────────────
function StorPctSirkel({ pct, size = 88, label, sub }: { pct: number; size?: number; label: string; sub: string }) {
  const r = (size / 2) - 7
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const col = pctColor(pct)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col}
            strokeWidth={5} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ filter: `drop-shadow(0 0 6px ${col}90)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black tabular-nums leading-none" style={{ color: col }}>{pct}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-bold text-white/70">{label}</p>
        <p className="text-[9px] text-white/30">{sub}</p>
      </div>
    </div>
  )
}

// ── Percentilbar for statistikklister ─────────────────────────────────────
function PctBar({ pct, raw, enhet, label, fork }: {
  pct: number; raw?: number; enhet: string; label: string; fork: string
}) {
  const [vis, setVis] = useState(false)
  const col = pctColor(pct)
  const fmtRaw = (v?: number) => {
    if (v == null || isNaN(v)) return "—"
    if (enhet === "%") return `${(v > 1 ? v : v * 100).toFixed(1)} %`
    return v.toFixed(2)
  }

  return (
    <div className="group py-3 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-3">
        {/* Percentil-tall */}
        <div className="w-10 flex-shrink-0">
          <span className="text-xl font-black tabular-nums leading-none" style={{ color: col }}>{pct}</span>
        </div>
        {/* Bar + label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-white/45">{label}</span>
              {enhet && <span className="text-[9px] text-white/18">{enhet}</span>}
              <button onClick={() => setVis(!vis)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Info size={9} className="text-white/18 hover:text-white/45" />
              </button>
            </div>
            {raw != null && (
              <span className="text-[10px] text-white/25 tabular-nums">{fmtRaw(raw)}</span>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: col, boxShadow: `0 0 6px ${col}50` }} />
          </div>
        </div>
        {/* Farget nivålabel */}
        <div className="w-20 flex-shrink-0 text-right">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: pctBg(pct), color: col }}>
            {pctLabel(pct)}
          </span>
        </div>
      </div>
      {vis && (
        <p className="text-[10px] text-white/25 mt-2 ml-13 leading-relaxed pl-14">{fork} · Percentil mot samme posisjon.</p>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
export default function PlayerProfilePage() {
  const params = useParams()
  const name = decodeURIComponent(params.name as string)

  const [player,  setPlayer]  = useState<PlayerData | null>(null)
  const [similar, setSimilar] = useState<SimilarPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [apneKat, setApneKat] = useState<string | null>("angrep")

  useEffect(() => {
    const base = "http://localhost:8000"
    Promise.all([
      fetch(`${base}/api/player/${encodeURIComponent(name)}`).then(r => r.json()),
      fetch(`${base}/api/similar/${encodeURIComponent(name)}`).then(r => r.json()),
    ])
      .then(([p, sim]) => {
        setPlayer(p)
        setSimilar(sim.similar || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [name])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(129,140,248,0.2)", borderTopColor: BRAND }} />
      </div>
    </div>
  )

  if (!player) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-white font-bold">Spiller ikke funnet</p>
      <Link href="/player" className="text-sm hover:opacity-80 transition-opacity" style={{ color: BRAND }}>← Tilbake til oversikt</Link>
    </div>
  )

  const logo   = getLogo(player.team_name)
  const pc     = POS_CFG[player.pos_group] || { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: player.pos_group }
  const isU23  = player.player_tier === "u23_prospect"

  // Percentiler — nøkkeltall
  const pctNå    = zToPercentile(player.fair_score > 0 ? (player.fair_score - 1) / 0.35 : -2)
  const pctPred  = zToPercentile(player.forecast_score > 0 ? (player.forecast_score - 1) / 0.35 : -2)
  const pctScout = Math.round(player.scout_priority * 100)
  const pctPos   = Math.round(player.percentile_pos)

  // Radardata fra z-scores
  const radarData = RADAR_AKSER.map(ax => ({
    label: ax.label,
    value: Math.round(zNorm((player as any)[ax.key] ?? 0)),
    fullMark: 100,
  }))

  // Beste rolle
  const bestRolle = ROLLE_CFG.find(r =>
    player.best_role_no?.toLowerCase().includes(r.key) ||
    r.label.toLowerCase().includes((player.best_role_no || "").toLowerCase())
  )

  return (
    <div className="min-h-screen bg-bg0" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        .sthin::-webkit-scrollbar{width:3px}.sthin::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:99px}
      `}</style>

      {/* ── HERO ── */}
      <div className="relative border-b border-white/5 overflow-hidden">
        {/* Bakgrunnslogo */}
        {logo && (
          <div className="absolute right-0 top-0 bottom-0 w-80 pointer-events-none select-none overflow-hidden">
            <Image src={logo} alt="" fill className="object-contain object-right opacity-[0.03] scale-110" />
          </div>
        )}
        {/* Glød */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 100% at 30% 0%, ${BRAND_SOFT} 0%, transparent 70%)` }} />

        <div className="max-w-7xl mx-auto px-8 py-8 relative">
          <Link href="/player"
            className="inline-flex items-center gap-2 text-xs text-white/30 hover:text-white transition-colors mb-6">
            <ArrowLeft size={13} />Tilbake til spilleroversikt
          </Link>

          <div className="flex items-start gap-8">
            {/* Logo */}
            <div className="flex-shrink-0">
              {logo
                ? <div className="w-20 h-20 rounded-2xl border border-white/8 flex items-center justify-center relative overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.04)" }}>
                    <Image src={logo} alt={player.team_name} width={64} height={64} className="object-contain p-1" />
                  </div>
                : <div className="w-20 h-20 rounded-2xl border border-white/8 flex items-center justify-center text-3xl font-black"
                    style={{ background: BRAND_SOFT, color: BRAND }}>
                    {player.player_name.charAt(0)}
                  </div>
              }
            </div>

            {/* Navn + info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                  style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.color}25` }}>{pc.label}</span>
                {isU23 && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>U23 Prospect</span>
                )}
                {player.risk_upside_segment && (
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg text-white/40"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {SEG_LABEL[player.risk_upside_segment] || player.risk_upside_segment}
                  </span>
                )}
                {player.cluster_label && (
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg"
                    style={{ background: BRAND_SOFT, color: BRAND, border: `1px solid ${BRAND_BORDER}` }}>
                    {player.cluster_label}
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-black text-white mb-3 leading-tight" style={{ fontFamily: "'Syne',sans-serif" }}>
                {player.player_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/35">
                {logo && <Image src={logo} alt="" width={16} height={16} className="object-contain" />}
                <span className="text-white/60 font-medium">{player.team_name}</span>
                <span className="text-white/12">·</span>
                <span>{player.nationality}</span>
                <span className="text-white/12">·</span>
                <span>{player.age} år</span>
                <span className="text-white/12">·</span>
                <span>{player.minutes?.toLocaleString()} min</span>
                <span className="text-white/12">·</span>
                <span>{player.games} kamper</span>
              </div>
            </div>

            {/* Tre store sirkler */}
            <div className="hidden lg:flex items-center gap-6 flex-shrink-0">
              <StorPctSirkel pct={pctNå}    size={90} label="Nåværende nivå"  sub="percentil" />
              <StorPctSirkel pct={pctPred}  size={90} label="Predikert nivå"  sub="percentil" />
              <StorPctSirkel pct={pctScout} size={90} label="Scoutprioritet"  sub="percentil" />
            </div>
          </div>

          {/* Mobile sirkler */}
          <div className="flex lg:hidden items-center gap-5 mt-6 pt-5 border-t border-white/5">
            <StorPctSirkel pct={pctNå}    size={76} label="Nåværende" sub="nivå"    />
            <StorPctSirkel pct={pctPred}  size={76} label="Predikert" sub="nivå"    />
            <StorPctSirkel pct={pctScout} size={76} label="Scout"     sub="prioritet" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-12 gap-6">

          {/* ── VENSTRE KOLONNE (4/12) ── */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">

            {/* Nøkkeltall-kort */}
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden border border-white/5">
              <div className="absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${BRAND}, transparent)` }} />
              <p className="text-[9px] uppercase tracking-widest text-white/22 font-bold mb-4">Nøkkeltall</p>
              <div className="space-y-2.5">
                {[
                  { l: "Posisjonspercentil",  v: `${pctPos}`,               c: pctColor(pctPos),  sub: `Bedre enn ${pctPos} % av pos.` },
                  { l: "Pålitelighet",        v: fp(player.reliability),     c: BRAND,             sub: "Datagrunnlag" },
                  { l: "ROI-indeks",          v: player.roi_index?.toFixed(2), c: "rgba(255,255,255,0.75)", sub: "Risikojustert verdi" },
                  { l: "Spilletid",           v: `${player.minutes?.toLocaleString()} min`, c: "rgba(255,255,255,0.6)", sub: `${player.games} kamper, ${player.starts || "—"} starter` },
                  { l: "Alderfaktor",         v: player.age_factor?.toFixed(2), c: "rgba(255,255,255,0.6)", sub: `${player.age} år` },
                ].map(row => (
                  <div key={row.l} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div>
                      <p className="text-[10px] text-white/35">{row.l}</p>
                      {row.sub && <p className="text-[9px] text-white/18 mt-0.5">{row.sub}</p>}
                    </div>
                    <span className="text-sm font-black tabular-nums" style={{ color: row.c }}>{row.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Beste rolle-kort */}
            {player.best_role_no && (
              <div className="rounded-2xl border p-4 relative overflow-hidden"
                style={{ background: BRAND_SOFT, borderColor: BRAND_BORDER, boxShadow: `0 0 24px ${BRAND_GLOW}` }}>
                <div className="absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${BRAND}, transparent)` }} />
                <p className="text-[9px] uppercase tracking-widest text-white/22 font-bold mb-3">Beste rolle</p>
                <div className="flex items-center gap-3">
                  {bestRolle && (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,0,0,0.25)" }}>
                      <bestRolle.ikon size={16} style={{ color: BRAND }} />
                    </div>
                  )}
                  <div>
                    <p className="text-base font-black text-white" style={{ fontFamily: "'Syne',sans-serif" }}>{player.best_role_no}</p>
                    {player.upside_gap_best != null && (
                      <p className="text-[10px] mt-0.5" style={{ color: player.upside_gap_best > 0 ? "#34d399" : "rgba(255,255,255,0.3)" }}>
                        {player.upside_gap_best > 0 ? "+" : ""}{player.upside_gap_best?.toFixed(2)} oppside vs. snitt
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Effektivitetssirkler */}
            <div className="glass-panel rounded-2xl p-5 border border-white/5">
              <p className="text-[9px] uppercase tracking-widest text-white/22 font-bold mb-4">Effektivitet</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Skuddeff.",    pct: zToPercentile((player as any).z_shot_efficiency_pos    ?? 0) },
                  { label: "Duelleff.",    pct: zToPercentile((player as any).z_duel_efficiency_pos    ?? 0) },
                  { label: "Pasningseff.",pct: zToPercentile((player as any).z_pass_efficiency_pos    ?? 0) },
                  { label: "Dribbleff.",  pct: zToPercentile((player as any).z_dribble_efficiency_pos ?? 0) },
                ].map(({ label, pct }) => (
                  <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5"
                    style={{ background: "rgba(255,255,255,0.02)" }}>
                    <PctSirkel pct={pct} size={52} />
                    <p className="text-[9px] text-white/30 text-center">{label}</p>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: pctBg(pct), color: pctColor(pct) }}>
                      {pctLabel(pct)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lignende spillere */}
            {similar.length > 0 && (
              <div className="glass-panel rounded-2xl p-5 border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={11} style={{ color: BRAND }} />
                  <p className="text-[9px] uppercase tracking-widest text-white/22 font-bold">Lignende spillere</p>
                </div>
                <div className="space-y-2">
                  {similar.slice(0, 5).map(s => {
                    const sLogo = getLogo(s.team_name)
                    const spc = POS_CFG[s.pos_group] || { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: s.pos_group }
                    const sPct = Math.round(s.fair_score > 0 ? Math.min(99, Math.max(1, ((s.fair_score - 0.2) / 1.7) * 100)) : 1)
                    return (
                      <Link key={s.player_name} href={`/player/${encodeURIComponent(s.player_name)}`}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 hover:border-white/12 hover:bg-white/3 transition-all group">
                        {sLogo
                          ? <div className="w-7 h-7 relative flex-shrink-0"><Image src={sLogo} alt="" fill className="object-contain" /></div>
                          : <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black"
                              style={{ background: BRAND_SOFT, color: BRAND }}>{s.player_name.charAt(0)}</div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">{s.player_name}</p>
                          <p className="text-[9px] text-white/25 truncate">{s.team_name} · {s.age} år</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: spc.bg, color: spc.color }}>{spc.label}</span>
                          <span className="text-xs font-black tabular-nums" style={{ color: pctColor(sPct) }}>{sPct}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── HØYRE KOLONNE (8/12) ── */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

            {/* Radarkart + posisjonstotal */}
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[9px] uppercase tracking-widest text-white/22 font-bold">Styrker vs. posisjonssnitt</p>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/8"
                  style={{ background: BRAND_SOFT }}>
                  <PctSirkel pct={pctPos} size={28} />
                  <div>
                    <p className="text-[9px] text-white/35">Posisjonspercentil</p>
                    <p className="text-xs font-black" style={{ color: pctColor(pctPos) }}>{pctLabel(pctPos)}</p>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                  <RechartsRadar dataKey="value" stroke={BRAND} fill={BRAND} fillOpacity={0.14} strokeWidth={2}
                    style={{ filter: `drop-shadow(0 0 6px ${BRAND})` }} />
                  <RechTooltip
                    contentStyle={{ background: "rgba(8,8,14,0.97)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11 }}
                    labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                    formatter={(v: number) => [`${v} percentil`, ""]} />
                </RadarChart>
              </ResponsiveContainer>
              {/* Percentil-forklaring */}
              <div className="flex items-center justify-center gap-6 mt-2 pt-3 border-t border-white/5">
                {[
                  { col: "#34d399", l: "Toppnivå (85+)"    },
                  { col: "#818cf8", l: "Over snitt (67–84)" },
                  { col: "#fbbf24", l: "Rundt snitt (34–66)" },
                  { col: "#f87171", l: "Under snitt (<34)"  },
                ].map(({ col, l }) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: col }} />
                    <span className="text-[9px] text-white/28">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistikk-kategorier med percentilbarer */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
              <div className="px-6 pt-5 pb-2">
                <div className="flex items-start gap-2">
                  <Info size={11} style={{ color: BRAND + "70" }} className="flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-white/28 leading-relaxed">
                    Alle tall er <strong className="text-white/50">percentil 0–100</strong> mot samme posisjon i Eliteserien.
                    50 = ligasnitt. 85+ = toppnivå. Det rå tallet vises til høyre.
                  </p>
                </div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {STAT_KAT.map(kat => (
                  <div key={kat.id}>
                    <button onClick={() => setApneKat(apneKat === kat.id ? null : kat.id)}
                      className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-white/2 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{kat.ikon}</span>
                        <span className="text-sm font-bold text-white">{kat.label}</span>
                      </div>
                      {apneKat === kat.id ? <ChevronUp size={13} className="text-white/20" /> : <ChevronDown size={13} className="text-white/20" />}
                    </button>
                    {apneKat === kat.id && (
                      <div className="px-6 pb-4 pt-1" style={{ background: "rgba(255,255,255,0.01)" }}>
                        {kat.stats.map(s => {
                          const z = (player as any)[s.zKey] ?? 0
                          const pct = zToPercentile(z)
                          const raw = (player as any)[s.key]
                          return <PctBar key={s.key} pct={pct} raw={raw} enhet={s.enhet} label={s.label} fork={s.fork} />
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rolleanalyse */}
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <p className="text-[9px] uppercase tracking-widest text-white/22 font-bold mb-5">Rolleanalyse — WSM</p>
              <div className="grid grid-cols-2 gap-4">
                {ROLLE_CFG.map(rolle => {
                  const valVal  = (player as any)[rolle.val]  ?? 0
                  const upside  = (player as any)[rolle.upside] ?? 0
                  const isBest  = player.best_role_no?.toLowerCase().includes(rolle.key) ||
                                  rolle.label.toLowerCase().includes((player.best_role_no || "").toLowerCase())
                  const pct = Math.round(Math.min(99, Math.max(1, (valVal / 2) * 100)))
                  const Icon = rolle.ikon
                  return (
                    <div key={rolle.key} className="rounded-2xl p-4 border relative overflow-hidden transition-all"
                      style={{
                        background: isBest ? BRAND_SOFT : "rgba(255,255,255,0.02)",
                        borderColor: isBest ? BRAND_BORDER : "rgba(255,255,255,0.06)",
                        boxShadow: isBest ? `0 0 20px ${BRAND_GLOW}` : "none",
                      }}>
                      {isBest && (
                        <div className="absolute inset-x-0 top-0 h-px"
                          style={{ background: `linear-gradient(90deg, transparent, ${BRAND}, transparent)` }} />
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: isBest ? "rgba(129,140,248,0.15)" : "rgba(255,255,255,0.05)" }}>
                            <Icon size={14} style={{ color: isBest ? BRAND : "rgba(255,255,255,0.35)" }} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{rolle.label}</p>
                            {isBest && <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(129,140,248,0.2)", color: BRAND }}>BESTE</span>}
                          </div>
                        </div>
                        <PctSirkel pct={pct} size={44} />
                      </div>
                      {/* Oppside */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-[9px] text-white/25">Oppside vs. snitt</span>
                        <span className="text-xs font-black" style={{ color: upside > 0 ? "#34d399" : "#f87171" }}>
                          {upside > 0 ? "+" : ""}{upside.toFixed(2)}
                        </span>
                      </div>
                      {/* Bar */}
                      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: isBest ? BRAND : "rgba(255,255,255,0.15)", boxShadow: isBest ? `0 0 6px ${BRAND}60` : "none" }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* What-if — kun U23 */}
            {isU23 && (
              <div className="rounded-2xl p-6 border relative overflow-hidden"
                style={{ background: "rgba(52,211,153,0.04)", borderColor: "rgba(52,211,153,0.15)" }}>
                <div className="absolute inset-x-0 top-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(52,211,153,0.4), transparent)" }} />
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={12} style={{ color: "#34d399" }} />
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "#34d399" }}>What-if — simulert ved 900 min</p>
                </div>
                <p className="text-[10px] text-white/28 mb-5 leading-relaxed">
                  Hva ville scorene vært om spilleren hadde 900 minutters spilletid?
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {ROLLE_CFG.map(rolle => {
                    const val = (player as any)[rolle.whatif]
                    if (!val) return null
                    const pct = Math.round(Math.min(99, Math.max(1, (val / 2) * 100)))
                    return (
                      <div key={rolle.key} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/6"
                        style={{ background: "rgba(255,255,255,0.02)" }}>
                        <PctSirkel pct={pct} size={52} />
                        <p className="text-[9px] text-white/30 text-center leading-tight">{rolle.label}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}