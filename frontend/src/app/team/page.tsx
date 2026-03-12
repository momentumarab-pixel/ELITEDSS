"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  MessageSquare, FileText, Activity, Users, Star,
  Send, Bell, Plus, X, Search, ChevronRight,
  Check, Trash2, ArrowLeft, Filter, Clock,
  ThumbsUp, Eye, Edit3, Archive, Zap, Shield,
  TrendingUp, BarChart2, BookOpen, Award,
  AlertCircle, Save, RefreshCw
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────
interface TeamMember {
  id: number; name: string; role: string; avatar: string
  bg: string; ring: string; lastSeen?: string
}
interface ChatMessage {
  id: string; userId: number; text: string; time: string
  channelId: string; reactions?: Record<string,number[]>
  playerTag?: string
}
interface Channel { id: string; name: string; playerName?: string; type: "general"|"player" }
interface Assessment {
  id: string; playerId: string; playerName: string; team: string; pos: string
  userId: number; status: "interested"|"watching"|"rejected"|"signed"
  scores: { teknikk:number; fysikk:number; taktikk:number; potensial:number }
  comment: string; date: string; votes: number[]
}
interface ScoutReport {
  id: string; userId: number; playerName: string; team: string
  title: string; text: string; date: string; rating: number
  tags: string[]
}
interface ActivityEntry {
  id: string; userId: number; action: string; target?: string; time: string
  type: "note"|"view"|"shortlist"|"comment"|"report"|"chat"
}
interface Notification { id: string; text: string; time: string; read: boolean; type: string }

// ─── Static config ──────────────────────────────────────────────────────────
const TEAM: TeamMember[] = [
  { id:1, name:"Erik Solberg",   role:"Hovedtrener",        avatar:"ES", bg:"#3b82f6", ring:"#60a5fa", lastSeen:"Nå" },
  { id:2, name:"Marte Holm",     role:"Sportssjef",         avatar:"MH", bg:"#22c55e", ring:"#4ade80", lastSeen:"2 min" },
  { id:3, name:"Jonas Bakke",    role:"Speider",            avatar:"JB", bg:"#a855f7", ring:"#c084fc", lastSeen:"15 min" },
  { id:4, name:"Ingrid Vold",    role:"Analytiker",         avatar:"IV", bg:"#f59e0b", ring:"#fbbf24", lastSeen:"1 t" },
  { id:5, name:"Tobias Lund",    role:"Medisinsk ansvarlig",avatar:"TL", bg:"#ef4444", ring:"#f87171", lastSeen:"3 t" },
]

const STATUS_CFG = {
  interested: { label:"Interessert",       color:"#22c55e", bg:"rgba(34,197,94,0.12)",   border:"rgba(34,197,94,0.3)"  },
  watching:   { label:"Under vurdering",   color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.3)" },
  rejected:   { label:"Avvist",            color:"#ef4444", bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.3)"  },
  signed:     { label:"Signert",           color:"#a855f7", bg:"rgba(168,85,247,0.12)",  border:"rgba(168,85,247,0.3)" },
}
const SCORE_LABELS = ["teknikk","fysikk","taktikk","potensial"] as const
const SCORE_ICONS  = ["🎯","⚡","🧠","📈"]

const INIT_CHANNELS: Channel[] = [
  { id:"general",  name:"Generelt",    type:"general" },
  { id:"rekrutt",  name:"Rekruttering",type:"general" },
  { id:"kamp",     name:"Kampanalyse", type:"general" },
]
const INIT_MSGS: ChatMessage[] = [
  { id:"m1", userId:1, text:"Ser på M. Broholm denne uken — noen tanker fra dere?",                  time:"12:35", channelId:"general", reactions:{"👍":[2,3],"👀":[4]} },
  { id:"m2", userId:2, text:"God teknikk, trenger mer kampdata. Kan du se nærmere på avslutningsevnen?", time:"12:36", channelId:"general", reactions:{"✅":[1]} },
  { id:"m3", userId:3, text:"Bør sjekke fysiske tester også — spurte agenten i dag.",                 time:"12:38", channelId:"general" },
  { id:"m4", userId:4, text:"Jeg har GPS-tall fra siste tre kamper, sender analyse nå.",              time:"12:41", channelId:"general", reactions:{"🙏":[1,2,3]} },
]
const INIT_ASSESSMENTS: Assessment[] = [
  { id:"a1", playerId:"M. Broholm",    playerName:"M. Broholm",     team:"Rosenborg",   pos:"MID", userId:1, status:"watching",   scores:{teknikk:4,fysikk:3,taktikk:4,potensial:5}, comment:"Sterk pasningspresisjon. U21-kandidat. Bør følges videre.", date:"i dag", votes:[2,3] },
  { id:"a2", playerId:"D. Karlsbakk", playerName:"D. Karlsbakk",  team:"Sarpsborg 08",pos:"ATT", userId:2, status:"interested", scores:{teknikk:4,fysikk:4,taktikk:3,potensial:4}, comment:"Høy avslutningsprosent. Kontraktsituasjon avklares i juni.", date:"i går", votes:[1,4] },
  { id:"a3", playerId:"O. Øhlenschlæger", playerName:"O. Øhlenschlæger", team:"Fredrikstad", pos:"DEF", userId:3, status:"watching", scores:{teknikk:3,fysikk:5,taktikk:4,potensial:3}, comment:"Eksepsjonell press-kapasitet og løpsmengde. Kan trenge taktisk utvikling.", date:"2 dager", votes:[1] },
]
const INIT_REPORTS: ScoutReport[] = [
  { id:"r1", userId:3, playerName:"M. Broholm",    team:"Rosenborg",   title:"Scoutrapport — Seriell #12 vs Molde",          text:"Spilte 81 min. 94 pasninger, 87% presisjon. Vant 8/11 nærkamper. Svak på venstresiden, men utmerket i press-spill og ballvending.",  date:"i dag",  rating:4, tags:["U21","MID","Rosenborg"] },
  { id:"r2", userId:4, playerName:"D. Karlsbakk", team:"Sarpsborg 08", title:"Analyse — Avslutning og bevegelsesmønstre",     text:"5 mål og 3 assist på 12 kamper. Foretrekker å angripe fra høyre flanke. God ved lav blokk, sliter mot presshøyt.",                    date:"i går",  rating:4, tags:["ATT","Signert?"] },
  { id:"r3", userId:1, playerName:"O. Øhlenschlæger", team:"Fredrikstad", title:"Forsvarsobservasjon — 2 kamper",              text:"Gjennomsnitt 13.2 km/kamp. Topper laget i dueller. Trenger bedre posisjonering ved innlegg, men har potensial som balansespiller.", date:"3 dager",rating:3, tags:["DEF","Fysikk"] },
]
const INIT_ACTIVITY: ActivityEntry[] = [
  { id:"ac1", userId:1, action:"la til vurdering av",  target:"M. Broholm",        time:"12:30", type:"shortlist" },
  { id:"ac2", userId:2, action:"kommenterte på",        target:"D. Karlsbakk",      time:"11:15", type:"comment"   },
  { id:"ac3", userId:3, action:"sendte scoutrapport om",target:"O. Øhlenschlæger", time:"10:45", type:"report"    },
  { id:"ac4", userId:4, action:"så profilen til",       target:"M. Broholm",        time:"09:20", type:"view"      },
  { id:"ac5", userId:1, action:"sendte melding i",      target:"#generelt",         time:"08:55", type:"chat"      },
]

const uid = ()=>Math.random().toString(36).slice(2,9)
const nowTime = ()=>new Date().toLocaleTimeString("no-NO",{hour:"2-digit",minute:"2-digit"})
const today   = ()=>new Date().toLocaleDateString("nb-NO",{day:"2-digit",month:"short"})

type MainTab = "chat"|"shortlist"|"rapporter"|"aktivitet"|"team"

// ══════════════════════════════════════════════════════════════════════════
function Avatar({u,size=8}:{u:TeamMember;size?:number}){
  const fs = size<=6?8:size<=8?10:12
  return(
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-black flex-shrink-0`}
      style={{background:`radial-gradient(circle at 38% 38%, ${u.ring}, ${u.bg})`,fontSize:fs,boxShadow:`0 2px 8px ${u.bg}50`}}>
      {u.avatar}
    </div>
  )
}

function ScoreBar({val,max=5,color="#6366f1"}:{val:number;max?:number;color?:string}){
  return(
    <div className="flex gap-0.5">
      {Array.from({length:max}).map((_,i)=>(
        <div key={i} className="w-3.5 h-1.5 rounded-full transition-all" style={{background:i<val?color:"rgba(255,255,255,0.08)"}}/>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
export default function TeamHubPage() {
  const [me,setMe]                   = useState(TEAM[0])
  const [tab,setTab]                 = useState<MainTab>("chat")
  const [channels,setChannels]       = useState<Channel[]>(INIT_CHANNELS)
  const [activeChannel,setActiveCh]  = useState("general")
  const [messages,setMessages]       = useState<ChatMessage[]>(INIT_MSGS)
  const [msgInput,setMsgInput]       = useState("")
  const [assessments,setAssessments] = useState<Assessment[]>(INIT_ASSESSMENTS)
  const [reports,setReports]         = useState<ScoutReport[]>(INIT_REPORTS)
  const [activity,setActivity]       = useState<ActivityEntry[]>(INIT_ACTIVITY)
  const [notifs,setNotifs]           = useState<Notification[]>([
    {id:"n1",text:"Marte Holm kommenterte på M. Broholm",time:"5 min",read:false,type:"comment"},
    {id:"n2",text:"Jonas Bakke delte ny scoutrapport",   time:"1 t", read:false,type:"report"},
    {id:"n3",text:"Ny vurdering: D. Karlsbakk",          time:"2 t", read:true, type:"shortlist"},
  ])
  const [showNotifs,setShowNotifs]   = useState(false)
  const [playerSearch,setPS]         = useState("")
  const [allPlayers,setAllPlayers]   = useState<{player_name:string;team_name:string;pos_group:string}[]>([])
  const [psResults,setPsResults]     = useState<typeof allPlayers>([])

  // Assessment form
  const [showAssessForm,setShowAF]   = useState(false)
  const [newA,setNewA]               = useState({playerName:"",team:"",pos:"MID",status:"watching" as Assessment["status"],
    scores:{teknikk:3,fysikk:3,taktikk:3,potensial:3},comment:""})
  const [aSearch,setASearch]         = useState("")
  const [aResults,setAResults]       = useState<typeof allPlayers>([])

  // Report form
  const [showRepForm,setShowRF]      = useState(false)
  const [newR,setNewR]               = useState({playerName:"",team:"",title:"",text:"",rating:3,tagInput:""})
  const [newRTags,setNewRTags]       = useState<string[]>([])

  // Filters
  const [statusFilter,setSF]         = useState<string>("Alle")
  const [posFilter,setPF]            = useState<string>("Alle")
  const [actFilter,setAF]            = useState<string>("Alle")
  const [reportSearch,setRS]         = useState("")

  // New channel
  const [showNewCh,setShowNewCh]     = useState(false)
  const [newChName,setNewChName]     = useState("")

  const chatRef = useRef<HTMLDivElement>(null)

  // Load players
  useEffect(()=>{
    fetch("http://localhost:8000/api/players?limit=254")
      .then(r=>r.json()).then((data:any[])=>{
        setAllPlayers(data.map(p=>({player_name:p.player_name,team_name:p.team_name,pos_group:p.pos_group})))
      }).catch(()=>{})
    // Load from localStorage
    try{
      const sm=localStorage.getItem("th_msg"); if(sm)setMessages(JSON.parse(sm))
      const sa=localStorage.getItem("th_ass"); if(sa)setAssessments(JSON.parse(sa))
      const sr=localStorage.getItem("th_rep"); if(sr)setReports(JSON.parse(sr))
      const sac=localStorage.getItem("th_act"); if(sac)setActivity(JSON.parse(sac))
      const sch=localStorage.getItem("th_ch");  if(sch)setChannels(JSON.parse(sch))
    }catch{}
  },[])

  useEffect(()=>{
    if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight
  },[messages,activeChannel])

  const save=useCallback((k:string,v:any)=>{ try{localStorage.setItem(k,JSON.stringify(v))}catch{} },[])

  // Player search handlers
  useEffect(()=>{
    if(playerSearch.length<2){setPsResults([]);return}
    setPsResults(allPlayers.filter(p=>p.player_name.toLowerCase().includes(playerSearch.toLowerCase())||p.team_name.toLowerCase().includes(playerSearch.toLowerCase())).slice(0,6))
  },[playerSearch,allPlayers])
  useEffect(()=>{
    if(aSearch.length<2){setAResults([]);return}
    setAResults(allPlayers.filter(p=>p.player_name.toLowerCase().includes(aSearch.toLowerCase())).slice(0,6))
  },[aSearch,allPlayers])

  // Send chat
  const sendMsg=()=>{
    if(!msgInput.trim())return
    const msg:ChatMessage={id:uid(),userId:me.id,text:msgInput.trim(),time:nowTime(),channelId:activeChannel}
    const updated=[...messages,msg]
    setMessages(updated); save("th_msg",updated); setMsgInput("")
    logActivity(`sendte melding i`,"#"+channels.find(c=>c.id===activeChannel)?.name,"chat")
  }

  // React to message
  const react=(msgId:string,emoji:string)=>{
    setMessages(prev=>prev.map(m=>{
      if(m.id!==msgId)return m
      const r={...(m.reactions||{})}
      const arr=r[emoji]||[]
      r[emoji]=arr.includes(me.id)?arr.filter(i=>i!==me.id):[...arr,me.id]
      if(r[emoji].length===0)delete r[emoji]
      return{...m,reactions:r}
    }))
  }

  // Add assessment
  const addAssessment=()=>{
    if(!newA.playerName.trim())return
    const a:Assessment={id:uid(),playerId:newA.playerName,playerName:newA.playerName,team:newA.team,
      pos:newA.pos,userId:me.id,status:newA.status,scores:{...newA.scores},comment:newA.comment,date:today(),votes:[]}
    const updated=[a,...assessments]
    setAssessments(updated); save("th_ass",updated); setShowAF(false)
    setNewA({playerName:"",team:"",pos:"MID",status:"watching",scores:{teknikk:3,fysikk:3,taktikk:3,potensial:3},comment:""})
    logActivity("la til vurdering av",newA.playerName,"shortlist")
    setNotifs(prev=>[{id:uid(),text:`${me.name} la til vurdering: ${newA.playerName}`,time:"nå",read:false,type:"shortlist"},...prev])
  }

  // Vote on assessment
  const vote=(id:string)=>{
    setAssessments(prev=>prev.map(a=>{
      if(a.id!==id)return a
      const v=a.votes.includes(me.id)?a.votes.filter(x=>x!==me.id):[...a.votes,me.id]
      return{...a,votes:v}
    }))
  }

  // Add report
  const addReport=()=>{
    if(!newR.playerName.trim()||!newR.title.trim())return
    const r:ScoutReport={id:uid(),userId:me.id,playerName:newR.playerName,team:newR.team,
      title:newR.title,text:newR.text,date:today(),rating:newR.rating,tags:newRTags}
    const updated=[r,...reports]
    setReports(updated); save("th_rep",updated); setShowRF(false)
    setNewR({playerName:"",team:"",title:"",text:"",rating:3,tagInput:""});setNewRTags([])
    logActivity("sendte scoutrapport om",newR.playerName,"report")
    setNotifs(prev=>[{id:uid(),text:`${me.name} delte ny rapport: ${newR.playerName}`,time:"nå",read:false,type:"report"},...prev])
  }

  const logActivity=(action:string,target?:string,type:ActivityEntry["type"]="view")=>{
    const entry:ActivityEntry={id:uid(),userId:me.id,action,target,time:nowTime(),type}
    const updated=[entry,...activity].slice(0,50)
    setActivity(updated); save("th_act",updated)
  }

  // Create channel
  const createChannel=()=>{
    if(!newChName.trim())return
    const ch:Channel={id:uid(),name:newChName.trim(),type:"general"}
    const updated=[...channels,ch]
    setChannels(updated); save("th_ch",updated); setActiveCh(ch.id); setNewChName(""); setShowNewCh(false)
  }

  const unread=notifs.filter(n=>!n.read).length
  const chMessages=messages.filter(m=>m.channelId===activeChannel)

  const filteredAssessments=assessments.filter(a=>{
    if(statusFilter!=="Alle"&&STATUS_CFG[a.status]?.label!==statusFilter)return false
    if(posFilter!=="Alle"&&a.pos!==posFilter)return false
    if(playerSearch&&!a.playerName.toLowerCase().includes(playerSearch.toLowerCase()))return false
    return true
  })
  const filteredReports=reports.filter(r=>{
    if(reportSearch&&!r.playerName.toLowerCase().includes(reportSearch.toLowerCase())&&!r.title.toLowerCase().includes(reportSearch.toLowerCase()))return false
    return true
  })
  const filteredActivity=activity.filter(a=>{
    if(actFilter!=="Alle"&&TEAM.find(t=>t.id===a.userId)?.name!==actFilter)return false
    return true
  })

  const ACT_ICON: Record<ActivityEntry["type"],{icon:any;color:string}> = {
    note:      {icon:FileText,     color:"#6366f1"},
    view:      {icon:Eye,         color:"#94a3b8"},
    shortlist: {icon:Star,        color:"#f59e0b"},
    comment:   {icon:MessageSquare,color:"#22c55e"},
    report:    {icon:BookOpen,    color:"#a855f7"},
    chat:      {icon:Send,        color:"#3b82f6"},
  }

  const TABS: {id:MainTab;label:string;icon:any;badge?:number}[] = [
    {id:"chat",      label:"Chat",         icon:MessageSquare, badge:chMessages.length>0?undefined:undefined},
    {id:"shortlist", label:"Vurderinger",  icon:Star,          badge:assessments.length},
    {id:"rapporter", label:"Rapporter",    icon:BookOpen,      badge:reports.length},
    {id:"aktivitet", label:"Aktivitet",    icon:Activity},
    {id:"team",      label:"Team",         icon:Users},
  ]

  // ─── Render ────────────────────────────────────────────────────────────────
  return(
    <div className="min-h-screen bg-bg0" style={{fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
        .sthin::-webkit-scrollbar{width:3px}.sthin::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:99px}
        .msg-in{animation:slideIn .15s ease}.msg-out{animation:slideIn .15s ease}
        @keyframes slideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="border-b border-white/5 bg-bg0/95 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-[1500px] mx-auto px-5 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-textMuted hover:text-white transition-colors">
              <ArrowLeft size={13}/>Dashboard
            </Link>
            <div className="w-px h-4 bg-white/10"/>
            <MessageSquare size={13} className="text-brand"/>
            <span className="text-sm font-bold text-white" style={{fontFamily:"'Syne',sans-serif"}}>Team Hub</span>
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-green-500/8 border border-green-500/15">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
              <span className="text-[10px] text-green-400">{TEAM.filter(m=>m.lastSeen==="Nå"||m.lastSeen==="2 min").length} aktive nå</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative">
              <button onClick={()=>setShowNotifs(!showNotifs)}
                className="relative w-8 h-8 flex items-center justify-center rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 transition-colors">
                <Bell size={13} className="text-textMuted"/>
                {unread>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">{unread}</span>}
              </button>
              {showNotifs&&(
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/8 overflow-hidden z-50" style={{background:"rgba(8,8,14,0.98)",backdropFilter:"blur(20px)"}}>
                  <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-widest">Varsler</span>
                    <button onClick={()=>setNotifs(p=>p.map(n=>({...n,read:true})))} className="text-[10px] text-brand hover:text-white transition-colors">Merk alle lest</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto sthin p-2 space-y-1">
                    {notifs.map(n=>(
                      <div key={n.id} onClick={()=>setNotifs(p=>p.map(x=>x.id===n.id?{...x,read:true}:x))}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${n.read?"bg-white/2 hover:bg-white/4":"bg-brand/8 border border-brand/15 hover:bg-brand/12"}`}>
                        <p className="text-xs text-white leading-relaxed">{n.text}</p>
                        <p className="text-[10px] text-textMuted mt-0.5">{n.time} siden</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User switcher */}
            <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/8 bg-white/3">
              <Avatar u={me} size={6}/>
              <div className="hidden sm:block">
                <p className="text-[11px] font-semibold text-white leading-tight">{me.name}</p>
                <p className="text-[9px] text-textMuted">{me.role}</p>
              </div>
              <select value={me.id} onChange={e=>setMe(TEAM.find(m=>m.id===+e.target.value)!)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full">
                {TEAM.map(m=><option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-5 py-4" style={{height:"calc(100vh - 48px)"}}>
        <div className="flex gap-4 h-full">

          {/* ── LEFT: Channel sidebar (only in chat tab) ── */}
          {tab==="chat"&&(
            <div className="w-44 flex-shrink-0 flex flex-col gap-2">
              <div className="glass-panel rounded-2xl flex-1 flex flex-col overflow-hidden">
                <div className="px-3 py-3 border-b border-white/6 flex items-center justify-between flex-shrink-0">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-textMuted">Kanaler</span>
                  <button onClick={()=>setShowNewCh(!showNewCh)} className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center hover:bg-brand/15 transition-colors">
                    <Plus size={9} className="text-textMuted hover:text-brand"/>
                  </button>
                </div>
                {showNewCh&&(
                  <div className="p-2 border-b border-white/6 flex gap-1">
                    <input value={newChName} onChange={e=>setNewChName(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&createChannel()}
                      placeholder="Ny kanal..." autoFocus
                      className="flex-1 bg-bg0/60 border border-white/8 rounded-lg px-2 py-1 text-[10px] text-white placeholder-textMuted focus:outline-none focus:border-brand/50"/>
                    <button onClick={createChannel} className="px-1.5 rounded-lg bg-brand/15 border border-brand/25 text-brand"><Check size={9}/></button>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto sthin p-1.5 space-y-0.5">
                  {channels.map(ch=>{
                    const unreadCount=messages.filter(m=>m.channelId===ch.id&&m.userId!==me.id).length
                    return(
                      <button key={ch.id} onClick={()=>setActiveCh(ch.id)}
                        className={`w-full text-left flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${activeChannel===ch.id?"bg-brand/15 text-brand border border-brand/20":"text-textMuted hover:text-white hover:bg-white/4 border border-transparent"}`}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-textMuted/50 text-[10px]">#</span>
                          <span className="font-medium truncate">{ch.name}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Online members */}
                <div className="p-2.5 border-t border-white/6 flex-shrink-0">
                  <p className="text-[8px] uppercase tracking-widest text-textMuted font-bold mb-2">Online</p>
                  <div className="space-y-1.5">
                    {TEAM.map(m=>(
                      <div key={m.id} className="flex items-center gap-2">
                        <div className="relative">
                          <Avatar u={m} size={5}/>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-bg0 ${m.lastSeen==="Nå"?"bg-green-400":m.lastSeen==="2 min"?"bg-yellow-400":"bg-white/20"}`}/>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold text-white leading-tight">{m.name.split(" ")[0]}</p>
                          <p className="text-[8px] text-textMuted">{m.lastSeen}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-0 glass-panel rounded-2xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/6 flex-shrink-0">
              {TABS.map(t=>{
                const Icon=t.icon; const active=tab===t.id
                return(
                  <button key={t.id} onClick={()=>setTab(t.id)}
                    className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors flex-shrink-0 ${active?"text-white":"text-textMuted hover:text-white/70"}`}>
                    <Icon size={12}/>{t.label}
                    {(t.badge??0)>0&&<span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-brand/15 text-brand">{t.badge}</span>}
                    {active&&<div className="absolute bottom-0 inset-x-3 h-0.5 bg-brand rounded-t-full"/>}
                  </button>
                )
              })}
            </div>

            {/* ══ CHAT ══ */}
            {tab==="chat"&&(
              <div className="flex flex-col flex-1 min-h-0">
                {/* Channel header */}
                <div className="px-5 py-2.5 border-b border-white/4 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white" style={{fontFamily:"'Syne',sans-serif"}}>
                      #{channels.find(c=>c.id===activeChannel)?.name}
                    </span>
                    <span className="text-[10px] text-textMuted">{chMessages.length} meldinger</span>
                  </div>
                  {/* Tag player */}
                  <div className="relative">
                    <input placeholder="Tagg spiller i kanal..." value={playerSearch} onChange={e=>setPS(e.target.value)}
                      className="bg-bg0/40 border border-white/8 rounded-xl pl-3 pr-3 py-1.5 text-[10px] text-white placeholder-textMuted/50 focus:outline-none focus:border-brand/40 w-44"/>
                    {psResults.length>0&&(
                      <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-white/10 overflow-hidden z-30 shadow-2xl" style={{background:"rgba(8,8,14,0.99)"}}>
                        {psResults.map(p=>(
                          <button key={p.player_name}
                            onClick={()=>{
                              setMsgInput(prev=>prev+`@${p.player_name} `)
                              setPS(""); setPsResults([])
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/6 text-left text-xs text-white border-b border-white/4 last:border-0">
                            <span className="font-semibold">{p.player_name}</span>
                            <span className="text-textMuted text-[9px]">{p.team_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div ref={chatRef} className="flex-1 overflow-y-auto sthin px-4 py-3 space-y-3">
                  {chMessages.length===0&&(
                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-30">
                      <MessageSquare size={32} className="text-white/20"/>
                      <p className="text-xs text-textMuted">Ingen meldinger — start samtalen</p>
                    </div>
                  )}
                  {chMessages.map((msg,i)=>{
                    const sender=TEAM.find(t=>t.id===msg.userId)!
                    const isMine=msg.userId===me.id
                    const showAvatar=i===0||chMessages[i-1].userId!==msg.userId
                    return(
                      <div key={msg.id} className={`flex items-end gap-2.5 msg-in ${isMine?"flex-row-reverse":""}`}>
                        <div className={showAvatar?"opacity-100":"opacity-0"} style={{width:32}}>
                          {sender&&<Avatar u={sender} size={8}/>}
                        </div>
                        <div className={`flex flex-col gap-0.5 max-w-[65%] ${isMine?"items-end":""}`}>
                          {showAvatar&&(
                            <div className={`flex items-center gap-2 mb-0.5 ${isMine?"flex-row-reverse":""}`}>
                              <span className="text-[10px] font-bold text-white">{sender?.name}</span>
                              <span className="text-[9px] text-textMuted">{msg.time}</span>
                              <span className="text-[9px] text-textMuted/40">{sender?.role}</span>
                            </div>
                          )}
                          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMine?"bg-brand/20 border border-brand/25 text-white rounded-br-md":"bg-white/5 border border-white/8 text-white rounded-bl-md"}`}
                            style={{maxWidth:420}}>
                            {msg.text.split(/(@\S+)/g).map((part,j)=>
                              part.startsWith("@")
                                ?<Link key={j} href={`/player/${encodeURIComponent(part.slice(1))}`} className="text-brand hover:underline font-semibold">{part}</Link>
                                :<span key={j}>{part}</span>
                            )}
                          </div>
                          {/* Reactions */}
                          <div className={`flex items-center gap-1 mt-0.5 flex-wrap ${isMine?"justify-end":""}`}>
                            {msg.reactions&&Object.entries(msg.reactions).map(([emoji,users])=>(
                              <button key={emoji} onClick={()=>react(msg.id,emoji)}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${users.includes(me.id)?"bg-brand/15 border-brand/25":"bg-white/4 border-white/8 hover:bg-white/8"}`}>
                                {emoji}<span className="text-white/60">{users.length}</span>
                              </button>
                            ))}
                            <button onClick={()=>react(msg.id,"👍")} className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded-full text-[10px] border border-white/6 bg-white/2 hover:bg-white/8 transition-all text-textMuted">+</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-white/6 flex-shrink-0">
                  <div className="flex items-end gap-3">
                    <Avatar u={me} size={8}/>
                    <div className="flex-1 relative">
                      <textarea value={msgInput} onChange={e=>setMsgInput(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg()}}}
                        placeholder={`Melding i #${channels.find(c=>c.id===activeChannel)?.name} — Enter for å sende`}
                        rows={1}
                        className="w-full bg-bg0/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-textMuted focus:outline-none focus:border-brand/40 resize-none leading-relaxed pr-12"/>
                      <button onClick={sendMsg} disabled={!msgInput.trim()}
                        className="absolute right-3 bottom-2.5 w-7 h-7 rounded-xl flex items-center justify-center bg-brand/20 border border-brand/30 text-brand hover:bg-brand/30 transition-all disabled:opacity-30">
                        <Send size={11}/>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pl-11">
                    {["👍","👀","✅","🎯","❓"].map(e=>(
                      <button key={e} onClick={()=>setMsgInput(p=>p+e)} className="text-base hover:scale-110 transition-transform">{e}</button>
                    ))}
                    <span className="text-[9px] text-textMuted ml-2">Shift+Enter = ny linje</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══ VURDERINGER (SHORTLIST) ══ */}
            {tab==="shortlist"&&(
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between flex-shrink-0 gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] uppercase tracking-widest text-textMuted">Status</span>
                    {["Alle",...Object.values(STATUS_CFG).map(s=>s.label)].map(s=>(
                      <button key={s} onClick={()=>setSF(s)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${statusFilter===s?"bg-brand/15 border-brand/30 text-brand":"bg-white/2 border-white/6 text-textMuted hover:text-white"}`}>{s}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-white/10"/>
                    {["Alle","GK","DEF","MID","ATT"].map(p=>(
                      <button key={p} onClick={()=>setPF(p)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${posFilter===p?"bg-white/10 border-white/20 text-white":"bg-white/2 border-white/6 text-textMuted hover:text-white"}`}>{p}
                      </button>
                    ))}
                  </div>
                  <button onClick={()=>setShowAF(!showAssessForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/15 border border-brand/30 rounded-xl text-xs font-bold text-brand hover:bg-brand/25 transition-colors">
                    <Plus size={11}/>Ny vurdering
                  </button>
                </div>

                {/* New assessment form */}
                {showAssessForm&&(
                  <div className="mx-5 mt-4 mb-2 p-4 rounded-2xl border border-brand/25 bg-brand/4 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-white" style={{fontFamily:"'Syne',sans-serif"}}>Ny spillervurdering</p>
                      <button onClick={()=>setShowAF(false)}><X size={13} className="text-textMuted hover:text-white"/></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 mb-3">
                      <div className="relative col-span-2">
                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted"/>
                        <input placeholder="Spillernavn" value={newA.playerName}
                          onChange={e=>{setNewA(p=>({...p,playerName:e.target.value}));setASearch(e.target.value)}}
                          className="w-full bg-bg0/60 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-textMuted focus:outline-none focus:border-brand/50"/>
                        {aResults.length>0&&(
                          <div className="absolute z-30 w-full mt-1 rounded-xl border border-white/10 overflow-hidden shadow-xl" style={{background:"rgba(8,8,14,0.99)"}}>
                            {aResults.map(p=>(
                              <button key={p.player_name} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/6 text-left border-b border-white/4 last:border-0"
                                onClick={()=>{setNewA(prev=>({...prev,playerName:p.player_name,team:p.team_name,pos:p.pos_group}));setASearch("");setAResults([])}}>
                                <span className="text-xs font-semibold text-white">{p.player_name}</span>
                                <span className="text-[10px] text-textMuted">{p.team_name} · {p.pos_group}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input placeholder="Klubb" value={newA.team} onChange={e=>setNewA(p=>({...p,team:e.target.value}))}
                        className="bg-bg0/60 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-textMuted focus:outline-none focus:border-brand/50"/>
                    </div>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <select value={newA.pos} onChange={e=>setNewA(p=>({...p,pos:e.target.value}))}
                        className="bg-bg0/60 border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand/50">
                        {["GK","DEF","MID","ATT"].map(p=><option key={p}>{p}</option>)}
                      </select>
                      {(Object.entries(STATUS_CFG) as [Assessment["status"],typeof STATUS_CFG[keyof typeof STATUS_CFG]][]).map(([k,v])=>(
                        <button key={k} onClick={()=>setNewA(p=>({...p,status:k}))}
                          className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${newA.status===k?"":"opacity-40"}`}
                          style={{background:newA.status===k?v.bg:"transparent",borderColor:v.border,color:v.color}}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                    {/* Score sliders */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {SCORE_LABELS.map((label,li)=>(
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-sm">{SCORE_ICONS[li]}</span>
                          <span className="text-[10px] text-textMuted capitalize w-16">{label}</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(v=>(
                              <button key={v} onClick={()=>setNewA(p=>({...p,scores:{...p.scores,[label]:v}}))}
                                className="w-5 h-5 rounded-md border text-[9px] font-bold transition-all"
                                style={{
                                  background:newA.scores[label]>=v?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.03)",
                                  borderColor:newA.scores[label]>=v?"rgba(99,102,241,0.5)":"rgba(255,255,255,0.08)",
                                  color:newA.scores[label]>=v?"#a5b4fc":"rgba(148,163,184,0.4)"
                                }}>{v}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <textarea value={newA.comment} onChange={e=>setNewA(p=>({...p,comment:e.target.value}))}
                      placeholder="Kommentar — kampobservasjoner, anbefalinger, oppfølgingspunkter..."
                      rows={3} className="w-full bg-bg0/60 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-textMuted focus:outline-none focus:border-brand/50 resize-none mb-3 leading-relaxed"/>
                    <button onClick={addAssessment} disabled={!newA.playerName.trim()}
                      className="w-full py-2.5 bg-brand/15 border border-brand/30 rounded-xl text-sm font-bold text-brand hover:bg-brand/25 transition-colors disabled:opacity-30">
                      Del vurdering med teamet
                    </button>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto sthin p-5 space-y-3">
                  {filteredAssessments.length===0&&<div className="text-center py-10 text-textMuted text-xs">Ingen vurderinger matcher filteret</div>}
                  {filteredAssessments.map(a=>{
                    const author=TEAM.find(t=>t.id===a.userId)!
                    const totalScore=Object.values(a.scores).reduce((s,v)=>s+v,0)
                    const maxScore=SCORE_LABELS.length*5
                    const sc=STATUS_CFG[a.status]
                    const voted=a.votes.includes(me.id)
                    return(
                      <div key={a.id} className="p-4 rounded-2xl border border-white/8 hover:border-white/12 transition-all" style={{background:"rgba(255,255,255,0.02)"}}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link href={`/player/${encodeURIComponent(a.playerName)}`} className="text-sm font-black text-white hover:text-brand transition-colors" style={{fontFamily:"'Syne',sans-serif"}}>{a.playerName}</Link>
                                <span className="text-[9px] text-textMuted">{a.team} · {a.pos}</span>
                                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold border" style={{background:sc.bg,borderColor:sc.border,color:sc.color}}>{sc.label}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Avatar u={author} size={5}/>
                                <span className="text-[10px] text-textMuted">{author?.name} · {author?.role} · {a.date}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/8 bg-white/3">
                              <BarChart2 size={10} className="text-brand"/>
                              <span className="text-xs font-black text-brand">{totalScore}</span>
                              <span className="text-[9px] text-textMuted">/{maxScore}</span>
                            </div>
                            <button onClick={()=>vote(a.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-medium transition-all ${voted?"bg-green-500/15 border-green-500/25 text-green-400":"bg-white/3 border-white/8 text-textMuted hover:text-white"}`}>
                              <ThumbsUp size={10}/>{a.votes.length}
                            </button>
                          </div>
                        </div>

                        {/* Score grid */}
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {SCORE_LABELS.map((label,li)=>(
                            <div key={label} className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px]">{SCORE_ICONS[li]}</span>
                                <span className="text-[9px] text-textMuted capitalize">{label}</span>
                                <span className="text-[9px] font-bold text-white ml-auto">{a.scores[label]}/5</span>
                              </div>
                              <ScoreBar val={a.scores[label]} color={a.scores[label]>=4?"#22c55e":a.scores[label]>=3?"#f59e0b":"#ef4444"}/>
                            </div>
                          ))}
                        </div>

                        {a.comment&&<p className="text-xs text-white/70 leading-relaxed border-t border-white/4 pt-3">{a.comment}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ══ RAPPORTER ══ */}
            {tab==="rapporter"&&(
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between flex-shrink-0 gap-3">
                  <div className="relative">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted"/>
                    <input placeholder="Søk rapporter..." value={reportSearch} onChange={e=>setRS(e.target.value)}
                      className="bg-bg0/60 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-textMuted focus:outline-none focus:border-brand/50 w-52"/>
                  </div>
                  <button onClick={()=>setShowRF(!showRepForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/15 border border-brand/30 rounded-xl text-xs font-bold text-brand hover:bg-brand/25 transition-colors">
                    <Plus size={11}/>Ny rapport
                  </button>
                </div>

                {showRepForm&&(
                  <div className="mx-5 mt-4 mb-2 p-4 rounded-2xl border border-brand/25 bg-brand/4 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-white" style={{fontFamily:"'Syne',sans-serif"}}>Ny scoutrapport</p>
                      <button onClick={()=>setShowRF(false)}><X size={13} className="text-textMuted hover:text-white"/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input placeholder="Spillernavn" value={newR.playerName} onChange={e=>setNewR(p=>({...p,playerName:e.target.value}))}
                        className="bg-bg0/60 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-textMuted focus:outline-none focus:border-brand/50"/>
                      <input placeholder="Klubb" value={newR.team} onChange={e=>setNewR(p=>({...p,team:e.target.value}))}
                        className="bg-bg0/60 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-textMuted focus:outline-none focus:border-brand/50"/>
                    </div>
                    <input placeholder="Rapporttittel" value={newR.title} onChange={e=>setNewR(p=>({...p,title:e.target.value}))}
                      className="w-full bg-bg0/60 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-textMuted focus:outline-none focus:border-brand/50 mb-2"/>
                    <textarea placeholder="Rapporttekst — kampobservasjoner, statistikk, anbefaling..." rows={4} value={newR.text} onChange={e=>setNewR(p=>({...p,text:e.target.value}))}
                      className="w-full bg-bg0/60 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-textMuted focus:outline-none focus:border-brand/50 resize-none mb-2 leading-relaxed"/>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] text-textMuted">Rating:</span>
                      {[1,2,3,4,5].map(v=>(
                        <button key={v} onClick={()=>setNewR(p=>({...p,rating:v}))}
                          className={`w-7 h-7 rounded-lg border text-xs font-bold transition-all ${newR.rating>=v?"bg-amber-500/20 border-amber-500/40 text-amber-300":"bg-white/3 border-white/8 text-textMuted"}`}>
                          {v}
                        </button>
                      ))}
                      <div className="flex items-center gap-2 ml-3">
                        <input placeholder="+ tag (Enter)" value={newR.tagInput} onChange={e=>setNewR(p=>({...p,tagInput:e.target.value}))}
                          onKeyDown={e=>{if(e.key==="Enter"&&newR.tagInput.trim()){setNewRTags(p=>[...p,newR.tagInput.trim()]);setNewR(p=>({...p,tagInput:""}))}}}
                          className="bg-bg0/60 border border-white/8 rounded-xl px-2.5 py-1.5 text-[10px] text-white placeholder-textMuted focus:outline-none w-32"/>
                        {newRTags.map(tag=>(
                          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand/15 text-brand text-[9px] border border-brand/20">
                            {tag}<button onClick={()=>setNewRTags(p=>p.filter(t=>t!==tag))}><X size={8}/></button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <button onClick={addReport} disabled={!newR.playerName.trim()||!newR.title.trim()}
                      className="w-full py-2.5 bg-brand/15 border border-brand/30 rounded-xl text-sm font-bold text-brand hover:bg-brand/25 transition-colors disabled:opacity-30">
                      Del rapport med teamet
                    </button>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto sthin p-5 space-y-3">
                  {filteredReports.length===0&&<div className="text-center py-10 text-textMuted text-xs">Ingen rapporter funnet</div>}
                  {filteredReports.map(r=>{
                    const author=TEAM.find(t=>t.id===r.userId)!
                    return(
                      <div key={r.id} className="p-4 rounded-2xl border border-white/8 hover:border-white/12 transition-all" style={{background:"rgba(255,255,255,0.02)"}}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Link href={`/player/${encodeURIComponent(r.playerName)}`} className="text-sm font-black text-white hover:text-brand" style={{fontFamily:"'Syne',sans-serif"}}>{r.playerName}</Link>
                              <span className="text-[9px] text-textMuted">{r.team}</span>
                              {r.tags.map(t=>(
                                <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-brand/12 text-brand border border-brand/20">{t}</span>
                              ))}
                            </div>
                            <p className="text-xs font-semibold text-white/80">{r.title}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {Array.from({length:5}).map((_,i)=>(
                              <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{background:i<r.rating?"#f59e0b":"rgba(255,255,255,0.08)"}}/>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed mb-3">{r.text}</p>
                        <div className="flex items-center justify-between border-t border-white/4 pt-2">
                          <div className="flex items-center gap-2">
                            <Avatar u={author} size={5}/>
                            <span className="text-[10px] text-textMuted">{author?.name} · {author?.role}</span>
                          </div>
                          <span className="text-[10px] text-textMuted">{r.date}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ══ AKTIVITET ══ */}
            {tab==="aktivitet"&&(
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-5 py-3 border-b border-white/6 flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <Filter size={11} className="text-textMuted"/>
                  <span className="text-[9px] uppercase tracking-widest text-textMuted">Filter</span>
                  {["Alle",...TEAM.map(t=>t.name)].map(n=>(
                    <button key={n} onClick={()=>setAF(n)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${actFilter===n?"bg-brand/15 border-brand/30 text-brand":"bg-white/2 border-white/6 text-textMuted hover:text-white"}`}>{n}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto sthin px-5 py-4">
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-white/6"/>
                    <div className="space-y-0">
                      {filteredActivity.map((entry,i)=>{
                        const user=TEAM.find(t=>t.id===entry.userId)!
                        const {icon:Icon,color}=ACT_ICON[entry.type]
                        return(
                          <div key={entry.id} className="relative flex items-start gap-4 pl-12 pb-5 group">
                            {/* Timeline dot */}
                            <div className="absolute left-3.5 top-0.5 w-3 h-3 rounded-full border-2 border-bg0 flex items-center justify-center" style={{background:color}}>
                              <Icon size={6} className="text-white"/>
                            </div>
                            <div className="flex-1 flex items-center justify-between gap-3 py-2 px-3.5 rounded-xl hover:bg-white/3 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <Avatar u={user} size={6}/>
                                <div>
                                  <p className="text-xs text-white">
                                    <span className="font-semibold">{user?.name}</span>
                                    <span className="text-textMuted"> {entry.action} </span>
                                    {entry.target&&(
                                      entry.target.startsWith("#")
                                        ?<span className="text-brand font-medium">{entry.target}</span>
                                        :<Link href={`/player/${encodeURIComponent(entry.target)}`} className="text-brand font-medium hover:underline">{entry.target}</Link>
                                    )}
                                  </p>
                                  <p className="text-[9px] text-textMuted">{user?.role}</p>
                                </div>
                              </div>
                              <span className="text-[10px] text-textMuted flex-shrink-0">{entry.time}</span>
                            </div>
                          </div>
                        )
                      })}
                      {filteredActivity.length===0&&<p className="text-textMuted text-xs text-center py-10">Ingen aktivitet</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ TEAM ══ */}
            {tab==="team"&&(
              <div className="flex-1 overflow-y-auto sthin p-5">
                <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-xl font-black text-white" style={{fontFamily:"'Syne',sans-serif"}}>Rekrutteringsteam</h2>
                      <p className="text-xs text-textMuted mt-0.5">{TEAM.length} aktive medlemmer</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/8 border border-green-500/15">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
                      <span className="text-xs text-green-400">{TEAM.filter(m=>m.lastSeen==="Nå"||m.lastSeen==="2 min").length} aktive nå</span>
                    </div>
                  </div>

                  {TEAM.map(member=>{
                    const memberMsgs=messages.filter(m=>m.userId===member.id).length
                    const memberAss=assessments.filter(a=>a.userId===member.id).length
                    const memberRep=reports.filter(r=>r.userId===member.id).length
                    const total=memberMsgs+memberAss+memberRep
                    const isMe=member.id===me.id
                    return(
                      <div key={member.id} className={`p-5 rounded-2xl border transition-all ${isMe?"border-brand/30 bg-brand/4":"border-white/8 bg-white/2 hover:border-white/12"}`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3.5">
                            <div className="relative">
                              <Avatar u={member} size={12}/>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-bg0 ${member.lastSeen==="Nå"?"bg-green-400":member.lastSeen==="2 min"?"bg-yellow-400":"bg-white/20"}`}/>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-white" style={{fontFamily:"'Syne',sans-serif"}}>{member.name}</h3>
                                {isMe&&<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand/15 text-brand border border-brand/25 font-bold">DEG</span>}
                              </div>
                              <p className="text-xs text-textMuted">{member.role}</p>
                              <p className="text-[10px] text-textMuted/50 mt-0.5">Sist aktiv: {member.lastSeen} siden</p>
                            </div>
                          </div>
                          {isMe&&(
                            <div className="px-3 py-1.5 rounded-xl border border-brand/25 bg-brand/8 flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand"/>
                              <span className="text-[10px] text-brand font-semibold">Innlogget</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {label:"Meldinger",  val:memberMsgs, icon:MessageSquare, color:"#3b82f6"},
                            {label:"Vurderinger",val:memberAss,  icon:Star,          color:"#f59e0b"},
                            {label:"Rapporter",  val:memberRep,  icon:BookOpen,      color:"#a855f7"},
                          ].map(stat=>{
                            const Icon=stat.icon
                            return(
                              <div key={stat.label} className="flex flex-col items-center py-3 rounded-xl border border-white/6 bg-white/2">
                                <Icon size={13} style={{color:stat.color}} className="mb-1.5"/>
                                <span className="text-xl font-black text-white">{stat.val}</span>
                                <span className="text-[9px] text-textMuted">{stat.label}</span>
                              </div>
                            )
                          })}
                        </div>
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