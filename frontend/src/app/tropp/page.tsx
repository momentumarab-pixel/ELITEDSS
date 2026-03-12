"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  Users, Plus, X, Save, RefreshCw, Search, FileText,
  ArrowLeft, ChevronRight, RotateCcw, Wrench,
  Minus, Circle, Square, ArrowRight, Trash2,
  AlertTriangle, Crown, Zap, BarChart3, Clock,
  BookOpen, Star, Activity, TrendingUp, Archive,
  Edit3, Check, PlusCircle, ArrowLeftRight, Shield
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from "recharts"

// ── Types ──────────────────────────────────────────────────────────────────
interface Player {
  player_name: string; team_name: string; age: number
  pos_group: string; fair_score: number; forecast_score: number | null; minutes: number
}
interface InjuryLog   { reason: string; returnDate: string; date: string }
interface MatchRating { rating: number; opponent: string; date: string; note?: string }
interface PlayerNote  { text: string; updatedAt: string }
interface CoachNote   { id: string; title: string; text: string; date: string; formation: string }
interface SquadPlayer extends Player {
  slot: string; shirt_number: number; salary: number; px: number; py: number
  status?: "fit"|"injured"|"suspended"|"doubt"
  instruction?: string
}
interface PlannedSub { fromSlot: string; toBenchIdx: number }

// ── Formations (keeper bottom y≈88, strikers top y≈14) ────────────────────
type SlotDef = { x:number; y:number; label:string; group:string }
const FORMATIONS: Record<string,{label:string;description:string;slots:Record<string,SlotDef>}> = {
  "4-3-3": {
    label:"4-3-3", description:"Angrepsorientert — tre angripere presser høyt",
    slots:{
      gk:  {x:50,y:88,label:"GK", group:"GK" },
      lb:  {x:18,y:72,label:"LB", group:"DEF"}, cb2:{x:38,y:74,label:"CB",group:"DEF"},
      cb1: {x:62,y:74,label:"CB", group:"DEF"}, rb: {x:82,y:72,label:"RB",group:"DEF"},
      cm2: {x:30,y:52,label:"CM", group:"MID"}, cm1:{x:50,y:50,label:"CM",group:"MID"},
      cm3: {x:70,y:52,label:"CM", group:"MID"},
      lw:  {x:18,y:22,label:"LW", group:"ATT"}, st1:{x:50,y:14,label:"ST",group:"ATT"},
      rw:  {x:82,y:22,label:"RW", group:"ATT"},
    }
  },
  "4-4-2": {
    label:"4-4-2", description:"Klassisk og balansert — solid defensiv blokk",
    slots:{
      gk:  {x:50,y:88,label:"GK",group:"GK" },
      lb:  {x:18,y:72,label:"LB",group:"DEF"}, cb2:{x:38,y:74,label:"CB",group:"DEF"},
      cb1: {x:62,y:74,label:"CB",group:"DEF"}, rb: {x:82,y:72,label:"RB",group:"DEF"},
      lm:  {x:18,y:50,label:"LM",group:"MID"}, cm2:{x:40,y:52,label:"CM",group:"MID"},
      cm1: {x:60,y:52,label:"CM",group:"MID"}, rm: {x:82,y:50,label:"RM",group:"MID"},
      st2: {x:38,y:16,label:"ST",group:"ATT"}, st1:{x:62,y:16,label:"ST",group:"ATT"},
    }
  },
  "4-2-3-1": {
    label:"4-2-3-1", description:"Moderne — dobbeltstopper beskytter bakrom",
    slots:{
      gk:  {x:50,y:88,label:"GK", group:"GK" },
      lb:  {x:18,y:72,label:"LB", group:"DEF"}, cb2:{x:38,y:74,label:"CB", group:"DEF"},
      cb1: {x:62,y:74,label:"CB", group:"DEF"}, rb: {x:82,y:72,label:"RB", group:"DEF"},
      dm2: {x:40,y:58,label:"DM", group:"MID"}, dm1:{x:60,y:58,label:"DM", group:"MID"},
      lam: {x:22,y:36,label:"LAM",group:"MID"}, cam:{x:50,y:34,label:"CAM",group:"MID"},
      ram: {x:78,y:36,label:"RAM",group:"MID"},
      st1: {x:50,y:14,label:"ST", group:"ATT"},
    }
  },
  "3-5-2": {
    label:"3-5-2", description:"Wingbacks dominerer bredden — kontroll på midten",
    slots:{
      gk:  {x:50,y:88,label:"GK", group:"GK" },
      cb3: {x:28,y:74,label:"CB", group:"DEF"}, cb2:{x:50,y:76,label:"CB", group:"DEF"},
      cb1: {x:72,y:74,label:"CB", group:"DEF"},
      lwb: {x:10,y:54,label:"LWB",group:"MID"}, cm3:{x:30,y:50,label:"CM", group:"MID"},
      cm2: {x:50,y:48,label:"CM", group:"MID"}, cm1:{x:70,y:50,label:"CM", group:"MID"},
      rwb: {x:90,y:54,label:"RWB",group:"MID"},
      st2: {x:36,y:16,label:"ST", group:"ATT"}, st1:{x:64,y:16,label:"ST",group:"ATT"},
    }
  },
  "5-3-2": {
    label:"5-3-2", description:"Defensiv kompakthet — fem bak, rask kontra",
    slots:{
      gk:  {x:50,y:88,label:"GK",group:"GK" },
      lb:  {x:10,y:66,label:"LB",group:"DEF"}, cb3:{x:28,y:74,label:"CB",group:"DEF"},
      cb2: {x:50,y:76,label:"CB",group:"DEF"}, cb1:{x:72,y:74,label:"CB",group:"DEF"},
      rb:  {x:90,y:66,label:"RB",group:"DEF"},
      cm3: {x:28,y:48,label:"CM",group:"MID"}, cm2:{x:50,y:46,label:"CM",group:"MID"},
      cm1: {x:72,y:48,label:"CM",group:"MID"},
      st2: {x:36,y:16,label:"ST",group:"ATT"}, st1:{x:64,y:16,label:"ST",group:"ATT"},
    }
  },
}

// ── Design tokens ──────────────────────────────────────────────────────────
const GC: Record<string,{bg:string;ring:string;dark:string;pill:string}> = {
  GK:  {bg:"#f59e0b",ring:"#fbbf24",dark:"#78350f",pill:"bg-amber-500/15 text-amber-300 border-amber-500/25"},
  DEF: {bg:"#3b82f6",ring:"#60a5fa",dark:"#1e3a8a",pill:"bg-blue-500/15 text-blue-300 border-blue-500/25"},
  MID: {bg:"#22c55e",ring:"#4ade80",dark:"#14532d",pill:"bg-green-500/15 text-green-300 border-green-500/25"},
  ATT: {bg:"#ef4444",ring:"#f87171",dark:"#7f1d1d",pill:"bg-red-500/15 text-red-300 border-red-500/25"},
}
const STATUS_CFG = {
  fit:       {color:"#22c55e",label:"Klar",       badge:"✓"},
  doubt:     {color:"#f59e0b",label:"Tvilsom",    badge:"?"},
  injured:   {color:"#ef4444",label:"Skadet",     badge:"✗"},
  suspended: {color:"#a855f7",label:"Suspendert", badge:"S"},
}
const TOOL_COLORS = ["#ffffff","#ef4444","#22c55e","#3b82f6","#f59e0b","#a855f7"]
type DrawTool = "arrow"|"curve"|"line"|"circle"|"rect"|"select"
interface DrawShape {id:string;type:DrawTool;points:number[];color:string;width:number}

const SHIRT:Record<string,number> = {
  gk:1,rb:2,lb:3,cb1:5,cb2:6,cm1:8,st1:9,cm2:10,lm:11,
  rw:7,lw:11,dm1:6,dm2:8,cam:10,ram:7,lam:11,cm3:4,
  cb3:4,rwb:2,lwb:3,st2:18,rm:7,dm3:4,
}
const fmt   = (v?:number)=>!v?"—":v>=1e6?`${(v/1e6).toFixed(1)}M`:`${(v/1000).toFixed(0)}k`
const fmtKr = (v?:number)=>!v?"—":`${fmt(v)} kr`
function seedSal(n:string){let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;return 400000+(h%1600000)}
const uid  = ()=>Math.random().toString(36).slice(2,9)
const today= ()=>new Date().toLocaleDateString("nb-NO",{day:"2-digit",month:"short",year:"numeric"})

type RightTab = "lag"|"notat"|"bok"|"skade"

// ══════════════════════════════════════════════════════════════════════════
export default function TroppPage() {
  // Core state
  const [all,setAll]               = useState<Player[]>([])
  const [formation,setFormation]   = useState("4-3-3")
  const [squad,setSquad]           = useState<Record<string,SquadPlayer>>({})
  const [bench,setBench]           = useState<SquadPlayer[]>([])
  const [activeSlot,setAS]         = useState<string|null>(null)
  const [search,setSrch]           = useState("")
  const [posF,setPosF]             = useState("Alle")
  const [focus,setFocus]           = useState<SquadPlayer|null>(null)
  const [captainSlot,setCaptain]   = useState<string|null>(null)
  const [saved,setSaved]           = useState(false)
  const [dragging,setDragging]     = useState<string|null>(null)
  const [rightTab,setRightTab]     = useState<RightTab>("lag")
  const [plannedSubs,setPlanned]   = useState<PlannedSub[]>([])
  const [subMode,setSubMode]       = useState<string|null>(null) // slotId being subbed

  // Coach notes (archived)
  const [coachNotes,setCNotes]     = useState<CoachNote[]>([])
  const [draftTitle,setDraftTitle] = useState("")
  const [draftText,setDraftText]   = useState("")
  const [viewNote,setViewNote]     = useState<CoachNote|null>(null)

  // Player notebook
  const [noteSearch,setNSrch]      = useState("")
  const [notePlayer,setNPlayer]    = useState<string|null>(null)
  const [playerNotes,setPN]        = useState<Record<string,PlayerNote>>({})

  // Match ratings
  const [matchRatings,setMR]       = useState<Record<string,MatchRating[]>>({})
  const [ratingPlayer,setRP]       = useState<string|null>(null)
  const [ratingSearch,setRSrch]    = useState("")
  const [newRating,setNR]          = useState({rating:7,opponent:"",note:"",date:""})

  // Injury logs
  const [injuryLogs,setIL]         = useState<Record<string,InjuryLog>>({})
  const [injPlayer,setInjP]        = useState<string|null>(null)
  const [injSearch,setInjSrch]     = useState("")
  const [newInj,setNI]             = useState({reason:"",returnDate:"",date:""})

  // Drawing
  const [showTools,setShowTools]   = useState(false)
  const [drawTool,setDrawTool]     = useState<DrawTool>("arrow")
  const [drawColor,setDrawColor]   = useState("#ef4444")
  const [drawWidth,setDrawWidth]   = useState(2)
  const [shapes,setShapes]         = useState<DrawShape[]>([])
  const [drawing,setDrawing]       = useState(false)
  const [startPt,setStartPt]       = useState<{x:number;y:number}|null>(null)
  const [curPt,setCurPt]           = useState<{x:number;y:number}|null>(null)
  const [selShape,setSelShape]     = useState<string|null>(null)

  const pitchRef = useRef<HTMLDivElement>(null)
  const svgRef   = useRef<SVGSVGElement>(null)
  const slots    = FORMATIONS[formation].slots

  // ── Persist ──────────────────────────────────────────────────────────────
  useEffect(()=>{
    fetch("http://localhost:8000/api/players?limit=254").then(r=>r.json()).then(setAll).catch(()=>{})
    const load = (k:string)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):null }catch{return null} }
    setSquad(load("t_sq")||{});    setBench(load("t_bn")||[])
    setCNotes(load("t_cn")||[]);   setPN(load("t_pn")||{})
    setMR(load("t_mr")||{});       setIL(load("t_il")||{})
    setShapes(load("t_sh")||[]);   setPlanned(load("t_ps")||[])
    const f=load("t_fm"); if(f)setFormation(f)
    const cp=load("t_cp"); if(cp)setCaptain(cp)
    const dt=load("t_dt"); if(dt)setDraftTitle(dt)
    const dtx=load("t_dtx"); if(dtx)setDraftText(dtx)
  },[])

  const p = useCallback((k:string,v:any)=>{ try{localStorage.setItem(k,JSON.stringify(v))}catch{} },[])

  const saveAll = ()=>{
    p("t_sq",squad); p("t_bn",bench); p("t_cn",coachNotes)
    p("t_pn",playerNotes); p("t_mr",matchRatings); p("t_il",injuryLogs)
    p("t_sh",shapes); p("t_fm",formation); p("t_cp",captainSlot)
    p("t_ps",plannedSubs); p("t_dt",draftTitle); p("t_dtx",draftText)
    setSaved(true); setTimeout(()=>setSaved(false),2000)
  }

  // Auto-save draft as you type
  useEffect(()=>{ p("t_dt",draftTitle); p("t_dtx",draftText) },[draftTitle,draftText])

  // ── Formation change ──────────────────────────────────────────────────────
  const changeFormation = (newF:string)=>{
    const newSlots=FORMATIONS[newF].slots
    const newIds=Object.keys(newSlots)
    const newSquad:Record<string,SquadPlayer>={}
    Object.entries(squad).forEach(([,pl],i)=>{
      const id=newIds[i]
      if(id&&newSlots[id]) newSquad[id]={...pl,slot:id,shirt_number:SHIRT[id]||10,px:newSlots[id].x,py:newSlots[id].y}
    })
    setFormation(newF); setSquad(newSquad); setFocus(null); setPlanned([])
    localStorage.setItem("t_fm",newF)
  }

  // ── Squad management ──────────────────────────────────────────────────────
  const pick=(pl:Player)=>{
    if(!activeSlot)return
    const isBench=activeSlot.startsWith("bench")
    const def=isBench?{x:50,y:50}:(slots[activeSlot]||{x:50,y:50})
    const sp:SquadPlayer={...pl,slot:activeSlot,shirt_number:SHIRT[activeSlot]||10,salary:seedSal(pl.player_name),px:def.x,py:def.y,status:"fit"}
    if(isBench) setBench(prev=>[...prev.filter(x=>x.player_name!==pl.player_name),sp])
    else setSquad(prev=>({...prev,[activeSlot]:sp}))
    setAS(null); setSrch("")
  }
  const rmSlot=(id:string)=>{
    setSquad(prev=>{const n={...prev};delete n[id];return n})
    setPlanned(prev=>prev.filter(s=>s.fromSlot!==id))
    if(focus?.slot===id)setFocus(null)
    if(captainSlot===id)setCaptain(null)
  }
  const rmBench=(name:string)=>{
    setBench(prev=>prev.filter(x=>x.player_name!==name))
    if(focus?.player_name===name)setFocus(null)
  }
  const setStatus=(slot:string,status:SquadPlayer["status"])=>{
    setSquad(prev=>prev[slot]?{...prev,[slot]:{...prev[slot],status}}:prev)
    if(focus?.slot===slot)setFocus(f=>f?{...f,status}:f)
  }

  // ── Planned substitutions ─────────────────────────────────────────────────
  const toggleSub=(fromSlot:string,toBenchIdx:number)=>{
    setPlanned(prev=>{
      const exists=prev.find(s=>s.fromSlot===fromSlot&&s.toBenchIdx===toBenchIdx)
      if(exists)return prev.filter(s=>!(s.fromSlot===fromSlot&&s.toBenchIdx===toBenchIdx))
      return [...prev.filter(s=>s.fromSlot!==fromSlot&&s.toBenchIdx!==toBenchIdx),{fromSlot,toBenchIdx}]
    })
    setSubMode(null)
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  const archiveNote=()=>{
    if(!draftText.trim())return
    const note:CoachNote={id:uid(),title:draftTitle.trim()||`Notat ${today()}`,text:draftText,date:today(),formation}
    const updated=[note,...coachNotes]
    setCNotes(updated); p("t_cn",updated)
    setDraftTitle(""); setDraftText(""); p("t_dt",""); p("t_dtx","")
  }
  const deleteNote=(id:string)=>{ const u=coachNotes.filter(n=>n.id!==id); setCNotes(u); p("t_cn",u); if(viewNote?.id===id)setViewNote(null) }

  const savePN=(name:string,text:string)=>{
    const note:PlayerNote={text,updatedAt:today()}
    setPN(prev=>{const n={...prev,[name]:note};p("t_pn",n);return n})
  }

  const addRating=(name:string)=>{
    if(!newRating.opponent)return
    const entry:MatchRating={...newRating,date:newRating.date||today()}
    setMR(prev=>{const n={...prev,[name]:[entry,...(prev[name]||[])].slice(0,15)};p("t_mr",n);return n})
    setNR({rating:7,opponent:"",note:"",date:""})
  }

  const saveInj=(name:string)=>{
    if(!newInj.reason)return
    const entry:InjuryLog={...newInj,date:newInj.date||today()}
    setIL(prev=>{const n={...prev,[name]:entry};p("t_il",n);return n})
    const slot=Object.entries(squad).find(([,pl])=>pl.player_name===name)?.[0]
    if(slot)setStatus(slot,"injured")
    setNI({reason:"",returnDate:"",date:""})
  }
  const removeInj=(name:string)=>{
    setIL(prev=>{const n={...prev};delete n[name];p("t_il",n);return n})
  }

  // ── Pitch drag ────────────────────────────────────────────────────────────
  const getPct=useCallback((cx:number,cy:number)=>{
    const r=pitchRef.current?.getBoundingClientRect();if(!r)return null
    return{x:Math.max(2,Math.min(98,(cx-r.left)/r.width*100)),y:Math.max(2,Math.min(98,(cy-r.top)/r.height*100))}
  },[])
  const getSvgPct=(e:React.MouseEvent)=>{
    const r=svgRef.current?.getBoundingClientRect();if(!r)return null
    return{x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100}
  }
  const onMM=useCallback((e:React.MouseEvent)=>{
    if(dragging){const pt=getPct(e.clientX,e.clientY);if(!pt)return;setSquad(prev=>prev[dragging]?{...prev,[dragging]:{...prev[dragging],px:pt.x,py:pt.y}}:prev)}
    if(drawing&&startPt){const pt=getSvgPct(e);if(pt)setCurPt(pt)}
  },[dragging,drawing,startPt,getPct])
  const onMU=useCallback((e:React.MouseEvent)=>{
    if(dragging)setDragging(null)
    if(drawing&&startPt){
      const pt=getSvgPct(e)
      if(pt&&(Math.abs(pt.x-startPt.x)>1||Math.abs(pt.y-startPt.y)>1)){
        const mid={x:(startPt.x+pt.x)/2,y:Math.min(startPt.y,pt.y)-12}
        setShapes(prev=>[...prev,{id:uid(),type:drawTool,
          points:drawTool==="curve"?[startPt.x,startPt.y,mid.x,mid.y,pt.x,pt.y]:[startPt.x,startPt.y,pt.x,pt.y],
          color:drawColor,width:drawWidth}])
      }
      setDrawing(false);setStartPt(null);setCurPt(null)
    }
  },[dragging,drawing,startPt,drawTool,drawColor,drawWidth])

  const renderShape=(s:DrawShape,preview=false)=>{
    const[x1,y1,x2,y2]=s.points;const sel=selShape===s.id
    const sp={stroke:s.color,strokeWidth:s.width,fill:"none",opacity:preview?0.6:1,
      style:{cursor:drawTool==="select"?"pointer":"default"},
      onClick:drawTool==="select"?()=>setSelShape(sel?null:s.id):undefined,
      strokeDasharray:sel?"4 2":undefined}
    if(s.type==="arrow"||s.type==="line"){
      const a=Math.atan2(y2-y1,x2-x1),al=s.type==="arrow"?2.5:0
      return<g key={s.id}><line x1={`${x1}%`}y1={`${y1}%`}x2={`${x2}%`}y2={`${y2}%`}{...sp}/>{s.type==="arrow"&&<polygon points={`${x2}%,${y2}% ${x2-al*Math.cos(a-0.5)}%,${y2-al*Math.sin(a-0.5)}% ${x2-al*Math.cos(a+0.5)}%,${y2-al*Math.sin(a+0.5)}%`}fill={s.color}stroke="none"/>}</g>
    }
    if(s.type==="curve"){const[cx,cy,ex,ey]=[s.points[2],s.points[3],s.points[4],s.points[5]];const a=Math.atan2(ey-cy,ex-cx)
      return<g key={s.id}><path d={`M ${x1}% ${y1}% Q ${cx}% ${cy}% ${ex}% ${ey}%`}{...sp}/><polygon points={`${ex}%,${ey}% ${ex-2.5*Math.cos(a-0.5)}%,${ey-2.5*Math.sin(a-0.5)}% ${ex-2.5*Math.cos(a+0.5)}%,${ey-2.5*Math.sin(a+0.5)}%`}fill={s.color}stroke="none"/></g>}
    if(s.type==="circle")return<ellipse key={s.id}cx={`${(x1+x2)/2}%`}cy={`${(y1+y2)/2}%`}rx={`${Math.abs(x2-x1)/2}%`}ry={`${Math.abs(y2-y1)/2}%`}{...sp}/>
    if(s.type==="rect")return<rect key={s.id}x={`${Math.min(x1,x2)}%`}y={`${Math.min(y1,y2)}%`}width={`${Math.abs(x2-x1)}%`}height={`${Math.abs(y2-y1)}%`}{...sp}/>
    return null
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const sqArr    = Object.values(squad)
  const totalSal = [...sqArr,...bench].reduce((a,p)=>a+p.salary,0)
  const avgScore = sqArr.length?(sqArr.reduce((a,p)=>a+p.fair_score,0)/sqArr.length).toFixed(2):"—"
  const avgAge   = sqArr.length?(sqArr.reduce((a,p)=>a+p.age,0)/sqArr.length).toFixed(1):"—"
  const injuredInSquad = sqArr.filter(p=>p.status==="injured"||p.status==="suspended")
  const allTracked = Array.from(new Set([...Object.keys(playerNotes),...Object.keys(matchRatings),...Object.keys(injuryLogs)]))

  const avail = all.filter(p=>{
    if(Object.values(squad).some(s=>s.player_name===p.player_name))return false
    if(bench.some(b=>b.player_name===p.player_name))return false
    if(search&&!p.player_name.toLowerCase().includes(search.toLowerCase())&&!p.team_name.toLowerCase().includes(search.toLowerCase()))return false
    if(posF!=="Alle"&&p.pos_group!==posF)return false
    return true
  }).slice(0,12)

  const noteSearchResults = all.filter(p=>noteSearch.length>1&&(p.player_name.toLowerCase().includes(noteSearch.toLowerCase())||p.team_name.toLowerCase().includes(noteSearch.toLowerCase()))).slice(0,8)
  const ratingSearchResults = all.filter(p=>ratingSearch.length>1&&p.player_name.toLowerCase().includes(ratingSearch.toLowerCase())).slice(0,6)
  const injSearchResults = all.filter(p=>injSearch.length>1&&p.player_name.toLowerCase().includes(injSearch.toLowerCase())).slice(0,6)

  // ── Tabs config ───────────────────────────────────────────────────────────
  const TABS: {id:RightTab;label:string;icon:React.ElementType;badge?:number}[] = [
    {id:"lag",   label:"Lag",        icon:Users},
    {id:"notat", label:"Trenernotat",icon:FileText,  badge:coachNotes.length},
    {id:"bok",   label:"Spillerbok", icon:BookOpen,  badge:allTracked.length},
    {id:"skade", label:"Skader & Rating", icon:AlertTriangle, badge:Object.keys(injuryLogs).length||undefined},
  ]

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg0 overflow-hidden" style={{fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
        .tok{cursor:grab;user-select:none}.tok:active{cursor:grabbing}
        .dshadow{filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6))}
        .sthin::-webkit-scrollbar{width:3px}.sthin::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="border-b border-white/5 bg-bg0/95 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-[1500px] mx-auto px-5 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-textMuted hover:text-white transition-colors">
              <ArrowLeft size={13}/> Dashboard
            </Link>
            <div className="w-px h-4 bg-white/10"/>
            <Users size={13} className="text-green-400"/>
            <span className="text-sm font-bold text-white" style={{fontFamily:"'Syne',sans-serif"}}>Stall</span>
            <span className="text-xs text-textMuted">{sqArr.length}/11 · {bench.length}/7</span>
          </div>

          {/* Formation picker */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-textMuted font-medium hidden lg:block mr-1">Formasjon</span>
            {Object.keys(FORMATIONS).map(f=>(
              <button key={f} onClick={()=>changeFormation(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${formation===f?"bg-brand/20 border-brand/40 text-brand":"bg-white/3 border-white/8 text-textMuted hover:text-white hover:bg-white/6"}`}>
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {injuredInSquad.length>0&&(
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg animate-pulse">
                <AlertTriangle size={11} className="text-red-400"/>
                <span className="text-[10px] text-red-400 font-medium">{injuredInSquad.length} skadet i 11er!</span>
              </div>
            )}
            {avgScore!=="—"&&<div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-brand/8 border border-brand/15 rounded-lg">
              <span className="text-[10px] text-textMuted">Snitt</span>
              <span className="text-[11px] font-bold text-brand">{avgScore}</span>
            </div>}
            <button onClick={saveAll} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${saved?"bg-green-500/15 border-green-500/25 text-green-400":"bg-white/4 border-white/8 text-white hover:bg-white/8"}`}>
              <Save size={11}/>{saved?"Lagret!":"Lagre"}
            </button>
            <button onClick={()=>{if(!confirm("Nullstill tropp?"))return;setSquad({});setBench([]);setFocus(null);setCaptain(null);setPlanned([])}}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/8 border border-red-500/15 rounded-lg text-xs text-red-400 hover:bg-red-500/15 transition-colors">
              <RefreshCw size={11}/> Nullstill
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-5 py-4" style={{height:"calc(100vh - 48px)",display:"flex",flexDirection:"column"}}>
        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">

          {/* ══ PITCH COL (5) ══ */}
          <div className="col-span-5 flex flex-col gap-3 min-h-0">

            {/* Stats strip */}
            {sqArr.length>0&&(
              <div className="glass-panel rounded-xl px-4 py-2 flex items-center gap-3 flex-shrink-0 flex-wrap">
                <div className="flex items-center gap-1.5"><BarChart3 size={11} className="text-brand"/><span className="text-[10px] text-textMuted">Score</span><span className="text-xs font-black text-brand">{avgScore}</span></div>
                <div className="w-px h-4 bg-white/8"/>
                <div className="flex items-center gap-1.5"><Clock size={11} className="text-textMuted"/><span className="text-[10px] text-textMuted">Snitt alder</span><span className="text-xs font-bold text-white">{avgAge}</span></div>
                <div className="w-px h-4 bg-white/8"/>
                <div className="flex items-center gap-1.5"><AlertTriangle size={11} className="text-amber-400"/><span className="text-[10px] text-textMuted">Usikre</span><span className="text-xs font-bold text-amber-400">{sqArr.filter(p=>p.status!=="fit").length}</span></div>
                <div className="w-px h-4 bg-white/8"/>
                <div className="flex items-center gap-1.5"><Zap size={11} className="text-textMuted"/><span className="text-[10px] text-textMuted">U23</span><span className="text-xs font-bold text-white">{sqArr.filter(p=>p.age<=23).length}</span></div>
                {captainSlot&&squad[captainSlot]&&(<><div className="w-px h-4 bg-white/8"/><div className="flex items-center gap-1.5"><Crown size={11} className="text-amber-400"/><span className="text-[10px] text-white">{squad[captainSlot].player_name.split(" ").pop()}</span></div></>)}
              </div>
            )}

            {/* Pitch */}
            <div className="glass-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 flex-shrink-0">
                <span className="text-xs font-bold text-white uppercase tracking-widest" style={{fontFamily:"'Syne',sans-serif"}}>
                  {formation} · {sqArr.length<11?`${11-sqArr.length} ledig`:"✓ Komplett"}
                </span>
                <div className="flex items-center gap-1.5">
                  {plannedSubs.length>0&&(
                    <span className="text-[10px] text-amber-400 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      {plannedSubs.length} bytte planlagt
                    </span>
                  )}
                  <button onClick={()=>setSquad(prev=>{const u={...prev};Object.keys(u).forEach(id=>{const d=slots[id];if(d)u[id]={...u[id],px:d.x,py:d.y}});return u})}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-textMuted hover:text-white hover:bg-white/5 border border-white/5 transition-all">
                    <RotateCcw size={9}/> Reset
                  </button>
                  <button onClick={()=>setShowTools(!showTools)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-all ${showTools?"bg-brand/15 border-brand/30 text-brand":"text-textMuted hover:text-white hover:bg-white/5 border-white/5"}`}>
                    <Wrench size={9}/> Verktøy
                  </button>
                </div>
              </div>

              {/* Toolbox */}
              {showTools&&(
                <div className="px-3 py-2 border-b border-white/5 bg-white/2 flex items-center gap-2 flex-wrap flex-shrink-0">
                  <div className="flex items-center gap-1">
                    {([{t:"select",icon:<Activity size={11}/>},{t:"arrow",icon:<ArrowRight size={11}/>},
                      {t:"curve",icon:<svg width="13" height="13" viewBox="0 0 14 14"><path d="M2 12 Q7 2 12 12" stroke="currentColor" strokeWidth="1.5" fill="none"/><polygon points="12,12 10,9 13,9" fill="currentColor"/></svg>},
                      {t:"line",icon:<Minus size={11}/>},{t:"circle",icon:<Circle size={11}/>},{t:"rect",icon:<Square size={11}/>},
                    ] as {t:DrawTool,icon:any}[]).map(({t,icon})=>(
                      <button key={t} onClick={()=>setDrawTool(t)} className={`w-7 h-7 flex items-center justify-center rounded-lg border text-[10px] transition-all ${drawTool===t?"bg-brand/20 border-brand/40 text-brand":"bg-white/3 border-white/8 text-textMuted hover:text-white"}`}>{icon}</button>
                    ))}
                  </div>
                  <div className="w-px h-5 bg-white/10"/>
                  <div className="flex gap-1">{TOOL_COLORS.map(c=><button key={c} onClick={()=>setDrawColor(c)} className="w-5 h-5 rounded-full border-2 transition-all" style={{background:c,borderColor:drawColor===c?"white":"transparent"}}/>)}</div>
                  <div className="w-px h-5 bg-white/10"/>
                  {[1,2,3,5].map(w=><button key={w} onClick={()=>setDrawWidth(w)} className={`w-6 h-6 flex items-center justify-center rounded border text-[9px] transition-all ${drawWidth===w?"bg-brand/20 border-brand/40 text-brand":"bg-white/3 border-white/8 text-textMuted"}`}>{w}</button>)}
                  <div className="w-px h-5 bg-white/10"/>
                  {selShape&&<button onClick={()=>{setShapes(prev=>prev.filter(s=>s.id!==selShape));setSelShape(null)}} className="flex items-center gap-1 px-2 py-1 bg-red-500/15 border border-red-500/25 rounded-lg text-[10px] text-red-400"><Trash2 size={9}/> Slett</button>}
                  <button onClick={()=>{setShapes([]);setSelShape(null)}} className="flex items-center gap-1 px-2 py-1 bg-white/3 border border-white/8 rounded-lg text-[10px] text-textMuted hover:text-red-400"><Trash2 size={9}/> Tøm</button>
                </div>
              )}

              {/* PITCH */}
              <div className="flex-1 relative overflow-hidden" ref={pitchRef} onMouseMove={onMM} onMouseUp={onMU}
                onMouseLeave={()=>{setDragging(null);if(drawing){setDrawing(false);setStartPt(null);setCurPt(null)}}}>

                {/* Grass */}
                <div className="absolute inset-0" style={{background:"linear-gradient(180deg,#1a5c2a 0%,#1e6830 14.3%,#1a5c2a 28.6%,#1e6830 42.9%,#1a5c2a 57.1%,#1e6830 71.4%,#1a5c2a 85.7%)"}}/>

                {/* Pitch lines — ONE goal at bottom behind GK */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" style={{pointerEvents:"none"}}>
                  {/* Border */}
                  <rect x="3" y="2" width="94" height="94" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6"/>
                  {/* Halfway line */}
                  <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  {/* Centre circle */}
                  <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5"/>
                  <circle cx="50" cy="50" r="0.8" fill="rgba(255,255,255,0.4)"/>
                  {/* Attack half — no goal, just the penalty area outline */}
                  <rect x="22" y="2" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <rect x="36" y="2" width="28" height="9" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4"/>
                  {/* Corner arcs top */}
                  <path d="M3 7 A5 5 0 0 0 8 2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <path d="M97 7 A5 5 0 0 1 92 2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  {/* Corner arcs bottom */}
                  <path d="M3 90 A5 5 0 0 1 8 96" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <path d="M97 90 A5 5 0 0 0 92 96" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  {/* KEEPER HALF — penalty area */}
                  <rect x="22" y="76" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.5"/>
                  {/* Keeper goal area */}
                  <rect x="36" y="87" width="28" height="9" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4"/>
                  {/* Penalty spot */}
                  <circle cx="50" cy="84" r="0.7" fill="rgba(255,255,255,0.65)"/>
                  {/* Penalty arc */}
                  <path d="M36 76 A14 14 0 0 1 64 76" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  {/* GOAL — only at bottom behind GK */}
                  <rect x="37" y="93.5" width="26" height="5.5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8"/>
                  {/* Goal net lines */}
                  {[42,47,53,58].map(x=><line key={x} x1={`${x}%`} y1="93.5%" x2={`${x}%`} y2="99%" stroke="rgba(255,255,255,0.18)" strokeWidth="0.3"/>)}
                  <line x1="37%" y1="95.5%" x2="63%" y2="95.5%" stroke="rgba(255,255,255,0.18)" strokeWidth="0.3"/>
                  <line x1="37%" y1="97.5%" x2="63%" y2="97.5%" stroke="rgba(255,255,255,0.18)" strokeWidth="0.3"/>
                </svg>

                {/* Drawing SVG */}
                <svg ref={svgRef} className="absolute inset-0 w-full h-full"
                  style={{pointerEvents:showTools&&drawTool!=="select"?"all":"none",cursor:showTools&&drawTool!=="select"?"crosshair":"default"}}
                  onMouseDown={e=>{if(drawTool==="select"||dragging)return;e.preventDefault();const pt=getSvgPct(e);if(pt){setStartPt(pt);setDrawing(true)}}}>
                  {shapes.map(s=>renderShape(s))}
                  {drawing&&startPt&&curPt&&renderShape({id:"preview",type:drawTool,
                    points:drawTool==="curve"?[startPt.x,startPt.y,(startPt.x+curPt.x)/2,Math.min(startPt.y,curPt.y)-12,curPt.x,curPt.y]:[startPt.x,startPt.y,curPt.x,curPt.y],
                    color:drawColor,width:drawWidth},true)}
                  {/* Planned sub arrows */}
                  {plannedSubs.map(sub=>{
                    const from=squad[sub.fromSlot]; const to=bench[sub.toBenchIdx]
                    if(!from||!to)return null
                    return<g key={`${sub.fromSlot}-${sub.toBenchIdx}`}>
                      <line x1={`${from.px}%`}y1={`${from.py}%`}x2={`${from.px}%`}y2="97%" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7"/>
                    </g>
                  })}
                </svg>

                {/* Player tokens */}
                {Object.entries(slots).map(([slotId,slotDef])=>{
                  const pl=squad[slotId]
                  const gc=GC[slotDef.group]
                  const initials=pl?pl.player_name.split(" ").map(n=>n[0]).slice(0,2).join(""):null
                  const px=pl?.px??slotDef.x; const py=pl?.py??slotDef.y
                  const isCap=captainSlot===slotId
                  const plannedOut=plannedSubs.find(s=>s.fromSlot===slotId)
                  const isSubMode=subMode===slotId

                  return(
                    <div key={slotId} className="absolute" style={{left:`${px}%`,top:`${py}%`,transform:"translate(-50%,-50%)",zIndex:dragging===slotId?20:10}}>
                      {pl?(
                        <div className="relative group flex flex-col items-center tok" style={{width:60}}
                          onMouseDown={e=>{if(showTools&&drawTool!=="select")return;e.preventDefault();setDragging(slotId)}}>
                          {/* Shirt number */}
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black border border-white/40 dshadow"
                            style={{background:gc.bg,color:gc.dark}}>{pl.shirt_number}</div>
                          {/* Status badge */}
                          {pl.status&&pl.status!=="fit"&&(
                            <div className="absolute -top-1 -right-2 z-20 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black border border-bg0"
                              style={{background:STATUS_CFG[pl.status].color}}>{STATUS_CFG[pl.status].badge}</div>
                          )}
                          {/* Captain badge */}
                          {isCap&&<div className="absolute -top-1 -left-2 z-20 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black" style={{background:"#f59e0b",color:"#78350f"}}>C</div>}
                          {/* Planned sub indicator */}
                          {plannedOut&&<div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 z-20 w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-black" style={{background:"#f59e0b",color:"#78350f"}}>↓</div>}

                          {/* Token button */}
                          <button onMouseDown={e=>e.stopPropagation()}
                            onClick={()=>{
                              if(subMode){toggleSub(subMode,0);return}
                              setFocus(focus?.slot===slotId?null:pl)
                            }}
                            className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold text-white dshadow border-2 transition-all"
                            style={{
                              background:`radial-gradient(circle at 38% 38%, ${gc.ring}, ${gc.bg})`,
                              borderColor:focus?.slot===slotId?"white":plannedOut?"#f59e0b":`${gc.ring}80`,
                              boxShadow:focus?.slot===slotId?`0 0 0 3px ${gc.ring}50,0 4px 12px rgba(0,0,0,0.5)`:"0 4px 12px rgba(0,0,0,0.4)",
                              opacity:pl.status==="injured"?0.45:pl.status==="suspended"?0.65:1,
                            }}>{initials}
                          </button>

                          {/* Name tag */}
                          <div className="mt-1 rounded-md px-1.5 py-0.5 text-center pointer-events-none" style={{background:"rgba(0,0,0,0.82)",backdropFilter:"blur(4px)",minWidth:52}}>
                            <div className="text-white text-[9px] font-semibold leading-tight truncate max-w-[50px]">{pl.player_name.split(" ").pop()}</div>
                            {pl.instruction
                              ? <div className="text-amber-300 text-[7px] truncate max-w-[50px]">{pl.instruction}</div>
                              : <div className="text-green-400 text-[8px]">{fmt(pl.salary)}</div>
                            }
                          </div>

                          {/* Remove */}
                          <button onMouseDown={e=>e.stopPropagation()} onClick={()=>rmSlot(slotId)}
                            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex z-20">
                            <X size={8} className="text-white"/>
                          </button>
                        </div>
                      ):(
                        <button onClick={()=>setAS(activeSlot===slotId?null:slotId)}
                          className="flex flex-col items-center gap-0.5 group/e"
                          style={{pointerEvents:showTools&&drawTool!=="select"?"none":"auto"}}>
                          <div className={`w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${activeSlot===slotId?"border-white/80 bg-white/18 scale-110":"border-white/25 bg-black/25 hover:border-white/55 hover:bg-white/10"}`}>
                            <Plus size={13} className={activeSlot===slotId?"text-white":"text-white/40 group-hover/e:text-white/70"}/>
                          </div>
                          <div className="px-1.5 py-0.5 rounded" style={{background:"rgba(0,0,0,0.55)"}}>
                            <span className="text-white/55 text-[9px] font-medium">{slotDef.label}</span>
                          </div>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bench */}
            <div className="glass-panel p-3 rounded-2xl flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-widest" style={{fontFamily:"'Syne',sans-serif"}}>Innbyttere</span>
                <div className="flex items-center gap-2">
                  {subMode&&<span className="text-[10px] text-amber-400 animate-pulse">Velg innbytter for {squad[subMode]?.player_name.split(" ").pop()}</span>}
                  <span className="text-xs text-textMuted">{bench.length}/7</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {Array.from({length:7}).map((_,i)=>{
                  const pl=bench[i]; const gc=pl?GC[pl.pos_group]:null
                  const isPlannedIn=plannedSubs.some(s=>s.toBenchIdx===i)
                  return pl?(
                    <div key={i} className="relative group flex-1">
                      <button onClick={()=>{
                          if(subMode){toggleSub(subMode,i);return}
                          setFocus(focus?.player_name===pl.player_name?null:pl)
                        }}
                        className={`w-full rounded-xl p-1.5 flex flex-col items-center border transition-all ${focus?.player_name===pl.player_name?"border-white/40 bg-white/8":isPlannedIn?"border-amber-500/40 bg-amber-500/8":"border-white/8 bg-white/3 hover:bg-white/6"}`}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white mb-0.5 dshadow"
                          style={{background:`radial-gradient(circle at 38% 38%, ${gc?.ring}, ${gc?.bg})`}}>
                          {pl.player_name.split(" ").map(n=>n[0]).slice(0,2).join("")}
                        </div>
                        <div className="text-[8px] text-white font-semibold truncate w-full text-center">{pl.player_name.split(" ").pop()}</div>
                        {isPlannedIn?<div className="text-[7px] text-amber-400">↑ Bytte</div>:<div className="text-[8px] text-green-400">{fmt(pl.salary)}</div>}
                      </button>
                      <button onClick={()=>rmBench(pl.player_name)} className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex z-10">
                        <X size={7} className="text-white"/>
                      </button>
                    </div>
                  ):(
                    <button key={i} onClick={()=>setAS(`bench-${i}`)}
                      className={`flex-1 rounded-xl border-2 border-dashed flex items-center justify-center py-3 transition-all ${activeSlot===`bench-${i}`?"border-white/60 bg-white/8":"border-white/12 hover:border-white/28"}`}>
                      <Plus size={11} className="text-white/25"/>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ══ RIGHT PANEL (7) ══ */}
          <div className="col-span-7 flex flex-col gap-3 min-h-0">

            {/* Player picker */}
            {activeSlot&&(
              <div className="glass-panel p-4 rounded-2xl border border-brand/25 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand animate-pulse"/>
                    <span className="text-sm font-bold text-white" style={{fontFamily:"'Syne',sans-serif"}}>
                      Velg — {slots[activeSlot]?.label||"Benk"}
                    </span>
                  </div>
                  <button onClick={()=>{setAS(null);setSrch("")}}><X size={14} className="text-textMuted hover:text-white"/></button>
                </div>
                <div className="flex gap-2 mb-2.5">
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted"/>
                    <input autoFocus type="text" value={search} onChange={e=>setSrch(e.target.value)} placeholder="Søk spiller..."
                      className="w-full bg-bg0/60 border border-white/8 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-brand text-white placeholder-textMuted"/>
                  </div>
                  <div className="flex gap-1">
                    {["Alle","GK","DEF","MID","ATT"].map(pos=>(
                      <button key={pos} onClick={()=>setPosF(pos)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${posF===pos?"bg-brand/15 text-brand border-brand/30":"bg-white/3 text-textMuted border-white/5 hover:text-white"}`}>{pos}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto sthin">
                  {avail.map(pl=>(
                    <button key={pl.player_name} onClick={()=>pick(pl)}
                      className="flex items-center justify-between px-2.5 py-2 hover:bg-white/6 rounded-xl transition-colors border border-white/5 hover:border-white/12">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 dshadow" style={{background:GC[pl.pos_group]?.bg||"#6366f1"}}>
                          {pl.player_name.split(" ").map(n=>n[0]).slice(0,2).join("")}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white leading-tight">{pl.player_name}</div>
                          <div className="text-[10px] text-textMuted">{pl.team_name}</div>
                        </div>
                      </div>
                      <div className="text-right ml-1 flex-shrink-0">
                        <div className="text-xs font-bold text-brand">{pl.fair_score?.toFixed(2)}</div>
                        <span className={`text-[9px] px-1 py-0.5 rounded border ${GC[pl.pos_group]?.pill}`}>{pl.pos_group}</span>
                      </div>
                    </button>
                  ))}
                  {avail.length===0&&<div className="col-span-2 text-center py-4 text-textMuted text-xs">Ingen funnet</div>}
                </div>
              </div>
            )}

            {/* Focus card */}
            {focus&&(
              <div className="glass-panel p-4 rounded-2xl border border-white/8 flex-shrink-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white dshadow"
                      style={{background:`radial-gradient(circle at 38% 38%, ${GC[focus.pos_group]?.ring}, ${GC[focus.pos_group]?.bg})`}}>
                      #{focus.shirt_number}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm leading-tight" style={{fontFamily:"'Syne',sans-serif"}}>{focus.player_name}</div>
                      <div className="text-xs text-textMuted">{focus.team_name} · {focus.age}år · {focus.pos_group}</div>
                    </div>
                  </div>
                  <button onClick={()=>setFocus(null)}><X size={13} className="text-textMuted hover:text-white"/></button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {[
                    {l:"Score",  v:focus.fair_score?.toFixed(2), c:"text-brand"},
                    {l:"Lønn",   v:fmtKr(focus.salary),          c:"text-green-400"},
                    {l:"Min",    v:focus.minutes>=1000?`${(focus.minutes/1000).toFixed(1)}k`:String(focus.minutes), c:"text-white"},
                    {l:"Alder",  v:`${focus.age}år`,              c:"text-white"},
                  ].map(s=>(
                    <div key={s.l} className="bg-white/3 rounded-xl py-2 px-1.5 text-center border border-white/5">
                      <div className={`text-sm font-bold ${s.c}`}>{s.v}</div>
                      <div className="text-[9px] text-textMuted mt-0.5">{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Instruction field */}
                <div className="mb-3">
                  <input
                    value={focus.instruction||""}
                    onChange={e=>{
                      const val=e.target.value
                      setSquad(prev=>prev[focus.slot!]?{...prev,[focus.slot!]:{...prev[focus.slot!],instruction:val}}:prev)
                      setFocus(f=>f?{...f,instruction:val}:f)
                    }}
                    placeholder="Spillerinstruksjon (vises på brikke — f.eks. Press høyt, Hold linja)"
                    className="w-full bg-bg0/60 border border-white/8 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50 text-white placeholder-textMuted"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {focus.slot&&!focus.slot.startsWith("bench")&&(
                    <>
                      <button onClick={()=>setCaptain(captainSlot===focus.slot?null:focus.slot!)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${captainSlot===focus.slot?"bg-amber-500/20 border-amber-500/40 text-amber-300":"bg-white/4 border-white/8 text-textMuted hover:text-white"}`}>
                        <Crown size={11}/>{captainSlot===focus.slot?"Kaptein ✓":"Kaptein"}
                      </button>
                      <button onClick={()=>setSubMode(subMode===focus.slot?null:focus.slot!)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${subMode===focus.slot?"bg-amber-500/20 border-amber-500/40 text-amber-300":"bg-white/4 border-white/8 text-textMuted hover:text-white"}`}>
                        <ArrowLeftRight size={11}/>Planlegg bytte
                      </button>
                    </>
                  )}
                  {(["fit","doubt","injured","suspended"] as const).map(s=>(
                    <button key={s} onClick={()=>{
                        focus.slot&&setStatus(focus.slot,s)
                        if(s==="injured"){setRightTab("skade");setInjP(focus.player_name);setInjSrch(focus.player_name)}
                      }}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${focus.status===s?"border-white/25 bg-white/8":"border-white/6 bg-white/2 text-textMuted hover:text-white"}`}
                      style={{color:focus.status===s?STATUS_CFG[s].color:undefined}}>
                      {STATUS_CFG[s].label}
                    </button>
                  ))}
                  <button onClick={()=>{setRightTab("bok");setNPlayer(focus.player_name);setNSrch("")}}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand/8 border border-brand/15 rounded-lg text-xs text-brand hover:bg-brand/15 transition-colors ml-auto">
                    <BookOpen size={11}/> Spillerbok
                  </button>
                  <Link href={`/player/${encodeURIComponent(focus.player_name)}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/4 border border-white/8 rounded-lg text-xs text-textMuted hover:text-white transition-colors">
                    Profil<ChevronRight size={11}/>
                  </Link>
                </div>
              </div>
            )}

            {/* ── TABS ── */}
            <div className="glass-panel rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex border-b border-white/6 flex-shrink-0">
                {TABS.map(t=>{
                  const Icon=t.icon; const active=rightTab===t.id
                  return(
                    <button key={t.id} onClick={()=>setRightTab(t.id)}
                      className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors ${active?"text-white":"text-textMuted hover:text-white/70"}`}>
                      <Icon size={11}/>{t.label}
                      {(t.badge??0)>0&&<span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                        style={{background:t.id==="skade"?"rgba(239,68,68,0.2)":"rgba(99,102,241,0.2)",color:t.id==="skade"?"#f87171":"#a5b4fc"}}>
                        {t.badge}
                      </span>}
                      {active&&<div className="absolute bottom-0 inset-x-3 h-px bg-brand rounded-t-full"/>}
                    </button>
                  )
                })}
              </div>

              {/* ── TAB: LAG ── */}
              {rightTab==="lag"&&(
                <div className="p-4 overflow-y-auto sthin flex-1">
                  {sqArr.length===0?(
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Users size={28} className="text-white/10"/>
                      <p className="text-textMuted text-xs">Trykk på tomme plasser på banen for å legge til spillere</p>
                    </div>
                  ):(
                    <div className="space-y-0.5">
                      {/* Header */}
                      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-2.5 pb-2 border-b border-white/6 mb-1">
                        <span className="text-[9px] text-textMuted uppercase tracking-widest w-6">#</span>
                        <span className="text-[9px] text-textMuted uppercase tracking-widest">Spiller</span>
                        <span className="text-[9px] text-textMuted uppercase tracking-widest">Score</span>
                        <span className="text-[9px] text-textMuted uppercase tracking-widest">Lønn</span>
                      </div>
                      {Object.entries(slots).map(([slotId,slotDef])=>{
                        const pl=squad[slotId]; if(!pl)return null
                        const isCap=captainSlot===slotId
                        const avg=matchRatings[pl.player_name]?.length?(matchRatings[pl.player_name].reduce((a,r)=>a+r.rating,0)/matchRatings[pl.player_name].length).toFixed(1):null
                        return(
                          <div key={slotId}
                            className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center py-2 px-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/3 ${focus?.slot===slotId?"bg-white/4":""}`}
                            onClick={()=>setFocus(focus?.slot===slotId?null:pl)}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black text-white dshadow" style={{background:GC[slotDef.group].bg}}>{pl.shirt_number}</div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-white">{pl.player_name}</span>
                                {isCap&&<Crown size={9} className="text-amber-400"/>}
                                {pl.status&&pl.status!=="fit"&&<div className="w-1.5 h-1.5 rounded-full" style={{background:STATUS_CFG[pl.status].color}}/>}
                                {injuryLogs[pl.player_name]&&<span className="text-[8px] px-1 rounded bg-red-500/15 text-red-400 border border-red-500/20">Sk</span>}
                                {plannedSubs.some(s=>s.fromSlot===slotId)&&<span className="text-[8px] text-amber-400">↓</span>}
                              </div>
                              <div className="text-[9px] text-textMuted">{slotDef.label} · {pl.age}år{avg?` · ★ ${avg}`:""}{pl.instruction?` · "${pl.instruction}"`:""}</div>
                            </div>
                            <span className="text-xs font-bold text-brand">{pl.fair_score?.toFixed(2)}</span>
                            <span className="text-xs text-green-400">{fmt(pl.salary)}</span>
                          </div>
                        )
                      })}
                      {/* Totals */}
                      <div className="grid grid-cols-3 gap-3 pt-3 mt-1 border-t border-white/6">
                        {[
                          {l:"Total lønn",   v:fmtKr(totalSal),  c:"text-green-400"},
                          {l:"Snitt score",  v:avgScore,          c:"text-brand"},
                          {l:"Snitt alder",  v:`${avgAge}år`,     c:"text-white"},
                        ].map(s=>(
                          <div key={s.l} className="text-center py-2 rounded-xl bg-white/2 border border-white/5">
                            <div className={`text-sm font-black ${s.c}`}>{s.v}</div>
                            <div className="text-[9px] text-textMuted">{s.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: TRENERNOTAT ── */}
              {rightTab==="notat"&&(
                <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-white/6">
                  {/* Draft (left) */}
                  <div className="flex flex-col flex-1 min-h-0 p-4 gap-3">
                    <div className="flex items-center justify-between flex-shrink-0">
                      <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium">Nytt notat</p>
                      <span className="text-[9px] text-textMuted">{formation} · Autolaget</span>
                    </div>
                    <input value={draftTitle} onChange={e=>setDraftTitle(e.target.value)}
                      placeholder="Tittel (f.eks. Kamp vs Brann — taktikk)"
                      className="bg-bg0/60 border border-white/8 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-brand/50 text-white placeholder-textMuted/40 flex-shrink-0"/>
                    <textarea value={draftText} onChange={e=>setDraftText(e.target.value)}
                      placeholder={`Formasjon: ${formation}\n\nTaktikk, bytteplan, presskonsept, instruksjoner til spillerne, set-piece notater...`}
                      className="flex-1 bg-bg0/60 border border-white/8 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-brand/50 text-white placeholder-textMuted/40 resize-none leading-relaxed"/>
                    <button onClick={archiveNote} disabled={!draftText.trim()}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand/15 border border-brand/30 text-sm font-bold text-brand hover:bg-brand/25 transition-colors disabled:opacity-30 flex-shrink-0">
                      <Archive size={13}/> Arkiver notat
                    </button>
                  </div>

                  {/* Archive (right) */}
                  <div className="flex flex-col w-56 min-h-0">
                    <div className="px-4 py-3 border-b border-white/6 flex-shrink-0">
                      <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium">Arkiv — {coachNotes.length} notater</p>
                    </div>
                    {viewNote?(
                      <div className="flex flex-col flex-1 min-h-0 p-3 gap-2">
                        <div className="flex items-center justify-between flex-shrink-0">
                          <button onClick={()=>setViewNote(null)} className="flex items-center gap-1 text-[10px] text-textMuted hover:text-white"><ArrowLeft size={10}/> Tilbake</button>
                          <button onClick={()=>deleteNote(viewNote.id)}><Trash2 size={11} className="text-textMuted hover:text-red-400"/></button>
                        </div>
                        <p className="text-xs font-bold text-white">{viewNote.title}</p>
                        <p className="text-[9px] text-textMuted">{viewNote.date} · {viewNote.formation}</p>
                        <div className="flex-1 overflow-y-auto sthin text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{viewNote.text}</div>
                      </div>
                    ):(
                      <div className="flex-1 overflow-y-auto sthin p-2 space-y-1">
                        {coachNotes.length===0&&<p className="text-textMuted text-[10px] text-center py-6">Ingen arkiverte notater ennå</p>}
                        {coachNotes.map(n=>(
                          <button key={n.id} onClick={()=>setViewNote(n)}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                            <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                            <p className="text-[9px] text-textMuted">{n.date} · {n.formation}</p>
                            <p className="text-[9px] text-white/40 truncate mt-0.5">{n.text.slice(0,50)}...</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB: SPILLERBOK ── */}
              {rightTab==="bok"&&(
                <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-white/6">
                  {/* Player list / search (left) */}
                  <div className="flex flex-col w-52 min-h-0 flex-shrink-0">
                    <div className="p-3 border-b border-white/6 flex-shrink-0">
                      <div className="relative">
                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted"/>
                        <input type="text" value={noteSearch} onChange={e=>setNSrch(e.target.value)}
                          placeholder="Søk spiller..."
                          className="w-full bg-bg0/60 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-brand/50 text-white placeholder-textMuted"/>
                        {noteSearch.length>1&&noteSearchResults.length>0&&(
                          <div className="absolute z-30 w-full mt-1 rounded-xl border border-white/10 overflow-hidden shadow-2xl" style={{background:"rgba(10,10,18,0.99)"}}>
                            {noteSearchResults.map(pl=>(
                              <button key={pl.player_name}
                                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/6 transition-colors text-left border-b border-white/4 last:border-0"
                                onClick={()=>{setNPlayer(pl.player_name);setNSrch("")}}>
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{background:GC[pl.pos_group]?.bg}}>
                                  {pl.player_name.split(" ").map(n=>n[0]).slice(0,2).join("")}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-white truncate">{pl.player_name}</p>
                                  <p className="text-[9px] text-textMuted">{pl.team_name}</p>
                                </div>
                                {playerNotes[pl.player_name]&&<div className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0"/>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto sthin p-2 space-y-1">
                      <p className="text-[9px] text-textMuted uppercase tracking-widest font-medium px-1 py-1">Mine spillere ({allTracked.length})</p>
                      {allTracked.length===0&&<p className="text-textMuted text-[10px] text-center py-6">Søk på en spiller for å starte</p>}
                      {allTracked.map(name=>{
                        const note=playerNotes[name]
                        const ratings=matchRatings[name]||[]
                        const avg=ratings.length?(ratings.reduce((a,r)=>a+r.rating,0)/ratings.length).toFixed(1):null
                        const inj=injuryLogs[name]
                        const inSquad=Object.values(squad).some(p=>p.player_name===name)
                        return(
                          <button key={name} onClick={()=>setNPlayer(name)}
                            className={`w-full flex items-center gap-2 p-2 rounded-xl transition-all text-left border ${notePlayer===name?"bg-white/8 border-white/15":"hover:bg-white/4 border-transparent"}`}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                              style={{background:"rgba(99,102,241,0.2)",border:"1px solid rgba(99,102,241,0.3)"}}>
                              {name.split(" ").map(n=>n[0]).slice(0,2).join("")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-white truncate">{name}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {inSquad&&<span className="text-[7px] px-1 rounded bg-green-500/15 text-green-400 border border-green-500/20">Tropp</span>}
                                {inj&&<span className="text-[7px] px-1 rounded bg-red-500/15 text-red-400 border border-red-500/20">Skadet</span>}
                                {avg&&<span className="text-[8px] text-amber-400">★{avg}</span>}
                                {note&&<span className="text-[7px] px-1 rounded bg-brand/15 text-brand border border-brand/20">Notat</span>}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Note editor + rating chart (right) */}
                  <div className="flex flex-col flex-1 min-h-0">
                    {notePlayer?(
                      <>
                        <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <BookOpen size={12} className="text-brand"/>
                            <span className="text-sm font-bold text-white">{notePlayer}</span>
                            {playerNotes[notePlayer]?.updatedAt&&<span className="text-[9px] text-textMuted">{playerNotes[notePlayer].updatedAt}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/player/${encodeURIComponent(notePlayer)}`} className="text-[10px] text-brand flex items-center gap-1">Profil<ChevronRight size={9}/></Link>
                            <button onClick={()=>setNPlayer(null)}><X size={12} className="text-textMuted hover:text-white"/></button>
                          </div>
                        </div>

                        {/* Rating chart if data exists */}
                        {(matchRatings[notePlayer]?.length??0)>1&&(
                          <div className="px-4 pt-3 pb-1 flex-shrink-0">
                            <p className="text-[9px] text-textMuted uppercase tracking-widest font-medium mb-2">Formkurve</p>
                            <ResponsiveContainer width="100%" height={60}>
                              <LineChart data={[...matchRatings[notePlayer]].reverse().map((r,i)=>({kamp:i+1,rating:r.rating,mot:r.opponent}))}>
                                <XAxis dataKey="kamp" tick={{fontSize:8,fill:"rgba(148,163,184,0.5)"}} axisLine={false} tickLine={false}/>
                                <YAxis domain={[1,10]} tick={{fontSize:8,fill:"rgba(148,163,184,0.5)"}} axisLine={false} tickLine={false} width={16}/>
                                <RTooltip contentStyle={{background:"rgba(8,8,14,0.95)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,fontSize:10}}
                                  formatter={(v:number)=>[v,"Rating"]}/>
                                <Line type="monotone" dataKey="rating" stroke="#6366f1" strokeWidth={2} dot={{fill:"#6366f1",r:3,strokeWidth:0}}/>
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        <textarea value={playerNotes[notePlayer]?.text||""} onChange={e=>savePN(notePlayer,e.target.value)}
                          placeholder={`Notatbok — ${notePlayer}\n\nKampopptreden, styrker/svakheter, treningsobservasjoner, taktiske instruksjoner, utviklingspunkter...`}
                          className="flex-1 bg-transparent border-0 px-4 py-3 text-xs focus:outline-none text-white placeholder-textMuted/40 resize-none leading-relaxed"/>
                      </>
                    ):(
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <BookOpen size={28} className="text-white/10 mx-auto mb-2"/>
                          <p className="text-textMuted text-xs">Velg en spiller fra listen</p>
                          <p className="text-textMuted/50 text-[10px]">eller søk øverst til venstre</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB: SKADER & RATING ── */}
              {rightTab==="skade"&&(
                <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-white/6">

                  {/* Left: Injury log */}
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between flex-shrink-0">
                      <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium">Skadelogg</p>
                      <span className="text-[10px] text-textMuted">{Object.keys(injuryLogs).length} aktive</span>
                    </div>
                    <div className="flex-1 overflow-y-auto sthin p-3 space-y-3">
                      {/* Add form */}
                      <div className="rounded-xl border border-white/8 p-3 space-y-2" style={{background:"rgba(255,255,255,0.02)"}}>
                        <p className="text-[9px] text-textMuted font-medium uppercase tracking-widest">Registrer skade</p>
                        <div className="relative">
                          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted"/>
                          <input type="text" placeholder="Søk spiller..." value={injSearch}
                            onChange={e=>{setInjSrch(e.target.value);const f=all.find(p=>p.player_name.toLowerCase()===e.target.value.toLowerCase());if(f)setInjP(f.player_name)}}
                            className="w-full bg-bg0/60 border border-white/8 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-red-500/40"/>
                          {injSearch.length>1&&injSearchResults.length>0&&(
                            <div className="absolute z-30 w-full mt-1 rounded-xl border border-white/10 overflow-hidden shadow-xl" style={{background:"rgba(10,10,18,0.99)"}}>
                              {injSearchResults.map(pl=>(
                                <button key={pl.player_name} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/6 text-left border-b border-white/4 last:border-0"
                                  onClick={()=>{setInjP(pl.player_name);setInjSrch(pl.player_name)}}>
                                  <span className="text-xs font-semibold text-white">{pl.player_name}</span>
                                  <span className="text-[9px] text-textMuted">{pl.team_name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <input type="text" placeholder="Skadeårsak (f.eks. Lyskeskade)" value={newInj.reason} onChange={e=>setNI(p=>({...p,reason:e.target.value}))}
                          className="w-full bg-bg0/60 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-red-500/40"/>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Forventet tilbake" value={newInj.returnDate} onChange={e=>setNI(p=>({...p,returnDate:e.target.value}))}
                            className="flex-1 bg-bg0/60 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-red-500/40"/>
                          <button onClick={()=>injPlayer&&saveInj(injPlayer)} disabled={!injPlayer||!newInj.reason}
                            className="px-3 py-1.5 bg-red-500/15 border border-red-500/25 rounded-lg text-xs text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-40">
                            Lagre
                          </button>
                        </div>
                      </div>
                      {/* List */}
                      {Object.entries(injuryLogs).length===0
                        ?<p className="text-textMuted text-xs text-center py-4">Ingen registrerte skader</p>
                        :Object.entries(injuryLogs).map(([name,il])=>(
                          <div key={name} className="flex items-start justify-between p-3 rounded-xl border border-red-500/15 bg-red-500/5">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <button onClick={()=>setNPlayer(name)} className="text-xs font-bold text-white hover:text-brand">{name}</button>
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/25">Skadet</span>
                              </div>
                              <p className="text-[11px] text-red-400/90 font-medium">{il.reason}</p>
                              {il.returnDate&&<p className="text-[10px] text-textMuted mt-0.5">Tilbake: <span className="text-white">{il.returnDate}</span></p>}
                              <p className="text-[9px] text-textMuted/50 mt-0.5">{il.date}</p>
                            </div>
                            <button onClick={()=>removeInj(name)}><X size={11} className="text-textMuted hover:text-red-400"/></button>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Right: Match ratings */}
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="px-4 py-3 border-b border-white/6 flex-shrink-0">
                      <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium">Kamprating</p>
                    </div>
                    <div className="flex-1 overflow-y-auto sthin p-3 space-y-3">
                      {/* Add form */}
                      <div className="rounded-xl border border-white/8 p-3 space-y-2" style={{background:"rgba(255,255,255,0.02)"}}>
                        <p className="text-[9px] text-textMuted font-medium uppercase tracking-widest">Ny rating</p>
                        <div className="relative">
                          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted"/>
                          <input type="text" placeholder="Søk spiller..." value={ratingSearch}
                            onChange={e=>{setRSrch(e.target.value);const f=all.find(p=>p.player_name.toLowerCase()===e.target.value.toLowerCase());if(f)setRP(f.player_name)}}
                            className="w-full bg-bg0/60 border border-white/8 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-amber-500/40"/>
                          {ratingSearch.length>1&&ratingSearchResults.length>0&&(
                            <div className="absolute z-30 w-full mt-1 rounded-xl border border-white/10 overflow-hidden shadow-xl" style={{background:"rgba(10,10,18,0.99)"}}>
                              {ratingSearchResults.map(pl=>(
                                <button key={pl.player_name} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/6 text-left border-b border-white/4 last:border-0"
                                  onClick={()=>{setRP(pl.player_name);setRSrch(pl.player_name)}}>
                                  <span className="text-xs font-semibold text-white">{pl.player_name}</span>
                                  <span className="text-[9px] text-textMuted">{pl.team_name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] text-textMuted mb-1.5">Rating: <span className="font-black text-amber-400 text-sm">{newRating.rating}</span><span className="text-textMuted">/10</span></p>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5,6,7,8,9,10].map(r=>(
                              <button key={r} onClick={()=>setNR(p=>({...p,rating:r}))}
                                className="flex-1 py-1.5 rounded text-[9px] font-bold border transition-all"
                                style={{
                                  background:newRating.rating===r?(r>=8?"rgba(34,197,94,0.2)":r>=6?"rgba(245,158,11,0.2)":"rgba(239,68,68,0.2)"):"rgba(255,255,255,0.02)",
                                  borderColor:newRating.rating===r?(r>=8?"rgba(34,197,94,0.5)":r>=6?"rgba(245,158,11,0.5)":"rgba(239,68,68,0.5)"):"rgba(255,255,255,0.06)",
                                  color:newRating.rating===r?(r>=8?"#4ade80":r>=6?"#fbbf24":"#f87171"):"rgba(148,163,184,0.5)"
                                }}>{r}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Motstander" value={newRating.opponent} onChange={e=>setNR(p=>({...p,opponent:e.target.value}))}
                            className="flex-1 bg-bg0/60 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-amber-500/40"/>
                          <button onClick={()=>ratingPlayer&&addRating(ratingPlayer)} disabled={!ratingPlayer||!newRating.opponent}
                            className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/25 rounded-lg text-xs text-amber-400 hover:bg-amber-500/25 transition-colors disabled:opacity-40">
                            Lagre
                          </button>
                        </div>
                        <input type="text" placeholder="Notat (valgfritt)" value={newRating.note||""} onChange={e=>setNR(p=>({...p,note:e.target.value}))}
                          className="w-full bg-bg0/60 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-amber-500/40"/>
                      </div>

                      {/* History */}
                      {Object.entries(matchRatings).length===0
                        ?<p className="text-textMuted text-xs text-center py-4">Ingen ratinger ennå</p>
                        :Object.entries(matchRatings).map(([name,ratings])=>{
                          const avg=ratings.reduce((a,r)=>a+r.rating,0)/ratings.length
                          const trend=ratings.length>=2?ratings[0].rating-ratings[1].rating:0
                          return(
                            <div key={name} className="rounded-xl border border-white/8 overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-white/6" style={{background:"rgba(255,255,255,0.03)"}}>
                                <button onClick={()=>{setNPlayer(name);setRightTab("bok")}} className="text-xs font-bold text-white hover:text-brand">{name}</button>
                                <div className="flex items-center gap-2">
                                  {trend!==0&&<span className={`text-[9px] font-bold ${trend>0?"text-green-400":"text-red-400"}`}>{trend>0?"↑":"↓"}{Math.abs(trend).toFixed(1)}</span>}
                                  <Star size={10} className="text-amber-400"/>
                                  <span className="text-xs font-black text-amber-400">{avg.toFixed(1)}</span>
                                  <span className="text-[9px] text-textMuted">{ratings.length} kamp</span>
                                </div>
                              </div>
                              {ratings.slice(0,3).map((r,i)=>(
                                <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-white/4 last:border-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black w-4" style={{color:r.rating>=8?"#22c55e":r.rating>=6?"#f59e0b":"#ef4444"}}>{r.rating}</span>
                                    <span className="text-[10px] text-textMuted">vs {r.opponent}</span>
                                    {r.note&&<span className="text-[9px] text-textMuted/50 truncate max-w-[70px]">{r.note}</span>}
                                  </div>
                                  <span className="text-[9px] text-textMuted">{r.date}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}