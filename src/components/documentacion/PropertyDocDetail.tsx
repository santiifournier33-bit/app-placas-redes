"use client"

import { X, ExternalLink, CheckCircle2, XCircle, AlertTriangle, Eye, Download, FileText, Loader2 } from "lucide-react"
import { CATEGORY_LABELS } from "@/lib/docs/doc-requirements"
import type { PropertyDocStatus, DriveFile } from "@/lib/docs/doc-analyzer"
import { useState, useEffect } from "react"

interface PropertyDocDetailProps {
  property: PropertyDocStatus
  onClose: () => void
}

export function PropertyDocDetail({ property: p, onClose }: PropertyDocDetailProps) {
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && previewFile) {
        setPreviewFile(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [previewFile])

  const handlePreview = (file: DriveFile) => {
    setPreviewFile(file)
  }

  const handleDownload = (file: DriveFile) => {
    window.open(`/api/docs/property/${p.id}/file?fileId=${file.id}&action=download`, "_blank")
  }

  const obligatoriosMissing = p.docsMissing.filter(d => d.priority === "obligatorio")
  const recomendadosMissing = p.docsMissing.filter(d => d.priority === "recomendado")

  // Separate present docs by priority
  const obligatoriosPresent = p.docsPresent.filter(d =>
    ["mandato", "titulo", "identidad"].includes(d.category) && !d.category.includes("conyuge")
  )
  const otherPresent = p.docsPresent.filter(d =>
    !["mandato", "titulo"].includes(d.category) || d.category.includes("conyuge")
  )

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-shell-bg border-l border-border-subtle z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-shell-bg/95 backdrop-blur-xl border-b border-border-subtle px-5 py-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted font-mono">ID {p.id}</p>
              <h2 className="text-lg font-bold text-text-primary mt-0.5 truncate">
                {p.operation} {p.type} {p.location}
              </h2>
              <p className="text-sm text-text-secondary mt-1">{p.agent}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-surface-overlay-hover text-text-muted hover:text-text-secondary transition-colors cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {p.driveUrl && (
            <a
              href={p.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-blue-500/10 text-xs md:text-[11px] font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              <ExternalLink size={12} />
              Abrir carpeta en Drive
            </a>
          )}
        </div>

        {p.status === "complete" && recomendadosMissing.length > 0 && (
          <div className="mx-5 mt-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/70 leading-relaxed">
              La documentación obligatoria está completa, pero falta algún documento recomendado (ej. {recomendadosMissing[0].label}). Revisá si es necesario para esta operación.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-5 space-y-6">

          {/* Obligatorios */}
          <section>
            <p className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-3">
              🔴 Documentos obligatorios
            </p>
            <div className="space-y-2">
              {obligatoriosPresent.map(doc => (
                <DocGroup key={doc.category} label={doc.label} files={doc.files} status="present"
                  onPreview={handlePreview} onDownload={handleDownload}
                />
              ))}
              {obligatoriosMissing.map(doc => (
                <DocMissing key={doc.category} label={doc.label} priority="obligatorio" />
              ))}
            </div>
          </section>

          {/* Recomendados */}
          {(recomendadosMissing.length > 0 || otherPresent.some(d => d.category === "identidad_conyuge" || d.category.includes("conyuge"))) && (
            <section>
              <p className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-3">
                🟡 Documentos recomendados
              </p>
              <div className="space-y-2">
                {otherPresent.filter(d => d.category === "identidad_conyuge" || d.category.includes("conyuge")).map(doc => (
                  <DocGroup key={doc.category} label={doc.label} files={doc.files} status="present"
                    onPreview={handlePreview} onDownload={handleDownload}
                  />
                ))}
                {recomendadosMissing.map(doc => (
                  <DocMissing key={doc.category} label={doc.label} priority="recomendado" />
                ))}
              </div>
            </section>
          )}

          {/* Other docs */}
          {otherPresent.filter(d => d.category !== "identidad_conyuge" && !d.category.includes("conyuge")).length > 0 && (
            <section>
              <p className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-3">
                📄 Otros documentos
              </p>
              <div className="space-y-2">
                {otherPresent.filter(d => d.category !== "identidad_conyuge" && !d.category.includes("conyuge")).map(doc => (
                  <DocGroup key={doc.category} label={doc.label} files={doc.files} status="extra"
                    onPreview={handlePreview} onDownload={handleDownload}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Unclassified */}
          {p.unclassifiedFiles.length > 0 && (
            <section>
              <p className="text-xs md:text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-3">
                ⚠️ Sin clasificar ({p.unclassifiedFiles.length})
              </p>
              <div className="space-y-1">
                {p.unclassifiedFiles.map(file => (
                  <FileRow
                    key={file.id} file={file}
                    onPreview={handlePreview} onDownload={handleDownload}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Summary */}
          <div className="rounded-xl bg-surface-overlay border border-border-subtle p-3">
            <p className="text-xs md:text-[11px] text-text-muted">
              Total: {p.fileCount} archivo{p.fileCount !== 1 ? "s" : ""} en Drive
            </p>
          </div>
        </div>
      </div>

      {/* Preview Fullscreen Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-5xl flex items-center justify-between mb-4">
            <h3 className="text-white font-medium truncate pr-4">{previewFile.name}</h3>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleDownload(previewFile)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-overlay-hover hover:bg-white/[0.15] text-white transition-colors cursor-pointer"
              >
                <Download size={16} />
                Descargar
              </button>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 rounded-xl hover:bg-surface-overlay-hover text-text-secondary hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="w-full max-w-5xl h-[80vh] rounded-2xl overflow-hidden bg-black/50 border border-border-default flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center -z-10">
              <Loader2 size={24} className="animate-spin text-text-muted" />
            </div>
            {previewFile.mimeType.startsWith("image/") ? (
              <img 
                src={`/api/docs/property/${p.id}/file?fileId=${previewFile.id}&action=preview`}
                alt={previewFile.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <iframe
                src={`/api/docs/property/${p.id}/file?fileId=${previewFile.id}&action=preview`}
                className="w-full h-full border-0 bg-white"
                title={previewFile.name}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

function DocGroup({ label, files, status, onPreview, onDownload }: {
  label: string
  files: DriveFile[]
  status: "present" | "extra"
  onPreview: (f: DriveFile) => void
  onDownload: (f: DriveFile) => void
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white/[0.01] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border-b border-border-subtle">
        <CheckCircle2 size={13} strokeWidth={2} className="text-emerald-400 shrink-0" />
        <span className="text-xs font-medium text-emerald-400">{label}</span>
      </div>
      <div className="divide-y divide-white/[0.03]">
        {files.map(file => (
          <FileRow
            key={file.id} file={file}
            onPreview={onPreview} onDownload={onDownload}
          />
        ))}
      </div>
    </div>
  )
}

function DocMissing({ label, priority }: { label: string; priority: "obligatorio" | "recomendado" }) {
  const isObl = priority === "obligatorio"
  return (
    <div className={`rounded-xl border px-3 py-2.5 flex items-center gap-2 ${
      isObl
        ? "border-red-500/20 bg-red-500/5"
        : "border-amber-500/20 bg-amber-500/5"
    }`}>
      <XCircle size={13} strokeWidth={2} className={isObl ? "text-red-400" : "text-amber-400"} />
      <span className={`text-xs font-medium ${isObl ? "text-red-400" : "text-amber-400"}`}>
        {label} — No encontrado
      </span>
    </div>
  )
}

function FileRow({ file, onPreview, onDownload }: {
  file: DriveFile
  onPreview: (f: DriveFile) => void
  onDownload: (f: DriveFile) => void
}) {
  const isImage = file.mimeType?.startsWith("image/")
  const isPdf = file.mimeType === "application/pdf"
  const isDocx = file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith('.docx')
  const canPreview = isImage || isPdf || isDocx

  return (
    <div className="flex items-center gap-2 px-3 py-2 group hover:bg-surface-overlay transition-colors">
      <FileText size={13} className="text-text-muted shrink-0" />
      <span className="text-xs md:text-[11px] text-text-secondary truncate flex-1 font-mono">{file.name}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {canPreview && (
          <button
            onClick={() => onPreview(file)}
            className="p-1.5 rounded-lg hover:bg-surface-overlay-hover text-text-muted hover:text-blue-400 transition-colors cursor-pointer"
            title="Vista previa"
          >
            <Eye size={13} />
          </button>
        )}
        <button
          onClick={() => onDownload(file)}
          className="p-1.5 rounded-lg hover:bg-surface-overlay-hover text-text-muted hover:text-emerald-400 transition-colors cursor-pointer"
          title="Descargar"
        >
          <Download size={13} />
        </button>
      </div>
    </div>
  )
}
