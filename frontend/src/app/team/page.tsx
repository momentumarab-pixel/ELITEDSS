"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Users, MessageSquare, FileText, Clock,
  Send, Bell, Plus, X,
  Activity, ChevronRight, Eye, Star
} from "lucide-react"

const TEAM = [
  { id: 1, name: "Kjetil",  role: "Hovedtrener", avatar: "KJ", bg: "#3b82f6", ring: "#60a5fa" },
  { id: 2, name: "Marie",   role: "Sportssjef",  avatar: "MA", bg: "#22c55e", ring: "#4ade80" },
  { id: 3, name: "Petter",  role: "Speider",     avatar: "PE", bg: "#a855f7", ring: "#c084fc" },
  { id: 4, name: "Linda",   role: "Analytiker",  avatar: "LI", bg: "#f59e0b", ring: "#fbbf24" },
]

const INIT_MESSAGES = [
  { id: 1, userId: 1, text: "Ser på M. Broholm i dag — noen tanker?",      time: "12:35" },
  { id: 2, userId: 2, text: "God teknikk, trenger mer kampdata. 👍",         time: "12:36" },
  { id: 3, userId: 3, text: "Bør sjekke fysiske tester også, spurte agenten.", time: "12:38" },
  { id: 4, userId: 4, text: "Jeg har tall fra GPS-tracker, sender nå.",     time: "12:41" },
]

const INIT_NOTES = [
  { id: 1, userId: 1, player: "M. Broholm",        club: "Rosenborg",    time: "12:30", text: "God teknikk og pasningspresisjon. Bør følges opp med fysisk test. Aktuell for U21-landslaget." },
  { id: 2, userId: 2, player: "D. Karlsbakk",      club: "Sarpsborg",    time: "11:15", text: "Høy avslutningsprosent sist sesong. Verdt å sjekke fullt kampbibliotek. Snakket med agent." },
  { id: 3, userId: 3, player: "O. Øhlenschlæger",  club: "Fredrikstad",  time: "09:30", text: "Kamprapport mottatt. Ser lovende ut i press-spillet og høyintensitetsperioder." },
]

const INIT_ACTIVITY = [
  { id: 1, userId: 1, action: "la til notat om",    player: "M. Broholm",       time: "12:30", type: "note"      },
  { id: 2, userId: 2, action: "oppdaterte shortlist",                            time: "11:15", type: "shortlist" },
  { id: 3, userId: 3, action: "så profil til",      player: "D. Karlsbakk",     time: "10:45", type: "view"      },
  { id: 4, userId: 4, action: "kommenterte på",     player: "O. Øhlenschlæger", time: "09:20", type: "comment"   },
]

function Avatar({ user, size = 8 }: { user: typeof TEAM[0]; size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{
        background: `radial-gradient(circle at 38% 38%, ${user.ring}, ${user.bg})`,
        fontSize: size <= 6 ? 9 : size <= 8 ? 11 : 13,
        boxShadow: `0 2px 8px ${user.bg}60`
      }}
    >
      {user.avatar}
    </div>
  )
}

export default function TeamPage() {
  const [me, setMe]             = useState(TEAM[0])
  const [messages, setMessages] = useState(INIT_MESSAGES)
  const [notes, setNotes]       = useState(INIT_NOTES)
  const [msgInput, setMsgInput] = useState("")
  const [showModal, setModal]   = useState(false)
  const [newNote, setNew]       = useState({ player: "", club: "", text: "" })
  const [notifs, setNotifs]     = useState([
    { id: 1, text: "Marie kommenterte på M. Broholm", time: "5 min", read: false },
    { id: 2, text: "Petter delte nytt scout-notat",   time: "1 t",   read: false },
  ])
  const [showNotifs, setShowNotifs] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = chatRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = () => {
    if (!msgInput.trim()) return
    setMessages(p => [...p, {
      id: Date.now(), userId: me.id, text: msgInput,
      time: new Date().toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" })
    }])
    setMsgInput("")
  }

  const shareNote = () => {
    if (!newNote.player || !newNote.text) return
    setNotes(p => [{ id: Date.now(), userId: me.id, player: newNote.player, club: newNote.club || "Ukjent", time: "nå", text: newNote.text }, ...p])
    setModal(false); setNew({ player: "", club: "", text: "" })
  }

  const unread = notifs.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-bg0" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HEADER ── */}
      <div className="border-b border-white/5" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 70%)" }}>
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={15} className="text-brand" />
                <span className="text-xs uppercase tracking-widest text-textMuted font-medium">Team Hub</span>
              </div>
              <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                Rekrutteringsteam
              </h1>
              <p className="text-textMuted">Kommunikasjon, notater og aktivitet — samlet på ett sted.</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification bell */}
              <div className="relative">
                <button onClick={() => setShowNotifs(!showNotifs)}
                  className="relative w-9 h-9 flex items-center justify-center glass-panel hover:bg-white/5 rounded-xl transition-colors">
                  <Bell size={15} className="text-textMuted" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                      {unread}
                    </span>
                  )}
                </button>
                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-72 glass-panel p-3 z-50 rounded-2xl border border-white/8">
                    <div className="text-xs font-semibold text-white uppercase tracking-widest mb-3 px-1">Varsler</div>
                    {notifs.map(n => (
                      <div key={n.id} onClick={() => setNotifs(p => p.map(x => x.id === n.id ? { ...x, read: true } : x))}
                        className={`p-3 rounded-xl mb-1.5 cursor-pointer transition-colors ${n.read ? "bg-white/2" : "bg-brand/8 border border-brand/15"}`}>
                        <p className="text-xs text-white leading-relaxed">{n.text}</p>
                        <p className="text-[10px] text-textMuted mt-1">{n.time} siden</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User switcher */}
              <div className="glass-panel px-3 py-2 rounded-xl flex items-center gap-2.5 border border-white/8">
                <Avatar user={me} size={7} />
                <div>
                  <div className="text-xs font-semibold text-white leading-tight">{me.name}</div>
                  <div className="text-[10px] text-textMuted">{me.role}</div>
                </div>
                <select value={me.id} onChange={e => setMe(TEAM.find(m => m.id === +e.target.value)!)}
                  className="absolute opacity-0 inset-0 cursor-pointer w-full">
                  {TEAM.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="relative">
                  <select value={me.id} onChange={e => setMe(TEAM.find(m => m.id === +e.target.value)!)}
                    className="bg-transparent border-none text-[10px] text-textMuted focus:outline-none cursor-pointer pr-1">
                    {TEAM.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Team avatars row */}
          <div className="flex items-center gap-2 mt-5">
            <span className="text-xs text-textMuted mr-1">Team:</span>
            <div className="flex -space-x-1.5">
              {TEAM.map(m => <Avatar key={m.id} user={m} size={7} />)}
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: "0 0 5px #4ade80" }} />
              <span className="text-[11px] text-textMuted">4 aktive</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="grid grid-cols-3 gap-5">

          {/* ── LEFT: CHAT (2 cols) ── */}
          <div className="col-span-2 space-y-5">

            {/* Chat */}
            <div className="glass-panel rounded-2xl flex flex-col" style={{ height: 420 }}>
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
                <MessageSquare size={14} className="text-brand" />
                <span className="text-sm font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Team-chat</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-textMuted">Live</span>
                </div>
              </div>

              {/* Messages */}
              <div ref={chatRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {messages.map(msg => {
                  const user = TEAM.find(t => t.id === msg.userId)!
                  const isMe = msg.userId === me.id
                  return (
                    <div key={msg.id} className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                      <Avatar user={user} size={8} />
                      <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-white">{user.name}</span>
                          <span className="text-[10px] text-textMuted">{msg.time}</span>
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-brand/15 border border-brand/20 text-white rounded-tr-sm"
                            : "bg-white/5 border border-white/8 text-white/90 rounded-tl-sm"
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  )
                })}

              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-white/5">
                <div className="flex gap-2 items-center">
                  <Avatar user={me} size={7} />
                  <div className="flex-1 flex items-center gap-2 bg-bg0/60 border border-white/8 rounded-xl px-3 py-2 focus-within:border-brand transition-colors">
                    <input
                      type="text" value={msgInput}
                      onChange={e => setMsgInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && send()}
                      placeholder="Skriv melding til teamet..."
                      className="flex-1 bg-transparent text-sm text-white placeholder-textMuted focus:outline-none"
                    />
                    <button onClick={send} className={`flex-shrink-0 transition-colors ${msgInput.trim() ? "text-brand hover:text-white" : "text-textMuted"}`}>
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity feed */}
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-brand" />
                <span className="text-sm font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Siste aktivitet</span>
              </div>
              <div className="space-y-1">
                {INIT_ACTIVITY.map(a => {
                  const user = TEAM.find(t => t.id === a.userId)!
                  const icon = a.type === "note" ? <FileText size={11} /> : a.type === "view" ? <Eye size={11} /> : a.type === "shortlist" ? <Star size={11} /> : <MessageSquare size={11} />
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-2 border-b border-white/4">
                      <Avatar user={user} size={6} />
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-xs font-semibold text-white">{user.name}</span>
                        <span className="text-xs text-textMuted">{a.action}</span>
                        {a.player && (
                          <Link href={`/player/${encodeURIComponent(a.player)}`}
                            className="text-xs text-brand hover:underline font-medium truncate">
                            {a.player}
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[9px] text-textMuted">{a.time}</span>
                        <span className="text-textMuted/40">{icon}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT: NOTES + TEAM ── */}
          <div className="space-y-5">

            {/* Scout notes */}
            <div className="glass-panel rounded-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-brand" />
                  <span className="text-sm font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Scout-notater</span>
                </div>
                <button onClick={() => setModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-brand/10 border border-brand/20 rounded-lg text-xs text-brand hover:bg-brand/20 transition-colors">
                  <Plus size={11} /> Nytt
                </button>
              </div>

              <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                {notes.map(note => {
                  const user = TEAM.find(t => t.id === note.userId)!
                  return (
                    <div key={note.id} className="px-5 py-4 hover:bg-white/2 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Link href={`/player/${encodeURIComponent(note.player)}`}
                          className="text-sm font-semibold text-white hover:text-brand transition-colors leading-tight">
                          {note.player}
                        </Link>
                        <span className="text-[10px] text-textMuted flex-shrink-0 mt-0.5">{note.club}</span>
                      </div>
                      <p className="text-xs text-textMuted leading-relaxed mb-3 line-clamp-2">{note.text}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar user={user} size={5} />
                          <span className="text-[10px]" style={{ color: user.ring }}>{user.name}</span>
                        </div>
                        <span className="text-[10px] text-textMuted">{note.time}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Team members */}
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={14} className="text-brand" />
                <span className="text-sm font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Teamet</span>
              </div>
              <div className="space-y-2">
                {TEAM.map(member => (
                  <div key={member.id}
                    onClick={() => setMe(member)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${me.id === member.id ? "bg-white/6 border border-white/10" : "hover:bg-white/3"}`}>
                    <Avatar user={member} size={8} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white leading-tight">{member.name}</div>
                      <div className="text-[10px] text-textMuted">{member.role}</div>
                    </div>
                    {me.id === member.id && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand/15 border border-brand/25 text-brand font-medium">deg</span>
                    )}
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" style={{ boxShadow: "0 0 4px #4ade80" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── NEW NOTE MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Nytt scout-notat</h3>
                <p className="text-xs text-textMuted mt-0.5">Deles med hele teamet</p>
              </div>
              <button onClick={() => setModal(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg transition-colors">
                <X size={14} className="text-textMuted" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-textMuted mb-1.5 block">Spiller</label>
                <input value={newNote.player} onChange={e => setNew(p => ({...p, player: e.target.value}))}
                  placeholder="F.eks. Marcus Broholm"
                  className="w-full bg-bg0/60 border border-white/8 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand text-white placeholder-textMuted" />
              </div>
              <div>
                <label className="text-xs text-textMuted mb-1.5 block">Klubb</label>
                <input value={newNote.club} onChange={e => setNew(p => ({...p, club: e.target.value}))}
                  placeholder="F.eks. Rosenborg"
                  className="w-full bg-bg0/60 border border-white/8 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand text-white placeholder-textMuted" />
              </div>
              <div>
                <label className="text-xs text-textMuted mb-1.5 block">Vurdering</label>
                <textarea value={newNote.text} onChange={e => setNew(p => ({...p, text: e.target.value}))}
                  placeholder="Skriv din scout-vurdering..."
                  rows={4}
                  className="w-full bg-bg0/60 border border-white/8 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand text-white placeholder-textMuted resize-none" />
              </div>
              <button onClick={shareNote} disabled={!newNote.player || !newNote.text}
                className="w-full py-2.5 bg-brand/15 border border-brand/25 rounded-xl text-sm font-semibold text-brand hover:bg-brand/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Del med teamet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}