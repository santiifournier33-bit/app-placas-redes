"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Global, CloseCircle, TickCircle, ArrowLeft, Magicpen, InfoCircle
} from "iconsax-react";

type CopyVariant = { title: string; subtitle: string; content: string };
type CopyVariants = { descriptivo: CopyVariant; emocional: CopyVariant; urgencia: CopyVariant };

interface SocialPublisherFormProps {
  property: any;
  copyVariants: CopyVariants | null;
  mediaType: "placa" | "video";
  /** The primary content format (used for single-format like placas) */
  contentFormat: "story" | "post" | "reel";
  /** Multiple formats selected (used for videos where user picks story + reel) */
  contentFormats?: ("story" | "reel")[];
  mediaThumb?: string | null;
  onBack: () => void;
  onPublishSuccess: () => void;
  /** Callback to update parent copyVariants after inline generation */
  onCopyGenerated?: (variants: CopyVariants) => void;
}

// ── Copy inclusion rules ──
// true = copy IS included, false = copy is NOT included
const COPY_RULES: Record<string, Record<string, boolean>> = {
  story: {
    Instagram: false,
    Facebook: false,
    TikTok: true,
    WhatsApp: false,
  },
  post: {
    Instagram: true,
    Facebook: true,
    TikTok: true,
    WhatsApp: true,
  },
  reel: {
    Instagram: true,
    Facebook: true,
    TikTok: true,
    WhatsApp: true,
  },
};

function getCopyNote(
  formats: string[],
  selectedPlatforms: string[]
): { included: string[]; excluded: string[] } {
  const included = new Set<string>();
  const excluded = new Set<string>();

  for (const platform of selectedPlatforms) {
    let includesCopy = false;
    for (const fmt of formats) {
      const rules = COPY_RULES[fmt] || COPY_RULES.post;
      if (rules[platform]) {
        includesCopy = true;
        break;
      }
    }
    if (includesCopy) {
      included.add(platform);
    } else {
      excluded.add(platform);
    }
  }
  return { included: Array.from(included), excluded: Array.from(excluded) };
}

const WHATSAPP_ICON = (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

export function SocialPublisherForm({
  property,
  copyVariants,
  mediaType,
  contentFormat,
  contentFormats,
  mediaThumb,
  onBack,
  onPublishSuccess,
  onCopyGenerated,
}: SocialPublisherFormProps) {
  // Resolve the active formats list
  const activeFormats: string[] = contentFormats && contentFormats.length > 0
    ? contentFormats
    : [contentFormat];
  // ── State ──
  const [publishText, setPublishText] = useState("");
  const [selectedCopyStyle, setSelectedCopyStyle] = useState<"descriptivo" | "emocional" | "urgencia" | null>(null);
  const [publishNetworks, setPublishNetworks] = useState<string[]>([]);
  const [whatsappSelected, setWhatsappSelected] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<number | null>(null);

  // ── Inline copy generation ──
  const [isGeneratingCopyInline, setIsGeneratingCopyInline] = useState(false);
  const [inlineCopyVariants, setInlineCopyVariants] = useState<CopyVariants | null>(null);

  // Use parent variants if available, otherwise use inline-generated ones
  const activeCopyVariants = copyVariants || inlineCopyVariants;

  useEffect(() => {
    fetchSocialAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── API Calls ──
  const fetchSocialAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const email = property.agent?.email || "default@freire.com";
      const res = await fetch(`/api/social/accounts?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.data) {
        setSocialAccounts(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
      } else {
        setSocialAccounts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleGenerateCopyInline = async () => {
    setIsGeneratingCopyInline(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property, type: "redes_sociales" }),
      });
      const data = await res.json();
      if (data.type === "variants" && data.variants) {
        setInlineCopyVariants(data.variants);
        onCopyGenerated?.(data.variants);
        // Auto-select descriptivo
        setSelectedCopyStyle("descriptivo");
        setPublishText(data.variants.descriptivo?.content || "");
      } else if (data.content) {
        const fallback: CopyVariants = {
          descriptivo: { title: "Copy Generado", subtitle: "", content: data.content },
          emocional: { title: "", subtitle: "", content: "" },
          urgencia: { title: "", subtitle: "", content: "" },
        };
        setInlineCopyVariants(fallback);
        onCopyGenerated?.(fallback);
        setSelectedCopyStyle("descriptivo");
        setPublishText(data.content);
      }
    } catch (e) {
      console.error(e);
      alert("Error generando copy. Intentá de nuevo.");
    } finally {
      setIsGeneratingCopyInline(false);
    }
  };

  const handleSelectStyle = (style: "descriptivo" | "emocional" | "urgencia") => {
    if (!activeCopyVariants) return;
    const content = activeCopyVariants[style]?.content || "";
    if (!content) return;
    setSelectedCopyStyle(style);
    setPublishText(content);
  };

  const handleAuthLinking = async () => {
    try {
      const email = property.agent?.email || "default@freire.com";
      const res = await fetch(`/api/social/auth?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.url) setOauthUrl(data.url);
    } catch (e) { console.error(e); }
  };

  const handleSimulateOAuthSuccess = () => {
    setOauthUrl(null);
    setSocialAccounts([
      { id: "ig-123", platform: "Instagram", username: "freirerealestate" },
      { id: "fb-789", platform: "Facebook", username: "freire.propiedades" },
      { id: "tk-456", platform: "TikTok", username: "freirerealestate" },
    ]);
  };

  // ── WhatsApp native share ──
  const handleWhatsAppShare = async () => {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const rules = COPY_RULES[contentFormat] || COPY_RULES.post;
      const includeText = rules["WhatsApp"];
      const shareText = includeText ? publishText : "";

      if (mediaThumb) {
        const response = await fetch(mediaThumb);
        const blob = await response.blob();
        const file = new File([blob], `freire-${mediaType}.jpg`, { type: blob.type });

        if (navigator.canShare && navigator.canShare({ files: [file] }) && isMobile) {
          await navigator.share({
            title: property.address || "Propiedad Freire",
            text: shareText,
            files: [file],
          });
          return;
        }
      }

      // Fallback: open WhatsApp with text only
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText || `Mirá esta propiedad: ${property.address}`)}`;
      window.open(waUrl, "_blank");
    } catch (e) {
      console.error("WhatsApp share error:", e);
    }
  };

  // ── Render Video AWS ──
  const handleVideoRender = async (): Promise<string | null> => {
    try {
      setRenderProgress(0);
      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property, theme: "default" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details);

      let isDone = false;
      let finalUrl: string | null = null;
      let errorCount = 0;

      while (!isDone && errorCount < 5) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const pollRes = await fetch(`/api/render-video?renderId=${data.renderId}&bucketName=${data.bucketName}`);
          const pollData = await pollRes.json();
          if (pollData.error) throw new Error(pollData.error);

          if (pollData.done) {
            isDone = true;
            finalUrl = pollData.outputFile;
            setRenderProgress(100);
          } else {
            setRenderProgress(Math.round(pollData.overallProgress * 100));
          }
        } catch (pollErr) {
          console.error("Poll error:", pollErr);
          errorCount++;
        }
      }
      return finalUrl;
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error al renderizar video en AWS. Verificá tu consola de Netlify.");
      return null;
    }
  };

  // ── Publish ──
  const handlePublishClick = async () => {
    const hasZernio = publishNetworks.length > 0;
    const hasWhatsApp = whatsappSelected;

    if (!hasZernio && !hasWhatsApp) return;

    setIsPublishing(true);
    setRenderProgress(null);

    let finalMediaUrls: string[] = mediaThumb ? [mediaThumb] : [];

    try {
      // Si es video, necesitamos compilar el MP4 en AWS antes de enviar a Zernio
      if (mediaType === "video" && hasZernio) {
        const videoUrl = await handleVideoRender();
        if (!videoUrl) {
          setIsPublishing(false);
          setRenderProgress(null);
          return;
        }
        finalMediaUrls = [videoUrl];
      }

      // 1. Publish to Zernio (social networks)
      if (hasZernio) {
        const email = property.agent?.email || "default@freire.com";

        // For each format, determine which accounts get copy
        const allAccountIds = new Set<string>();
        const accountsWithCopy = new Set<string>();
        const accountsWithoutCopy = new Set<string>();

        for (const fmt of activeFormats) {
          const rules = COPY_RULES[fmt] || COPY_RULES.post;
          for (const acc of socialAccounts) {
            if (!publishNetworks.includes(acc.id)) continue;
            allAccountIds.add(acc.id);
            if (rules[acc.platform]) {
              accountsWithCopy.add(acc.id);
            } else {
              accountsWithoutCopy.add(acc.id);
            }
          }
        }

        // Accounts that get copy in ANY format → send with copy
        // Accounts that NEVER get copy in any format → send without
        const finalWithCopy = Array.from(accountsWithCopy);
        const finalWithoutCopy = Array.from(accountsWithoutCopy).filter(id => !accountsWithCopy.has(id));

        if (finalWithCopy.length > 0 && publishText) {
          await fetch("/api/social/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              text: publishText,
              socialAccountIds: finalWithCopy,
              mediaUrls: finalMediaUrls,
            }),
          });
        }

        if (finalWithoutCopy.length > 0) {
          await fetch("/api/social/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              text: "",
              socialAccountIds: finalWithoutCopy,
              mediaUrls: finalMediaUrls,
            }),
          });
        }
      }

      // 2. WhatsApp native share
      if (hasWhatsApp) {
        await handleWhatsAppShare();
      }

      onPublishSuccess();
    } catch (e) {
      console.error(e);
      alert("Error de red. Intentá de nuevo");
    } finally {
      setIsPublishing(false);
      setRenderProgress(null);
    }
  };

  // ── Derived: copy note ──
  const selectedPlatforms: string[] = [
    ...socialAccounts.filter((a: any) => publishNetworks.includes(a.id)).map((a: any) => a.platform),
    ...(whatsappSelected ? ["WhatsApp"] : []),
  ];
  const { included: copyIncluded, excluded: copyExcluded } = getCopyNote(activeFormats, selectedPlatforms);

  const charCount = publishText.length;
  const charLimit = 2200; // Instagram limit

  // ── Style button labels ──
  const STYLE_BUTTONS: { key: "descriptivo" | "emocional" | "urgencia"; label: string }[] = [
    { key: "descriptivo", label: "Catálogo" },
    { key: "emocional", label: "Emocional" },
    { key: "urgencia", label: "Comercial" },
  ];

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* ── Header ── */}
      <div className="p-4 border-b border-outline-variant bg-surface flex items-center justify-between">
        <button onClick={onBack} className="btn-tertiary px-2 py-1 flex items-center gap-2">
          <ArrowLeft size={18} />
          Volver
        </button>
        <h3 className="font-heading font-bold text-lg text-primary flex items-center gap-2">
          <Global size={20} className="text-[#2563EB]" variant="Bulk" />
          Publicar
        </h3>
        <div className="w-[80px]" />
      </div>

      {/* ── OAuth Popup (overlay) ── */}
      {oauthUrl && (
        <div className="absolute inset-0 z-50 bg-surface flex flex-col">
          <div className="p-4 border-b flex justify-between items-center shrink-0">
            <h4 className="font-bold text-primary">Vincular Redes Sociales</h4>
            <button onClick={() => setOauthUrl(null)} className="text-on-surface-variant hover:text-primary">
              <CloseCircle size={24} />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-surface-variant/30 text-center">
            <Global size={48} className="text-[#2563EB] mb-4" variant="Bulk" />
            <h2 className="text-xl font-bold mb-2 text-primary">Portal Privado de Conexión</h2>
            <p className="text-sm text-on-surface-variant mb-6 max-w-sm">
              En producción, aquí verás la pantalla de login nativa de Instagram, Facebook o TikTok sin salir de la App.
            </p>
            <button onClick={handleSimulateOAuthSuccess} className="btn-primary !bg-[#2563EB] !border-[#2563EB] hover:!bg-[#1D4ED8]">
              Simular Conexión Exitosa
            </button>
          </div>
        </div>
      )}

      {/* ── Scrollable Body ── */}
      <div className="p-5 overflow-y-auto flex-1">
        {isLoadingAccounts ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="h-6 w-6 border-2 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin mb-4" />
            <p className="text-sm text-on-surface-variant">Conectando con cuentas sociales...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ═══ STEP 3.1: Redes ═══ */}
            <div>
              <label className="block font-semibold text-xs text-primary mb-2 uppercase tracking-wider">
                Paso 3.1 — Redes de destino
              </label>

              {/* WhatsApp (always available) */}
              <div className="mb-2">
                <button
                  onClick={() => setWhatsappSelected(!whatsappSelected)}
                  className={`w-full px-3 py-2.5 border rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors duration-200 ${
                    whatsappSelected
                      ? "bg-[#25D366] text-white border-[#25D366]"
                      : "bg-surface text-on-surface-variant border-outline-variant hover:border-[#25D366]/50"
                  }`}
                >
                  {WHATSAPP_ICON}
                  WhatsApp — Compartir directo
                </button>
              </div>

              {/* Zernio accounts */}
              {socialAccounts.length === 0 ? (
                <div className="bg-surface-variant/50 border border-outline-variant rounded-xl p-4 text-center">
                  <p className="text-sm text-on-surface-variant mb-3">No tenés redes sociales vinculadas aún.</p>
                  <button onClick={handleAuthLinking} className="btn-primary !bg-[#2563EB] !border-[#2563EB] text-xs">
                    Vincular Instagram / Facebook / TikTok
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {socialAccounts.map((acc: any) => (
                    <button
                      key={acc.id}
                      onClick={() =>
                        setPublishNetworks((prev) =>
                          prev.includes(acc.id) ? prev.filter((id) => id !== acc.id) : [...prev, acc.id]
                        )
                      }
                      className={`px-3 py-2 border rounded-xl flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ${
                        publishNetworks.includes(acc.id)
                          ? "bg-[#2563EB] text-white border-[#2563EB]"
                          : "bg-surface text-on-surface-variant border-outline-variant hover:border-[#2563EB]/50"
                      }`}
                    >
                      {acc.platform === "Instagram" && "📷"}
                      {acc.platform === "Facebook" && "📘"}
                      {acc.platform === "TikTok" && "🎵"}
                      {acc.platform} — {acc.username || acc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ═══ STEP 3.2: Copy ═══ */}
            <div>
              <label className="block font-semibold text-xs text-primary mb-2 uppercase tracking-wider">
                Paso 3.2 — Texto (Copy)
              </label>

              {/* Style buttons + Generate */}
              <div className="flex gap-2 mb-3">
                {STYLE_BUTTONS.map(({ key, label }) => {
                  const hasContent = !!activeCopyVariants?.[key]?.content;
                  const isActive = selectedCopyStyle === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectStyle(key)}
                      disabled={!hasContent}
                      className={`flex-1 px-2 py-2 border rounded-xl text-[11px] font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm"
                          : hasContent
                          ? "bg-surface text-on-surface-variant border-outline-variant hover:border-[#2563EB]/50 cursor-pointer"
                          : "bg-surface-variant/30 text-on-surface-variant/40 border-outline-variant/50 cursor-not-allowed"
                      }`}
                      title={!hasContent ? "Generá el copy primero" : `Usar estilo ${label}`}
                    >
                      {label}
                    </button>
                  );
                })}

                {/* Generate button (only if no variants exist) */}
                {!activeCopyVariants && (
                  <button
                    onClick={handleGenerateCopyInline}
                    disabled={isGeneratingCopyInline}
                    className="flex-1 px-2 py-2 border rounded-xl text-[11px] font-semibold bg-primary text-white border-primary hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {isGeneratingCopyInline ? (
                      <>
                        <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generando…
                      </>
                    ) : (
                      <>
                        <Magicpen size={14} />
                        Generar copy
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={publishText}
                  onChange={(e) => {
                    setPublishText(e.target.value);
                    setSelectedCopyStyle(null); // user is editing freely
                  }}
                  placeholder={
                    activeCopyVariants
                      ? "Elegí un estilo arriba o escribí tu propio texto…"
                      : "Presioná 'Generar copy' para crear el texto con IA, o escribí uno manualmente…"
                  }
                  rows={5}
                  className="w-full bg-surface-variant/30 border border-outline-variant rounded-xl p-3 text-xs text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow whitespace-pre-wrap resize-none"
                />
                <span
                  className={`absolute bottom-2 right-3 text-[10px] font-mono ${
                    charCount > charLimit ? "text-error font-bold" : "text-on-surface-variant/40"
                  }`}
                >
                  {charCount}/{charLimit}
                </span>
              </div>

              {/* ── Copy inclusion note ── */}
              <AnimatePresence>
                {selectedPlatforms.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3"
                  >
                    <div className="bg-surface-variant/40 border border-outline-variant/50 rounded-xl p-3 text-[11px] text-on-surface-variant flex items-start gap-2">
                      <InfoCircle size={16} className="shrink-0 mt-0.5 text-[#2563EB]" />
                      <div>
                        {copyIncluded.length > 0 && (
                          <p>
                            <span className="font-semibold text-primary">Con copy:</span>{" "}
                            {copyIncluded.join(", ")}
                          </p>
                        )}
                        {copyExcluded.length > 0 && (
                          <p className="mt-0.5">
                            <span className="font-semibold text-on-surface-variant/60">Sin copy (solo media):</span>{" "}
                            {copyExcluded.join(", ")}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-on-surface-variant/50 italic">
                          Para historias y estados, solo se envía la imagen/video sin texto.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Media preview ── */}
            {mediaThumb && (
              <div className="bg-success/5 border border-success/10 rounded-xl p-3 flex items-center gap-3">
                <TickCircle size={18} className="text-success" variant="Bulk" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary">Contenido visual adjunto</p>
                  <p className="text-[10px] text-on-surface-variant truncate">Se incluirá en todas las publicaciones.</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaThumb} alt="Preview" className="w-10 h-10 object-cover rounded-md shrink-0" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-4 border-t border-outline-variant bg-surface shrink-0">
        <button
          onClick={handlePublishClick}
          disabled={isPublishing || (!publishNetworks.length && !whatsappSelected) || (activeFormats.some(f => COPY_RULES[f]?.Instagram) && !publishText && publishNetworks.length > 0)}
          className="btn-primary flex items-center justify-center gap-2 py-4 disabled:opacity-50 w-full"
        >
          {isPublishing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {renderProgress !== null ? `Renderizando video (${renderProgress}%)...` : "Publicando..."}
            </>
          ) : (
            "Publicar ahora"
          )}
        </button>
      </div>
    </div>
  );
}
