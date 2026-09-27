// Распознавание текста со скриншота прямо в браузере (tesseract.js).
// Картинка никуда не отправляется: с CDN скачивается только сама программа распознавания и словарь русского языка.

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024

<<<<<<< HEAD
/** Увеличивает мелкий скриншот и поднимает контраст, чтобы категории и проценты читались лучше. */
async function prepareImage(file: File): Promise<Blob | File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = bitmap.width < 1400 ? 2 : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = image.data
    for (let index = 0; index < pixels.length; index += 4) {
      const gray = pixels[index] * 0.3 + pixels[index + 1] * 0.59 + pixels[index + 2] * 0.11
      const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.45 + 128))
      pixels[index] = contrast
      pixels[index + 1] = contrast
      pixels[index + 2] = contrast
    }
    context.putImageData(image, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    return blob ?? file
  } catch {
    return file
  }
}

export async function recognizeImage(file: File, onProgress?: (percent: number) => void): Promise<string> {
  const { createWorker, PSM } = await import('tesseract.js')
=======
export async function recognizeImage(file: File, onProgress?: (percent: number) => void): Promise<string> {
  // Библиотека большая, поэтому загружаем её только когда пользователь выбрал скриншот.
  const { createWorker } = await import('tesseract.js')
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
  const worker = await createWorker('rus+eng', 1, {
    logger: (message: { status: string; progress: number }) => {
      if (message.status === 'recognizing text') onProgress?.(Math.round(message.progress * 100))
    },
  })

  try {
<<<<<<< HEAD
    const image = await prepareImage(file)
    const lines = new Set<string>()
    for (const mode of [PSM.SINGLE_BLOCK, PSM.SPARSE_TEXT]) {
      await worker.setParameters({ tessedit_pageseg_mode: mode })
      const { data } = await worker.recognize(image)
      for (const line of data.text.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (trimmed !== '') lines.add(trimmed)
      }
    }
    return [...lines].join('\n')
=======
    const { data } = await worker.recognize(file)
    return data.text
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
  } finally {
    await worker.terminate()
  }
}
