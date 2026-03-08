"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, User, GitCompare,
  Brain, Shield, Crosshair, MessageSquare, Radar
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [hoverLogo, setHoverLogo] = useState(false);

  const navItems = [
    { name: "Dashboard",     href: "/dashboard", icon: LayoutDashboard },
    { name: "Spillerprofil", href: "/player",    icon: User            },
    { name: "Sammenligning", href: "/duell",     icon: GitCompare      },
    { name: "Innsikt",       href: "/analyse",   icon: Brain           },
    { name: "Scout",         href: "/scout",     icon: Radar,           highlight: true },
    { name: "Stall",         href: "/tropp",     icon: Shield          },
    { name: "Team Hub",      href: "/team",      icon: MessageSquare   },
  ];

  const isActive = (href: string) => {
    if (href === "/player")  return pathname.startsWith("/player");
    if (href === "/analyse") return pathname.startsWith("/analyse");
    if (href === "/scout")   return pathname.startsWith("/scout");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b border-white/5"
      style={{ background: "rgba(8,8,14,0.93)", backdropFilter: "blur(24px)" }}
    >
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3) 50%, transparent)" }} />

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">

          {/* ── LOGO ── */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 select-none"
            onMouseEnter={() => setHoverLogo(true)}
            onMouseLeave={() => setHoverLogo(false)}
          >
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-xl border border-brand/40"
                style={{
                  opacity: hoverLogo ? 1 : 0,
                  transform: hoverLogo ? "scale(1.55)" : "scale(1)",
                  transition: "opacity 0.3s ease, transform 0.4s ease"
                }} />
              <div
                className="relative w-9 h-9 rounded-xl flex items-center justify-center border border-brand/20"
                style={{
                  background: "linear-gradient(145deg, rgba(99,102,241,0.18) 0%, rgba(67,56,202,0.28) 100%)",
                  boxShadow: hoverLogo
                    ? "5px 5px 20px rgba(99,102,241,0.45), -1px -1px 6px rgba(255,255,255,0.04)"
                    : "inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 10px rgba(0,0,0,0.4)",
                  transform: hoverLogo
                    ? "perspective(180px) rotateY(18deg) rotateX(-6deg) scale(1.1)"
                    : "perspective(180px) rotateY(0deg) rotateX(0deg) scale(1)",
                  transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease"
                }}
              >
                <Crosshair
                  className="relative w-4 h-4 text-brand"
                  strokeWidth={2.2}
                  style={{
                    transform: hoverLogo ? "rotate(90deg)" : "rotate(0deg)",
                    filter: hoverLogo ? "drop-shadow(0 0 5px rgba(99,102,241,1))" : "none",
                    transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), filter 0.3s ease"
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col leading-none gap-0.5">
              <div className="flex items-baseline" style={{ fontFamily: "'Syne', sans-serif" }}>
                <span
                  className="text-[17px] font-black tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #fff 0%, #c7d2fe 50%, #a5b4fc 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}
                >
                  ELITE
                </span>
                <span
                  className="text-[17px] font-black tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: hoverLogo
                      ? "drop-shadow(0 0 18px rgba(99,102,241,0.9))"
                      : "drop-shadow(0 0 10px rgba(99,102,241,0.55))",
                    transition: "filter 0.3s ease"
                  }}
                >
                  DSS
                </span>
              </div>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "8.5px",
                fontWeight: 500,
                letterSpacing: "0.2em",
                color: "rgba(129,140,248,0.5)",
                textTransform: "uppercase"
              }}>
                Scouting Intelligence
              </span>
            </div>
          </Link>

          {/* ── NAV ITEMS ── */}
          <div className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              // Scout — spesialknapp med border
              if (item.highlight) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative mx-1 px-3.5 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all duration-200"
                    style={{
                      background: active
                        ? "linear-gradient(135deg, rgba(99,102,241,0.28), rgba(79,70,229,0.22))"
                        : "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(79,70,229,0.07))",
                      border: `1px solid ${active ? "rgba(99,102,241,0.45)" : "rgba(99,102,241,0.22)"}`,
                      color: active ? "#fff" : "rgba(165,180,252,0.85)",
                      boxShadow: active ? "0 0 18px rgba(99,102,241,0.2)" : "none",
                    }}
                  >
                    <Icon
                      className="w-3.5 h-3.5 flex-shrink-0"
                      strokeWidth={active ? 2.2 : 1.8}
                      style={{ color: active ? "#a5b4fc" : "#818cf8" }}
                    />
                    <span className="hidden lg:block">{item.name}</span>
                    {active && (
                      <span className="absolute" style={{
                        bottom: "-1px", left: "50%", transform: "translateX(-50%)",
                        width: 18, height: 2, borderRadius: 99,
                        background: "linear-gradient(90deg, #818cf8, #6366f1)",
                        boxShadow: "0 0 8px rgba(99,102,241,0.7)"
                      }} />
                    )}
                  </Link>
                );
              }

              // Vanlig lenke
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3.5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-white/5 text-white"
                      : "text-textMuted hover:text-white hover:bg-white/4"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-colors duration-200 ${active ? "text-brand" : ""}`}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span className="hidden lg:block">{item.name}</span>
                  {active && (
                    <span className="absolute" style={{
                      bottom: "-1px", left: "50%", transform: "translateX(-50%)",
                      width: 18, height: 2, borderRadius: 99,
                      background: "linear-gradient(90deg, #818cf8, #6366f1)",
                      boxShadow: "0 0 8px rgba(99,102,241,0.7)"
                    }} />
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── RIGHT: live badge ── */}
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.14)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-400"
              style={{ boxShadow: "0 0 6px #4ade80", animation: "pulse 2s infinite" }} />
            <span style={{
              fontSize: "10px", fontWeight: 500,
              color: "rgba(165,180,252,0.6)",
              letterSpacing: "0.12em"
            }}>
              PROTOTYPE
              Theodor & Haron
            </span>
          </div>

        </div>
      </div>

      {/* Bottom gradient line */}
      <div style={{
        height: "1px",
        background: "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.5) 30%, rgba(148,163,184,0.4) 50%, rgba(99,102,241,0.5) 70%, transparent 100%)"
      }} />
    </nav>
  );
}