"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import PropertyExplorer from "@/components/PropertyExplorer";
import Dashboard from "@/components/Dashboard";
import TokkoDescriptionForm from "@/components/TokkoDescriptionForm";
import LoginScreen from "@/components/LoginScreen";
import { motion, AnimatePresence } from "framer-motion";
import { Building, DocumentText1, Logout } from "iconsax-react";

type ActiveTab = "properties" | "tokko_description";

export default function Home() {
  const [property, setProperty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("properties");
  const [user, setUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check auth on load
  useEffect(() => {
    // Si estamos dentro del popup de OAuth, cerrarlo para alertar a la ventana padre
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_success') === 'true') {
      if (window.opener) {
        window.close();
        return;
      }
    }

    const storedUser = localStorage.getItem("tokko_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch(e) {}
    }
    setIsCheckingAuth(false);
  }, []);

  const handleLoginSuccess = (userData: any) => {
    localStorage.setItem("tokko_user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("tokko_user");
    setUser(null);
  };

  if (isCheckingAuth) return null;

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const handlePropertyLoad = (data: any) => {
    console.log("Propiedad cargada:", data);
    setProperty(data);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col relative overflow-hidden">
      {/* Subtle Background Textures */}
      <div className="absolute inset-0 bg-navy-radial pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/[0.03] to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-secondary/[0.04] to-transparent blur-3xl pointer-events-none" />

      {/* ══ Top Bar ══ */}
      <header className="w-full relative z-10 border-b border-outline-variant/30 bg-surface/70 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">

          {/* Left: Logo + label */}
          <button
            onClick={() => setProperty(null)}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <Image
              src="/logo-pequeno.png"
              alt="Freire Propiedades"
              width={96}
              height={32}
              className="object-contain group-hover:opacity-75 transition-opacity duration-200"
            />
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-4 w-px bg-primary/15" />
              <span className="text-[10px] font-bold text-primary/50 uppercase tracking-[0.18em]">
                Placas & Redes
              </span>
            </div>
          </button>

          {/* Center: system label (only on large screens, truly centered) */}
          <span className="hidden lg:block text-[11px] text-on-surface-variant/40 font-medium tracking-wide absolute left-1/2 -translate-x-1/2 pointer-events-none select-none">
            Sistema Interno de Contenidos
          </span>

          {/* Right: user pill + logout */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-surface border border-outline-variant rounded-xl px-2.5 py-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <span className="text-[11px] font-semibold text-primary truncate max-w-[100px] sm:max-w-[180px] md:max-w-[240px]">
                {user.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-error/10 text-error hover:bg-error hover:text-white border border-error/25 hover:border-error transition-all duration-200 cursor-pointer text-[11px] font-semibold shrink-0"
              title="Cerrar sesión"
            >
              <Logout size={14} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-6 relative z-10">
        <AnimatePresence mode="wait">
          {property ? (
            /* ── Dashboard (Property selected) ── */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <Dashboard property={property} user={user} onBack={() => setProperty(null)} />
            </motion.div>
          ) : (
            /* ── Main Hub (Tabs) ── */
            <motion.div
              key="hub"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-6xl mx-auto"
            >
              {/* Tab Selector */}
              <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
                <TabButton
                  active={activeTab === "properties"}
                  onClick={() => setActiveTab("properties")}
                  icon={<Building size={18} />}
                  label="Propiedades Publicadas"
                />
                <TabButton
                  active={activeTab === "tokko_description"}
                  onClick={() => setActiveTab("tokko_description")}
                  icon={<DocumentText1 size={18} />}
                  label="Descripción para Tokko Broker"
                />
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === "properties" ? (
                  <motion.div
                    key="tab-properties"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <PropertyExplorer onSelectProperty={handlePropertyLoad} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="tab-tokko"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <TokkoDescriptionForm />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center relative z-10">
        <p className="text-xs text-on-surface-variant/40 font-medium">
          &copy; {new Date().getFullYear()} Freire Propiedades &mdash; Uso exclusivo interno
        </p>
      </footer>
    </div>
  );
}

/* ── Tab Button Component ── */
function TabButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
        active
          ? "bg-primary text-white shadow-md shadow-primary/20"
          : "bg-white text-on-surface-variant border border-outline-variant hover:border-secondary/30 hover:text-primary hover:shadow-sm"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
