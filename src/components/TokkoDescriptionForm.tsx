"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DocumentText1, Copy, Refresh, Magicpen } from "iconsax-react";

export default function TokkoDescriptionForm() {
  const [formData, setFormData] = useState({
    type: "Casa",
    operation_type: "Venta",
    location: "",
    rooms: "",
    bedrooms: "",
    bathrooms: "",
    parking: "0",
    surface_total: "",
    surface_covered: "",
    surface_semicovered: "",
    characteristics: "",
    notes: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.location || !formData.rooms) {
      setError("Por favor completa los campos obligatorios (*).");
      return;
    }

    setIsLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "tokko_description",
          property: formData
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setResult(data.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* Columna Izquierda: Formulario */}
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 bg-white border border-outline-variant rounded-2xl shadow-card overflow-hidden"
      >
        <div className="p-5 border-b border-outline-variant bg-surface-container-low">
          <h2 className="font-heading font-bold text-primary flex items-center gap-2 text-lg">
            <DocumentText1 size={20} />
            Datos de la Propiedad
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Completá los datos básicos para generar la descripción profesional.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Operación *</label>
              <select name="operation_type" value={formData.operation_type} onChange={handleChange} className="w-full text-sm p-2 border border-outline-variant rounded-lg focus:outline-none focus:border-secondary">
                <option value="Venta">Venta</option>
                <option value="Alquiler">Alquiler</option>
                <option value="Alquiler Temporal">Alquiler Temporal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Tipo de Propiedad *</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full text-sm p-2 border border-outline-variant rounded-lg focus:outline-none focus:border-secondary">
                <option value="Casa">Casa</option>
                <option value="Departamento">Departamento</option>
                <option value="Terreno">Terreno</option>
                <option value="Oficina">Oficina</option>
                <option value="Local">Local</option>
                <option value="Galpón">Galpón</option>
                <option value="PH">PH</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">Barrio / Zona *</label>
            <input type="text" name="location" required value={formData.location} onChange={handleChange} placeholder="Ej: Pilar, Barrio Las Cañitas" className="w-full text-sm p-2 border border-outline-variant rounded-lg focus:outline-none focus:border-secondary" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Ambientes *</label>
              <input type="number" name="rooms" required value={formData.rooms} onChange={handleChange} className="w-full text-sm p-2 border border-outline-variant rounded-lg focus:outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Dormitorios</label>
              <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleChange} className="w-full text-sm p-2 border border-outline-variant rounded-lg focus:outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Baños</label>
              <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleChange} className="w-full text-sm p-2 border border-outline-variant rounded-lg focus:outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Cocheras</label>
              <input type="number" name="parking" value={formData.parking} onChange={handleChange} className="w-full text-sm p-2 border border-outline-variant rounded-lg focus:outline-none focus:border-secondary" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Sup. Total (m²)</label>
              <input type="number" name="surface_total" value={formData.surface_total} onChange={handleChange} className="w-full text-sm p-2 border border-outline-variant rounded-lg focus:outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Sup. Cubierta (m²)</label>
              <input type="number" name="surface_covered" value={formData.surface_covered} onChange={handleChange} className="w-full text-sm p-2 border border-outline-variant rounded-lg focus:outline-none focus:border-secondary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary mb-1">Semicubierta (m²)</label>
              <input type="number" name="surface_semicovered" value={formData.surface_semicovered} onChange={handleChange} className="w-full text-sm p-2 border border-outline-variant rounded-lg focus:outline-none focus:border-secondary" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">Características principales (Amenities, detalles, etc)</label>
            <textarea name="characteristics" value={formData.characteristics} onChange={handleChange} rows={3} placeholder="Pileta, SUM, losa radiante, vista al lago..." className="w-full text-sm p-2 border border-outline-variant rounded-lg focus:outline-none focus:border-secondary resize-none"></textarea>
          </div>

          {error && <p className="text-error text-xs font-medium">{error}</p>}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-70 mt-4 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Magicpen size={20} />
                Generar Descripción
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Columna Derecha: Resultado */}
      <motion.div 
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col"
      >
        <div className="bg-white border border-outline-variant rounded-2xl shadow-card flex-1 flex flex-col overflow-hidden relative">
          <div className="p-5 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
            <h2 className="font-heading font-bold text-primary flex items-center gap-2 text-lg">
              Descripción Generada
            </h2>
            {result && (
              <div className="flex gap-2">
                <button 
                  onClick={() => handleGenerate()}
                  disabled={isLoading}
                  className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors cursor-pointer"
                  title="Regenerar"
                >
                  <Refresh size={18} className={isLoading ? "animate-spin" : ""} />
                </button>
                <button 
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-secondary text-white text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-secondary-light transition-colors cursor-pointer"
                >
                  <Copy size={16} />
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 p-6 relative bg-[#f9fafb]">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-on-surface-variant/40"
                >
                  <DocumentText1 size={48} className="mb-4 opacity-50" />
                  <p className="font-medium">Completá el formulario y hacé click en generar<br/>para crear una descripción profesional lista para Tokko Broker.</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full"
                >
                  <textarea 
                    readOnly 
                    value={result} 
                    className="w-full h-full p-4 text-sm resize-none bg-white border border-outline-variant rounded-xl focus:outline-none focus:border-secondary shadow-inner font-sans text-on-surface/80"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
