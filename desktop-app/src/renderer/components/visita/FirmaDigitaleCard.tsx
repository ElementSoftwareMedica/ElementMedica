import { useState, useRef, useEffect, useCallback } from 'react'
import { PenTool, Eraser, Save, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react'

// ============================================================
// Types
// ============================================================

type FirmaTarget = 'medico' | 'paziente'

interface Props {
  visitId: string
  firmaMedico: string | null
  firmaPaziente: string | null
  isReadOnly: boolean
  onSaveFirma: (target: FirmaTarget, dataUrl: string) => void
}

// ============================================================
// Component
// ============================================================

export function FirmaDigitaleCard({ visitId, firmaMedico, firmaPaziente, isReadOnly, onSaveFirma }: Props): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTarget, setActiveTarget] = useState<FirmaTarget | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const hasMedico = !!firmaMedico
  const hasPaziente = !!firmaPaziente
  const bothSigned = hasMedico && hasPaziente

  // Initialize canvas when target changes
  useEffect(() => {
    if (!activeTarget) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set proper resolution
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // Clear and set style
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Load existing signature if any
    const existingData = activeTarget === 'medico' ? firmaMedico : firmaPaziente
    if (existingData) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
      img.src = existingData
    }

    setHasStrokes(!!existingData)
  }, [activeTarget, firmaMedico, firmaPaziente])

  // Drawing handlers
  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isReadOnly || !activeTarget) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
    setHasStrokes(true)
  }, [isReadOnly, activeTarget, getPos])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [isDrawing, getPos])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    setHasStrokes(false)
  }, [])

  // Save signature
  const handleSave = useCallback(() => {
    if (!activeTarget || !canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSaveFirma(activeTarget, dataUrl)
    setActiveTarget(null)
  }, [activeTarget, onSaveFirma])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-indigo-600" />
          Firma Digitale
        </h3>
        <div className="flex items-center gap-2">
          {bothSigned && (
            <span className="text-[10px] text-green-600 flex items-center gap-0.5">
              <CheckCircle className="w-3 h-3" /> Firmata
            </span>
          )}
          {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Signature status */}
          <div className="grid grid-cols-2 gap-2">
            {/* Medico */}
            <div className={`rounded-xl border p-2.5 text-center ${
              hasMedico ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <p className="text-[10px] font-medium text-gray-600 mb-1">Medico</p>
              {hasMedico ? (
                <div className="space-y-1">
                  <img src={firmaMedico!} alt="Firma medico" className="w-full h-12 object-contain rounded" />
                  <span className="text-[9px] text-green-600">✓ Firmato</span>
                </div>
              ) : (
                <div className="h-12 flex items-center justify-center">
                  <span className="text-[10px] text-gray-400">Non firmato</span>
                </div>
              )}
              {!isReadOnly && (
                <button
                  onClick={() => setActiveTarget('medico')}
                  className="mt-1.5 w-full text-[10px] font-medium text-teal-600 hover:text-teal-700"
                >
                  {hasMedico ? 'Rifirma' : 'Firma'}
                </button>
              )}
            </div>

            {/* Paziente */}
            <div className={`rounded-xl border p-2.5 text-center ${
              hasPaziente ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <p className="text-[10px] font-medium text-gray-600 mb-1">Paziente</p>
              {hasPaziente ? (
                <div className="space-y-1">
                  <img src={firmaPaziente!} alt="Firma paziente" className="w-full h-12 object-contain rounded" />
                  <span className="text-[9px] text-green-600">✓ Firmato</span>
                </div>
              ) : (
                <div className="h-12 flex items-center justify-center">
                  <span className="text-[10px] text-gray-400">Non firmato</span>
                </div>
              )}
              {!isReadOnly && (
                <button
                  onClick={() => setActiveTarget('paziente')}
                  className="mt-1.5 w-full text-[10px] font-medium text-teal-600 hover:text-teal-700"
                >
                  {hasPaziente ? 'Rifirma' : 'Firma'}
                </button>
              )}
            </div>
          </div>

          {/* Drawing pad */}
          {activeTarget && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">
                  Firma {activeTarget === 'medico' ? 'del Medico' : 'del Paziente'}
                </p>
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Eraser className="w-3 h-3" />
                  Cancella
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-32 cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>

              <p className="text-[9px] text-gray-400 text-center">
                Disegna la firma con il mouse o il touchscreen
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setActiveTarget(null)}
                  className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasStrokes}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3 h-3" />
                  Salva Firma
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
