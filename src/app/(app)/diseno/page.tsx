"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PropertyExplorer from "@/components/PropertyExplorer";
import Dashboard from "@/components/Dashboard";
import TokkoDescriptionForm from "@/components/TokkoDescriptionForm";
import { motion, AnimatePresence } from "framer-motion";
import { Building, DocumentText1 } from "iconsax-react";
import { PageHeader } from "@/components/nav/PageHeader";

type ActiveTab = "properties" | "tokko_description";

export default function DisenoPage() {
  const searchParams = useSearchParams();
  const initialTab: ActiveTab = searchParams.get("tab") === "tokko_description" ? "tokko_description" : "properties";

  const [property, setProperty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  // Sync activeTab when URL ?tab= changes (sidebar accordion navigation).
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "tokko_description") setActiveTab("tokko_description");
    else if (t === "properties") setActiveTab("properties");
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_success') === 'true') {
      if (window.opener) {
        window.close();
        return;
      }
    }

    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.user) setUser(data.user);
    }).catch(() => {});
  }, []);

  const handlePropertyLoad = (data: any) => {
    setProperty(data);
  };

  return (
    <div className="diseno-context min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-navy-radial pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/[0.03] to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-secondary/[0.04] to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <PageHeader title="Diseño" />
      </div>

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-6 relative z-10">
        <AnimatePresence mode="wait">
          {property ? (
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
            <motion.div
              key="hub"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-6xl mx-auto"
            >
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
    </div>
  );
}

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
