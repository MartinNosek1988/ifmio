import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ChevronLeft, ChevronRight } from 'lucide-react'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface PdfViewerProps {
  pdfBase64: string
  onTextSelected: (text: string) => void
  highlightedTexts?: string[]
  activeFieldLabel?: string | null
  scale?: number
}

const PDF_SCALE = 1.5
const PDF_SCALE_MOBILE = 0.8

function getScale() {
  return window.innerWidth <= 900 ? PDF_SCALE_MOBILE : PDF_SCALE
}

export default function PdfViewer({ pdfBase64, onTextSelected, highlightedTexts, activeFieldLabel, scale: scaleProp }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)

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

    return () => {
      loadTask.destroy()
    }
  }, [pdfBase64])

  // Render current page
  const renderPage = useCallback(async () => {
    const doc = pdfDocRef.current
    const canvas = canvasRef.current
    const textLayerDiv = textLayerRef.current
    if (!doc || !canvas || !textLayerDiv) return

    const page = await doc.getPage(pageNum)
    const scale = scaleProp ?? getScale()
    const viewport = page.getViewport({ scale })

    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.width = viewport.width + 'px'
    canvas.style.height = viewport.height + 'px'

    const ctx = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise

    // Clear old text layer
    textLayerDiv.innerHTML = ''
    textLayerDiv.style.width = viewport.width + 'px'
    textLayerDiv.style.height = viewport.height + 'px'

    // Build text layer
    const textContent = await page.getTextContent()
    for (const item of textContent.items) {
      if (!('str' in item) || !item.str) continue

      const span = document.createElement('span')
      span.textContent = item.str

      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
      const [a, b, , , e, f] = tx
      span.style.position = 'absolute'
      span.style.left = e + 'px'
      span.style.top = (viewport.height - f) + 'px'
      span.style.fontSize = Math.sqrt(a * a + b * b) + 'px'
      span.style.fontFamily = ('fontName' in item ? item.fontName : null) || 'sans-serif'
      span.style.whiteSpace = 'nowrap'
      span.style.cursor = 'pointer'
      span.style.color = 'transparent'
      span.style.userSelect = 'text'
      span.style.pointerEvents = 'auto'

      if (highlightedTexts?.some(t => t.includes(item.str))) {
        span.style.backgroundColor = 'rgba(29, 158, 117, 0.2)'
      }

      textLayerDiv.appendChild(span)
    }
  }, [pageNum, highlightedTexts, scaleProp])

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
          borderRadius: 6, marginBottom: 8, fontSize: '.82rem', color: 'var(--primary, #1D9E75)',
          fontWeight: 500, textAlign: 'center',
        }}>
          Vyberte text v PDF pro pole: <strong>{activeFieldLabel}</strong>
        </div>
      )}

      {/* Page navigation */}
      {numPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, marginBottom: 8, fontSize: '.82rem',
        }}>
          <button
            onClick={() => setPageNum(p => Math.max(1, p - 1))}
            disabled={pageNum <= 1}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text)' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span>Strana {pageNum} / {numPages}</span>
          <button
            onClick={() => setPageNum(p => Math.min(numPages, p + 1))}
            disabled={pageNum >= numPages}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text)' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* PDF canvas + text layer */}
      <div
        ref={containerRef}
        style={{
          position: 'relative', overflow: 'auto', flex: 1,
          border: '1px solid var(--border)', borderRadius: 6,
          background: '#f5f5f5',
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />
        <div
          ref={textLayerRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}
