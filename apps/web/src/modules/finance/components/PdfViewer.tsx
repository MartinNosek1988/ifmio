import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export type ZoomMode = number | 'auto' | 'page' | 'width'

interface PdfViewerProps {
  pdfBase64: string
  onTextSelected: (text: string) => void
  highlightedTexts?: string[]
  activeFieldLabel?: string | null
  zoomMode?: ZoomMode
  /** @deprecated Use zoomMode instead */
  scale?: number
  page?: number
  onPageChange?: (page: number, total: number) => void
}

export default function PdfViewer({ pdfBase64, onTextSelected, highlightedTexts, activeFieldLabel, zoomMode, scale: scaleProp, page: pageProp, onPageChange }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef<HTMLDivElement>(null)
  const [pageNum, setPageNum] = useState(pageProp ?? 1)
  const [numPages, setNumPages] = useState(0)
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 })

  const resizeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Track container size via ResizeObserver (debounced)
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      clearTimeout(resizeTimer.current)
      resizeTimer.current = setTimeout(() => {
        const { width, height } = entries[0].contentRect
        if (width > 0 && height > 0) setContainerSize({ w: width, h: height })
      }, 150)
    })
    ro.observe(el)
    return () => { clearTimeout(resizeTimer.current); ro.disconnect() }
  }, [])

  // Load PDF document
  useEffect(() => {
    const data = atob(pdfBase64)
    const bytes = new Uint8Array(data.length)
    for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i)

    const loadTask = pdfjsLib.getDocument({ data: bytes })
    loadTask.promise.then(doc => {
      pdfDocRef.current = doc
      setNumPages(doc.numPages)
      setPageNum(1)
    })

    return () => { loadTask.destroy() }
  }, [pdfBase64])

  // Sync controlled page prop
  useEffect(() => {
    if (pageProp && pageProp !== pageNum) setPageNum(pageProp)
  }, [pageProp])

  // Report page changes
  useEffect(() => {
    if (onPageChange && numPages > 0) onPageChange(pageNum, numPages)
  }, [pageNum, numPages, onPageChange])

  // Render current page
  const renderPage = useCallback(async () => {
    const doc = pdfDocRef.current
    const canvas = canvasRef.current
    const textLayerDiv = textLayerRef.current
    const sizeDiv = sizeRef.current
    if (!doc || !canvas || !textLayerDiv) return

    const page = await doc.getPage(pageNum)

    // Calculate scale based on zoomMode
    const mode = zoomMode ?? scaleProp ?? 'width'
    let scale: number
    if (mode === 'auto' || mode === 'width') {
      const baseVp = page.getViewport({ scale: 1 })
      scale = containerSize.w / baseVp.width
    } else if (mode === 'page') {
      const baseVp = page.getViewport({ scale: 1 })
      scale = Math.min(containerSize.w / baseVp.width, containerSize.h / baseVp.height)
    } else {
      scale = mode as number
    }

    const viewport = page.getViewport({ scale })
    const w = viewport.width
    const h = viewport.height

    // Set size wrapper to hold space (prevents jumping)
    if (sizeDiv) {
      sizeDiv.style.width = w + 'px'
      sizeDiv.style.height = h + 'px'
    }

    // Render to offscreen canvas first (no flicker)
    const offscreen = document.createElement('canvas')
    offscreen.width = w
    offscreen.height = h
    const offCtx = offscreen.getContext('2d')!
    await (page.render as any)({ canvasContext: offCtx, viewport }).promise

    // Copy to visible canvas
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(offscreen, 0, 0)

    // Rebuild text layer
    textLayerDiv.innerHTML = ''
    textLayerDiv.style.width = w + 'px'
    textLayerDiv.style.height = h + 'px'

    const textContent = await page.getTextContent()
    for (const item of textContent.items) {
      if (!('str' in item) || !item.str) continue

      const span = document.createElement('span')
      span.textContent = item.str

      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
      const [a, b, , , e, f] = tx
      span.style.position = 'absolute'
      span.style.left = e + 'px'
      span.style.top = (h - f) + 'px'
      span.style.fontSize = Math.sqrt(a * a + b * b) + 'px'
      span.style.fontFamily = ('fontName' in item ? item.fontName : null) || 'sans-serif'
      span.style.whiteSpace = 'nowrap'
      span.style.cursor = 'text'
      span.style.color = 'transparent'
      span.style.backgroundColor = 'transparent'
      span.style.userSelect = 'text'
      span.style.pointerEvents = 'auto'

      if (highlightedTexts?.length && highlightedTexts.length > 0) {
        const lower = item.str.toLowerCase()
        if (highlightedTexts.some(n => n && lower.includes(n.toLowerCase()))) {
          span.style.backgroundColor = 'rgba(252, 211, 77, 0.6)'
        }
      }

      textLayerDiv.appendChild(span)
    }
  }, [pageNum, zoomMode, scaleProp, containerSize])

  useEffect(() => {
    if (pdfDocRef.current) renderPage()
  }, [renderPage, numPages])

  // Text selection handler
  useEffect(() => {
    const textLayerDiv = textLayerRef.current
    if (!textLayerDiv) return

    const handleMouseUp = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()
      if (text && text.length > 0) {
        onTextSelected(text)
        selection?.removeAllRanges()
      }
    }

    textLayerDiv.addEventListener('mouseup', handleMouseUp)
    return () => textLayerDiv.removeEventListener('mouseup', handleMouseUp)
  }, [onTextSelected])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {activeFieldLabel && (
        <div style={{
          padding: '6px 12px', background: 'rgba(29, 158, 117, 0.1)',
          borderRadius: 6, marginBottom: 4, fontSize: '.82rem', color: 'var(--primary, #1D9E75)',
          fontWeight: 500, textAlign: 'center', flexShrink: 0,
        }}>
          Vyberte text v PDF pro pole: <strong>{activeFieldLabel}</strong>
        </div>
      )}

      {/* Scrollable container */}
      <div
        ref={wrapperRef}
        style={{ overflow: 'auto', flex: 1, background: '#f0f0f0', padding: 8 }}
      >
        {/* Size holder — prevents jumping on re-render */}
        <div ref={sizeRef} style={{ position: 'relative', display: 'inline-block', minWidth: '100%' }}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
          <div
            ref={textLayerRef}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
