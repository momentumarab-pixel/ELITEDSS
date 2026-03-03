"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Target, 
  Users, 
  Star, 
  Zap,
  Clock,
  FileText,
  Plus,
  Eye,
  Award,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CheckCircle
} from "lucide-react"

interface ScoutingActivity {
  id: string
  player_name: string
  team_name: string
  age: number
  pos_group: string
  match_score: number
  priority: 'high' | 'medium' | 'low'
  last_seen: string
  notes?: string
  recommended?: boolean
}

interface ScoutNote {
  id: string
  timestamp: string
  player_name: string
  note: string
}

export default function RekrutteringPage() {
  const [activities, setActivities] = useState<ScoutingActivity[]>([])
  const [notes, setNotes] = useState<ScoutNote[]>([])
  const [newNote, setNewNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")

  useEffect(() => {
    const demoActivities: ScoutingActivity[] = [
      {
        id: '1',
        player_name: 'M. Broholm',
        team_name: 'Rosenborg',
        age: 21,
        pos_group: 'MID',
        match_score: 91,
        priority: 'high',
        last_seen: '3 dager siden',
        notes: 'God teknikk, mangler litt fysikk.',
        recommended: true
      },
      {
        id: '2',
        player_name: 'D. Karlsbakk',
        team_name: 'Sarpsborg',
        age: 22,
        pos_group: 'ATT',
        match_score: 87,
        priority: 'high',
        last_seen: '1 uke siden',
        notes: 'Høy avslutningsprosent, følg med!',
        recommended: true
      },
      {
        id: '3',
        player_name: 'O. Øhlenschlæger',
        team_name: 'Fredrikstad',
        age: 21,
        pos_group: 'MID',
        match_score: 74,
        priority: 'medium',
        last_seen: '2 uker siden',
        notes: 'Kamprapport mottatt, ser lovende ut.'
      },
      {
        id: '4',
        player_name: 'L. Alvheim',
        team_name: 'Kristiansund',
        age: 21,
        pos_group: 'DEF',
        match_score: 62,
        priority: 'low',
        last_seen: '1 måned siden'
      },
      {
        id: '5',
        player_name: 'F. Carstensen',
        team_name: 'Sarpsborg',
        age: 23,
        pos_group: 'DEF',
        match_score: 68,
        priority: 'medium',
        last_seen: '3 uker siden'
      }
    ]

    const demoNotes: ScoutNote[] = [
      {
        id: '1',
        timestamp: '14:32',
        player_name: 'M. Broholm',
        note: 'God teknikk, mangler litt fysikk.'
      },
      {
        id: '2',
        timestamp: '11:05',
        player_name: 'D. Karlsbakk',
        note: 'Høy avslutningsprosent, følg med!'
      },
      {
        id: '3',
        timestamp: '09:30',
        player_name: 'O. Øhlenschlæger',
        note: 'Kamprapport mottatt, ser lovende ut.'
      }
    ]

    setActivities(demoActivities)
    setNotes(demoNotes)
    setLoading(false)
  }, [])

  const addNote = () => {
    if (!newNote.trim()) return
    
    const note: ScoutNote = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      player_name: 'Ny',
      note: newNote
    }
    
    setNotes([note, ...notes])
    setNewNote("")
  }

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-green-500/20 text-green-500 border-green-500/30'
      case 'medium': return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
      case 'low': return 'bg-purple-500/20 text-purple-500 border-purple-500/30'
      default: return 'bg-panel text-textMuted'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-green-500" />
      case 'medium': return <AlertCircle className="w-4 h-4 text-blue-500" />
      case 'low': return <AlertCircle className="w-4 h-4 text-purple-500" />
      default: return null
    }
  }

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.priority === filter)

  const highCount = activities.filter(a => a.priority === 'high').length
  const mediumCount = activities.filter(a => a.priority === 'medium').length
  const lowCount = activities.filter(a => a.priority === 'low').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Target className="w-6 h-6 text-brand animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-brand mb-2 flex items-center gap-3">
          <Target className="w-8 h-8" />
          Rekruttering
        </h1>
        <p className="text-textMuted">Samlet oversikt over alle scouting-aktiviteter</p>
      </div>

      {/* Nøkkeltall - Samme stil som forsiden */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-6">
          <Target className="w-8 h-8 text-brand mb-3" />
          <div className="text-3xl font-bold text-white mb-1">{activities.length}</div>
          <div className="text-sm text-textMuted">Aktive scoutinger</div>
          <div className="text-xs text-brand mt-1">{highCount} høy prioritet</div>
        </div>

        <div className="glass-panel p-6">
          <Star className="w-8 h-8 text-amber-500 mb-3" />
          <div className="text-3xl font-bold text-white mb-1">8</div>
          <div className="text-sm text-textMuted">Kandidater</div>
          <div className="text-xs text-amber-500 mt-1">På shortlist</div>
        </div>

        <div className="glass-panel p-6">
          <Zap className="w-8 h-8 text-purple-500 mb-3" />
          <div className="text-3xl font-bold text-white mb-1">39</div>
          <div className="text-sm text-textMuted">U23-spillere</div>
          <div className="text-xs text-purple-500 mt-1">I databasen</div>
        </div>

        <div className="glass-panel p-6">
          <Users className="w-8 h-8 text-green-500 mb-3" />
          <div className="text-3xl font-bold text-white mb-1">3</div>
          <div className="text-sm text-textMuted">Pågående samtaler</div>
          <div className="text-xs text-green-500 mt-1">Med agenter/klubber</div>
        </div>
      </div>

      {/* Hovedinnhold - 2 kolonner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Venstre kolonne - Aktive scoutinger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Target className="text-brand" size={20} />
                Aktive scoutinger
              </h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand rounded-lg transition-all text-sm">
                <Plus size={16} />
                <span>Ny scouting</span>
              </button>
            </div>

            {/* Filter-knapper */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  filter === 'all' 
                    ? 'bg-brand text-white' 
                    : 'bg-panel text-textMuted hover:text-text'
                }`}
              >
                Alle ({activities.length})
              </button>
              <button
                onClick={() => setFilter('high')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  filter === 'high' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-panel text-textMuted hover:text-text'
                }`}
              >
                Høy ({highCount})
              </button>
              <button
                onClick={() => setFilter('medium')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  filter === 'medium' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-panel text-textMuted hover:text-text'
                }`}
              >
                Medium ({mediumCount})
              </button>
              <button
                onClick={() => setFilter('low')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  filter === 'low' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-panel text-textMuted hover:text-text'
                }`}
              >
                Lav ({lowCount})
              </button>
            </div>

            {/* Aktivitetsliste */}
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="glass-panel p-4 hover:bg-panelHover transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getPriorityColor(activity.priority)}`}>
                        {getPriorityIcon(activity.priority)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/player/${encodeURIComponent(activity.player_name)}`}
                            className="font-bold text-lg hover:text-brand transition-colors"
                          >
                            {activity.player_name}
                          </Link>
                          {activity.recommended && (
                            <span className="bg-brand/20 text-brand text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Star size={10} />
                              Anbefalt
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-textMuted">
                          {activity.team_name} · {activity.age} år · {activity.pos_group}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="flex items-center gap-1 text-textMuted">
                            <Clock size={12} />
                            Sist sett: {activity.last_seen}
                          </span>
                          {activity.notes && (
                            <span className="flex items-center gap-1 text-brand">
                              <FileText size={12} />
                              Notat
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-brand">{activity.match_score}%</div>
                        <div className="text-xs text-textMuted">match</div>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-2 hover:bg-panelHover rounded-lg transition-all" title="Notater">
                          <FileText size={16} className="text-textMuted" />
                        </button>
                        <Link 
                          href={`/player/${encodeURIComponent(activity.player_name)}`}
                          className="p-2 hover:bg-panelHover rounded-lg transition-all"
                          title="Profil"
                        >
                          <Eye size={16} className="text-textMuted" />
                        </Link>
                        <button className="p-2 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-all" title="Marker som ferdig">
                          <CheckCircle size={16} className="text-green-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Høyre kolonne - Notater og statistikk */}
        <div className="space-y-6">
          {/* Scout-notater */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="text-brand" size={20} />
              Scout-notater
            </h2>
            
            <div className="space-y-3 mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Skriv nytt notat..."
                className="w-full h-24 bg-panel border border-white/5 rounded-lg p-3 text-sm focus:outline-none focus:border-brand resize-none"
              />
              <button
                onClick={addNote}
                className="w-full flex items-center justify-center gap-2 bg-brand/10 hover:bg-brand/20 text-brand py-2 rounded-lg transition-all"
              >
                <Plus size={16} />
                <span>Lagre notat</span>
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {notes.map((note) => (
                <div key={note.id} className="bg-panel rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-brand">{note.player_name}</span>
                    <span className="text-xs text-textMuted">{note.timestamp}</span>
                  </div>
                  <p className="text-textMuted">"{note.note}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Siste aktivitet */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="text-brand" size={20} />
              Siste aktivitet
            </h2>
            
            <div className="space-y-3">
              {notes.slice(0, 3).map((note) => (
                <div key={note.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-brand" />
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{note.player_name}</span>
                      <span className="text-textMuted ml-1">{note.timestamp}</span>
                    </p>
                    <p className="text-xs text-textMuted">{note.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ukestatistikk */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-brand" size={20} />
              Ukestatistikk
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-textMuted">Nye scoutinger</span>
                <span className="font-bold text-brand">+4</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-textMuted">Spillere vurdert</span>
                <span className="font-bold text-brand">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-textMuted">Kamprapporter</span>
                <span className="font-bold text-brand">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-textMuted">Notater skrevet</span>
                <span className="font-bold text-brand">{notes.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hurtiglenker */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="text-brand" size={20} />
          Hurtiglenker
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            href="/shortlist"
            className="flex items-center gap-3 p-4 bg-panel hover:bg-panelHover rounded-lg transition-all group"
          >
            <Star className="w-6 h-6 text-amber-500" />
            <div>
              <p className="font-semibold">Kandidater</p>
              <p className="text-xs text-textMuted">8 spillere</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-textMuted group-hover:text-amber-500" />
          </Link>

          <Link 
            href="/talent"
            className="flex items-center gap-3 p-4 bg-panel hover:bg-panelHover rounded-lg transition-all group"
          >
            <Zap className="w-6 h-6 text-purple-500" />
            <div>
              <p className="font-semibold">U23 Talent</p>
              <p className="text-xs text-textMuted">39 spillere</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-textMuted group-hover:text-purple-500" />
          </Link>

          <Link 
            href="/dashboard"
            className="flex items-center gap-3 p-4 bg-panel hover:bg-panelHover rounded-lg transition-all group"
          >
            <Target className="w-6 h-6 text-brand" />
            <div>
              <p className="font-semibold">Dashboard</p>
              <p className="text-xs text-textMuted">Oversikt</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-textMuted group-hover:text-brand" />
          </Link>

          <Link 
            href="/analyse"
            className="flex items-center gap-3 p-4 bg-panel hover:bg-panelHover rounded-lg transition-all group"
          >
            <TrendingUp className="w-6 h-6 text-cyan-500" />
            <div>
              <p className="font-semibold">Analyse</p>
              <p className="text-xs text-textMuted">Innsikt</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-textMuted group-hover:text-cyan-500" />
          </Link>
        </div>
      </div>
    </div>
  )
}
