"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, X, ChevronRight } from "lucide-react"

interface Player {
  player_id: number
  player_name: string
  team_name: string
  age: number
  pos_group: string
  minutes: number
  fair_score: number | null
  forecast_score: number | null
  player_tier: string
  goals: number
  assists: number
  reliability: number
  value_tier: string
  scout_priority: number
}

// ── Fargesystem — identisk med dashboard ──────────────────────────
const C = {
  bg:     "#07080c",
  panel:  "rgba(14, 16, 24, 0.90)",
  border: "rgba(255,255,255,0.05)",
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
const POS_LABEL: Record<string, string> = {
  GK: "GK", DEF: "DEF", MID: "MID", ATT: "ATT",
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

// ── Spillerkort ───────────────────────────────────────────────────
function PlayerCard({ player }: { player: Player }) {
  const logo = getLogo(player.team_name)
  const posColor = POS_COLOR[player.pos_group] ?? C.indigo
  const tier = TIER_CFG[player.value_tier] ?? { color: "rgba(255,255,255,0.3)", label: player.value_tier ?? "" }
  const score = Math.round((player.scout_priority ?? 0) * 100)
  const isU23 = player.player_tier === "u23_prospect"

  return (
    <Link href={`/player/${encodeURIComponent(player.player_name)}`} className="group block">
      <div className="relative rounded-2xl border overflow-hidden transition-all duration-300 h-full"
        style={{ background: C.panel, borderColor: C.border }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = `${tier.color}35`
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${tier.color}10, 0 20px 40px -15px ${tier.color}15`
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = C.border
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = "none"
        }}>

        {/* Top glow line — tier farge */}
        <div className="absolute inset-x-0 top-0 h-px transition-opacity opacity-0 group-hover:opacity-100"
          style={{ background: `linear-gradient(90deg, transparent, ${tier.color}70, transparent)` }} />

        <div className="p-4">
          {/* Header: logo + badges */}
          <div className="flex items-start justify-between mb-3">
            <div className="relative w-9 h-9 flex-shrink-0">
              {logo
                ? <Image src={logo} alt="" fill className="object-contain" />
                : <div className="w-full h-full rounded-xl flex items-center justify-center text-xs font-black"
                    style={{ background: `${posColor}15`, color: posColor }}>
                    {player.player_name.charAt(0)}
                  </div>
              }
            </div>
            <div className="flex items-center gap-1.5">
              {isU23 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${C.violet}15`, color: C.violet, border: `1px solid ${C.violet}25` }}>
                  U23
                </span>
              )}
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: `${posColor}12`, color: posColor, border: `1px solid ${posColor}25` }}>
                {POS_LABEL[player.pos_group] ?? player.pos_group}
              </span>
            </div>
          </div>

          {/* Navn + lag */}
          <div className="mb-3">
            <p className="text-sm font-black text-white leading-tight mb-0.5 group-hover:text-white transition-colors"
              style={{ fontFamily: "'Syne', sans-serif" }}>
              {player.player_name}
            </p>
            <p className="text-[10px] text-white/35">{player.team_name} · {player.age} år</p>
          </div>

          {/* Mål / Assist / Min */}
          <div className="grid grid-cols-3 gap-1 mb-3">
            {[
              { l: "Mål",    v: player.goals ?? 0 },
              { l: "Assist", v: player.assists ?? 0 },
              { l: "Min",    v: player.minutes >= 1000 ? `${(player.minutes/1000).toFixed(1)}k` : player.minutes },
            ].map(s => (
              <div key={s.l} className="rounded-lg py-1.5 text-center border border-white/[0.05]"
                style={{ background: "rgba(255,255,255,0.025)" }}>
                <p className="text-xs font-bold text-white">{s.v}</p>
                <p className="text-[9px] text-white/30">{s.l}</p>
              </div>
            ))}
          </div>

          {/* Scout-prioritet bar + tier */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${score}%`, background: tier.color, boxShadow: `0 0 6px ${tier.color}` }} />
            </div>
            <span className="text-[9px] font-bold tabular-nums flex-shrink-0" style={{ color: tier.color }}>
              {tier.label}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Hoved ─────────────────────────────────────────────────────────
export default function PlayerOverviewPage() {
  const [players,     setPlayers]     = useState<Player[]>([])
  const [filtered,    setFiltered]    = useState<Player[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState("")
  const [selectedPos, setSelectedPos] = useState("Alle")
  const [selectedTier,setSelectedTier]= useState("Alle")

  useEffect(() => {
    fetch("http://localhost:8000/api/players?limit=254&sort_by=scout_priority")
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : []
        setPlayers(arr)
        setFiltered(arr)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let res = [...players]
    if (search)
      res = res.filter(p =>
        p.player_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.team_name?.toLowerCase().includes(search.toLowerCase())
      )
    if (selectedPos !== "Alle") res = res.filter(p => p.pos_group === selectedPos)
    if (selectedTier !== "Alle") {
      if (selectedTier === "U23")    res = res.filter(p => p.player_tier === "u23_prospect")
      else if (selectedTier === "Elite") res = res.filter(p => p.value_tier === "Elite")
      else res = res.filter(p => p.player_tier === "senior")
    }
    setFiltered(res)
  }, [search, selectedPos, selectedTier, players])

  const hasFilter = search || selectedPos !== "Alle" || selectedTier !== "Alle"

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: C.bg }}>
      <p className="text-sm text-white/25">Laster spillere…</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full opacity-[0.025]"
          style={{ background: C.indigo, filter: "blur(80px)" }} />
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-10 space-y-8">

        {/* ── SØKE- OG FILTERPANEL ──────────────────── */}
        <div className="relative rounded-2xl border overflow-hidden"
          style={{ background: C.panel, borderColor: C.border }}>
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${C.indigo}60, transparent)` }} />

          <div className="p-5">
            {/* Søkefelt */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                type="text"
                placeholder="Søk på navn eller lag…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/25 focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${search ? C.indigo + "50" : "rgba(255,255,255,0.07)"}`,
                }}
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filtre */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Posisjon */}
              <div className="flex items-center gap-1.5">
                {["Alle","MID","ATT","DEF","GK"].map(pos => {
                  const active = selectedPos === pos
                  const pc = POS_COLOR[pos] ?? C.indigo
                  return (
                    <button key={pos} onClick={() => setSelectedPos(pos)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
                      style={{
                        background: active ? `${pc}18` : "rgba(255,255,255,0.03)",
                        borderWidth: 1, borderStyle: "solid",
                        borderColor: active ? `${pc}40` : "rgba(255,255,255,0.06)",
                        color: active ? pc : "rgba(255,255,255,0.40)",
                      }}>
                      {pos}
                    </button>
                  )
                })}
              </div>

              <div className="h-4 w-px bg-white/10" />

              {/* Tier */}
              <div className="flex items-center gap-1.5">
                {[
                  { k: "Alle",   l: "Alle"   },
                  { k: "Elite",  l: "Elite"  },
                  { k: "Senior", l: "Senior" },
                  { k: "U23",    l: "U23"    },
                ].map(({ k, l }) => {
                  const active = selectedTier === k
                  const tc = k === "Elite" ? C.emerald : k === "U23" ? C.violet : C.indigo
                  return (
                    <button key={k} onClick={() => setSelectedTier(k)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
                      style={{
                        background: active ? `${tc}18` : "rgba(255,255,255,0.03)",
                        borderWidth: 1, borderStyle: "solid",
                        borderColor: active ? `${tc}40` : "rgba(255,255,255,0.06)",
                        color: active ? tc : "rgba(255,255,255,0.40)",
                      }}>
                      {l}
                    </button>
                  )
                })}
              </div>

              {/* Teller + nullstill */}
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[11px] text-white/30">
                  <span className="text-white font-semibold">{filtered.length}</span> spillere
                </span>
                {hasFilter && (
                  <button
                    onClick={() => { setSearch(""); setSelectedPos("Alle"); setSelectedTier("Alle") }}
                    className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors">
                    Nullstill <X size={9} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── SPILLERGRID ───────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Search size={24} className="text-white/10" />
            <p className="text-sm text-white/25">Ingen spillere matcher søket</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.slice(0, 96).map(p => (
                <PlayerCard key={p.player_id || p.player_name} player={p} />
              ))}
            </div>
            {filtered.length > 96 && (
              <p className="text-center text-[11px] text-white/22 pt-4">
                Viser 96 av {filtered.length} — bruk søk for å finne flere
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}