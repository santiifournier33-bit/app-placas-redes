"use client";

import { useState } from "react";
import { SearchNormal1, ArrowRight, Building, Link21, DocumentCode } from "iconsax-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PropertyLoader({ onLoaded }: { onLoaded: (data: any) => void }) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlOrId: inputValue.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo cargar la propiedad");
      }

      onLoaded(data);
    } catch (err: any) {
      setError(err.message || "No se pudo cargar la propiedad");
    } finally {
      setIsLoading(false);
    }
  };

  const inputHints = [
    { icon: <Building size={14} />, label: "ID numérico", example: "7909570" },
    { icon: <DocumentCode size={14} />, label: "Código Tokko", example: "FHO7909570" },
    { icon: <Link21 size={14} />, label: "URL Freire / Ficha.info", example: "freirepropiedades.com/..." },
  ];

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full text-center mb-10"
      >
        <h1 className="font-heading font-bold text-3xl md:text-4xl text-primary tracking-tight mb-3">
          Cargar Propiedad
        </h1>
        <p className="font-sans text-on-surface-variant text-base max-w-md mx-auto leading-relaxed">
          Ingresá el ID, código de referencia o link de la propiedad para generar contenido profesional.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <form onSubmit={handleSubmit} className="relative w-full group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 transition-colors duration-300 group-focus-within:text-secondary">
            <SearchNormal1 size={20} />
          </div>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError(null); }}
            placeholder="Ej: 7909570, FHO7909570 o https://freirepropiedades.com/..."
            className="input-architectural pl-14 pr-16"
            disabled={isLoading}
          />

          <AnimatePresence>
            {inputValue.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="submit"
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-container transition-all disabled:opacity-50 shadow-sm"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-3"
            >
              <div className="px-4 py-3 bg-error/5 text-error rounded-lg text-sm font-medium border border-error/10 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 5v3.5M8 10.5h.005" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Hints */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {inputHints.map((hint, i) => (
            <motion.button
              key={i}
              type="button"
              onClick={() => setInputValue(hint.example)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="flex items-center gap-2 text-xs text-on-surface-variant/60 hover:text-primary transition-colors group cursor-pointer"
            >
              <span className="text-on-surface-variant/40 group-hover:text-secondary transition-colors">
                {hint.icon}
              </span>
              <span className="font-medium">{hint.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
