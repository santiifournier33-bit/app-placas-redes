"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import type { MediaItem, NormalizedMedia } from "@/lib/colega/media";

// Galería + visor multimedia estilo ficha.info (Tokko):
// - Vista inline: grilla de fotos con pills "Videos / Videos 360° / Fotos" sobre la imagen.
// - Modal tabbed: visor grande con tabs centrados, flechas, contador. Fotos = carrusel,
//   Videos/360° = iframe embebido (lazy, sólo proveedores allowlisteados).
// Recibe sólo fotos + media ya depurados (sin branding/datos del asesor).

type Tab = "videos" | "tours" | "photos";

/** Pill que abre el modal en un tab. Declarado fuera del render para no recrearse. */
function Pill({ t, label, onOpen }: { t: Tab; label: string; onOpen: (t: Tab) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(t); }}
      className="text-xs font-semibold rounded-full px-3.5 py-1.5 bg-black/55 text-white backdrop-blur hover:bg-black/70 transition-colors"
    >
      {label}
    </button>
  );
}

/** Embed directo (sin façade); link externo si el proveedor no es embebible. */
function MediaFrame({ item }: { item: MediaItem }) {
  if (item.kind === "link" || !item.embedUrl) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0f1720] text-white">
        <span className="text-sm text-white/80">{item.title}</span>
        <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold bg-white text-[#0f1720] rounded-full px-4 py-2 hover:bg-white/90">
          Abrir contenido
        </a>
      </div>
    );
  }

  return (
    <iframe
      src={item.embedUrl}
      title={item.title}
      className="absolute inset-0 w-full h-full"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; xr-spatial-tracking"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

export function ColegaGallery({ photos, alt, media }: { photos: string[]; alt: string; media?: NormalizedMedia }) {
  const imgs = useMemo(() => photos?.filter(Boolean) || [], [photos]);
  const videos = media?.videos || [];
  const tours = media?.tours || [];

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("photos");
  const [index, setIndex] = useState(0);

  // Tabs disponibles, en el orden de Tokko: Videos, Videos 360°, Fotos.
  const tabs = useMemo(() => {
    const t: { id: Tab; label: string }[] = [];
    if (videos.length) t.push({ id: "videos", label: "Videos" });
    if (tours.length) t.push({ id: "tours", label: "Videos 360°" });
    t.push({ id: "photos", label: "Fotos" });
    return t;
  }, [videos.length, tours.length]);

  const count = tab === "photos" ? imgs.length : tab === "videos" ? videos.length : tours.length;

  const openModal = (t: Tab, i = 0) => {
    setTab(t);
    setIndex(i);
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setIndex(0);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, prev, next]);

  if (imgs.length === 0 && videos.length === 0 && tours.length === 0) {
    return (
      <div className="w-full h-64 lg:h-[26rem] rounded-xl bg-[#F3F6F8] flex items-center justify-center text-[#9aa7b2] text-sm">
        Sin imágenes disponibles
      </div>
    );
  }

  const main = imgs[0];
  const thumbs = imgs.slice(1, 5);
  const extra = imgs.length - 5;

  return (
    <>
      {/* ── Vista inline ── */}
      <div className="relative grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 md:h-[26rem]">
        <button type="button" onClick={() => openModal("photos", 0)} className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-xl bg-[#F3F6F8] h-64 md:h-full">
          {main ? (
            <Image
              src={main}
              alt={alt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <span className="flex items-center justify-center w-full h-64 md:h-full text-[#9aa7b2] text-sm">Sin fotos</span>
          )}
        </button>

        {thumbs.map((src, i) => {
          const isLast = i === thumbs.length - 1 && extra > 0;
          return (
            <button key={i} type="button" onClick={() => openModal("photos", i + 1)} className="relative group overflow-hidden rounded-xl bg-[#F3F6F8] hidden md:block">
              <Image
                src={src}
                alt={`${alt} ${i + 2}`}
                fill
                loading="lazy"
                sizes="25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {isLast && <span className="absolute inset-0 bg-black/55 text-white flex items-center justify-center text-lg font-semibold">+{extra + 1}</span>}
            </button>
          );
        })}

        {/* Pills sobre la imagen principal (abajo-derecha) */}
        <div className="absolute left-2 bottom-2 md:left-3 md:bottom-3 flex gap-2 z-10">
          {videos.length > 0 && <Pill t="videos" label="Videos" onOpen={openModal} />}
          {tours.length > 0 && <Pill t="tours" label="Videos 360°" onOpen={openModal} />}
          <Pill t="photos" label="Fotos" onOpen={openModal} />
        </div>
      </div>

      {/* Tira horizontal en mobile */}
      {imgs.length > 1 && (
        <div className="flex md:hidden gap-2 mt-2 overflow-x-auto pb-1">
          {imgs.slice(1).map((src, i) => (
            <button key={i} type="button" onClick={() => openModal("photos", i + 1)} className="relative shrink-0 w-24 h-20 rounded-lg overflow-hidden bg-[#F3F6F8]">
              <Image src={src} alt={`${alt} ${i + 2}`} fill loading="lazy" sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* ── Modal tabbed ── */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col" role="dialog" aria-modal="true">
          {/* Top bar: tabs centrados + cerrar */}
          <div className="relative flex items-center justify-center px-4 pt-4 pb-3">
            <div className="flex bg-white rounded-xl shadow-lg overflow-hidden">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchTab(t.id)}
                  className={`text-sm font-semibold px-5 py-2.5 border-b-2 transition-colors ${
                    tab === t.id ? "text-[#e23] border-[#e23]" : "text-[#46566a] border-transparent hover:text-[#1b2733]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={close} aria-label="Cerrar" className="absolute right-4 top-3 text-white/90 hover:text-white text-3xl leading-none">✕</button>
          </div>

          {/* Viewer */}
          <div className="flex-1 flex items-center justify-center px-4 pb-3 min-h-0 relative">
            {count > 1 && (
              <button type="button" onClick={prev} aria-label="Anterior" className="absolute left-2 md:left-8 z-10 text-white/85 hover:text-white text-4xl px-2 py-2">‹</button>
            )}

            {tab === "photos" ? (
              imgs[index] ? (
                // Full-res viewer image: shown only on user interaction, sizing is
                // intrinsic (object-contain), so a plain img is the right fit here.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgs[index]} alt={`${alt} ${index + 1}`} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain rounded-lg" />
              ) : null
            ) : (
              <div className="relative w-full max-w-5xl aspect-video rounded-lg overflow-hidden">
                {(() => {
                  const item = (tab === "videos" ? videos : tours)[index];
                  return item ? <MediaFrame key={`${tab}-${index}`} item={item} /> : null;
                })()}
              </div>
            )}

            {count > 1 && (
              <button type="button" onClick={next} aria-label="Siguiente" className="absolute right-2 md:right-8 z-10 text-white/85 hover:text-white text-4xl px-2 py-2">›</button>
            )}
          </div>

          {/* Contador */}
          {count > 0 && <div className="text-center text-white/85 text-sm pb-4">{index + 1}/{count}</div>}
        </div>
      )}
    </>
  );
}
