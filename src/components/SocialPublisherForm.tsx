"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Global, CloseCircle, TickCircle, ArrowLeft, Magicpen, InfoCircle, Instagram, Facebook
} from "iconsax-react";

type CopyVariant = { title: string; subtitle: string; content: string };
type CopyVariants = { descriptivo: CopyVariant; emocional: CopyVariant; urgencia: CopyVariant };

interface SocialPublisherFormProps {
  property: any;
  user: any;
  copyVariants: CopyVariants | null;
  mediaType: "placa" | "video";
  /** The primary content format (used for single-format like placas) */
  contentFormat: "story" | "post" | "reel";
  /** Multiple formats selected (used for videos where user picks story + reel) */
  contentFormats?: ("story" | "reel")[];
  mediaThumb?: string | null;
  /** Public URL of a pre-rendered video (for Zernio publishing) */
  renderedVideoUrl?: string | null;
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
  user,
  copyVariants,
  mediaType,
  contentFormat,
  contentFormats,
  mediaThumb,
  renderedVideoUrl,
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState<string>("instagram");
  const [renderProgress, setRenderProgress] = useState<number | null>(null);

  // ── Inline copy generation ──
  const [isGeneratingCopyInline, setIsGeneratingCopyInline] = useState(false);
  const [inlineCopyVariants, setInlineCopyVariants] = useState<CopyVariants | null>(null);

  // Use parent variants if available, otherwise use inline-generated ones
  const activeCopyVariants = copyVariants || inlineCopyVariants;

  useEffect(() => {
    fetchSocialAccounts();
    // Check if returning from OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_success') === 'true') {
      // Re-fetch accounts after OAuth callback
      fetchSocialAccounts();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── API Calls ──
  const fetchSocialAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const email = user?.email || property.agent?.email || "default@freire.com";
      const res = await fetch(`/api/social/accounts?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      const accounts = data.data || [];
      setSocialAccounts(accounts);
      // Extract profileId from the first account for use in publish calls
      const firstProfileId = accounts[0]?.profileId;
      if (firstProfileId) setProfileId(firstProfileId);
    } catch (e) {
      console.error(e);
      setSocialAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleDisconnectAccount = async (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm("¿Estás seguro de que querés desvincular esta red social?");
    if (!confirmed) return;

    try {
      const email = property.agent?.email || "default@freire.com";
      const res = await fetch("/api/social/accounts/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accountId }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchSocialAccounts();
        setPublishNetworks(prev => prev.filter(id => id !== accountId));
      } else {
        alert(data.error || "Error al desvincular");
      }
    } catch(err) {
      console.error(err);
      alert("Error de conexión");
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

  const handleAuthLinking = async (platform: string = "instagram") => {
    setIsConnecting(true);
    try {
      const email = user?.email || property.agent?.email || "default@freire.com";
      const res = await fetch(`/api/social/auth?email=${encodeURIComponent(email)}&platform=${platform}`);
      const data = await res.json();
      if (data.url) {
        // Open OAuth in a popup
        const popup = window.open(data.url, 'zernio_oauth', 'width=600,height=700,scrollbars=yes');
        // Poll for popup close to re-fetch accounts
        const pollTimer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            setIsConnecting(false);
            fetchSocialAccounts();
          }
        }, 1000);
      } else {
        setOauthUrl("error");
        setIsConnecting(false);
      }
    } catch (e) {
      console.error('Auth linking error:', e);
      setIsConnecting(false);
    }
  };

  // ── Publish ──
  const handlePublishClick = async () => {
    const hasZernio = publishNetworks.length > 0;

    if (!hasZernio) return;

    setIsPublishing(true);
    setRenderProgress(null);

    // For video: use the pre-rendered public URL; for placa: use the captured image
    let finalMediaUrls: string[] = [];
    if (mediaType === "video") {
      if (renderedVideoUrl) {
        finalMediaUrls = [renderedVideoUrl];
      } else if (mediaThumb) {
        finalMediaUrls = [mediaThumb];
      }
    } else {
      finalMediaUrls = mediaThumb ? [mediaThumb] : [];
    }

    if (mediaType === "video" && hasZernio && !renderedVideoUrl) {
      setIsPublishing(false);
      setRenderProgress(null);
      alert("El video aún se está preparando. Esperá un momento y volvé a intentar.");
      return;
    }

    try {
      // 1. Publish to Zernio (social networks)
      if (hasZernio) {
        const email = user?.email || property.agent?.email || "default@freire.com";

        // For each format, determine which accounts get copy
        const accountsWithCopy = new Set<string>();
        const accountsWithoutCopy = new Set<string>();

        for (const fmt of activeFormats) {
          const rules = COPY_RULES[fmt] || COPY_RULES.post;
          for (const acc of socialAccounts) {
            if (!publishNetworks.includes(acc.id)) continue;
            if (rules[acc.platform]) {
              accountsWithCopy.add(acc.id);
            } else {
              accountsWithoutCopy.add(acc.id);
            }
          }
        }

        const finalWithCopy = Array.from(accountsWithCopy);
        const finalWithoutCopy = Array.from(accountsWithoutCopy).filter(id => !accountsWithCopy.has(id));

        // Helper to perform publish with auto-retry on 502/504
        const performPublishWithRetry = async (payload: any, label: string) => {
          let attempts = 0;
          const maxAttempts = 2; // Try up to twice
          
          while (attempts < maxAttempts) {
            attempts++;
            try {
              const res = await fetch("/api/social/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });

              if (res.ok) return;

              // If it's a gateway timeout (502/504), retry once
              if ((res.status === 502 || res.status === 504) && attempts < maxAttempts) {
                console.warn(`Gateway timeout (${res.status}) for ${label}. Attempt ${attempts} failed. Retrying...`);
                // Wait briefly for Zernio to finish background processing
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
              }

              const errText = await res.text();
              let errData: any = {};
              try { errData = JSON.parse(errText); } catch(e) {}
              throw new Error(errData.error || `Error publicando ${label}: ${res.status}`);
            } catch (err: any) {
              if (attempts >= maxAttempts) throw err;
              // If it's a network error or potential timeout string
              if (err.message?.includes('502') || err.message?.includes('504')) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
              }
              throw err;
            }
          }
        };

        if (finalWithCopy.length > 0 && publishText) {
          const accountsPayload = finalWithCopy.map(id => {
            const acc = socialAccounts.find((a: any) => a.id === id);
            return { id, platform: acc?.platform || 'instagram' };
          });

          await performPublishWithRetry({
            email,
            text: publishText,
            accounts: accountsPayload,
            mediaUrls: finalMediaUrls,
            profileId,
            contentFormat: activeFormats.find(f => f !== 'story') || activeFormats[0] || 'post',
          }, "redes sociales con texto");
        }

        if (finalWithoutCopy.length > 0) {
          const accountsPayload = finalWithoutCopy.map(id => {
            const acc = socialAccounts.find((a: any) => a.id === id);
            return { id, platform: acc?.platform || 'instagram' };
          });

          await performPublishWithRetry({
            email,
            text: "",
            accounts: accountsPayload,
            mediaUrls: finalMediaUrls,
            profileId,
            contentFormat: "story",
          }, "historias");
        }
      }

      onPublishSuccess();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error de red. Intentá de nuevo");
    } finally {
      setIsPublishing(false);
      setRenderProgress(null);
    }
  };

  // ── Derived: copy note ──
  const selectedPlatforms: string[] = [
    ...socialAccounts.filter((a: any) => publishNetworks.includes(a.id)).map((a: any) => a.platform),
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

  // Determine if only stories are selected
  const isStoryOnly = activeFormats.length > 0 && activeFormats.every(f => f === "story");

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

      {/* ── Connect Platform Overlay ── */}
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
            <h2 className="text-xl font-bold mb-2 text-primary">Conectar una Red Social</h2>
            <p className="text-sm text-on-surface-variant mb-4 max-w-sm">
              Elegí la plataforma que querés vincular. Se abrirá una ventana para autorizar el acceso.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {(["instagram", "facebook", "tiktok"] as const).map((p) => {
                let Icon;
                if (p === "instagram") Icon = <Instagram size={18} variant="Bold" color="white" />;
                else if (p === "facebook") Icon = <Facebook size={18} variant="Bold" color="white" />;
                else Icon = (
                  <svg className="w-[18px] h-[18px] fill-white" viewBox="0 0 448 512">
                    <path d="M448 209.9a210.1 210.1 0 0 1 -122.8-39.3V349.4A162.6 162.6 0 1 1 185 188.3V278.2a74.6 74.6 0 1 0 52.2 71.2V0l88 0a121.2 121.2 0 0 0 1.9 22.2h0A122.2 122.2 0 0 0 381 102.4a121.4 121.4 0 0 0 67 20.1z"/>
                  </svg>
                );

                return (
                  <button
                    key={p}
                    onClick={() => { setOauthUrl(null); handleAuthLinking(p); }}
                    disabled={isConnecting}
                    className="btn-primary !bg-[#2563EB] !border-[#2563EB] hover:!bg-[#1D4ED8] flex items-center justify-center gap-2.5 disabled:opacity-50 text-white shadow-sm"
                  >
                    {Icon}
                    {" "}{p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                );
              })}
            </div>
            
            <button 
              onClick={() => setOauthUrl(null)} 
              className="mt-6 flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} /> Volver al menú
            </button>

            {isConnecting && (
              <div className="mt-4 flex items-center gap-2 text-sm text-on-surface-variant">
                <div className="h-4 w-4 border-2 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
                Abriendo ventana de autorización…
              </div>
            )}
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

              {/* Zernio accounts */}
              {socialAccounts.length === 0 ? (
                <div className="bg-surface-variant/50 border border-outline-variant rounded-xl p-4 text-center">
                  <p className="text-sm text-on-surface-variant mb-3">No tenés redes sociales vinculadas aún.</p>
                  <button onClick={() => setOauthUrl("connect")} className="btn-primary !bg-[#2563EB] !border-[#2563EB] text-xs">
                    Vincular cuenta nueva
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {socialAccounts.map((acc: any) => (
                      <div key={acc.id} className="relative group">
                        <button
                          onClick={() =>
                            setPublishNetworks((prev) =>
                              prev.includes(acc.id) ? prev.filter((id) => id !== acc.id) : [...prev, acc.id]
                            )
                          }
                          className={`px-3 py-2 border rounded-xl flex items-center justify-between gap-2.5 text-xs font-semibold transition-colors duration-200 shadow-sm w-full outline-none pr-8 ${
                          publishNetworks.includes(acc.id)
                            ? "bg-[#2563EB] text-white border-[#2563EB]"
                            : "bg-surface text-on-surface-variant border-outline-variant hover:border-[#2563EB]/50"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 overflow-hidden">
                          {acc.platform === "Instagram" && <Instagram size={14} color={publishNetworks.includes(acc.id) ? "white" : "#2563EB"} variant={publishNetworks.includes(acc.id) ? "Bold" : "Linear"} />}
                          {acc.platform === "Facebook" && <Facebook size={14} color={publishNetworks.includes(acc.id) ? "white" : "#2563EB"} variant={publishNetworks.includes(acc.id) ? "Bold" : "Linear"} />}
                          {acc.platform === "TikTok" && (
                            <svg className={`w-[12px] h-[12px] ${publishNetworks.includes(acc.id) ? "fill-white" : "fill-[#2563EB]"}`} viewBox="0 0 448 512">
                               <path d="M448 209.9a210.1 210.1 0 0 1 -122.8-39.3V349.4A162.6 162.6 0 1 1 185 188.3V278.2a74.6 74.6 0 1 0 52.2 71.2V0l88 0a121.2 121.2 0 0 0 1.9 22.2h0A122.2 122.2 0 0 0 381 102.4a121.4 121.4 0 0 0 67 20.1z"/>
                            </svg>
                          )}
                          <span className="flex flex-col items-start leading-tight">
                            <span className="truncate">{acc.platform} — {acc.username || acc.name}</span>
                          </span>
                        </span>
                        </button>
                        <button
                           onClick={(e) => handleDisconnectAccount(acc.id, e)}
                           title="Desvincular red social"
                           className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors duration-200 z-10 ${
                             publishNetworks.includes(acc.id)
                               ? "bg-white/25 text-white hover:bg-white/40"
                               : "bg-error/10 text-error hover:bg-error hover:text-white"
                           }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setOauthUrl("connect")} className="btn-tertiary self-start text-[11px] font-semibold flex items-center gap-1 opacity-80">
                    + Vincular otra cuenta
                  </button>
                </div>
              )}
            </div>

            {/* ═══ STEP 3.2: Copy ═══ */}
            {isStoryOnly ? (
              <div className="bg-surface-variant/40 border border-outline-variant/50 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-primary">Las historias no llevan texto</p>
                <p className="text-xs mt-1 text-on-surface-variant opacity-70">Solo se enviará la imagen o video sin copy.</p>
              </div>
            ) : (
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
            )}

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
          disabled={isPublishing || !publishNetworks.length}
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
