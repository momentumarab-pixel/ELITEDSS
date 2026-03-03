"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Shield, 
  LayoutDashboard, 
  User, 
  BarChart3,
  Sword, 
  Users,
  Star,
  Zap,
  Home,
  Target
} from "lucide-react"

const navItems = [
  { name: "Forside", href: "/", icon: Home },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Spillerprofil", href: "/player", icon: User },
  { name: "Sammenligning", href: "/duell", icon: Sword },
  { name: "Rekruttering", href: "/rekruttering", icon: Target },
  { name: "Kandidater", href: "/shortlist", icon: Star },
  { name: "Talent", href: "/talent", icon: Zap },
  { name: "Analyse", href: "/analyse", icon: BarChart3 },
  { name: "Stall", href: "/tropp", icon: Users },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 bg-bg1/80 backdrop-blur-lg border-b border-panel">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-brand/20 blur-md rounded-lg group-hover:bg-brand/30 transition-all"></div>
              <div className="relative bg-gradient-to-br from-brand to-purple-500 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <span className="font-bold text-xl text-brand">DSS</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || 
                (item.href !== "/" && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-brand text-white"
                      : "hover:bg-panel text-muted hover:text-text"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
