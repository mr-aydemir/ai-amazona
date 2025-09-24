/**
 * Utility functions for handling image data conversion between JSON strings and arrays
 * for SQLite compatibility
 */

export function parseImages(images: string | string[]): string[] {
  if (Array.isArray(images)) {
    return images
  }
  
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      // If it's not valid JSON, treat as single image URL
      return images ? [images] : []
    }
  }
  
  return []
}

export function stringifyImages(images: string[]): string {
  return JSON.stringify(images)
}