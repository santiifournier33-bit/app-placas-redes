"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sms, Warning2 } from "iconsax-react";
import { InfiniteGrid } from "@/components/ui/infinite-grid";
import { resetAllStores } from "@/lib/stores/resetAllStores";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Credenciales incorrectas.");
      }

      resetAllStores()
      router.push("/diseno");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <InfiniteGrid>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] bg-shell-surface/60 backdrop-blur-2xl rounded-[32px] shadow-modal border border-shell-border overflow-hidden relative z-10 my-auto"
        >
          <div className="pt-10 pb-8 px-8 text-center bg-shell-bg/40 border-b border-shell-border relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent" />
            <div className="mx-auto flex justify-center mb-6">
              <Image
                src="/logo-blanco-oficial.png"
                alt="Freire Propiedades"
                width={160}
                height={50}
                className="object-contain"
              />
            </div>
            <h1 className="text-xl font-heading font-bold text-shell-text tracking-tight">
              Acceso Plataforma Freire
            </h1>
            <p className="text-xs text-shell-text-muted mt-2 font-medium">
              Ingresá con tu cuenta de Tokko Broker
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-error/5 border border-error/10 p-3 rounded-xl flex items-start gap-2.5 text-error">
                    <Warning2 size={18} className="shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold leading-snug flex-1">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs md:text-[11px] font-bold text-shell-text-muted uppercase tracking-wider pl-1">Email Tokko Broker</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-shell-text-muted group-focus-within:text-brand-accent transition-colors duration-200">
                    <Sms size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="tu@email.com"
                    className="w-full h-12 bg-shell-bg/40 border border-shell-border rounded-xl pl-11 pr-4 text-sm font-medium text-shell-text placeholder:text-shell-text-muted/50 focus:outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/15 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs md:text-[11px] font-bold text-shell-text-muted uppercase tracking-wider pl-1">Contraseña</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-shell-text-muted group-focus-within:text-brand-accent transition-colors duration-200">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="Tu contraseña de Tokko"
                    className="w-full h-12 bg-shell-bg/40 border border-shell-border rounded-xl pl-11 pr-4 text-sm font-medium text-shell-text placeholder:text-shell-text-muted/50 focus:outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/15 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 mt-8 bg-gradient-to-r from-brand-accent to-brand-accent-light text-brand-primary hover:brightness-105 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none shadow-[0_4px_20px_rgba(200,164,90,0.25)] cursor-pointer"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          <div className="px-8 pb-8 text-center">
            <p className="text-xs md:text-[10px] font-semibold text-shell-text-muted/70 leading-normal">
              Tus credenciales se validan directamente con Tokko Broker de forma segura y nunca son almacenadas.
            </p>
          </div>
        </motion.div>
      </InfiniteGrid>
    </div>
  );
}
