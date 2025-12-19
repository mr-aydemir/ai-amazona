export function parseProductImages(images: any): string {
  let imageUrl = '/images/placeholder.svg'

  if (typeof images === 'string') {
    // Check if string is empty or just whitespace
    if (!images.trim()) {
      imageUrl = '/images/placeholder.svg'
    } else {
      try {
        // Only try to parse if it looks like valid JSON
        if (images.startsWith('[') && images.endsWith(']')) {
          const parsedImages = JSON.parse(images)
          if (Array.isArray(parsedImages) && parsedImages.length > 0) {
            const firstImage = parsedImages[0]
            if (typeof firstImage === 'string' && firstImage.trim() &&
              (firstImage.startsWith('/') || firstImage.startsWith('http'))) {
              imageUrl = firstImage
            }
          }
        } else if (images.startsWith('"') && images.endsWith('"')) {
          // Handle single quoted string
          const unquotedImage = images.slice(1, -1)
          if (unquotedImage.trim() &&
            (unquotedImage.startsWith('/') || unquotedImage.startsWith('http'))) {
            imageUrl = unquotedImage
          }
        } else if (images.startsWith('/') || images.startsWith('http')) {
          // Treat as single image URL
          imageUrl = images
        }
      } catch (e) {
        console.error('Failed to parse images JSON:', images, e)
        // If parsing fails, check if it looks like a URL
        if (images.includes('http') || (images.startsWith('/') && !images.startsWith('[') && !images.startsWith('{'))) {
          imageUrl = images
        }
      }
    }
  } else if (Array.isArray(images) && images.length > 0) {
    // Handle case where images is already an array
    const firstImage = images[0]
    if (typeof firstImage === 'string' && firstImage.trim() &&
      (firstImage.startsWith('/') || firstImage.startsWith('http'))) {
      imageUrl = firstImage
    }
  }

  return imageUrl
}
