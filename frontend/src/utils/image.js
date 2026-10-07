// Validates an image file, center-crops it to a square and shrinks it to a small JPEG data URL.
export function fileToAvatar(file, size = 400) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file (JPG, PNG or WebP).'))
    if (file.size > 5 * 1024 * 1024) return reject(new Error('The image must be 5 MB or smaller.'))

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That image could not be read. Try a different file.'))
    }
    img.src = url
  })
}


