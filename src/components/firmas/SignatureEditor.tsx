'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface Signer {
  id: string
  name: string
  email: string
  phone: string
}

interface SignatureBox {
  id: string
  signerId: string
  signerName: string
  page: number
  x: number  // relative 0-1
  y: number  // relative 0-1
  w: number  // relative 0-1
  h: number  // relative 0-1
}

interface PageRender {
  pageNum: number
  canvas: HTMLCanvasElement
  width: number
  height: number
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f59e0b', '#10b981', '#3b82f6', '#ef4444'
]

export default function SignatureEditor({ onSent }: { onSent: () => void }) {
  const [title, setTitle] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfPages, setPdfPages] = useState<PageRender[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Signers
  const [signers, setSigners] = useState<Signer[]>([])
  const [selectedSignerId, setSelectedSignerId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [addError, setAddError] = useState('')

  // Signature boxes
  const [boxes, setBoxes] = useState<SignatureBox[]>([])
  const [dragging, setDragging] = useState<{ boxId: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [signOnAllPages, setSignOnAllPages] = useState(false)

  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfjsRef = useRef<any>(null)

  // Load pdf.js
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      pdfjsRef.current = pdfjsLib
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  const renderPdf = useCallback(async (file: File) => {
    if (!pdfjsRef.current) {
      // wait for pdf.js to load
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    setLoading(true)
    setError('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await pdfjsRef.current.getDocument({ data: arrayBuffer }).promise
      const numPages = pdfDoc.numPages
      setTotalPages(numPages)
      setCurrentPage(numPages) // start at last page like KiteProp

      const renders: PageRender[] = []
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise
        renders.push({ pageNum: i, canvas, width: viewport.width, height: viewport.height })
      }
      setPdfPages(renders)
    } catch (e) {
      setError('Error al leer el PDF. Asegurate de que sea un archivo válido.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF.')
      return
    }
    setPdfFile(file)
    setBoxes([])
    await renderPdf(file)
  }

  const addSigner = () => {
    setAddError('')
    if (!newName.trim()) { setAddError('El nombre es obligatorio.'); return }
    if (!newEmail.trim() || !newEmail.includes('@')) { setAddError('Email inválido.'); return }
    if (signers.length >= 18) { setAddError('Máximo 18 firmantes.'); return }
    const signer: Signer = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
    }
    setSigners(prev => [...prev, signer])
    setSelectedSignerId(signer.id)
    setNewName(''); setNewEmail(''); setNewPhone('')
  }

  const removeSigner = (id: string) => {
    setSigners(prev => prev.filter(s => s.id !== id))
    setBoxes(prev => prev.filter(b => b.signerId !== id))
    if (selectedSignerId === id) setSelectedSignerId(null)
  }

  const getSignerColor = (signerId: string) => {
    const idx = signers.findIndex(s => s.id === signerId)
    return COLORS[idx % COLORS.length]
  }

  // Handle click on PDF canvas to place signature
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedSignerId) return
    const signer = signers.find(s => s.id === selectedSignerId)
    if (!signer) return

    // Check if signer already has a box on this page (or any page if signOnAllPages)
    const existing = boxes.find(b => b.signerId === selectedSignerId)
    if (existing) return // already has 1 signature

    const container = canvasContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const pageRender = pdfPages[currentPage - 1]
    if (!pageRender) return

    // canvas is rendered at container width, scaled
    const scale = container.clientWidth / pageRender.width
    const scaledH = pageRender.height * scale

    const relX = Math.max(0, Math.min(0.85, clickX / container.clientWidth))
    const relY = Math.max(0, Math.min(0.90, clickY / scaledH))
    const boxW = 0.22
    const boxH = 0.055

    const box: SignatureBox = {
      id: crypto.randomUUID(),
      signerId: selectedSignerId,
      signerName: signer.name,
      page: currentPage,
      x: relX,
      y: relY,
      w: boxW,
      h: boxH,
    }
    setBoxes(prev => [...prev, box])
  }, [selectedSignerId, signers, boxes, currentPage, pdfPages])

  // Drag logic
  const handleBoxMouseDown = (e: React.MouseEvent, boxId: string) => {
    e.stopPropagation()
    const box = boxes.find(b => b.id === boxId)
    if (!box) return
    setDragging({ boxId, startX: e.clientX, startY: e.clientY, origX: box.x, origY: box.y })
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const container = canvasContainerRef.current
      if (!container) return
      const pageRender = pdfPages[currentPage - 1]
      if (!pageRender) return
      const scale = container.clientWidth / pageRender.width
      const scaledH = pageRender.height * scale

      const dx = (e.clientX - dragging.startX) / container.clientWidth
      const dy = (e.clientY - dragging.startY) / scaledH

      setBoxes(prev => prev.map(b => b.id === dragging.boxId
        ? { ...b, x: Math.max(0, Math.min(0.78, dragging.origX + dx)), y: Math.max(0, Math.min(0.90, dragging.origY + dy)) }
        : b
      ))
    }
    const onUp = () => setDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging, pdfPages, currentPage])

  const boxesOnCurrentPage = boxes.filter(b => b.page === currentPage)

  const DOCUSEAL_URL = 'http://144.22.45.201:3001'

  const handleSubmit = () => {
    setError('')
    if (!title.trim()) { setError('Escribí un título para el documento.'); return }
    if (!pdfFile) { setError('Seleccioná un archivo PDF.'); return }
    if (signers.length === 0) { setError('Agregá al menos un firmante.'); return }

    // Open DocuSeal native UI — free tier, full signing workflow
    window.open(`${DOCUSEAL_URL}/templates/new`, '_blank')
    setSuccess('Se abrió DocuSeal para completar el envío. Subí el PDF allí y configurá los firmantes.')
    setTimeout(() => setSuccess(''), 6000)
  }

  const pageRender = pdfPages[currentPage - 1]
  const signerBoxCount = (signerId: string) => boxes.filter(b => b.signerId === signerId).length

  return (
    <div className="h-full flex overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-64 flex-shrink-0 border-r border-[var(--border-subtle)] flex flex-col overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Título del documento</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Contrato de alquiler"
              className="mt-1 w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* PDF Upload */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Archivo PDF</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] border border-dashed border-[var(--border-subtle)] rounded-lg cursor-pointer hover:border-violet-500 transition-colors"
            >
              <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-xs text-[var(--text-muted)] truncate">
                {pdfFile ? pdfFile.name : 'Seleccionar archivo'}
              </span>
            </div>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Sign on all pages toggle */}
          {pdfFile && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={signOnAllPages} onChange={e => setSignOnAllPages(e.target.checked)}
                className="rounded accent-violet-500" />
              <span className="text-xs text-[var(--text-secondary)]">Firma en todas las hojas</span>
            </label>
          )}

          {/* Divider */}
          {pdfFile && <div className="border-t border-[var(--border-subtle)]" />}

          {/* Add signer form */}
          {pdfFile && (
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Agregar firmante</label>
              <div className="mt-2 space-y-2">
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre completo"
                  className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-violet-500" />
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email *" type="email" inputMode="email"
                  className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-violet-500" />
                <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Teléfono (opcional)"
                  className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-violet-500" />
                {addError && <p className="text-xs text-red-400">{addError}</p>}
                <button onClick={addSigner}
                  className="w-full py-1.5 text-xs font-semibold bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg border border-violet-500/30 transition-colors">
                  + Agregar firmante
                </button>
              </div>
            </div>
          )}

          {/* Signers list */}
          {signers.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Firmantes</label>
              {signers.map(signer => {
                const color = getSignerColor(signer.id)
                const boxCount = signerBoxCount(signer.id)
                const isSelected = selectedSignerId === signer.id
                return (
                  <div key={signer.id}
                    onClick={() => setSelectedSignerId(isSelected ? null : signer.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected ? 'border-violet-500 bg-violet-500/10' : 'border-[var(--border-subtle)] hover:border-violet-500/40'
                    }`}>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{signer.name}</p>
                      <p className="text-xs md:text-[10px] text-[var(--text-muted)]">{boxCount}/1 firma</p>
                    </div>
                    {boxCount === 1
                      ? <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      : <div className="w-4 h-4 rounded-full border-2 border-[var(--border-subtle)]" />
                    }
                    <button onClick={e => { e.stopPropagation(); removeSigner(signer.id) }}
                      className="w-4 h-4 text-[var(--text-muted)] hover:text-red-400 transition-colors flex-shrink-0">✕</button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Instructions */}
          {pdfFile && signers.length > 0 && (
            <div className="bg-[var(--bg-secondary)] rounded-lg p-3 space-y-1.5 text-xs md:text-[11px] text-[var(--text-muted)]">
              <p className="flex items-start gap-1.5"><span>👆</span> Seleccioná un firmante</p>
              <p className="flex items-start gap-1.5"><span>✍️</span> Hacé clic en el PDF para agregar la firma</p>
              <p className="flex items-start gap-1.5"><span>↔️</span> Arrastrá para reposicionarla</p>
              <p className="flex items-start gap-1.5"><span>ℹ️</span> Cada firmante puede tener solo 1 firma</p>
              <p className="flex items-start gap-1.5"><span>👥</span> Máximo 18 firmantes en total</p>
            </div>
          )}
        </div>

        {/* Stats footer */}
        {boxes.length > 0 && (
          <div className="mt-auto border-t border-[var(--border-subtle)] px-4 py-3 grid grid-cols-3 gap-2 text-center">
            {[
              ['FIRMANTES', signers.length],
              ['FIRMAS', boxes.length],
              ['PÁGINAS', new Set(boxes.map(b => b.page)).size],
            ].map(([label, val]) => (
              <div key={label as string}>
                <p className="text-base font-bold text-violet-400">{val}</p>
                <p className="text-xs md:text-[9px] text-[var(--text-muted)] font-semibold">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT PANEL: PDF Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-secondary)]">
        {!pdfFile ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--text-muted)]">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-[var(--text-secondary)]">Subí un PDF para comenzar</p>
              <p className="text-sm mt-1">Vas a poder posicionar las firmas sobre el documento</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-[var(--text-muted)]">Cargando PDF...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Page nav */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] flex-shrink-0">
              <span className="text-sm text-[var(--text-muted)]">Página {currentPage} de {totalPages}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] disabled:opacity-40 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm font-mono w-16 text-center text-[var(--text-primary)]">
                  {currentPage} / {totalPages}
                </span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] disabled:opacity-40 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              {selectedSignerId && (
                <div className="flex items-center gap-1.5 text-xs text-violet-300">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: getSignerColor(selectedSignerId) }} />
                  <span>Clic en el PDF para colocar firma</span>
                </div>
              )}
            </div>

            {/* PDF Canvas */}
            <div className="flex-1 overflow-auto flex justify-center p-4">
              <div className="relative inline-block shadow-2xl" style={{ cursor: selectedSignerId ? 'crosshair' : 'default' }}>
                {pageRender && (
                  <div
                    ref={canvasContainerRef}
                    className="relative"
                    style={{ width: '100%', maxWidth: '700px' }}
                    onClick={handleCanvasClick}
                  >
                    <img
                      src={pageRender.canvas.toDataURL()}
                      alt={`Página ${currentPage}`}
                      className="w-full h-auto block rounded-sm"
                    />
                    {/* Signature boxes overlay */}
                    {boxesOnCurrentPage.map(box => {
                      const color = getSignerColor(box.signerId)
                      return (
                        <div
                          key={box.id}
                          onMouseDown={e => handleBoxMouseDown(e, box.id)}
                          style={{
                            position: 'absolute',
                            left: `${box.x * 100}%`,
                            top: `${box.y * 100}%`,
                            width: `${box.w * 100}%`,
                            height: `${box.h * 100}%`,
                            borderColor: color,
                            cursor: 'grab',
                            userSelect: 'none',
                          }}
                          className="border-2 rounded-sm bg-white/10 backdrop-blur-[1px] flex flex-col items-center justify-center gap-0.5 hover:bg-white/20 transition-colors"
                        >
                          <span className="text-xs md:text-[9px] font-bold leading-tight truncate px-1 w-full text-center" style={{ color }}>
                            {box.signerName}
                          </span>
                          <span className="text-[8px] text-gray-400">Firma aquí</span>
                          <span className="text-[7px] text-gray-500">Página {box.page}</span>
                          <button
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); setBoxes(prev => prev.filter(b => b.id !== box.id)) }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs md:text-[9px] flex items-center justify-center hover:bg-red-600 transition-colors"
                          >✕</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Bottom bar */}
        <div className="border-t border-[var(--border-subtle)] px-4 py-3 bg-[var(--bg-primary)] flex items-center justify-between gap-3 flex-shrink-0">
          {error && <p className="text-sm text-red-400 flex-1">{error}</p>}
          {success && <p className="text-sm text-emerald-400 flex-1">{success}</p>}
          {!error && !success && <div className="flex-1" />}
          <button
            onClick={handleSubmit}
            disabled={sending || !pdfFile || signers.length === 0}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2"
          >
            {sending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
