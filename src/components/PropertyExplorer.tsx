"use client";

import { useState, useEffect, useMemo } from "react";
import { SearchNormal1, Location, Building, Ruler, Drop, Lamp } from "iconsax-react";
import { motion, AnimatePresence } from "framer-motion";

type PropertyListing = {
  id: number;
  reference_code: string;
  type: string;
  operation_type: string;
  title: string;
  address: string;
  location: string;
  price: string;
  price_raw: number;
  currency: string;
  description: string;
  rooms: number;
  bathrooms: number;
  bedrooms: number;
  surface_total: number;
  surface_covered: number;
  thumbnail: string;
  photo: string;
  tags: string[];
};

export default function PropertyExplorer({ onSelectProperty }: { onSelectProperty: (data: any) => void }) {
  const [allProperties, setAllProperties] = useState<PropertyListing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directLoading, setDirectLoading] = useState(false);

  // Fetch all properties on mount
  useEffect(() => {
    fetchAllProperties();
  }, []);

  const fetchAllProperties = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/properties");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar propiedades");
      setAllProperties(data.properties || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const [sortBy, setSortBy] = useState<"recent" | "price_asc" | "price_desc" | "surface_desc">("recent");

  // Detect if search is ID, URL or text
  const isDirectSearch = (query: string): boolean => {
    const trimmed = query.trim();
    if (/^\d{5,10}$/.test(trimmed)) return true;
    if (/^[a-zA-Z]{2,5}\d{5,10}$/.test(trimmed)) return true;
    if (trimmed.includes("freirepropiedades") || trimmed.includes("ficha.info")) return true;
    return false;
  };

  // Filter and Sort globally across all properties
  const filteredProperties = useMemo(() => {
    let result = allProperties;

    // 1. Search Query filtering
    if (searchQuery.trim() && !isDirectSearch(searchQuery)) {
      const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      result = allProperties.filter(p => {
        const searchable = `${p.title} ${p.address} ${p.location} ${p.type} ${p.operation_type} ${p.description} ${p.reference_code} ${p.tags.join(" ")}`.toLowerCase();
        return terms.every(term => searchable.includes(term));
      });
    }

    // 2. Sorting
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return b.id - a.id;
        case "price_asc":
          if (!a.price_raw) return 1;
          if (!b.price_raw) return -1;
          return a.price_raw - b.price_raw;
        case "price_desc":
          return b.price_raw - a.price_raw;
        case "surface_desc":
          return b.surface_total - a.surface_total;
        default:
          return b.id - a.id;
      }
    });
  }, [allProperties, searchQuery, sortBy]);

  // Handle direct property load (by ID or URL)
  const handleDirectLoad = async () => {
    const query = searchQuery.trim();
    if (!query || !isDirectSearch(query)) return;

    setDirectLoading(true);
    try {
      const res = await fetch("/api/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlOrId: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSelectProperty(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDirectLoading(false);
    }
  };

  // Handle clicking on a property card
  const handleCardClick = async (property: PropertyListing) => {
    setDirectLoading(true);
    try {
      const res = await fetch("/api/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlOrId: String(property.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSelectProperty(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDirectLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDirectSearch(searchQuery)) {
      handleDirectLoad();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-8"
      >
        <h1 className="font-heading font-bold text-3xl md:text-4xl text-primary tracking-tight mb-3">
          Propiedades Publicadas
        </h1>
        <p className="font-sans text-on-surface-variant text-base max-w-lg mx-auto leading-relaxed">
          Buscá por ubicación, tipo, ID o URL para acceder a las herramientas de cada propiedad.
        </p>
      </motion.div>

      {/* Unified Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="mb-8"
      >
        <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSubmit} className="relative w-full group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 transition-colors duration-300 group-focus-within:text-secondary">
              <SearchNormal1 size={20} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setError(null); }}
              placeholder="Buscar por ubicación, tipo, ID, URL o código..."
              className="input-architectural pl-14 pr-16 w-full h-[52px]"
              disabled={directLoading}
            />
            <AnimatePresence>
              {searchQuery.length > 0 && isDirectSearch(searchQuery) && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="submit"
                  disabled={directLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-9 px-4 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-container transition-all disabled:opacity-50 shadow-sm text-xs font-semibold gap-1.5"
                >
                  {directLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Cargar</>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </form>

          {/* Sort Dropdown */}
          <div className="shrink-0 w-full md:w-56 relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              disabled={directLoading || isLoading}
              className="input-architectural w-full appearance-none bg-white cursor-pointer pl-4 pr-10 focus:ring-primary focus:border-primary disabled:opacity-50 text-sm font-medium text-on-surface h-[52px]"
            >
              <option value="recent">Más recientes</option>
              <option value="price_desc">Mayor precio</option>
              <option value="price_asc">Menor precio</option>
              <option value="surface_desc">Mayor tamaño</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/50 flex flex-col gap-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.9201 8.9502L13.4001 15.4702C12.6301 16.2402 11.3701 16.2402 10.6001 15.4702L4.08008 8.9502" stroke="currentColor" strokeWidth="2.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="max-w-2xl mx-auto mb-6"
          >
            <div className="px-4 py-3 bg-error/5 text-error rounded-lg text-sm font-medium border border-error/10 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 10.5h.005" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {directLoading && (
        <div className="fixed inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-modal px-8 py-6 flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-semibold text-primary">Cargando propiedad...</p>
          </div>
        </div>
      )}

      {/* Results count */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-between mb-5 px-1"
        >
          <p className="text-sm text-on-surface-variant">
            Mostrando <span className="font-bold text-primary">{filteredProperties.length}</span> propiedades
            {searchQuery.trim() && !isDirectSearch(searchQuery) && (
              <span className="text-on-surface-variant/60"> — filtrando por "{searchQuery}"</span>
            )}
          </p>
        </motion.div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex bg-white rounded-xl border border-outline-variant overflow-hidden animate-pulse h-[180px]">
              <div className="w-[200px] bg-surface-dim shrink-0" />
              <div className="flex-1 p-5 space-y-3">
                <div className="h-4 bg-surface-dim rounded w-2/3" />
                <div className="h-3 bg-surface-dim rounded w-1/2" />
                <div className="h-3 bg-surface-dim rounded w-full" />
                <div className="h-3 bg-surface-dim rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Property Grid */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {filteredProperties.map((property, index) => (
            <motion.button
              key={property.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.35 }}
              onClick={() => handleCardClick(property)}
              className="group flex bg-white rounded-xl border border-outline-variant overflow-hidden hover:shadow-hover hover:border-secondary/20 transition-all duration-300 text-left h-[180px] cursor-pointer"
            >
              {/* Photo */}
              <div className="relative w-[200px] shrink-0 overflow-hidden bg-surface-dim">
                {property.thumbnail ? (
                  <img
                    src={property.thumbnail}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building size={32} className="text-on-surface-variant/30" />
                  </div>
                )}
                {/* Operation badge */}
                <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${
                  property.operation_type === 'Alquiler' ? 'bg-secondary' :
                  property.operation_type === 'Alquiler Temporal' ? 'bg-accent' :
                  'bg-primary'
                }`}>
                  {property.operation_type}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                <div>
                  {/* Title & Price Row */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-heading font-bold text-[15px] text-primary leading-snug truncate">
                      {property.title}
                    </h3>
                    <span className="text-error font-bold text-[14px] whitespace-nowrap shrink-0">
                      {property.price}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1 text-xs text-on-surface-variant/70 mb-2">
                    <Location size={13} />
                    <span className="truncate">{property.address || property.location}</span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-on-surface-variant/60 leading-relaxed line-clamp-2">
                    {property.description || "Sin descripción disponible"}
                  </p>
                </div>

                {/* Bottom: Stats + Button */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3 text-on-surface-variant/50">
                    {property.bedrooms > 0 && (
                      <span className="flex items-center gap-1 text-xs">
                        <Lamp size={14} />
                        {property.bedrooms}
                      </span>
                    )}
                    {property.rooms > 0 && (
                      <span className="flex items-center gap-1 text-xs">
                        <Building size={14} />
                        {property.rooms} amb
                      </span>
                    )}
                    {property.bathrooms > 0 && (
                      <span className="flex items-center gap-1 text-xs">
                        <Drop size={14} />
                        {property.bathrooms}
                      </span>
                    )}
                    {property.surface_total > 0 && (
                      <span className="flex items-center gap-1 text-xs">
                        <Ruler size={14} />
                        {property.surface_total} m²
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-semibold text-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Herramientas →
                  </span>
                </div>
              </div>
            </motion.button>
          ))}

          {/* No results */}
          {filteredProperties.length === 0 && !isLoading && (
            <div className="col-span-full py-16 text-center">
              <SearchNormal1 size={40} className="mx-auto text-on-surface-variant/20 mb-4" />
              <p className="text-on-surface-variant/60 text-sm font-medium">
                No se encontraron propiedades que coincidan con "{searchQuery}"
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
