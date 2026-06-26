import { useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { Button } from '@/components/ui/button'
import { createCroppedImageBlob } from '@/lib/crop-image'

type PlayerPhotoCropperProps = {
  file: File
  onCancel: () => void
  onCropped: (file: File) => void
}

export function PlayerPhotoCropper({ file, onCancel, onCropped }: PlayerPhotoCropperProps) {
  const [imageUrl] = useState(() => URL.createObjectURL(file))
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const finishCrop = async () => {
    if (!croppedArea || !imageUrl) return

    setIsProcessing(true)
    try {
      const croppedFile = await createCroppedImageBlob(imageUrl, croppedArea, {
        fileName: file.name.replace(/\.[^.]+$/, '') + '-avatar.webp',
        maxWidth: 512,
        mimeType: 'image/webp',
        quality: 0.86,
      })
      URL.revokeObjectURL(imageUrl)
      onCropped(croppedFile)
    } finally {
      setIsProcessing(false)
    }
  }

  const cancelCrop = () => {
    URL.revokeObjectURL(imageUrl)
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-zinc-950/75 backdrop-blur-sm md:place-items-center" role="dialog" aria-modal="true">
      <div className="grid w-full max-w-[430px] gap-4 rounded-t-[2rem] border border-white/10 bg-zinc-950 p-5 text-white shadow-2xl md:rounded-[2rem]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Crop foto profil</p>
          <p className="mt-1 text-sm text-white/60">Geser dan zoom foto ke dalam lingkaran.</p>
        </div>

        <div className="relative h-[24rem] overflow-hidden rounded-[1.5rem] bg-black">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => setCroppedArea(areaPixels)}
            />
          )}
        </div>

        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/70">
          Zoom
          <input
            className="accent-emerald-400"
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className="h-12 border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={cancelCrop}>
            Batal
          </Button>
          <Button type="button" className="h-12" onClick={finishCrop} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Gunakan'}
          </Button>
        </div>
      </div>
    </div>
  )
}
