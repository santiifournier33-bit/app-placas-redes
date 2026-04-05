"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sms, Warning2 } from "iconsax-react";

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
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

      // Success!
      onLoginSuccess(data.user);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-surface overflow-y-auto z-50">
      <div className="min-h-full flex flex-col items-center justify-center p-4 py-8 relative">
        {/* Background styling elements */}
        <div className="absolute inset-0 bg-navy-radial pointer-events-none" />
        <div className="absolute top-0 right-0 w-[80wv] h-[80wv] max-w-[600px] max-h-[600px] rounded-full bg-gradient-to-br from-primary/[0.03] to-transparent blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[60wv] h-[60wv] max-w-[400px] max-h-[400px] rounded-full bg-gradient-to-tr from-secondary/[0.04] to-transparent blur-[60px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px] bg-white rounded-[24px] shadow-modal border border-outline-variant overflow-hidden relative z-10 my-auto"
        >
          {/* Header styling */}
        <div className="pt-10 pb-8 px-8 text-center bg-surface-container-lowest border-b border-outline-variant relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
          
          <div className="mx-auto flex justify-center mb-6">
            <Image
              src="/logo-pequeno.png"
              alt="Freire Propiedades"
              width={160}
              height={50}
              className="object-contain"
            />
          </div>
          <h1 className="text-xl font-heading font-bold text-primary tracking-tight">
            Acceso a Placas & Redes
          </h1>
          <p className="text-sm text-on-surface-variant/70 mt-2 font-medium">
            Ingresá con tu cuenta de Tokko Broker
          </p>
        </div>

        {/* Form */}
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

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary pl-1">Email Tokko Broker</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-secondary transition-colors duration-200">
                  <Sms size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="tu@email.com"
                  className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl pl-11 pr-4 text-sm font-medium text-on-surface focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary pl-1">Contraseña</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-secondary transition-colors duration-200">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="Tu contraseña de Tokko"
                  className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl pl-11 pr-4 text-sm font-medium text-on-surface focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-8 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none shadow-sm"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Ingresar"
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="px-8 pb-8 text-center">
          <p className="text-[11px] font-medium text-on-surface-variant/50">
            Tus credenciales se validan directamente con Tokko Broker de forma segura y nunca son almacenadas.
          </p>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
