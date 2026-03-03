"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Clock,
  Send,
  User,
  Bell,
  Share2,
  Eye,
  Star,
  ChevronRight,
  X,
  Check,
  AlertCircle
} from "lucide-react"

// Hardkodet team-medlemmer for demo
const TEAM_MEMBERS = [
  { id: 1, name: "Kjetil", role: "Hovedtrener", avatar: "KJ", color: "bg-blue-500" },
  { id: 2, name: "Marie", role: "Sportssjef", avatar: "MA", color: "bg-green-500" },
  { id: 3, name: "Petter", role: "Speider", avatar: "PE", color: "bg-purple-500" },
  { id: 4, name: "Linda", role: "Analytiker", avatar: "LI", color: "bg-amber-500" },
]

// Demo notater
const DEMO_SHARED_NOTES = [
  {
    id: 1,
    player: "M. Broholm",
    team: "Rosenborg",
    user: "Kjetil",
    time: "12:30",
    text: "God teknikk, bør følges opp med fysisk test. Kan være aktuell for U21-landslaget.",
    avatar: "KJ"
  },
  {
    id: 2,
    player: "D. Karlsbakk",
    team: "Sarpsborg",
    user: "Marie",
    time: "11:15",
    text: "Høy avslutningsprosent, verdt å sjekke kamper fra sist sesong. Snakket med agent.",
    avatar: "MA"
  },
  {
    id: 3,
    player: "O. Øhlenschlæger",
    team: "Fredrikstad",
    user: "Petter",
    time: "09:30",
    text: "Kamprapport mottatt, ser lovende ut. God i press-spillet.",
    avatar: "PE"
  },
]

// Demo aktiviteter
const DEMO_ACTIVITIES = [
  { id: 1, user: "Kjetil", action: "la til notat på", player: "M. Broholm", time: "12:30", type: "note" },
  { id: 2, user: "Marie", action: "oppdaterte shortlist", time: "11:15", type: "shortlist" },
  { id: 3, user: "Petter", action: "så profil til", player: "D. Karlsbakk", time: "10:45", type: "view" },
  { id: 4, user: "Linda", action: "kommenterte på", player: "O. Øhlenschlæger", time: "09:20", type: "comment" },
]

interface Message {
  id: number
  user: string
  text: string
  time: string
  avatar: string
  color: string
}

export default function TeamPage() {
  const [currentUser, setCurrentUser] = useState(TEAM_MEMBERS[0])
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      user: "Kjetil",
      text: "Ser på M. Broholm - noen tanker?",
      time: "12:35",
      avatar: "KJ",
      color: "bg-blue-500"
    },
    {
      id: 2,
      user: "Marie",
      text: "Enig, god teknikk! 👍",
      time: "12:36",
      avatar: "MA",
      color: "bg-green-500"
    },
    {
      id: 3,
      user: "Petter",
      text: "Bør sjekke fysiske tester også",
      time: "12:38",
      avatar: "PE",
      color: "bg-purple-500"
    }
  ])
  const [newMessage, setNewMessage] = useState("")
  const [sharedNotes, setSharedNotes] = useState(DEMO_SHARED_NOTES)
  const [activities] = useState(DEMO_ACTIVITIES)
  const [showNewNoteModal, setShowNewNoteModal] = useState(false)
  const [newNote, setNewNote] = useState({ player: "", text: "" })
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Marie kommenterte på M. Broholm", time: "5 min siden", read: false },
    { id: 2, text: "Petter delte nytt notat", time: "1 time siden", read: false },
  ])
  const [showNotifications, setShowNotifications] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: messages.length + 1,
      user: currentUser.name,
      text: newMessage,
      time: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      avatar: currentUser.avatar,
      color: currentUser.color
    }

    setMessages([...messages, message])
    setNewMessage("")
  }

  const shareNote = () => {
    if (!newNote.player || !newNote.text) return

    const note = {
      id: sharedNotes.length + 1,
      player: newNote.player,
      team: "Ukjent",
      user: currentUser.name,
      time: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      text: newNote.text,
      avatar: currentUser.avatar
    }

    setSharedNotes([note, ...sharedNotes])
    setShowNewNoteModal(false)
    setNewNote({ player: "", text: "" })

    // Legg til aktivitet
    const activity = {
      id: activities.length + 1,
      user: currentUser.name,
      action: "delte notat om",
      player: note.player,
      time: "nå",
      type: "note"
    }
    // Her ville vi oppdatert activities
  }

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-brand mb-2 flex items-center gap-3">
            <Users className="w-8 h-8" />
            Team Hub
          </h1>
          <p className="text-textMuted">Samarbeid og kommunikasjon i rekrutteringsteamet</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifikasjoner */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-panelHover rounded-lg transition-all"
            >
              <Bell size={20} className="text-textMuted" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 glass-panel p-4 z-50">
                <h3 className="font-bold mb-3">Varsler</h3>
                <div className="space-y-3">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-3 rounded-lg ${n.read ? 'bg-panel/50' : 'bg-brand/10'} cursor-pointer`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <p className="text-sm">{n.text}</p>
                      <p className="text-xs text-textMuted mt-1">{n.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Brukervelger */}
          <div className="flex items-center gap-3 glass-panel p-2">
            <span className="text-sm text-textMuted">Logget inn som:</span>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const user = TEAM_MEMBERS.find(m => m.id === parseInt(e.target.value))
                if (user) setCurrentUser(user)
              }}
              className="bg-panel border border-white/5 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-brand"
            >
              {TEAM_MEMBERS.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hovedinnhold - 2 kolonner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Venstre kolonne - Chat (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="text-brand" size={20} />
              Team-chat
            </h2>

            {/* Chat-meldinger */}
            <div 
              ref={chatContainerRef}
              className="h-96 overflow-y-auto mb-4 space-y-4 pr-2"
            >
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full ${msg.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {msg.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{msg.user}</span>
                      <span className="text-xs text-textMuted">{msg.time}</span>
                    </div>
                    <p className="text-sm bg-panel rounded-lg p-3 mt-1">{msg.text}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Skriv melding */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Skriv melding..."
                className="flex-1 bg-panel border border-white/5 rounded-lg px-4 py-3 focus:outline-none focus:border-brand"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-3 bg-brand/10 hover:bg-brand/20 text-brand rounded-lg transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* Aktivitetstrøm */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="text-brand" size={20} />
              Siste aktivitet
            </h2>

            <div className="space-y-3">
              {activities.map((act) => (
                <div key={act.id} className="flex items-center gap-3 text-sm">
                  <div className={`w-6 h-6 rounded-full ${
                    act.user === 'Kjetil' ? 'bg-blue-500' :
                    act.user === 'Marie' ? 'bg-green-500' :
                    act.user === 'Petter' ? 'bg-purple-500' : 'bg-amber-500'
                  } bg-opacity-20 flex items-center justify-center`}>
                    <span className="text-xs font-bold">{act.user[0]}</span>
                  </div>
                  <p>
                    <span className="font-bold text-brand">{act.user}</span>
                    <span className="text-textMuted"> {act.action} </span>
                    {act.player && (
                      <Link href={`/player/${encodeURIComponent(act.player)}`} className="text-brand hover:underline">
                        {act.player}
                      </Link>
                    )}
                  </p>
                  <span className="text-xs text-textMuted ml-auto">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Høyre kolonne - Delte notater */}
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="text-brand" size={20} />
                Delte notater
              </h2>
              <button
                onClick={() => setShowNewNoteModal(true)}
                className="px-3 py-1 bg-brand/10 hover:bg-brand/20 text-brand rounded-lg transition-all text-sm flex items-center gap-1"
              >
                <span>Nytt</span>
                <span>+</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {sharedNotes.map((note) => (
                <div key={note.id} className="bg-panel rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Link 
                      href={`/player/${encodeURIComponent(note.player)}`}
                      className="font-bold hover:text-brand transition-colors"
                    >
                      {note.player}
                    </Link>
                    <span className="text-xs text-textMuted">{note.team}</span>
                  </div>
                  <p className="text-sm text-textMuted mb-3">"{note.text}"</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full ${
                        note.user === 'Kjetil' ? 'bg-blue-500' :
                        note.user === 'Marie' ? 'bg-green-500' :
                        note.user === 'Petter' ? 'bg-purple-500' : 'bg-amber-500'
                      } bg-opacity-20 flex items-center justify-center`}>
                        <span className="text-[10px] font-bold">{note.avatar}</span>
                      </div>
                      <span className="text-brand">{note.user}</span>
                    </div>
                    <span className="text-textMuted">{note.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aktive team-medlemmer */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="text-brand" size={20} />
              Teamet
            </h2>

            <div className="space-y-3">
              {TEAM_MEMBERS.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {member.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-textMuted">{member.role}</p>
                  </div>
                  {member.id === currentUser.id && (
                    <span className="ml-auto text-xs bg-brand/20 text-brand px-2 py-1 rounded-full">deg</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for nytt notat */}
      {showNewNoteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Nytt notat</h3>
              <button
                onClick={() => setShowNewNoteModal(false)}
                className="p-2 hover:bg-panelHover rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-textMuted mb-2">Spiller</label>
                <input
                  type="text"
                  value={newNote.player}
                  onChange={(e) => setNewNote({...newNote, player: e.target.value})}
                  placeholder="F.eks. M. Broholm"
                  className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-sm text-textMuted mb-2">Notat</label>
                <textarea
                  value={newNote.text}
                  onChange={(e) => setNewNote({...newNote, text: e.target.value})}
                  placeholder="Skriv dine vurderinger..."
                  rows={4}
                  className="w-full bg-panel border border-white/5 rounded-lg px-4 py-2 focus:outline-none focus:border-brand resize-none"
                />
              </div>

              <button
                onClick={shareNote}
                disabled={!newNote.player || !newNote.text}
                className="w-full bg-brand hover:bg-brandDark text-white py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Del notat med teamet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
