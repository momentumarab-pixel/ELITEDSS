"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  LayoutDashboard, ArrowUpRight, ChevronRight,
  BarChart3, Crosshair, Gauge, GitCompare, Users, Radar,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────
interface Stats {
  total_players: number; senior_players: number; u23_players: number
  elite_count: number; total_goals: number; total_assists: number
  avg_age: number; avg_reliability: number
  top_scorer: { name: string; goals: number; team: string }
  top_assister: { name: string; assists: number; team: string }
  top_fair_score: { name: string; fair_score: number; team: string }
  top_scout: { name: string; scout_priority: number; tier: string }
  risk_upside_segments: Record<string, number>
}
interface Player {
  player_name: string; team_name: string; pos_group: string
  age: number; fair_score: number; forecast_score: number
  scout_priority: number; reliability: number
  goals: number; assists: number; value_tier: string; best_role_no: string
}
interface ValueTier { tier: string; count: number; pct: number; color: string; top3: string[] }

// ── Fargesystem ────────────────────────────────────────────────────
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

const POS_COLOR: Record<string, string> = {
  GK: C.amber, DEF: C.blue, MID: C.violet, ATT: C.rose,
}

const TIER_CFG: Record<string, { color: string; label: string }> = {
  "Elite":       { color: C.emerald, label: "Elite"      },
  "Over snitt":  { color: C.indigo,  label: "Etablert"   },
  "Rundt snitt": { color: C.amber,   label: "Utviklende" },
  "Under snitt": { color: C.rose,    label: "Begrenset"  },
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

// ── Panel ──────────────────────────────────────────────────────────
function Panel({ children, className = "", glow }: { children: React.ReactNode; className?: string; glow?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${className}`}
      style={{ background: C.panel, borderColor: C.border, boxShadow: glow ? `0 0 0 1px ${glow}22, 0 20px 40px -20px rgba(0,0,0,0.7)` : "0 20px 40px -20px rgba(0,0,0,0.7)" }}>
      {glow && (
        <div className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${glow}80, transparent)` }} />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ── Hero Metric ────────────────────────────────────────────────────
function HeroMetric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="group relative rounded-2xl border overflow-hidden transition-all duration-300"
      style={{
        background: `${C.panel}`,
        borderColor: C.border,
        boxShadow: `0 0 0 1px transparent`,
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = `${color}40`
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${color}15, 0 0 30px -5px ${color}20`
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = C.border
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 1px transparent"
      }}>
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
      <div className="p-5">
        <p className="text-[42px] font-black leading-none tracking-tight text-white tabular-nums mb-2"
          style={{ fontFamily: "'Syne', sans-serif", textShadow: `0 0 30px ${color}40` }}>
          {value}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${color}90` }}>
          {label}
        </p>
      </div>
    </div>
  )
}

// ── Scout Row ──────────────────────────────────────────────────────
function ScoutRow({ player, rank }: { player: Player; rank: number }) {
  const logo = getLogo(player.team_name)
  const tier = TIER_CFG[player.value_tier] ?? TIER_CFG["Rundt snitt"]
  const score = Math.round(player.scout_priority * 100)
  const rel = Math.round(player.reliability * 100)
  const relColor = rel >= 75 ? C.emerald : rel >= 50 ? C.amber : "rgba(255,255,255,0.25)"
  const posColor = POS_COLOR[player.pos_group] ?? C.indigo

  return (
    <Link href={`/player/${encodeURIComponent(player.player_name)}`}
      className="group flex items-center gap-4 px-5 py-3.5 transition-all duration-200 hover:bg-white/[0.02]"
      style={{ borderBottom: `1px solid rgba(255,255,255,0.025)` }}>
      <span className="w-5 text-[10px] font-mono font-bold text-white/15 tabular-nums flex-shrink-0">{rank.toString().padStart(2,"0")}</span>
      <div className="relative h-6 w-6 flex-shrink-0">
        {logo
          ? <Image src={logo} alt="" fill className="object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
          : <div className="h-full w-full rounded border border-white/5 bg-white/[0.02]" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-white group-hover:text-white transition-colors">
            {player.player_name}
          </p>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${posColor}12`, color: posColor, border: `1px solid ${posColor}25` }}>
            {player.pos_group}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-white/30 truncate">
          {player.team_name} · {player.age} år ·{" "}
          <span style={{ color: relColor }}>Pålitelighet {rel}%</span>
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-14 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="h-full rounded-full" style={{ width: `${score}%`, background: tier.color, boxShadow: `0 0 6px ${tier.color}` }} />
        </div>
        <span className="w-8 text-right text-sm font-black tabular-nums" style={{ color: tier.color }}>
          {score}%
        </span>
      </div>
    </Link>
  )
}

// ── Top Performer ──────────────────────────────────────────────────
function TopPerformer({ title, name, team, value, unit, logo, color }: {
  title: string; name: string; team: string; value: number; unit: string; logo: string | null; color: string
}) {
  return (
    <div className="relative rounded-2xl border overflow-hidden"
      style={{ background: `${color}06`, borderColor: `${color}20`, boxShadow: `0 0 30px -10px ${color}20` }}>
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}70, transparent)` }} />
      <div className="p-4">
        <p className="text-[9px] font-semibold uppercase tracking-widest mb-3" style={{ color: `${color}80` }}>{title}</p>
        <div className="flex items-center gap-3">
          {logo && (
            <div className="relative h-9 w-9 flex-shrink-0">
              <Image src={logo} alt="" fill className="object-contain" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{name}</p>
            <p className="text-[10px] text-white/35 truncate">{team}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-black tabular-nums leading-none"
              style={{ color, fontFamily: "'Syne',sans-serif", textShadow: `0 0 20px ${color}60` }}>
              {value}
            </p>
            <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: `${color}55` }}>{unit}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Ligakvalitet rad — enkel horisontal bar ────────────────────────
function TierRow({ label, count, pct, color }: { label: string; count: number; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-4 py-2.5">
      <span className="w-24 text-[11px] font-semibold text-white flex-shrink-0">{label}</span>
      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <span className="text-[10px] text-white/30 w-7 text-right tabular-nums flex-shrink-0">{pct}%</span>
      <span className="text-sm font-black tabular-nums w-8 text-right flex-shrink-0"
        style={{ color, textShadow: `0 0 10px ${color}60` }}>{count}</span>
    </div>
  )
}

// ── MiniRadar ──────────────────────────────────────────────────────
function MiniRadar({ values, color }: { values: number[]; color: string }) {
  const size = 64; const center = size / 2; const radius = size * 0.38
  const angles = [0, 72, 144, 216, 288].map(d => d * Math.PI / 180)
  const pts = (vals: number[], r: number) => vals.map((v, i) => {
    const rr = r * (v / 100)
    return `${center + rr * Math.sin(angles[i])},${center - rr * Math.cos(angles[i])}`
  }).join(" ")
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.33, 0.66, 1].map(f => (
        <polygon key={f} points={pts([100,100,100,100,100], radius * f)}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      <polygon points={pts(values, radius)} fill={color} fillOpacity="0.12"
        stroke={color} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  )
}

// ── Sparkline ──────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80; const h = 32
  const mn = Math.min(...data); const mx = Math.max(...data); const rng = mx - mn || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * h}`).join(" ")
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  )
}

// ── Analyseverktøy-kort ────────────────────────────────────────────
function ToolCard({ title, href, desc, cta, viz, glowColor }: {
  title: string; href: string; desc: string; cta: string; viz: React.ReactNode; glowColor: string
}) {
  return (
    <Link href={href} className="group block">
      <div className="relative rounded-2xl border overflow-hidden transition-all duration-300"
        style={{ background: C.panel, borderColor: C.border }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = `${glowColor}35`
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${glowColor}10, 0 20px 40px -15px ${glowColor}20`
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = C.border
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = "none"
        }}>
        <div className="absolute inset-x-0 top-0 h-px transition-opacity opacity-0 group-hover:opacity-100"
          style={{ background: `linear-gradient(90deg, transparent, ${glowColor}70, transparent)` }} />
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm font-black text-white" style={{ fontFamily: "'Syne',sans-serif" }}>{title}</p>
            <ArrowUpRight size={12} className="text-white/20 group-hover:text-white/50 transition-colors mt-0.5" />
          </div>
          {/* Visualisering */}
          <div className="flex items-center justify-center h-16 mb-4">
            {viz}
          </div>
          <p className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.38)" }}>{desc}</p>
          <span className="text-[10px] font-semibold" style={{ color: glowColor }}>{cta} →</span>
        </div>
      </div>
    </Link>
  )
}

// ── Hoved ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [tiers,   setTiers]   = useState<ValueTier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const B = "http://localhost:8000"
    Promise.all([
      fetch(`${B}/api/stats`).then(r => r.json()),
      fetch(`${B}/api/players?limit=254&sort_by=scout_priority`).then(r => r.json()),
      fetch(`${B}/api/value-tiers`).then(r => r.json()),
    ])
      .then(([s, p, vt]) => { setStats(s); setPlayers(Array.isArray(p) ? p : []); setTiers(Array.isArray(vt) ? vt : []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: C.bg }}>
      <p className="text-sm text-white/25">Laster scouting-data…</p>
    </div>
  )

  const topScout  = [...players].sort((a, b) => b.scout_priority - a.scout_priority).slice(0, 6)
  const scorerLogo   = stats ? getLogo(stats.top_scorer.team) : null
  const assisterLogo = stats ? getLogo(stats.top_assister?.team ?? "") : null
  const elitePct  = stats ? Math.round((stats.elite_count / stats.total_players) * 100) : 0
  const u23Pct    = stats ? Math.round((stats.u23_players / stats.total_players) * 100) : 0

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full opacity-[0.03]"
          style={{ background: C.indigo, filter: "blur(80px)" }} />
      </div>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div className="relative border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="max-w-[1400px] mx-auto px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">

            {/* CTA venstre */}
            <div className="max-w-lg">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-7 w-7 rounded-xl border flex items-center justify-center"
                  style={{ background: `${C.indigo}12`, borderColor: `${C.indigo}30` }}>
                  <LayoutDashboard size={13} style={{ color: C.indigo }} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Eliteserien 2025 · Sesonganalyse
                </span>
              </div>
              <h1 className="text-[48px] font-black leading-none tracking-tight text-white mb-2"
                style={{ fontFamily: "'Syne', sans-serif" }}>
                ScoutDesk
              </h1>
              <p className="text-2xl font-medium text-white/25 mb-5" style={{ fontFamily: "'Syne', sans-serif" }}>
                Professional Scouting
              </p>
              <p className="text-sm leading-relaxed text-white/40 max-w-sm mb-8">
                Datadrevet rekruttering for norsk toppfotball.
                {stats && ` ${stats.total_players} spillere analysert på tvers av nivå, rolle og potensial.`}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/scout"
                  className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                  style={{ background: `${C.indigo}18`, border: `1px solid ${C.indigo}35` }}>
                  Start scouting <ArrowUpRight size={13} className="text-white/40" />
                </Link>
                <Link href="/analyse"
                  className="inline-flex items-center gap-2.5 rounded-xl border px-6 py-3.5 text-sm font-semibold text-white/60 transition-all hover:-translate-y-0.5 hover:text-white"
                  style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                  <BarChart3 size={13} className="text-white/30" /> Avansert analyse
                </Link>
              </div>
            </div>

            {/* 4 nøkkeltall — gløende hover-border */}
            {stats && (
              <div className="grid grid-cols-2 gap-3 lg:min-w-[420px]">
                <HeroMetric label="Spillere"    value={stats.total_players}  color={C.indigo}  />
                <HeroMetric label="Mål"         value={stats.total_goals}    color={C.rose}    />
                <HeroMetric label={`Elite · ${elitePct}%`} value={stats.elite_count} color={C.emerald} />
                <HeroMetric label={`U23 · ${u23Pct}%`}     value={stats.u23_players} color={C.violet}  />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN ──────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-8 py-10 space-y-10">

        {/* Rad 1: Scout + høyre kolonne */}
        <div className="grid grid-cols-12 gap-6">

          {/* Scout-prioritet */}
          <div className="col-span-12 lg:col-span-7">
            <Panel glow={C.indigo}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-2">
                  <Crosshair size={12} style={{ color: C.indigo }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Scout-prioritet</span>
                </div>
                <Link href="/scout" className="flex items-center gap-1 text-[10px] text-white/22 hover:text-white/50 transition-colors">
                  Se alle <ChevronRight size={10} />
                </Link>
              </div>
              <div>
                {topScout.map((p, i) => <ScoutRow key={p.player_name} player={p} rank={i + 1} />)}
              </div>
            </Panel>
          </div>

          {/* Høyre: Toppscorer + Topassister + Ligakvalitet */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            {stats && (
              <>
                <TopPerformer
                  title="Toppscorer" name={stats.top_scorer.name}
                  team={stats.top_scorer.team} value={stats.top_scorer.goals}
                  unit="mål" logo={scorerLogo} color={C.rose} />
                {stats.top_assister && (
                  <TopPerformer
                    title="Toppassist" name={stats.top_assister.name}
                    team={stats.top_assister.team} value={stats.top_assister.assists}
                    unit="assist" logo={assisterLogo} color={C.emerald} />
                )}
              </>
            )}

            {/* Ligakvalitet */}
            <Panel>
              <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-2">
                  <Gauge size={12} className="text-white/30" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Ligakvalitet</span>
                </div>
              </div>
              <div className="px-5 py-3 space-y-0.5">
                {tiers.map(vt => {
                  const cfg = TIER_CFG[vt.tier] ?? { color: "#94a3b8", label: vt.tier }
                  return <TierRow key={vt.tier} label={cfg.label} count={vt.count} pct={vt.pct} color={cfg.color} />
                })}
              </div>
            </Panel>
          </div>
        </div>

        {/* Rad 2: Analyseverktøy */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/22 mb-5">Analyseverktøy</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            <ToolCard
              title="Spillerprofil"
              href="/player"
              glowColor={C.indigo}
              desc="Detaljert analyse av enkeltspillere — radar, per-90 statistikker, rolleprofil og scout-vurdering."
              cta="Utforsk spillere"
              viz={
                <div className="flex gap-1.5 items-end h-12">
                  {[55,72,88,64,91,78,83,60,95,70].map((v, i) => (
                    <div key={i} className="w-2.5 rounded-t-sm"
                      style={{ height: `${v}%`, background: `${C.indigo}`, opacity: 0.5 + (v / 200),
                               boxShadow: v > 80 ? `0 0 6px ${C.indigo}` : "none" }} />
                  ))}
                </div>
              }
            />

            <ToolCard
              title="Sammenligning"
              href="/duell"
              glowColor={C.emerald}
              desc="Sammenlign to spillere direkte på 10 statistikker — radar, nøkkelpass, dueller og mye mer."
              cta="Start duell"
              viz={
                <div className="flex items-center gap-3">
                  <MiniRadar values={[85, 70, 92, 60, 78]} color={C.emerald} />
                  <span className="text-[10px] font-bold text-white/20">VS</span>
                  <MiniRadar values={[72, 88, 58, 91, 65]} color={C.indigo} />
                </div>
              }
            />

            <ToolCard
              title="Scout-senteret"
              href="/scout"
              glowColor={C.violet}
              desc="Filtrer på posisjon, alder og nivå. Rangert etter scout-prioritet, ROI og forecast score."
              cta="Åpne scout-filter"
              viz={
                <div className="text-center">
                  <Sparkline data={[40,48,61,70,65,79,74,88,85,94]} color={C.violet} />
                  <p className="text-[9px] text-white/25 mt-1.5" style={{ color: C.violet }}>Scout-prioritet ↑ sesong 2025</p>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}