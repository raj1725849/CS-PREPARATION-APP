"use client"

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(",")[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export async function prepareImagesForApi(files: File[]): Promise<{
  images: string[]
  mimeTypes: string[]
}> {
  const results = await Promise.all(
    files.map(async (file) => ({
      base64: await fileToBase64(file),
      mimeType: file.type || "image/jpeg"
    }))
  )
  return {
    images: results.map(r => r.base64),
    mimeTypes: results.map(r => r.mimeType)
  }
}
