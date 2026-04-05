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

      {/* Top Bar */}
      <header className="w-full px-8 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setProperty(null)} className="cursor-pointer">
            <Image
              src="/logo-pequeno.png"
              alt="Freire Propiedades"
              width={140}
              height={46}
              className="object-contain"
            />
          </button>
          <div className="hidden sm:flex items-center gap-2 ml-4">
            <div className="h-5 w-px bg-primary/10" />
            <span className="text-[11px] font-semibold text-primary/60 uppercase tracking-[0.15em]">
              Placas & Redes
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-on-surface-variant/50 font-medium hidden md:inline">
            Sistema Interno de Contenidos
          </span>
          <div className="h-5 w-px bg-primary/10 hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-primary">{user.email}</span>
            <button 
              onClick={handleLogout}
              className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <Logout size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-6 py-4 relative z-10">
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
              <Dashboard property={property} onBack={() => setProperty(null)} />
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
              <div className="flex items-center justify-center gap-3 mb-8">
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
      className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
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
