// Распознавание текста со скриншота прямо в браузере (tesseract.js).
// Картинка никуда не отправляется: с CDN скачивается только сама программа распознавания и словарь русского языка.

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024

export async function recognizeImage(file: File, onProgress?: (percent: number) => void): Promise<string> {
  // Библиотека большая, поэтому загружаем её только когда пользователь выбрал скриншот.
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('rus+eng', 1, {
    logger: (message: { status: string; progress: number }) => {
      if (message.status === 'recognizing text') onProgress?.(Math.round(message.progress * 100))
    },
  })

  try {
    const { data } = await worker.recognize(file)
    return data.text
  } finally {
    await worker.terminate()
  }
}
