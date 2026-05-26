"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sms } from "iconsax-react";
import { InfiniteGrid } from "@/components/ui/infinite-grid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/ui/error-state";
import { resetAllStores } from "@/lib/stores/resetAllStores";
import { cn } from "@/lib/utils";

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
          className="w-full max-w-[420px] bg-surface-1/60 backdrop-blur-2xl rounded-[32px] shadow-modal border border-border-subtle overflow-hidden relative z-10 my-auto"
        >
          {/* Header with brand gradient strip + logo */}
          <div className="pt-10 pb-8 px-8 text-center bg-shell-bg/40 border-b border-border-subtle relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-brand-navy via-brand-navy-600 to-brand-gold" />
            <div className="mx-auto flex justify-center mb-6">
              <Image
                src="/logo-blanco-oficial.png"
                alt="Freire Propiedades"
                width={160}
                height={50}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-xl font-heading font-bold text-text-primary tracking-tight">
              Acceso Plataforma Freire
            </h1>
            <p className="text-xs text-text-muted mt-2 font-medium">
              Ingresá con tu cuenta de Tokko Broker
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <ErrorState title="No pudimos iniciar sesión" description={error} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-[11px] font-bold text-text-muted uppercase tracking-wider pl-1">
                Email Tokko Broker
              </Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10">
                  <Sms size={18} />
                </div>
                <Input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="tu@email.com"
                  className="h-12 pl-11 bg-shell-bg/40 focus-visible:border-brand-gold"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-[11px] font-bold text-text-muted uppercase tracking-wider pl-1">
                Contraseña
              </Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10">
                  <Lock size={18} />
                </div>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="Tu contraseña de Tokko"
                  className="h-12 pl-11 bg-shell-bg/40 focus-visible:border-brand-gold"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full h-12 mt-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none cursor-pointer",
                "bg-gradient-to-r from-brand-gold to-brand-gold-light text-brand-navy hover:brightness-105",
                "shadow-[0_4px_20px_rgba(200,164,90,0.25)]"
              )}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-brand-navy/30 border-t-brand-navy rounded-full animate-spin" />
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          <div className="px-8 pb-8 text-center">
            <p className="text-[10px] font-semibold text-text-muted/70 leading-normal">
              Tus credenciales se validan directamente con Tokko Broker de forma segura y nunca son almacenadas.
            </p>
          </div>
        </motion.div>
      </InfiniteGrid>
    </div>
  );
}
