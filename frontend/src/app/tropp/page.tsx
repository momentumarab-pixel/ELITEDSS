"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  Users, Plus, X, Save, RefreshCw, Search, FileText,
  ArrowLeft, ChevronRight, RotateCcw, Wrench,
  Minus, Circle, Square, ArrowRight, Trash2,
  AlertTriangle, Crown, Zap, BarChart3, Clock,
  BookOpen, Star, GitCompare, Heart, Calendar,
  ChevronDown, Activity, Shield
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────
interface Player {
  player_name: string; team_name: string; age: number
  pos_group: string; fair_score: number; forecast_score: number | null; minutes: number
}
interface InjuryLog { reason: string; returnDate: string; date: string }
interface MatchRating { rating: number; opponent: string; date: string; note?: string }
interface PlayerNote { text: string; updatedAt: string }
interface SquadPlayer extends Player {
  slot: string; shirt_number: number; salary: number; px: number; py: number
  status?: "fit"|"injured"|"suspended"|"doubt"
}

// ── Formations — keeper BOTTOM, strikers TOP ───────────────────────────────
const FORMATIONS: Record<string, {
  label: string
  description: string
  slots: Record<string, {x:number;y:number;label:string;group:string}>
}> = {
  "4-3-3": {
    label:"4-3-3", description:"Angrepsorientert med tre angripere",
    slots:{
      gk:  {x:50,y:88,label:"GK", group:"GK" },
      lb:  {x:18,y:72,label:"LB", group:"DEF"},
      cb2: {x:38,y:74,label:"CB", group:"DEF"},
      cb1: {x:62,y:74,label:"CB", group:"DEF"},
      rb:  {x:82,y:72,label:"RB", group:"DEF"},
      cm2: {x:30,y:52,label:"CM", group:"MID"},
      cm1: {x:50,y:50,label:"CM", group:"MID"},
      cm3: {x:70,y:52,label:"CM", group:"MID"},
      lw:  {x:18,y:22,label:"LW", group:"ATT"},
      st1: {x:50,y:14,label:"ST", group:"ATT"},
      rw:  {x:82,y:22,label:"RW", group:"ATT"},
    }
  },
  "4-4-2": {
    label:"4-4-2", description:"Klassisk balansert formasjon",
    slots:{
      gk:  {x:50,y:88,label:"GK", group:"GK" },
      lb:  {x:18,y:72,label:"LB", group:"DEF"},
      cb2: {x:38,y:74,label:"CB", group:"DEF"},
      cb1: {x:62,y:74,label:"CB", group:"DEF"},
      rb:  {x:82,y:72,label:"RB", group:"DEF"},
      lm:  {x:18,y:50,label:"LM", group:"MID"},
      cm2: {x:40,y:52,label:"CM", group:"MID"},
      cm1: {x:60,y:52,label:"CM", group:"MID"},
      rm:  {x:82,y:50,label:"RM", group:"MID"},
      st2: {x:38,y:16,label:"ST", group:"ATT"},
      st1: {x:62,y:16,label:"ST", group:"ATT"},
    }
  },
  "4-2-3-1": {
    label:"4-2-3-1", description:"Modern med dobbeltstopper og hengende spiss",
    slots:{
      gk:  {x:50,y:88,label:"GK",  group:"GK" },
      lb:  {x:18,y:72,label:"LB",  group:"DEF"},
      cb2: {x:38,y:74,label:"CB",  group:"DEF"},
      cb1: {x:62,y:74,label:"CB",  group:"DEF"},
      rb:  {x:82,y:72,label:"RB",  group:"DEF"},
      dm2: {x:40,y:58,label:"DM",  group:"MID"},
      dm1: {x:60,y:58,label:"DM",  group:"MID"},
      lam: {x:22,y:36,label:"LAM", group:"MID"},
      cam: {x:50,y:34,label:"CAM", group:"MID"},
      ram: {x:78,y:36,label:"RAM", group:"MID"},
      st1: {x:50,y:14,label:"ST",  group:"ATT"},
    }
  },
  "3-5-2": {
    label:"3-5-2", description:"Med wingbacks og kontroll på midten",
    slots:{
      gk:  {x:50,y:88,label:"GK",  group:"GK" },
      cb3: {x:28,y:74,label:"CB",  group:"DEF"},
      cb2: {x:50,y:76,label:"CB",  group:"DEF"},
      cb1: {x:72,y:74,label:"CB",  group:"DEF"},
      lwb: {x:10,y:54,label:"LWB", group:"MID"},
      cm3: {x:30,y:50,label:"CM",  group:"MID"},
      cm2: {x:50,y:48,label:"CM",  group:"MID"},
      cm1: {x:70,y:50,label:"CM",  group:"MID"},
      rwb: {x:90,y:54,label:"RWB", group:"MID"},
      st2: {x:36,y:16,label:"ST",  group:"ATT"},
      st1: {x:64,y:16,label:"ST",  group:"ATT"},
    }
  },
  "5-3-2": {
    label:"5-3-2", description:"Defensiv med fem forsvarere og wingbacks",
    slots:{
      gk:  {x:50,y:88,label:"GK", group:"GK" },
      lb:  {x:10,y:66,label:"LB", group:"DEF"},
      cb3: {x:28,y:74,label:"CB", group:"DEF"},
      cb2: {x:50,y:76,label:"CB", group:"DEF"},
      cb1: {x:72,y:74,label:"CB", group:"DEF"},
      rb:  {x:90,y:66,label:"RB", group:"DEF"},
      cm3: {x:28,y:48,label:"CM", group:"MID"},
      cm2: {x:50,y:46,label:"CM", group:"MID"},
      cm1: {x:72,y:48,label:"CM", group:"MID"},
      st2: {x:36,y:16,label:"ST", group:"ATT"},
      st1: {x:64,y:16,label:"ST", group:"ATT"},
    }
  },
}

// ── Config ─────────────────────────────────────────────────────────────────
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
const SHIRT: Record<string,number> = {
  gk:1,rb:2,lb:3,cb1:5,cb2:6,cm1:8,st1:9,cm2:10,lm:11,
  rw:7,lw:11,dm1:6,dm2:8,cam:10,ram:7,lam:11,cm3:4,
  cb3:4,rwb:2,lwb:3,st2:18,rm:7,dm3:4,
}
const TOOL_COLORS = ["#ffffff","#ef4444","#22c55e","#3b82f6","#f59e0b","#a855f7"]
type DrawTool = "arrow"|"curve"|"line"|"circle"|"rect"|"select"
interface DrawShape {id:string;type:DrawTool;points:number[];color:string;width:number}

const fmt = (v?:number) => !v?"—":v>=1e6?`${(v/1e6).toFixed(1)}M`:`${(v/1000).toFixed(0)}k`
function seedSal(n:string){let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;return 400000+(h%1600000)}

type RightTab = "squad"|"notes"|"bok"|"skade"|"sammenlign"

// ── Main ───────────────────────────────────────────────────────────────────
export default function TroppPage() {
  const [all,setAll]               = useState<Player[]>([])
  const [formation,setFormation]   = useState("4-3-3")
  const [compareF,setCompareF]     = useState("4-4-2")
  const [squad,setSquad]           = useState<Record<string,SquadPlayer>>({})
  const [bench,setBench]           = useState<SquadPlayer[]>([])
  const [activeSlot,setAS]         = useState<string|null>(null)
  const [search,setSrch]           = useState("")
  const [posF,setPosF]             = useState("Alle")
  const [focus,setFocus]           = useState<SquadPlayer|null>(null)
  const [coachNote,setCN]          = useState("")
  const [playerNotes,setPN]        = useState<Record<string,PlayerNote>>({})
  const [matchRatings,setMR]       = useState<Record<string,MatchRating[]>>({})
  const [injuryLogs,setIL]         = useState<Record<string,InjuryLog>>({})
  const [captainSlot,setCaptain]   = useState<string|null>(null)
  const [saved,setSaved]           = useState(false)
  const [dragging,setDragging]     = useState<string|null>(null)
  const [rightTab,setRightTab]     = useState<RightTab>("squad")
  const [noteSearch,setNSrch]      = useState("")
  const [notePlayer,setNPlayer]    = useState<string|null>(null)
  const [ratingPlayer,setRPlayer]  = useState<string|null>(null)
  const [newRating,setNewRating]   = useState({rating:7,opponent:"",note:"",date:""})
  const [injuryPlayer,setInjPlayer]= useState<string|null>(null)
  const [newInjury,setNewInjury]   = useState({reason:"",returnDate:"",date:""})
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

  const slots = FORMATIONS[formation].slots

  useEffect(()=>{
    fetch("http://localhost:8000/api/players?limit=254").then(r=>r.json()).then(setAll).catch(()=>{})
    try{
      const sq=localStorage.getItem("dss_sq5");if(sq)setSquad(JSON.parse(sq))
      const bn=localStorage.getItem("dss_bn5");if(bn)setBench(JSON.parse(bn))
      const cn=localStorage.getItem("dss_cn5");if(cn)setCN(cn)
      const pn=localStorage.getItem("dss_pn5");if(pn)setPN(JSON.parse(pn))
      const mr=localStorage.getItem("dss_mr5");if(mr)setMR(JSON.parse(mr))
      const il=localStorage.getItem("dss_il5");if(il)setIL(JSON.parse(il))
      const sh=localStorage.getItem("dss_sh5");if(sh)setShapes(JSON.parse(sh))
      const fm=localStorage.getItem("dss_fm5");if(fm)setFormation(fm)
      const cp=localStorage.getItem("dss_cp5");if(cp)setCaptain(cp)
    }catch{}
  },[])

  const persist = useCallback((key:string,val:any)=>{
    try{localStorage.setItem(key,JSON.stringify(val))}catch{}
  },[])

  const save = () => {
    persist("dss_sq5",squad);persist("dss_bn5",bench);persist("dss_cn5",coachNote)
    persist("dss_pn5",playerNotes);persist("dss_mr5",matchRatings);persist("dss_il5",injuryLogs)
    persist("dss_sh5",shapes);persist("dss_fm5",formation);persist("dss_cp5",captainSlot)
    setSaved(true);setTimeout(()=>setSaved(false),2000)
  }

  const changeFormation = (newF:string) => {
    const newSlots = FORMATIONS[newF].slots
    const newIds = Object.keys(newSlots)
    const sqArr = Object.entries(squad)
    const newSquad:Record<string,SquadPlayer> = {}
    sqArr.forEach(([,p],i)=>{
      const targetId = newIds[i]
      if(targetId && newSlots[targetId]){
        newSquad[targetId]={...p,slot:targetId,shirt_number:SHIRT[targetId]||10,px:newSlots[targetId].x,py:newSlots[targetId].y}
      }
    })
    setFormation(newF);setSquad(newSquad);setFocus(null)
    localStorage.setItem("dss_fm5",newF)
  }

  const pick = (p:Player) => {
    if(!activeSlot) return
    const isBench = activeSlot.startsWith("bench")
    const def = isBench?{x:50,y:50}:(slots[activeSlot]||{x:50,y:50})
    const sp:SquadPlayer={...p,slot:activeSlot,shirt_number:SHIRT[activeSlot]||10,salary:seedSal(p.player_name),px:def.x,py:def.y,status:"fit"}
    if(isBench) setBench(prev=>[...prev.filter(x=>x.player_name!==p.player_name),sp])
    else setSquad(prev=>({...prev,[activeSlot]:sp}))
    setAS(null);setSrch("")
  }

  const rmSlot=(id:string)=>{setSquad(p=>{const n={...p};delete n[id];return n});if(focus?.slot===id)setFocus(null);if(captainSlot===id)setCaptain(null)}
  const rmBench=(name:string)=>{setBench(p=>p.filter(x=>x.player_name!==name));if(focus?.player_name===name)setFocus(null)}

  const setStatus=(slot:string,status:SquadPlayer["status"])=>{
    setSquad(prev=>prev[slot]?{...prev,[slot]:{...prev[slot],status}}:prev)
    if(focus?.slot===slot)setFocus(f=>f?{...f,status}:f)
  }

  const savePlayerNote=(name:string,text:string)=>{
    const note:PlayerNote={text,updatedAt:new Date().toLocaleDateString("nb-NO",{day:"2-digit",month:"short",year:"numeric"})}
    setPN(prev=>{const n={...prev,[name]:note};persist("dss_pn5",n);return n})
  }

  const addMatchRating=(name:string)=>{
    if(!newRating.opponent) return
    const entry:MatchRating={...newRating,date:newRating.date||new Date().toLocaleDateString("nb-NO")}
    setMR(prev=>{const n={...prev,[name]:[entry,...(prev[name]||[])].slice(0,10)};persist("dss_mr5",n);return n})
    setNewRating({rating:7,opponent:"",note:"",date:""})
  }

  const saveInjury=(name:string)=>{
    if(!newInjury.reason) return
    const entry:InjuryLog={...newInjury,date:newInjury.date||new Date().toLocaleDateString("nb-NO")}
    setIL(prev=>{const n={...prev,[name]:entry};persist("dss_il5",n);return n})
    // Also set status to injured
    const slot = Object.entries(squad).find(([,p])=>p.player_name===name)?.[0]
    if(slot) setStatus(slot,"injured")
    setNewInjury({reason:"",returnDate:"",date:""})
  }

  // Drag
  const getPitchPct=useCallback((cx:number,cy:number)=>{
    const r=pitchRef.current?.getBoundingClientRect();if(!r)return null
    return{x:Math.max(2,Math.min(98,(cx-r.left)/r.width*100)),y:Math.max(2,Math.min(98,(cy-r.top)/r.height*100))}
  },[])
  const getSvgPct=(e:React.MouseEvent)=>{
    const r=svgRef.current?.getBoundingClientRect();if(!r)return null
    return{x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100}
  }
  const onMouseMove=useCallback((e:React.MouseEvent)=>{
    if(dragging){const pt=getPitchPct(e.clientX,e.clientY);if(!pt)return;setSquad(prev=>prev[dragging]?{...prev,[dragging]:{...prev[dragging],px:pt.x,py:pt.y}}:prev)}
    if(drawing&&startPt){const pt=getSvgPct(e);if(pt)setCurPt(pt)}
  },[dragging,drawing,startPt,getPitchPct])
  const onMouseUp=useCallback((e:React.MouseEvent)=>{
    if(dragging)setDragging(null)
    if(drawing&&startPt){
      const pt=getSvgPct(e)
      if(pt&&(Math.abs(pt.x-startPt.x)>1||Math.abs(pt.y-startPt.y)>1)){
        const mid={x:(startPt.x+pt.x)/2,y:Math.min(startPt.y,pt.y)-12}
        setShapes(prev=>[...prev,{id:Date.now().toString(),type:drawTool,
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
      return<g key={s.id}><path d={`M ${x1}% ${y1}% Q ${cx}% ${cy}% ${ex}% ${ey}%`}{...sp}/><polygon points={`${ex}%,${ey}% ${ex-2.5*Math.cos(a-0.5)}%,${ey-2.5*Math.sin(a-0.5)}% ${ex-2.5*Math.cos(a+0.5)}%,${ey-2.5*Math.sin(a+0.5)}%`}fill={s.color}stroke="none"/></g>
    }
    if(s.type==="circle")return<ellipse key={s.id}cx={`${(x1+x2)/2}%`}cy={`${(y1+y2)/2}%`}rx={`${Math.abs(x2-x1)/2}%`}ry={`${Math.abs(y2-y1)/2}%`}{...sp}/>
    if(s.type==="rect")return<rect key={s.id}x={`${Math.min(x1,x2)}%`}y={`${Math.min(y1,y2)}%`}width={`${Math.abs(x2-x1)}%`}height={`${Math.abs(y2-y1)}%`}{...sp}/>
    return null
  }

  const avail = all.filter(p=>{
    if(Object.values(squad).some(s=>s.player_name===p.player_name))return false
    if(bench.some(b=>b.player_name===p.player_name))return false
    if(search&&!p.player_name.toLowerCase().includes(search.toLowerCase())&&!p.team_name.toLowerCase().includes(search.toLowerCase()))return false
    if(posF!=="Alle"&&p.pos_group!==posF)return false
    return true
  }).slice(0,12)

  const sqArr    = Object.values(squad)
  const totalSal = [...sqArr,...bench].reduce((a,p)=>a+p.salary,0)
  const avgScore = sqArr.length?(sqArr.reduce((a,p)=>a+p.fair_score,0)/sqArr.length).toFixed(2):"—"
  const avgAge   = sqArr.length?(sqArr.reduce((a,p)=>a+p.age,0)/sqArr.length).toFixed(1):"—"

  const notePlayersList = Object.entries(playerNotes)
  const noteSearchResults = all.filter(p=>noteSearch.length>1&&(p.player_name.toLowerCase().includes(noteSearch.toLowerCase())||p.team_name.toLowerCase().includes(noteSearch.toLowerCase()))).slice(0,8)

  // All players that have any data (notes, ratings, injury)
  const allTrackedPlayers = Array.from(new Set([
    ...Object.keys(playerNotes),
    ...Object.keys(matchRatings),
    ...Object.keys(injuryLogs),
  ]))

  // Rating search
  const ratingSearchResults = all.filter(p=>noteSearch.length>1&&(p.player_name.toLowerCase().includes(noteSearch.toLowerCase()))).slice(0,6)

  const RIGHT_TABS: {id:RightTab;label:string;icon:React.ElementType}[] = [
    {id:"squad",     label:"Lag",        icon:Users      },
    {id:"notes",     label:"Trener",     icon:FileText   },
    {id:"bok",       label:"Spillerbok", icon:BookOpen   },
    {id:"skade",     label:"Skader",     icon:AlertTriangle},
    {id:"sammenlign",label:"Formasjon",  icon:GitCompare },
  ]

  return (
    <div className="min-h-screen bg-bg0 overflow-hidden" style={{fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
        .tok{cursor:grab;user-select:none;}.tok:active{cursor:grabbing;}
        .dshadow{filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6));}
        .scroll-thin::-webkit-scrollbar{width:3px}.scroll-thin::-webkit-scrollbar-track{background:transparent}.scroll-thin::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}
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
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                  formation===f
                    ?"bg-brand/20 border-brand/40 text-brand"
                    :"bg-white/3 border-white/8 text-textMuted hover:text-white hover:bg-white/6"
                }`}>{f}
              </button>
            ))}
          </div>

          {/* Stats + actions */}
          <div className="flex items-center gap-2">
            {avgScore!=="—"&&<div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-brand/8 border border-brand/15 rounded-lg">
              <span className="text-[10px] text-textMuted">Snitt</span>
              <span className="text-[11px] font-bold text-brand">{avgScore}</span>
            </div>}
            {totalSal>0&&<div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-green-500/8 border border-green-500/15 rounded-lg">
              <span className="text-[10px] text-textMuted">Lønn</span>
              <span className="text-[11px] font-bold text-green-400">{fmt(totalSal)}</span>
            </div>}
            <button onClick={save} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${saved?"bg-green-500/15 border-green-500/25 text-green-400":"bg-white/4 border-white/8 text-white hover:bg-white/8"}`}>
              <Save size={11}/>{saved?"Lagret!":"Lagre"}
            </button>
            <button onClick={()=>{if(!confirm("Nullstill tropp?"))return;setSquad({});setBench([]);setFocus(null);setCaptain(null)}}
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
                {captainSlot&&squad[captainSlot]&&(<>
                  <div className="w-px h-4 bg-white/8"/>
                  <div className="flex items-center gap-1.5"><Crown size={11} className="text-amber-400"/><span className="text-[10px] text-textMuted">{squad[captainSlot].player_name.split(" ").pop()}</span></div>
                </>)}
              </div>
            )}

            {/* Pitch */}
            <div className="glass-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
              {/* Pitch header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 flex-shrink-0">
                <span className="text-xs font-bold text-white uppercase tracking-widest" style={{fontFamily:"'Syne',sans-serif"}}>
                  {FORMATIONS[formation].label} · {sqArr.length<11?`${11-sqArr.length} ledig`:"✓ Komplett"}
                </span>
                <div className="flex items-center gap-1.5">
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
                      <button key={t} onClick={()=>setDrawTool(t)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg border text-[10px] transition-all ${drawTool===t?"bg-brand/20 border-brand/40 text-brand":"bg-white/3 border-white/8 text-textMuted hover:text-white"}`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="w-px h-5 bg-white/10"/>
                  <div className="flex gap-1">{TOOL_COLORS.map(c=><button key={c} onClick={()=>setDrawColor(c)} className="w-5 h-5 rounded-full border-2 transition-all" style={{background:c,borderColor:drawColor===c?"white":"transparent"}}/>)}</div>
                  <div className="w-px h-5 bg-white/10"/>
                  {[1,2,3,5].map(w=><button key={w} onClick={()=>setDrawWidth(w)} className={`w-6 h-6 flex items-center justify-center rounded border text-[9px] transition-all ${drawWidth===w?"bg-brand/20 border-brand/40 text-brand":"bg-white/3 border-white/8 text-textMuted"}`}>{w}</button>)}
                  <div className="w-px h-5 bg-white/10"/>
                  {selShape&&<button onClick={()=>{setShapes(p=>p.filter(s=>s.id!==selShape));setSelShape(null)}} className="flex items-center gap-1 px-2 py-1 bg-red-500/15 border border-red-500/25 rounded-lg text-[10px] text-red-400"><Trash2 size={9}/> Slett</button>}
                  <button onClick={()=>{setShapes([]);setSelShape(null)}} className="flex items-center gap-1 px-2 py-1 bg-white/3 border border-white/8 rounded-lg text-[10px] text-textMuted hover:text-red-400"><Trash2 size={9}/> Tøm</button>
                </div>
              )}

              {/* THE PITCH */}
              <div className="flex-1 relative overflow-hidden" ref={pitchRef}
                onMouseMove={onMouseMove} onMouseUp={onMouseUp}
                onMouseLeave={()=>{setDragging(null);if(drawing){setDrawing(false);setStartPt(null);setCurPt(null)}}}>

                {/* Grass stripes */}
                <div className="absolute inset-0" style={{background:"linear-gradient(180deg,#1a5c2a 0%,#1e6830 14.3%,#1a5c2a 28.6%,#1e6830 42.9%,#1a5c2a 57.1%,#1e6830 71.4%,#1a5c2a 85.7%)"}}/>

                {/* Lines — goal at TOP (attack), keeper area at BOTTOM */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" style={{pointerEvents:"none"}}>
                  {/* Pitch border */}
                  <rect x="3" y="2" width="94" height="96" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6"/>
                  {/* Halfway line */}
                  <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5"/>
                  {/* Centre circle */}
                  <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <circle cx="50" cy="50" r="0.8" fill="rgba(255,255,255,0.5)"/>
                  {/* ATTACK goal (top) */}
                  <rect x="37" y="2" width="26" height="5.5" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.85)" strokeWidth="0.7"/>
                  {/* Attack penalty area */}
                  <rect x="19" y="2" width="62" height="22" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.5"/>
                  {/* Attack goal area */}
                  <rect x="32" y="2" width="36" height="9" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4"/>
                  {/* Attack penalty spot */}
                  <circle cx="50" cy="14" r="0.7" fill="rgba(255,255,255,0.7)"/>
                  {/* Attack penalty arc */}
                  <path d="M36 24 A14 14 0 0 0 64 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5"/>
                  {/* KEEPER goal (bottom) */}
                  <rect x="37" y="92.5" width="26" height="5.5" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.85)" strokeWidth="0.7"/>
                  {/* Keeper penalty area */}
                  <rect x="19" y="76" width="62" height="22" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.5"/>
                  {/* Keeper goal area */}
                  <rect x="32" y="89" width="36" height="9" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4"/>
                  {/* Keeper penalty spot */}
                  <circle cx="50" cy="86" r="0.7" fill="rgba(255,255,255,0.7)"/>
                  {/* Keeper penalty arc */}
                  <path d="M36 76 A14 14 0 0 1 64 76" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5"/>
                  {/* Corners */}
                  <path d="M3 7 A5 5 0 0 0 8 2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <path d="M97 7 A5 5 0 0 1 92 2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <path d="M3 93 A5 5 0 0 1 8 98" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <path d="M97 93 A5 5 0 0 0 92 98" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                </svg>

                {/* Drawing SVG */}
                <svg ref={svgRef} className="absolute inset-0 w-full h-full"
                  style={{pointerEvents:showTools&&drawTool!=="select"?"all":"none",cursor:showTools&&drawTool!=="select"?"crosshair":"default"}}
                  onMouseDown={e=>{if(drawTool==="select"||dragging)return;e.preventDefault();const pt=getSvgPct(e);if(pt){setStartPt(pt);setDrawing(true)}}}>
                  {shapes.map(s=>renderShape(s))}
                  {drawing&&startPt&&curPt&&renderShape({id:"preview",type:drawTool,
                    points:drawTool==="curve"?[startPt.x,startPt.y,(startPt.x+curPt.x)/2,Math.min(startPt.y,curPt.y)-12,curPt.x,curPt.y]:[startPt.x,startPt.y,curPt.x,curPt.y],
                    color:drawColor,width:drawWidth},true)}
                </svg>

                {/* Player tokens */}
                {Object.entries(slots).map(([slotId,slotDef])=>{
                  const p=squad[slotId]
                  const gc=GC[slotDef.group]
                  const initials=p?p.player_name.split(" ").map(n=>n[0]).slice(0,2).join(""):null
                  const px=p?.px??slotDef.x
                  const py=p?.py??slotDef.y
                  const isCap=captainSlot===slotId
                  const hasInjury=p&&injuryLogs[p.player_name]

                  return(
                    <div key={slotId} className="absolute" style={{left:`${px}%`,top:`${py}%`,transform:"translate(-50%,-50%)",zIndex:dragging===slotId?20:10}}>
                      {p?(
                        <div className="relative group flex flex-col items-center tok" style={{width:58}}
                          onMouseDown={e=>{if(showTools&&drawTool!=="select")return;e.preventDefault();setDragging(slotId)}}>
                          {/* Shirt number */}
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black border border-white/40 dshadow"
                            style={{background:gc.bg,color:gc.dark}}>{p.shirt_number}</div>
                          {/* Status badge */}
                          {p.status&&p.status!=="fit"&&(
                            <div className="absolute -top-1 -right-2 z-20 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black border border-bg0"
                              style={{background:STATUS_CFG[p.status].color}}>{STATUS_CFG[p.status].badge}</div>
                          )}
                          {/* Captain */}
                          {isCap&&<div className="absolute -top-1 -left-2 z-20 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black" style={{background:"#f59e0b",color:"#78350f"}}>C</div>}
                          {/* Token */}
                          <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setFocus(focus?.slot===slotId?null:p)}
                            className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold text-white dshadow border-2 transition-all"
                            style={{
                              background:`radial-gradient(circle at 38% 38%, ${gc.ring}, ${gc.bg})`,
                              borderColor:focus?.slot===slotId?"white":`${gc.ring}80`,
                              boxShadow:focus?.slot===slotId?`0 0 0 3px ${gc.ring}50,0 4px 12px rgba(0,0,0,0.5)`:"0 4px 12px rgba(0,0,0,0.4)",
                              opacity:p.status==="injured"?0.45:p.status==="suspended"?0.65:1,
                            }}>{initials}
                          </button>
                          {/* Name tag */}
                          <div className="mt-1 rounded-md px-1.5 py-0.5 text-center pointer-events-none" style={{background:"rgba(0,0,0,0.82)",backdropFilter:"blur(4px)",minWidth:52}}>
                            <div className="text-white text-[9px] font-semibold leading-tight truncate max-w-[50px]">{p.player_name.split(" ").pop()}</div>
                            <div className="text-green-400 text-[8px] font-medium">{fmt(p.salary)}</div>
                          </div>
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
                <span className="text-xs text-textMuted">{bench.length}/7</span>
              </div>
              <div className="flex gap-1.5">
                {Array.from({length:7}).map((_,i)=>{
                  const p=bench[i];const gc=p?GC[p.pos_group]:null
                  return p?(
                    <div key={i} className="relative group flex-1">
                      <button onClick={()=>setFocus(focus?.player_name===p.player_name?null:p)}
                        className={`w-full rounded-xl p-1.5 flex flex-col items-center border transition-all ${focus?.player_name===p.player_name?"border-white/40 bg-white/8":"border-white/8 bg-white/3 hover:bg-white/6"}`}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-bold text-white mb-0.5 dshadow"
                          style={{background:`radial-gradient(circle at 38% 38%, ${gc?.ring}, ${gc?.bg})`}}>
                          {p.player_name.split(" ").map(n=>n[0]).slice(0,2).join("")}
                        </div>
                        <div className="text-[8px] text-white font-semibold truncate w-full text-center">{p.player_name.split(" ").pop()}</div>
                        <div className="text-[8px] text-green-400">{fmt(p.salary)}</div>
                      </button>
                      <button onClick={()=>rmBench(p.player_name)} className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex z-10">
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
                    <input autoFocus type="text" value={search} onChange={e=>setSrch(e.target.value)} placeholder="Søk..."
                      className="w-full bg-bg0/60 border border-white/8 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-brand text-white placeholder-textMuted"/>
                  </div>
                  <div className="flex gap-1">
                    {["Alle","GK","DEF","MID","ATT"].map(p=>(
                      <button key={p} onClick={()=>setPosF(p)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${posF===p?"bg-brand/15 text-brand border-brand/30":"bg-white/3 text-textMuted border-white/5 hover:text-white"}`}>{p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto scroll-thin">
                  {avail.map(p=>(
                    <button key={p.player_name} onClick={()=>pick(p)}
                      className="flex items-center justify-between px-2.5 py-2 hover:bg-white/6 rounded-xl transition-colors border border-white/5 hover:border-white/12">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 dshadow"
                          style={{background:GC[p.pos_group]?.bg||"#6366f1"}}>
                          {p.player_name.split(" ").map(n=>n[0]).slice(0,2).join("")}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white leading-tight">{p.player_name}</div>
                          <div className="text-[10px] text-textMuted">{p.team_name}</div>
                        </div>
                      </div>
                      <div className="text-right ml-1 flex-shrink-0">
                        <div className="text-xs font-bold text-brand">{p.fair_score?.toFixed(2)}</div>
                        <span className={`text-[9px] px-1 py-0.5 rounded border ${GC[p.pos_group]?.pill}`}>{p.pos_group}</span>
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
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {[
                    {l:"Score",v:focus.fair_score?.toFixed(2),c:"text-brand"},
                    {l:"Lønn",v:fmt(focus.salary),c:"text-green-400"},
                    {l:"Min",v:focus.minutes>=1000?`${(focus.minutes/1000).toFixed(1)}k`:String(focus.minutes),c:"text-white"},
                    {l:"Alder",v:`${focus.age}`,c:"text-white"},
                  ].map(s=>(
                    <div key={s.l} className="bg-white/3 rounded-xl py-2 px-1.5 text-center border border-white/5">
                      <div className={`text-sm font-bold ${s.c}`}>{s.v}</div>
                      <div className="text-[9px] text-textMuted mt-0.5">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Captain */}
                  {focus.slot&&!focus.slot.startsWith("bench")&&(
                    <button onClick={()=>setCaptain(captainSlot===focus.slot?null:focus.slot!)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${captainSlot===focus.slot?"bg-amber-500/20 border-amber-500/40 text-amber-300":"bg-white/4 border-white/8 text-textMuted hover:text-white"}`}>
                      <Crown size={11}/>{captainSlot===focus.slot?"Kaptein ✓":"Sett kaptein"}
                    </button>
                  )}
                  {/* Status */}
                  {(["fit","doubt","injured","suspended"] as const).map(s=>(
                    <button key={s} onClick={()=>{focus.slot&&setStatus(focus.slot,s);if(s==="injured"){setRightTab("skade");setInjPlayer(focus.player_name)}}}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${focus.status===s?"border-white/25 bg-white/8":"border-white/6 bg-white/2 text-textMuted hover:text-white"}`}
                      style={{color:focus.status===s?STATUS_CFG[s].color:undefined}}>
                      {STATUS_CFG[s].label}
                    </button>
                  ))}
                  {/* Shortcut buttons */}
                  <button onClick={()=>{setRightTab("bok");setNPlayer(focus.player_name);setNSrch("")}}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand/8 border border-brand/15 rounded-lg text-xs text-brand hover:bg-brand/15 transition-colors">
                    <BookOpen size={11}/> Spillerbok
                  </button>
                  <button onClick={()=>{setRightTab("skade");setRPlayer(focus.player_name)}}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/4 border border-white/8 rounded-lg text-xs text-white hover:bg-white/8 transition-colors">
                    <Star size={11}/> Kamprating
                  </button>
                  <Link href={`/player/${encodeURIComponent(focus.player_name)}`}
                    className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-white/4 border border-white/8 rounded-lg text-xs text-textMuted hover:text-white transition-colors">
                    Profil <ChevronRight size={11}/>
                  </Link>
                </div>
              </div>
            )}

            {/* ── TABS PANEL ── */}
            <div className="glass-panel rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-white/6 flex-shrink-0">
                {RIGHT_TABS.map(t=>{
                  const Icon=t.icon;const active=rightTab===t.id
                  return(
                    <button key={t.id} onClick={()=>setRightTab(t.id)}
                      className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors ${active?"text-white":"text-textMuted hover:text-white/70"}`}>
                      <Icon size={11}/>
                      {t.label}
                      {active&&<div className="absolute bottom-0 inset-x-3 h-px bg-brand rounded-t-full"/>}
                      {/* Badge for tracked players */}
                      {t.id==="bok"&&Object.keys(playerNotes).length>0&&(
                        <span className="w-4 h-4 rounded-full bg-brand/20 text-brand text-[9px] flex items-center justify-center font-bold">{Object.keys(playerNotes).length}</span>
                      )}
                      {t.id==="skade"&&Object.keys(injuryLogs).length>0&&(
                        <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 text-[9px] flex items-center justify-center font-bold">{Object.keys(injuryLogs).length}</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* ── TAB: STARTOPPSTILLING ── */}
              {rightTab==="squad"&&(
                <div className="p-4 overflow-y-auto scroll-thin flex-1">
                  {sqArr.length===0?(
                    <p className="text-textMuted text-xs text-center py-8">Legg til spillere ved å trykke på tomme plasser på banen</p>
                  ):(
                    <div className="space-y-0.5">
                      {Object.entries(slots).map(([slotId,slotDef])=>{
                        const p=squad[slotId];if(!p)return null
                        const isCap=captainSlot===slotId
                        return(
                          <div key={slotId}
                            className={`flex items-center justify-between py-2 px-2.5 rounded-xl border-b border-white/4 hover:bg-white/3 cursor-pointer transition-colors ${focus?.slot===slotId?"bg-white/4 border-white/8":"border-transparent"}`}
                            onClick={()=>setFocus(focus?.slot===slotId?null:p)}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black text-white dshadow"
                                style={{background:GC[slotDef.group].bg}}>{p.shirt_number}</div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-white">{p.player_name}</span>
                                  {isCap&&<Crown size={9} className="text-amber-400"/>}
                                  {p.status&&p.status!=="fit"&&<div className="w-2 h-2 rounded-full" style={{background:STATUS_CFG[p.status].color}}/>}
                                  {injuryLogs[p.player_name]&&<span className="text-[8px] px-1 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">S</span>}
                                </div>
                                <div className="text-[10px] text-textMuted">{slotDef.label} · {p.age}år</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-brand">{p.fair_score?.toFixed(2)}</div>
                              <div className="text-[9px] text-green-400">{fmt(p.salary)}</div>
                            </div>
                          </div>
                        )
                      })}
                      <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/6">
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-textMuted">Total lønn</span>
                          <span className="text-xs font-bold text-green-400">{fmt(totalSal)} kr</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-textMuted">Snitt score</span>
                          <span className="text-xs font-bold text-brand">{avgScore}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: TRENERNOTAT ── */}
              {rightTab==="notes"&&(
                <div className="p-4 flex flex-col flex-1 min-h-0">
                  <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium mb-2">Trenernotat — {FORMATIONS[formation].label}</p>
                  <textarea value={coachNote} onChange={e=>setCN(e.target.value)}
                    onBlur={()=>localStorage.setItem("dss_cn5",coachNote)}
                    placeholder={`Formasjon: ${formation} — ${FORMATIONS[formation].description}\n\nTaktisk plan, bytteplan, presskonsept, instruksjoner...`}
                    className="flex-1 w-full bg-bg0/60 border border-white/8 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-brand/50 text-white placeholder-textMuted/40 resize-none leading-relaxed"/>
                  <p className="text-[9px] text-textMuted mt-1.5">Lagres automatisk</p>
                </div>
              )}

              {/* ── TAB: SPILLERBOK ── */}
              {rightTab==="bok"&&(
                <div className="flex flex-col flex-1 min-h-0">
                  {/* Search + "Mine spillere" header */}
                  <div className="p-3 border-b border-white/6 flex-shrink-0 space-y-2">
                    <div className="relative">
                      <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted"/>
                      <input type="text" value={noteSearch} onChange={e=>setNSrch(e.target.value)}
                        placeholder="Søk spiller for å åpne notatbok..."
                        className="w-full bg-bg0/60 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-brand/50 text-white placeholder-textMuted"/>
                      {/* Search dropdown */}
                      {noteSearch.length>1&&noteSearchResults.length>0&&(
                        <div className="absolute z-30 w-full mt-1 rounded-xl border border-white/10 overflow-hidden shadow-2xl" style={{background:"rgba(10,10,18,0.99)"}}>
                          {noteSearchResults.map(p=>(
                            <button key={p.player_name}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/6 transition-colors text-left border-b border-white/4 last:border-0"
                              onClick={()=>{setNPlayer(p.player_name);setNSrch("")}}>
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                style={{background:GC[p.pos_group]?.bg}}>
                                {p.player_name.split(" ").map(n=>n[0]).slice(0,2).join("")}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{p.player_name}</p>
                                <p className="text-[9px] text-textMuted">{p.team_name} · {p.pos_group} · {p.age}år</p>
                              </div>
                              {playerNotes[p.player_name]&&<div className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0"/>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Note editor or "Mine spillere" list */}
                  {notePlayer?(
                    <div className="flex flex-col flex-1 min-h-0 p-3 gap-2">
                      <div className="flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <BookOpen size={12} className="text-brand"/>
                          <span className="text-xs font-bold text-white">{notePlayer}</span>
                          {playerNotes[notePlayer]?.updatedAt&&<span className="text-[9px] text-textMuted">{playerNotes[notePlayer].updatedAt}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/player/${encodeURIComponent(notePlayer)}`} className="text-[10px] text-brand hover:opacity-80 flex items-center gap-1">Profil<ChevronRight size={9}/></Link>
                          <button onClick={()=>setNPlayer(null)}><X size={12} className="text-textMuted hover:text-white"/></button>
                        </div>
                      </div>
                      <textarea
                        value={playerNotes[notePlayer]?.text||""}
                        onChange={e=>savePlayerNote(notePlayer,e.target.value)}
                        placeholder={`Notatbok for ${notePlayer}\n\nKampopptreden, styrker og svakheter, treningsobservasjoner, taktiske instruksjoner, langsiktig utvikling...`}
                        className="flex-1 w-full bg-bg0/60 border border-white/8 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-brand/50 text-white placeholder-textMuted/40 resize-none leading-relaxed"/>
                    </div>
                  ):(
                    <div className="flex-1 overflow-y-auto scroll-thin p-3">
                      <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium mb-3">
                        Mine spillere — {allTrackedPlayers.length} registrert
                      </p>
                      {allTrackedPlayers.length===0?(
                        <p className="text-textMuted text-xs text-center py-8">Søk på en spiller ovenfor for å starte første notatbok</p>
                      ):(
                        <div className="space-y-1.5">
                          {allTrackedPlayers.map(name=>{
                            const note=playerNotes[name]
                            const ratings=matchRatings[name]||[]
                            const avgR=ratings.length?ratings.reduce((a,r)=>a+r.rating,0)/ratings.length:null
                            const injury=injuryLogs[name]
                            const inSquad=Object.values(squad).some(p=>p.player_name===name)
                            return(
                              <button key={name} onClick={()=>setNPlayer(name)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all text-left">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                                  style={{background:"rgba(99,102,241,0.2)",border:"1px solid rgba(99,102,241,0.3)"}}>
                                  {name.split(" ").map(n=>n[0]).slice(0,2).join("")}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-bold text-white truncate">{name}</span>
                                    {inSquad&&<span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20 flex-shrink-0">I tropp</span>}
                                    {injury&&<span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 flex-shrink-0">Skadet</span>}
                                  </div>
                                  <p className="text-[10px] text-textMuted truncate">
                                    {note?.text?note.text.slice(0,60)+"...":"Ingen notat ennå"}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  {avgR&&<div className="flex items-center gap-1"><Star size={9} className="text-amber-400"/><span className="text-[10px] font-bold text-amber-400">{avgR.toFixed(1)}</span></div>}
                                  {ratings.length>0&&<span className="text-[9px] text-textMuted">{ratings.length} kamp</span>}
                                  {note?.updatedAt&&<span className="text-[9px] text-textMuted">{note.updatedAt}</span>}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: SKADER + KAMPRATING ── */}
              {rightTab==="skade"&&(
                <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-white/6">

                  {/* Left: Injury log */}
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="px-4 py-3 border-b border-white/6 flex-shrink-0">
                      <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium">Skadelogg</p>
                    </div>
                    <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-2">
                      {/* Add injury */}
                      <div className="rounded-xl border border-white/8 p-3 space-y-2" style={{background:"rgba(255,255,255,0.02)"}}>
                        <p className="text-[10px] text-textMuted font-medium uppercase tracking-widest">Registrer skade</p>
                        <div className="relative">
                          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted"/>
                          <input type="text" placeholder="Søk spiller..."
                            value={injuryPlayer||""}
                            onChange={e=>{
                              const q=e.target.value
                              if(!q){setInjPlayer(null);return}
                              const found=all.find(p=>p.player_name.toLowerCase().includes(q.toLowerCase()))
                              if(found)setInjPlayer(found.player_name)
                              else setInjPlayer(q)
                            }}
                            className="w-full bg-bg0/60 border border-white/8 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-red-500/40"/>
                        </div>
                        <input type="text" placeholder="Årsak (f.eks. Lyske, Ankel)" value={newInjury.reason} onChange={e=>setNewInjury(p=>({...p,reason:e.target.value}))}
                          className="w-full bg-bg0/60 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-red-500/40"/>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Forventet tilbake" value={newInjury.returnDate} onChange={e=>setNewInjury(p=>({...p,returnDate:e.target.value}))}
                            className="flex-1 bg-bg0/60 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-red-500/40"/>
                          <button onClick={()=>injuryPlayer&&saveInjury(injuryPlayer)}
                            disabled={!injuryPlayer||!newInjury.reason}
                            className="px-3 py-1.5 bg-red-500/15 border border-red-500/25 rounded-lg text-xs text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-40">
                            Lagre
                          </button>
                        </div>
                      </div>

                      {/* Injury list */}
                      {Object.entries(injuryLogs).length===0?(
                        <p className="text-textMuted text-xs text-center py-4">Ingen registrerte skader</p>
                      ):(
                        Object.entries(injuryLogs).map(([name,il])=>(
                          <div key={name} className="flex items-start justify-between p-3 rounded-xl border border-red-500/15 bg-red-500/5">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-white">{name}</span>
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/25">Skadet</span>
                              </div>
                              <p className="text-[10px] text-red-400/80 font-medium">{il.reason}</p>
                              {il.returnDate&&<p className="text-[10px] text-textMuted">Tilbake: {il.returnDate}</p>}
                              <p className="text-[9px] text-textMuted/60">{il.date}</p>
                            </div>
                            <button onClick={()=>setIL(prev=>{const n={...prev};delete n[name];persist("dss_il5",n);return n})}>
                              <X size={11} className="text-textMuted hover:text-red-400"/>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: Match ratings */}
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="px-4 py-3 border-b border-white/6 flex-shrink-0">
                      <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium">Kamprating</p>
                    </div>
                    <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-2">
                      {/* Add rating */}
                      <div className="rounded-xl border border-white/8 p-3 space-y-2" style={{background:"rgba(255,255,255,0.02)"}}>
                        <p className="text-[10px] text-textMuted font-medium uppercase tracking-widest">Ny kamprating</p>
                        <div className="relative">
                          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted"/>
                          <input type="text" placeholder="Søk spiller..."
                            value={ratingPlayer||""}
                            onChange={e=>{
                              const q=e.target.value
                              if(!q){setRPlayer(null);return}
                              const found=all.find(p=>p.player_name.toLowerCase().includes(q.toLowerCase()))
                              if(found)setRPlayer(found.player_name)
                              else setRPlayer(q)
                            }}
                            className="w-full bg-bg0/60 border border-white/8 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-amber-500/40"/>
                        </div>
                        {/* Rating 1-10 */}
                        <div>
                          <p className="text-[9px] text-textMuted mb-1.5">Rating: <span className="font-bold text-amber-400">{newRating.rating}</span>/10</p>
                          <div className="flex gap-1">
                            {[1,2,3,4,5,6,7,8,9,10].map(r=>(
                              <button key={r} onClick={()=>setNewRating(p=>({...p,rating:r}))}
                                className={`flex-1 py-1.5 rounded text-[9px] font-bold border transition-all ${
                                  newRating.rating===r?"border-amber-500/50 text-amber-400":"border-white/8 text-textMuted hover:border-white/20"
                                }`}
                                style={{background:newRating.rating===r?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.02)"}}>
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Motstander (f.eks. Brann)" value={newRating.opponent} onChange={e=>setNewRating(p=>({...p,opponent:e.target.value}))}
                            className="flex-1 bg-bg0/60 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-amber-500/40"/>
                          <button onClick={()=>ratingPlayer&&addMatchRating(ratingPlayer)}
                            disabled={!ratingPlayer||!newRating.opponent}
                            className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/25 rounded-lg text-xs text-amber-400 hover:bg-amber-500/25 transition-colors disabled:opacity-40">
                            Lagre
                          </button>
                        </div>
                        <input type="text" placeholder="Notat (valgfritt)" value={newRating.note||""} onChange={e=>setNewRating(p=>({...p,note:e.target.value}))}
                          className="w-full bg-bg0/60 border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-textMuted focus:outline-none focus:border-amber-500/40"/>
                      </div>

                      {/* Rating history */}
                      {Object.entries(matchRatings).length===0?(
                        <p className="text-textMuted text-xs text-center py-4">Ingen kampratinger ennå</p>
                      ):(
                        Object.entries(matchRatings).map(([name,ratings])=>{
                          const avg=ratings.reduce((a,r)=>a+r.rating,0)/ratings.length
                          return(
                            <div key={name} className="rounded-xl border border-white/8 overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-white/6" style={{background:"rgba(255,255,255,0.03)"}}>
                                <span className="text-xs font-bold text-white">{name}</span>
                                <div className="flex items-center gap-1.5">
                                  <Star size={10} className="text-amber-400"/>
                                  <span className="text-xs font-black text-amber-400">{avg.toFixed(1)}</span>
                                  <span className="text-[9px] text-textMuted">snitt</span>
                                </div>
                              </div>
                              {ratings.slice(0,3).map((r,i)=>(
                                <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-white/4 last:border-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black" style={{color:r.rating>=8?"#22c55e":r.rating>=6?"#f59e0b":"#ef4444"}}>{r.rating}</span>
                                    <span className="text-[10px] text-textMuted">vs {r.opponent}</span>
                                    {r.note&&<span className="text-[9px] text-textMuted/60 truncate max-w-[80px]">{r.note}</span>}
                                  </div>
                                  <span className="text-[9px] text-textMuted">{r.date}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: FORMASJONSSAMMENLIGNING ── */}
              {rightTab==="sammenlign"&&(
                <div className="flex flex-col flex-1 min-h-0 p-4 gap-4">
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] uppercase tracking-widest text-textMuted font-medium">Sammenlign mot</p>
                    <div className="flex gap-1.5">
                      {Object.keys(FORMATIONS).filter(f=>f!==formation).map(f=>(
                        <button key={f} onClick={()=>setCompareF(f)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${compareF===f?"bg-purple-500/20 border-purple-500/40 text-purple-300":"bg-white/3 border-white/8 text-textMuted hover:text-white"}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                    {[{f:formation,c:"#6366f1",label:"Aktiv"},{f:compareF,c:"#a855f7",label:"Sammenligning"}].map(({f,c,label})=>(
                      <div key={f} className="rounded-2xl border border-white/8 overflow-hidden relative" style={{background:"rgba(255,255,255,0.015)"}}>
                        <div className="px-3 py-2 border-b border-white/6 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{background:c}}/>
                            <span className="text-xs font-bold text-white">{f}</span>
                          </div>
                          <span className="text-[9px] text-textMuted">{label}</span>
                        </div>
                        {/* Mini pitch */}
                        <div className="relative" style={{paddingBottom:"130%"}}>
                          <div className="absolute inset-0" style={{background:"linear-gradient(180deg,#1a5c2a 0%,#1e6830 50%,#1a5c2a 100%)"}}>
                            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" style={{pointerEvents:"none"}}>
                              <rect x="5" y="2" width="90" height="96" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
                              <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                              <rect x="22" y="2" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5"/>
                              <rect x="22" y="78" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5"/>
                              <rect x="38" y="2" width="24" height="5" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6"/>
                              <rect x="38" y="93" width="24" height="5" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6"/>
                            </svg>
                            {/* Dots */}
                            {Object.entries(FORMATIONS[f].slots).map(([id,slot])=>(
                              <div key={id} className="absolute flex flex-col items-center"
                                style={{left:`${slot.x}%`,top:`${slot.y}%`,transform:"translate(-50%,-50%)"}}>
                                <div className="rounded-full flex items-center justify-center text-white font-black border border-white/30"
                                  style={{
                                    width:22,height:22,fontSize:8,
                                    background:`radial-gradient(circle at 38% 38%, ${GC[slot.group].ring}, ${GC[slot.group].bg})`,
                                    boxShadow:`0 0 6px ${c}40`
                                  }}>
                                  {slot.label[0]}
                                </div>
                                <div className="mt-0.5 px-1 rounded text-center" style={{background:"rgba(0,0,0,0.7)",fontSize:6,color:"rgba(255,255,255,0.7)"}}>
                                  {slot.label}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Description */}
                        <div className="px-3 py-2 border-t border-white/6">
                          <p className="text-[10px] text-textMuted">{FORMATIONS[f].description}</p>
                        </div>
                      </div>
                    ))}
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