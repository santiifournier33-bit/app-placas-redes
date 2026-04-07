"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building, Magicpen, Video, Image as ImageIcon, Copy, TickCircle,
  CloseCircle, ArrowLeft, DocumentDownload, Music, PlayCircle, PauseCircle, Send, Global
} from "iconsax-react";
import { Player } from "@remotion/player";
import { PropertyComposition } from "../remotion/PropertyComposition";
import { StoryPlacaComposition } from "../remotion/StoryPlacaComposition";
import { pdf } from '@react-pdf/renderer';
import { PdfVertical } from '../pdf/PdfVertical';
import { PdfHorizontal } from '../pdf/PdfHorizontal';
import { SocialPublisherForm } from "./SocialPublisherForm";
import * as htmlToImage from 'html-to-image';

type CopyVariant = { title: string; subtitle: string; content: string };
type CopyVariants = { descriptivo: CopyVariant; emocional: CopyVariant; urgencia: CopyVariant };

const MUSIC_TRACKS = [
  { id: 'aura', name: 'Aura', file: '/audio/Corporate 1.mp3', mood: 'Profesional' },
  { id: 'nexus', name: 'Nexus', file: '/audio/Corporate 2.mp3', mood: 'Moderno' },
  { id: 'zenit', name: 'Zenit', file: '/audio/Corporate 3.mp3', mood: 'Dinámico' },
  { id: 'vortex', name: 'Vórtex', file: '/audio/Corporate 5.mp3', mood: 'Rítmico' },
  { id: 'solis', name: 'Solís', file: '/audio/Corporate happy.mp3', mood: 'Optimista' },
  { id: 'swift', name: 'Swift', file: '/audio/Corporate speed.mp3', mood: 'Enérgico' },
  { id: 'luna', name: 'Luna', file: '/audio/Lofi chill.mp3', mood: 'Relajado' },
  { id: 'ocaso', name: 'Ocaso', file: '/audio/Sunset upbeat corporate.mp3', mood: 'Inspirador' },
  { id: 'eter', name: 'Éter', file: '/audio/absolutesound-corporate-office-background-music-507969.mp3', mood: 'Atmosférico' },
  { id: 'none', name: 'Sin Música', file: null, mood: 'Silencio' },
];

export default function Dashboard({ property, onBack }: { property: any; onBack: () => void }) {
  // ── IA Copywriter State ──
  const [copyVariants, setCopyVariants] = useState<CopyVariants | null>(null);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  // ── Video State ──
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [placaUrl, setPlacaUrl] = useState<string | null>(null);
  const [isGeneratingPlaca, setIsGeneratingPlaca] = useState(false);
  const [placaFormat, setPlacaFormat] = useState<"story" | "post" | null>(null);
  const [selectedPlacaPhotos, setSelectedPlacaPhotos] = useState<string[]>([]);
  const [showPlacaModal, setShowPlacaModal] = useState(false);

  // ── PDF State ──
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // ── Video State ──
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(MUSIC_TRACKS[0].file);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);

  // ── Active Section (expanded) ──
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // ── Download Video HD State ──
  const [isVideoDownloading, setIsVideoDownloading] = useState(false);
  const [videoDownloadProgress, setVideoDownloadProgress] = useState<number | null>(null);

  // ── AI location Parsing State ──
  const [parsedLocation, setParsedLocation] = useState<{title: string, subtitle: string} | null>(null);
  const [isParsingLocation, setIsParsingLocation] = useState(false);

  // ── Social Publish State ──
  const [placaStep, setPlacaStep] = useState<"preview" | "publish">("preview");
  const [videoStep, setVideoStep] = useState<"preview" | "format" | "publish">("preview");
  const [videoPublishFormats, setVideoPublishFormats] = useState<("story" | "reel")[]>(["reel"]);
  const [publishText, setPublishText] = useState("");
  const [publishNetworks, setPublishNetworks] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [capturedPlacaUrl, setCapturedPlacaUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // ── Toast State ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  let toastTimeout: NodeJS.Timeout;

  const showToast = (message: string) => {
    setToastMessage(message);
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => setToastMessage(null), 3000);
  };

  // ═══════════════════════════════════════
  // HANDLERS & EFFECTS
  // ═══════════════════════════════════════

  useEffect(() => {
    if (activeSection === "placas" && !parsedLocation && !isParsingLocation) {
      const fetchParsedLocation = async () => {
        setIsParsingLocation(true);
        try {
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ property, type: "location_parse" }),
          });
          const data = await res.json();
          if (data.type === "location") {
            setParsedLocation({ title: data.title, subtitle: data.subtitle });
          }
        } catch (e) {
          console.error("Error parsing location", e);
        } finally {
          setIsParsingLocation(false);
        }
      };
      fetchParsedLocation();
    }
  }, [activeSection, property, parsedLocation, isParsingLocation]);

  const capturePlacaNode = async (): Promise<string | null> => {
    const node = document.getElementById("placa-capture-node");
    if (!node) return null;
    setIsCapturing(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const dataUrl = await htmlToImage.toJpeg(node, { quality: 1, pixelRatio: 3 });
      setCapturedPlacaUrl(dataUrl);
      return dataUrl;
    } catch (err) {
      console.error("Error capturing placa:", err);
      showToast("Error al procesar la placa para publicación");
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  const handleExportPlaca = async () => {
    const dataUrl = await capturePlacaNode();
    if (dataUrl) {
      const link = document.createElement("a");
      link.download = `placa-${property.id}.jpg`;
      link.href = dataUrl;
      link.click();
      showToast("Descarga iniciada");
    }
  };

  const handleDownloadVideoHD = async () => {
    setIsVideoDownloading(true);
    setVideoDownloadProgress(0);
    try {
      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property, theme: "default" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { renderId, bucketName } = data;
      let isDone = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 60; // 2 minutes approx (60 * 2s)

      while (!isDone && attempts < MAX_ATTEMPTS) {
        attempts++;
        await new Promise((r) => setTimeout(r, 2000));
        
        try {
          const progRes = await fetch(`/api/render-video?renderId=${renderId}&bucketName=${bucketName}`);
          const progData = await progRes.json();
          
          if (!progRes.ok) throw new Error(progData.error || "Error parseando progreso de AWS");
          
          if (progData.fatalErrorEncountered) {
            console.error("AWS Remotion Fatal Error:", progData.errors);
            alert("Error fatal de AWS al generar el video. Por favor reporta esto al soporte técnico.");
            throw new Error("AWS lambda falló internamente.");
          } else if (progData.done) {
            isDone = true;
            // Trigger download — outputFile is the full S3 URL from Remotion
            const videoUrl = progData.outputFile || progData.outKey;
            if (videoUrl) {
              window.open(videoUrl, '_blank');
              showToast("Descarga de video lista.");
            } else {
              alert("El video se renderizó pero no se obtuvo la URL de descarga.");
            }
          } else {
            const currentProgress = Math.floor(progData.overallProgress * 100);
            setVideoDownloadProgress(currentProgress);
            
            // Verificamos si no está avanzando después de muchos intentos.
            if (currentProgress === 0 && attempts > 15) {
              console.warn("Posible problema con Remotion Lambda: lleva más de 30 segundos en 0%. Podría deberse a falta de update de sitios en AWS.");
            }
          }
        } catch (pollErr: any) {
             console.error("Error consultando estado en AWS:", pollErr);
             throw new Error("Fallo de comunicación continua con AWS.");
        }
      }

      if (!isDone) {
        alert("El renderizado tardó demasiado y paró por seguridad. Inténtalo de nuevo más tarde o verifica la consola para errores.");
        throw new Error("Timeout en render.");
      }
    } catch (e: any) {
      console.error(e);
      showToast(`Error al exportar video HD: ${e.message}`);
    } finally {
      setIsVideoDownloading(false);
      setVideoDownloadProgress(null);
    }
  };

  const handleGenerateCopy = async () => {
    setIsGeneratingCopy(true);
    setCopyVariants(null);
    setCopyError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property, type: "redes_sociales" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCopyError(data.error || "Error al generar el copy");
        return;
      }
      if (data.type === "variants" && data.variants) {
        setCopyVariants(data.variants);
      } else if (data.content) {
        setCopyVariants({
          descriptivo: { title: "Copy Generado", subtitle: "", content: data.content },
          emocional: { title: "", subtitle: "", content: "" },
          urgencia: { title: "", subtitle: "", content: "" },
        });
      }
    } catch (error) {
      setCopyError("Error de red. Intentá de nuevo.");
      console.error(error);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const handleGeneratePlaca = async (format: "story" | "post") => {
    setPlacaFormat(format);
    setIsGeneratingPlaca(true);
    setPlacaUrl(null);
    try {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property, type: "placa", format }),
      });
      const data = await res.json();
      if (data.url) setPlacaUrl(data.url);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingPlaca(false);
    }
  };

  const handleGeneratePdf = async (format: 'vertical' | 'horizontal') => {
    setIsGeneratingPdf(true);
    setPdfUrl(null);
    try {
      const parsedAddr = parsedLocation?.title || property.address || "";
      const parsedLoc = parsedLocation?.subtitle || property.location || "";
      const propForPdf = { ...property, address: parsedAddr, location: parsedLoc };
      
      const doc = format === 'vertical' ? <PdfVertical property={propForPdf} /> : <PdfHorizontal property={propForPdf} />;
      const asPdf = pdf();
      asPdf.updateContainer(doc);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAuthLinking = async () => {
    try {
      const email = property.agent?.email || "default@freire.com";
      const res = await fetch(`/api/social/auth?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.url) {
        setOauthUrl(data.url);
      }
    } catch(e) { console.error(e); }
  };

  const handleSimulateOAuthSuccess = () => {
    setOauthUrl(null);
    setSocialAccounts([
      { id: "ig-123", platform: "Instagram", username: "freirerealestate" },
      { id: "tk-456", platform: "TikTok", username: "freirerealestate" }
    ]);
    showToast("Redes vinculadas exitosamente");
  };

  const openPublishModal = (text: string) => {
    // Deprecated for direct button, but kept if needed for reference
  };

  const fetchSocialAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const email = property.agent?.email || "default@freire.com"; // using agent email automatically if exists
      const res = await fetch(`/api/social/accounts?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.data) { // Zernio typically returns actual array in a data field or at root
        setSocialAccounts(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
      } else {
        setSocialAccounts(Array.isArray(data) ? data : []);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handlePublishClick = async (mediaType: "placa" | "video") => {
    if (publishNetworks.length === 0) return;
    if (!publishText) return;
    
    setIsPublishing(true);

    try {
      const email = property.agent?.email || "default@freire.com";
      const payload = {
        email,
        text: publishText,
        socialAccountIds: publishNetworks,
        mediaUrls: mediaType === "placa" ? (capturedPlacaUrl ? [capturedPlacaUrl] : []) : [] // Add logic for videoUrl if it existed
      };

      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Error publicando");
      } else {
        showToast("¡Contenido publicado exitosamente en tus redes!");
        if (mediaType === "placa") setShowPlacaModal(false);
        if (mediaType === "video") setShowVideoModal(false);
      }
    } catch(e) {
      console.error(e);
      alert("Error de red. Intentá de nuevo");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleShareToWhatsApp = async (fileUrl: string, fileName: string, fallbackText: string) => {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] }) && isMobile) {
        await navigator.share({
          title: "Publicar en WhatsApp",
          text: fallbackText,
          files: [file]
        });
      } else {
        // Fallback Desktop: It's hard to share files directly via WhatsApp Web link
        // so we offer to download the file directly, and alert the user to attach it manually
        alert("En computadora, descargá el archivo y adjuntalo directamente a WhatsApp Web.");
      }
    } catch (e) {
      console.error("Error compartiendo archivo:", e);
    }
  };

  const handleTogglePhoto = (photo: string) => {
    setSelectedPhotos(prev => {
      if (prev.includes(photo)) {
        return prev.filter(p => p !== photo);
      }
      return [...prev, photo];
    });
  };

  const handleTogglePlacaPhoto = (photo: string) => {
    setSelectedPlacaPhotos(prev => {
      if (prev.includes(photo)) {
        return prev.filter(p => p !== photo);
      }
      if (prev.length >= 4) return prev; // Limit to 4 photos
      return [...prev, photo];
    });
  };

  const currentVideoPhotos = selectedPhotos.length > 0 
    ? selectedPhotos 
    : (property.photos || []).slice(0, 5);

  const formatSurface = (val: any) => {
    if (!val) return "-";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return Math.round(num);
  };

  // ═══════════════════════════════════════
  // PROPERTY STATS
  // ═══════════════════════════════════
  const stats = [
    { label: "Precio", value: property.price, accent: true },
    { label: "m2 Totales", value: `${formatSurface(property.surface_total)} m²` },
    { label: "Cubierta", value: `${formatSurface(property.surface_covered)} m²` },
    { label: "Ambientes", value: property.rooms || "-" },
    { label: "Dormitorios", value: property.bedrooms || "-" },
    { label: "Baños", value: property.bathrooms || "-" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-6xl mx-auto pb-12"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="btn-tertiary mb-6 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Volver al buscador
      </button>

      {/* ═══════════════════════════════════ */}
      {/* PROPERTY HEADER CARD               */}
      {/* ═══════════════════════════════════ */}
      <div className="card-premium p-0 overflow-hidden mb-8">
        <div className="flex flex-col lg:flex-row">
          {/* Photo */}
          <div className="lg:w-2/5 relative">
            {property.photos && property.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={property.photos[0]}
                alt={property.address}
                className="w-full h-56 lg:h-full object-cover"
              />
            ) : (
              <div className="w-full h-56 lg:h-full bg-surface-container-low flex items-center justify-center">
                <Building size={48} className="text-on-surface-variant/30" variant="Bulk" />
              </div>
            )}
            {/* Badge overlay */}
            <div className="absolute top-4 left-4">
              <span className={`badge ${property.operation_type?.toLowerCase().includes("alquiler") ? "badge-alquiler" : "badge-venta"}`}>
                {property.operation_type}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="lg:w-3/5 p-6 lg:p-8 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-secondary uppercase tracking-widest">
                {property.type}
              </span>
              
              {/* Agent Info */}
              {(property.producer || property.branch) && (
                <div className="flex items-center gap-2 bg-surface py-1.5 px-3 rounded-full border border-outline-variant shadow-sm">
                  {property.producer?.picture || property.branch?.logo ? (
                    <img 
                      src={property.producer?.picture || property.branch?.logo} 
                      alt={property.producer?.name || property.branch?.name} 
                      className="w-8 h-8 rounded-full object-cover border border-secondary" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold tracking-widest">
                      {(property.producer?.name || property.branch?.name || "A").charAt(0)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-primary leading-tight line-clamp-1 max-w-[140px]">
                      {property.producer?.name || property.branch?.name || "Agente Asignado"}
                    </span>
                    <span className="text-[8px] text-on-surface-variant uppercase tracking-[0.1em] leading-tight">
                      {property.producer ? "Agente a cargo" : "Sucursal"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <h2 className="font-heading text-2xl lg:text-3xl font-bold text-primary mb-2 tracking-tight pr-2">
              {property.address}
            </h2>
            <p className="text-on-surface-variant text-sm mb-5">{property.location}</p>

            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {stats.map((s, i) => (
                <div key={i} className="flex flex-col items-center justify-center text-center p-2.5 bg-surface rounded-lg shadow-sm border border-outline-variant/50">
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">
                    {s.label}
                  </p>
                  <p className={`font-bold text-sm ${s.accent ? "text-accent" : "text-primary"}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════ */}
      {/* ACTION MODULES GRID                */}
      {/* ═══════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Module: Copywriter */}
        <div
          className={`card-action p-5 flex flex-col ${activeSection === "copy" ? "ring-2 ring-primary/20" : ""}`}
          onClick={() => { setActiveSection(activeSection === "copy" ? null : "copy"); }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center">
              <Magicpen size={20} color="var(--color-primary)" variant="Bulk" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm text-primary">Copy Redes Sociales</h3>
              <p className="text-[11px] text-on-surface-variant">3 variantes con IA</p>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant/70 mb-auto leading-relaxed">
            Generá 3 textos con diferentes tonos para redes sociales de forma automática.
          </p>
        </div>

        {/* Module: Placas */}
        <div
          className={`card-action p-5 flex flex-col ${activeSection === "placas" ? "ring-2 ring-primary/20" : ""}`}
          onClick={() => { setActiveSection(activeSection === "placas" ? null : "placas"); }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-xl flex items-center justify-center">
              <ImageIcon size={20} color="var(--color-secondary)" variant="Bulk" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm text-primary">Placas & Mosaicos</h3>
              <p className="text-[11px] text-on-surface-variant">Story o Post</p>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant/70 mb-auto leading-relaxed">
            Imágenes profesionales con foto, gradiente y datos de la propiedad.
          </p>
        </div>

        {/* Module: PDF */}
        <div
          className={`card-action p-5 flex flex-col ${activeSection === "pdf" ? "ring-2 ring-primary/20" : ""}`}
          onClick={() => { setActiveSection(activeSection === "pdf" ? null : "pdf"); }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl flex items-center justify-center">
              <DocumentDownload size={20} color="var(--color-accent)" variant="Bulk" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm text-primary">Ficha PDF</h3>
              <p className="text-[11px] text-on-surface-variant">Folleto profesional</p>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant/70 mb-auto leading-relaxed">
            Folleto descargable con fotos, descripción, plano y mapa de ubicación.
          </p>
        </div>

        {/* Module: Video */}
        <div
          className={`card-action p-5 flex flex-col ${activeSection === "video" ? "ring-2 ring-primary/20" : ""}`}
          onClick={() => { setActiveSection(activeSection === "video" ? null : "video"); }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl flex items-center justify-center">
              <Video size={20} color="var(--color-primary)" variant="Bulk" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm text-primary">Video Reel</h3>
              <p className="text-[11px] text-on-surface-variant">Multi-foto animado</p>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant/70 mb-auto leading-relaxed">
            Reel con Ken Burns, transiciones fade y datos animados sobre las fotos.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════ */}
      {/* EXPANDED SECTION CONTENT            */}
      {/* ═══════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {/* ── COPY SECTION ── */}
        {activeSection === "copy" && (
          <motion.div
            key="copy-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card-premium mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-bold text-lg text-primary">
                  IA Copywriter — Redes Sociales
                </h3>
                <button
                  onClick={handleGenerateCopy}
                  disabled={isGeneratingCopy}
                  className="btn-primary disabled:opacity-50"
                >
                  {isGeneratingCopy ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Magicpen size={16} />
                      Generar Copy Redes Sociales
                    </>
                  )}
                </button>
              </div>

              {isGeneratingCopy && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="copy-card p-5">
                      <div className="skeleton h-4 w-3/4 rounded mb-3" />
                      <div className="skeleton h-3 w-1/2 rounded mb-4" />
                      <div className="space-y-2">
                        <div className="skeleton h-3 rounded" />
                        <div className="skeleton h-3 rounded" />
                        <div className="skeleton h-3 w-5/6 rounded" />
                        <div className="skeleton h-3 w-4/6 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {copyVariants && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(Object.entries(copyVariants) as [string, CopyVariant][])
                    .filter(([, v]) => v.content)
                    .map(([key, variant]) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: key === "descriptivo" ? 0 : key === "emocional" ? 0.1 : 0.2 }}
                      className="copy-card flex flex-col"
                    >
                      <div className="px-5 pt-5 pb-3 border-b border-outline-variant">
                        <h4 className="font-heading font-semibold text-sm text-primary">{variant.title}</h4>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">{variant.subtitle}</p>
                      </div>
                      <div className="px-5 py-4 flex-1">
                        <p className="text-xs text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                          {variant.content}
                        </p>
                      </div>
                      <div className="px-5 pb-4 flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(variant.content, key); }}
                          className="btn-tertiary flex-1 justify-center text-xs"
                        >
                          {copiedKey === key ? (
                            <><TickCircle size={14} color="var(--color-success)" /> Copiado</>
                          ) : (
                            <><Copy size={14} /> Copiar</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {copyError && !isGeneratingCopy && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-error/5 text-error border border-error/10 rounded-xl px-5 py-4 text-sm flex items-center justify-between"
                >
                  <span>{copyError}</span>
                  <button onClick={handleGenerateCopy} className="btn-tertiary text-error text-xs font-semibold">
                    Reintentar
                  </button>
                </motion.div>
              )}

              {!isGeneratingCopy && !copyVariants && !copyError && (
                <p className="text-sm text-on-surface-variant/50 text-center py-6">
                  Hacé click en &ldquo;Generar Copy&rdquo; para obtener 3 versiones con diferentes tonos.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── PLACAS SECTION ── */}
        {activeSection === "placas" && (
          <motion.div
            key="placas-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card-premium mb-8">
              <h3 className="font-heading font-bold text-lg text-primary mb-6">
                Generar Placa Visual
              </h3>

              {selectedPlacaPhotos.length < 4 ? (
                <>
                  <p className="text-sm text-on-surface-variant mb-4">
                    <strong>Paso 1:</strong> Seleccioná exactamente 4 fotos (la 1ra será la portada principal).
                  </p>
                  <div className="bg-surface rounded-xl p-4 lg:p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm font-semibold text-primary">
                        Fotos seleccionadas: {selectedPlacaPhotos.length}/4
                      </p>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {(property.photos || []).map((photo: string, index: number) => {
                        const selIndex = selectedPlacaPhotos.indexOf(photo);
                        const isSelected = selIndex !== -1;
                        return (
                          <div
                            key={index}
                            onClick={() => handleTogglePlacaPhoto(photo)}
                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                              isSelected ? 'border-secondary shadow-md scale-95' : 'border-transparent hover:border-primary/20'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={photo} 
                              alt={`Foto ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute top-1 left-1 w-6 h-6 bg-secondary text-white rounded-full flex items-center justify-center text-xs font-bold shadow opacity-90 backdrop-blur-sm">
                                {selIndex === 0 ? "★ 1" : selIndex + 1}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {(!property.photos || property.photos.length === 0) && (
                      <p className="text-sm text-center text-on-surface-variant py-4">No hay fotos disponibles para generar la placa.</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                     <p className="text-sm text-on-surface-variant">
                      <strong>Paso 2:</strong> Elegí el formato en el que querés la placa.
                    </p>
                    <button onClick={() => setSelectedPlacaPhotos([])} className="text-xs font-bold text-secondary hover:underline">
                      Volver a elegir fotos
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Story Format */}
                    <button
                      onClick={() => { setPlacaFormat("story"); setShowPlacaModal(true); }}
                      className="card-action !p-6 text-left hover:ring-2 hover:ring-primary/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-20 bg-gradient-to-b from-primary/20 to-primary/5 rounded-lg border border-primary/10 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-primary">9:16</span>
                        </div>
                        <div>
                          <h4 className="font-heading font-semibold text-primary">Historia / Story</h4>
                          <p className="text-xs text-on-surface-variant mt-1">1080 × 1920 px — Formato vertical</p>
                          <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
                            Ideal para Instagram Stories y WhatsApp Status
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Post Format */}
                    <button
                      onClick={() => { setPlacaFormat("post"); setShowPlacaModal(true); }}
                      className="card-action !p-6 text-left hover:ring-2 hover:ring-secondary/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-b from-secondary/20 to-secondary/5 rounded-lg border border-secondary/10 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-secondary">1:1</span>
                        </div>
                        <div>
                          <h4 className="font-heading font-semibold text-primary">Post Cuadrado</h4>
                          <p className="text-xs text-on-surface-variant mt-1">1080 × 1080 px — Formato cuadrado</p>
                          <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
                            Ideal para Feed de Instagram y Facebook
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ── PDF SECTION ── */}
        {activeSection === "pdf" && (
          <motion.div
            key="pdf-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card-premium mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading font-bold text-lg text-primary">Ficha PDF Profesional</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Elegí el formato para tu folleto con fotos, datos y ubicación</p>
                </div>
              </div>

              {!isGeneratingPdf && !pdfUrl && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Vertical Format */}
                  <button
                    onClick={() => handleGeneratePdf('vertical')}
                    className="card-action !p-6 text-left hover:ring-2 hover:ring-accent/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 bg-gradient-to-b from-accent/20 to-accent/5 rounded border border-accent/10 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-accent">A4 Vert</span>
                      </div>
                      <div>
                        <h4 className="font-heading font-semibold text-primary">Formato Vertical</h4>
                        <p className="text-xs text-on-surface-variant mt-1">Ideal para impresión tradicional e Inmobiliarias.</p>
                      </div>
                    </div>
                  </button>

                  {/* Horizontal Format */}
                  <button
                    onClick={() => handleGeneratePdf('horizontal')}
                    className="card-action !p-6 text-left hover:ring-2 hover:ring-accent/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-12 bg-gradient-to-b from-accent/20 to-accent/5 rounded border border-accent/10 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-accent">A4 Horiz</span>
                      </div>
                      <div>
                        <h4 className="font-heading font-semibold text-primary">Formato Horizontal</h4>
                        <p className="text-xs text-on-surface-variant mt-1">Ideal para presentaciones y visualización en pantallas (PC/TV).</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {isGeneratingPdf && (
                <div className="flex items-center justify-center py-12 gap-3">
                  <div className="h-5 w-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                  <span className="text-sm text-on-surface-variant">Generando PDF renderizado en alta calidad...</span>
                </div>
              )}

              {pdfUrl && !isGeneratingPdf && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-6"
                >
                  <div className="bg-surface p-6 rounded-xl text-center">
                    <DocumentDownload size={48} className="text-accent mx-auto mb-3" variant="Bulk" />
                    <p className="text-sm font-semibold text-primary mb-1">Ficha PDF generada exitosamente</p>
                    <p className="text-xs text-on-surface-variant mb-4">El documento está listo para descargar o compartir.</p>
                    <div className="flex flex-col gap-2 justify-center max-w-xs mx-auto">
                      <div className="flex gap-2">
                        <a href={pdfUrl} download={`Ficha_Freire_${property.address || property.id}.pdf`} className="btn-accent flex-1 justify-center">
                          Descargar PDF
                        </a>
                        <button 
                          onClick={() => handleShareToWhatsApp(pdfUrl, `Ficha_${property.id}.pdf`, `Mirá esta propiedad: ${property.address} - ${property.location}`)} 
                          className="btn-primary !bg-[#25D366] !border-[#25D366] hover:!bg-[#128C7E] flex-none px-3"
                          title="Compartir en WhatsApp"
                        >
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        </button>
                      </div>
                      <button onClick={() => setPdfUrl(null)} className="btn-tertiary w-full justify-center">
                        Elegir otro formato
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── VIDEO SECTION ── */}
        {activeSection === "video" && (
          <motion.div
            key="video-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card-premium mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading font-bold text-lg text-primary">Video Reel</h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Seleccioná las fotos en el orden que querés que aparezcan en el video.
                  </p>
                </div>
                <button
                  onClick={() => setShowVideoModal(true)}
                  disabled={selectedPhotos.length === 0}
                  className="btn-primary disabled:opacity-50"
                  title={selectedPhotos.length === 0 ? "Seleccioná al menos 1 foto" : ""}
                >
                  <Video size={16} />
                  Abrir Previsualizador
                </button>
              </div>
              <div className="bg-surface rounded-xl p-4 lg:p-6">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {(property.photos || []).map((photo: string, index: number) => {
                    const selIndex = selectedPhotos.indexOf(photo);
                    const isSelected = selIndex !== -1;
                    return (
                      <div
                        key={index}
                        onClick={() => handleTogglePhoto(photo)}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                          isSelected ? 'border-accent shadow-md scale-95' : 'border-transparent hover:border-primary/20'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={photo} 
                          alt={`Foto ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-1 left-1 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold shadow opacity-90 backdrop-blur-sm">
                            {selIndex + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {(!property.photos || property.photos.length === 0) && (
                  <p className="text-sm text-center text-on-surface-variant py-4">No hay fotos disponibles para generar el video.</p>
                )}
              </div>

              {/* Music Selection Step */}
              <div className="mt-8 border-t border-on-surface/5 pt-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                    <Music size={18} variant="Bold" />
                  </div>
                  <h4 className="font-heading font-bold text-primary">Paso 2: Música de fondo</h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {MUSIC_TRACKS.map((track) => {
                    const isSelected = selectedAudio === track.file;
                    const isPreviewing = previewAudio === track.file && track.file !== null;
                    
                    return (
                      <div 
                        key={track.id}
                        className={`relative py-1.5 px-3 rounded-lg border-2 transition-all cursor-pointer ${
                          isSelected ? 'border-accent bg-accent/5 shadow-sm' : 'border-on-surface/5 hover:border-accent/20'
                        }`}
                        onClick={() => setSelectedAudio(track.file)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 overflow-hidden">
                            <p className={`text-[11px] font-bold truncate ${isSelected ? 'text-accent' : 'text-primary'}`}>
                              {track.name}
                            </p>
                          </div>
                          
                          {track.file && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPreviewing) {
                                  setPreviewAudio(null);
                                } else {
                                  setPreviewAudio(track.file);
                                }
                              }}
                              className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${
                                isPreviewing ? 'bg-accent text-white' : 'bg-on-surface/5 text-primary hover:bg-accent/20'
                              }`}
                            >
                              {isPreviewing ? <PauseCircle size={14} variant="Bold" /> : <PlayCircle size={14} variant="Bold" />}
                            </button>
                          )}
                          {!track.file && (
                             <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-on-surface-variant/20">
                               <Music size={14} />
                             </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Audio Preview Element (Hidden) */}
                {previewAudio && (
                  <audio 
                    src={previewAudio} 
                    autoPlay 
                    onEnded={() => setPreviewAudio(null)} 
                    className="hidden"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════ */}
      {/* VIDEO MODAL                         */}
      {/* ═══════════════════════════════════ */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowVideoModal(false)}
          >
            <button
              onClick={() => { setShowVideoModal(false); setVideoStep("preview"); }}
              className="absolute top-6 right-6 lg:top-8 lg:right-8 z-[60] bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors cursor-pointer"
            >
              <CloseCircle size={40} variant="Bulk" />
            </button>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {videoStep === "preview" ? (
                <>
                  <div className="bg-black p-3 aspect-[9/16]">
                    <Player
                      component={PropertyComposition}
                      inputProps={{
                        property: {
                          ...property,
                          address: parsedLocation?.title || property.address || "Propiedad Exclusiva",
                          price: property.price || "Consultar",
                          type: property.type || "Propiedad",
                          operation_type: property.operation_type || "Venta",
                          location: parsedLocation?.subtitle || property.location || "",
                          rooms: property.rooms || 0,
                          bedrooms: property.bedrooms || 0,
                          bathrooms: property.bathrooms || 0,
                          surface_total: property.surface_total || 0,
                          surface_covered: property.surface_covered || 0,
                          photos: currentVideoPhotos,
                        },
                        audioUrl: selectedAudio || undefined,
                      }}
                      durationInFrames={(Math.max(1, currentVideoPhotos.length) + 1) * 90}
                      compositionWidth={1080}
                      compositionHeight={1920}
                      fps={30}
                      style={{ width: "100%", height: "100%", borderRadius: "8px" }}
                      controls
                      autoPlay
                      loop
                    />
                  </div>
                  <div className="p-4 flex gap-3">
                    <button 
                      onClick={handleDownloadVideoHD}
                      disabled={isVideoDownloading}
                      className="btn-secondary flex-1 shadow-md text-xs disabled:opacity-50" 
                    >
                      {isVideoDownloading ? `Aguardá... ${videoDownloadProgress || 0}%` : "Descargar HD"}
                    </button>
                    <button 
                      onClick={() => setVideoStep("format")}
                      className="btn-primary !bg-[#2563EB] !border-[#2563EB] hover:!bg-[#1D4ED8] flex-1 shadow-md text-xs"
                    >
                      Publicar en Redes
                    </button>
                  </div>
                </>
              ) : videoStep === "format" ? (
                <div className="p-6 flex flex-col gap-5">
                  <div>
                    <h4 className="font-heading font-bold text-primary mb-1">¿Cómo querés publicar este video?</h4>
                    <p className="text-xs text-on-surface-variant">Podés elegir uno o ambos. La app detecta automáticamente dónde va el copy.</p>
                  </div>
                  <button
                    onClick={() => setVideoPublishFormats(prev => prev.includes("reel") ? prev.filter(f => f !== "reel") : [...prev, "reel"])}
                    className={`card-action !p-5 text-left transition-all duration-200 ${
                      videoPublishFormats.includes("reel") ? "ring-2 ring-[#2563EB] bg-[#2563EB]/5" : "hover:ring-1 hover:ring-outline-variant"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        videoPublishFormats.includes("reel") ? "bg-[#2563EB] border-[#2563EB]" : "border-outline-variant"
                      }`}>
                        {videoPublishFormats.includes("reel") && <TickCircle size={14} className="text-white" />}
                      </div>
                      <div>
                        <h5 className="font-heading font-semibold text-primary">🎬 Reel / Video</h5>
                        <p className="text-xs text-on-surface-variant mt-0.5">TikTok, Reels de IG, Video de Facebook. El copy <strong>se incluye</strong> en todas.</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setVideoPublishFormats(prev => prev.includes("story") ? prev.filter(f => f !== "story") : [...prev, "story"])}
                    className={`card-action !p-5 text-left transition-all duration-200 ${
                      videoPublishFormats.includes("story") ? "ring-2 ring-secondary bg-secondary/5" : "hover:ring-1 hover:ring-outline-variant"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        videoPublishFormats.includes("story") ? "bg-secondary border-secondary" : "border-outline-variant"
                      }`}>
                        {videoPublishFormats.includes("story") && <TickCircle size={14} className="text-white" />}
                      </div>
                      <div>
                        <h5 className="font-heading font-semibold text-primary">📱 Historia / Estado</h5>
                        <p className="text-xs text-on-surface-variant mt-0.5">IG Stories, WhatsApp Status, FB Stories. El copy <strong>no se incluye</strong> (excepto TikTok).</p>
                      </div>
                    </div>
                  </button>
                  <div className="flex gap-3">
                    <button onClick={() => setVideoStep("preview")} className="btn-tertiary flex-1 justify-center text-xs">
                      ← Volver
                    </button>
                    <button
                      onClick={() => setVideoStep("publish")}
                      disabled={videoPublishFormats.length === 0}
                      className="btn-primary !bg-[#2563EB] !border-[#2563EB] hover:!bg-[#1D4ED8] flex-1 justify-center text-xs disabled:opacity-50"
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-[80vh] flex flex-col">
                  <SocialPublisherForm 
                    property={property}
                    copyVariants={copyVariants}
                    mediaType="video"
                    contentFormat={videoPublishFormats.includes("reel") ? "reel" : "story"}
                    contentFormats={videoPublishFormats}
                    onBack={() => setVideoStep("format")}
                    onPublishSuccess={() => {
                        setShowVideoModal(false);
                        setVideoStep("preview");
                        showToast("¡Video publicado exitosamente en tus redes!");
                    }}
                    onCopyGenerated={(v) => setCopyVariants(v)}
                  />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════ */}
      {/* PLACA MODAL                         */}
      {/* ═══════════════════════════════════ */}
      <AnimatePresence>
        {showPlacaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPlacaModal(false)}
          >
            {/* LARGE OUTSIDE CLOSE BUTTON */}
            <button
              onClick={() => { setShowPlacaModal(false); setPlacaStep("preview"); }}
              className="absolute top-6 right-6 lg:top-8 lg:right-8 z-[60] bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors cursor-pointer"
            >
              <CloseCircle size={40} variant="Bulk" />
            </button>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={`bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative`}
              onClick={(e) => e.stopPropagation()}
            >
              {placaStep === "preview" ? (
                <>
                  <div className={`bg-black p-3 ${placaFormat === 'story' ? 'aspect-[9/16]' : 'aspect-square'}`}>
                    <div id="placa-capture-node" className="w-full h-full relative overflow-hidden bg-white rounded-lg">
                      <Player
                      component={StoryPlacaComposition}
                      inputProps={{
                        format: placaFormat || 'story',
                        property: {
                          ...property,
                          address: parsedLocation?.title || property.address || "Propiedad Exclusiva",
                          price: property.price || "Consultar",
                          type: property.type || "Propiedad",
                          operation_type: property.operation_type || "Venta",
                          location: parsedLocation?.subtitle || property.location || "",
                          rooms: property.rooms || 0,
                          bedrooms: property.bedrooms || 0,
                          bathrooms: property.bathrooms || 0,
                          surface_total: property.surface_total || 0,
                          surface_covered: property.surface_covered || 0,
                          photos: selectedPlacaPhotos,
                        },
                      }}
                      durationInFrames={1}
                      compositionWidth={1080}
                      compositionHeight={placaFormat === 'story' ? 1920 : 1080}
                      fps={30}
                      style={{ width: "100%", height: "100%", borderRadius: "8px" }}
                      autoPlay={false}
                      loop={false}
                    />
                    </div>
                  </div>
                  <div className="p-4 flex gap-3">
                    <button 
                      onClick={handleExportPlaca}
                      disabled={isCapturing}
                      className="btn-secondary flex-1 shadow-md text-xs disabled:opacity-50" 
                    >
                      {isCapturing ? "Aguardá..." : "⬇ Descargar JPG"}
                    </button>
                    <button 
                      onClick={async () => {
                        const dataUrl = await capturePlacaNode();
                        if (dataUrl) setPlacaStep("publish");
                      }}
                      disabled={isCapturing}
                      className="btn-primary !bg-[#2563EB] !border-[#2563EB] hover:!bg-[#1D4ED8] flex-1 shadow-md text-xs disabled:opacity-50"
                    >
                      Publicar en Redes
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-[80vh] flex flex-col">
                  <SocialPublisherForm 
                    property={property}
                    copyVariants={copyVariants}
                    mediaType="placa"
                    contentFormat={placaFormat || "story"}
                    mediaThumb={placaUrl}
                    onBack={() => setPlacaStep("preview")}
                    onPublishSuccess={() => {
                        setShowPlacaModal(false);
                        setPlacaStep("preview");
                        showToast("¡Placa publicada exitosamente en tus redes!");
                    }}
                    onCopyGenerated={(v) => setCopyVariants(v)}
                  />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════ */}
      {/* TOAST NOTIFICATION                  */}
      {/* ═══════════════════════════════════ */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl bg-black text-white font-medium text-sm border border-white/10 backdrop-blur-md"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
