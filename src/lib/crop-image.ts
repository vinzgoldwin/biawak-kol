export type PixelCropArea = {
  x: number
  y: number
  width: number
  height: number
}

type OutputOptions = {
  fileName?: string
  maxWidth?: number
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png'
  fallbackMimeType?: 'image/jpeg' | 'image/png'
  quality?: number
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Gambar tidak bisa dibaca.')))
    image.src = src
  })
}

export async function createCroppedImageBlob(imageSrc: string, crop: PixelCropArea, options: OutputOptions = {}) {
  const image = await loadImage(imageSrc)
  const targetWidth = Math.min(options.maxWidth ?? 1400, crop.width)
  const targetHeight = Math.round(targetWidth * (crop.height / crop.width))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) throw new Error('Browser tidak bisa memproses crop gambar.')

  canvas.width = targetWidth
  canvas.height = targetHeight
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, targetWidth, targetHeight)

  const mimeType = options.mimeType ?? 'image/webp'
  const fallbackMimeType = options.fallbackMimeType ?? 'image/jpeg'
  const quality = options.quality ?? 0.86

  return new Promise<File>((resolve, reject) => {
    const createFile = (blob: Blob) => {
      const type = blob.type || mimeType
      resolve(new File([blob], options.fileName ?? 'mvp-poster.webp', { type, lastModified: Date.now() }))
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        canvas.toBlob((fallbackBlob) => {
          if (!fallbackBlob) {
            reject(new Error('Crop foto gagal.'))
            return
          }

          createFile(fallbackBlob)
        }, fallbackMimeType, quality)
        return
      }

      createFile(blob)
    }, mimeType, quality)
  })
}
