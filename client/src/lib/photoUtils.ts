// Utility functions for handling photo display from database BLOB storage

export function getPhotoUrl(catchData: any, photoIndex: number = 0): string | null {
  // Database BLOB storage format
  if (catchData.photoData && Array.isArray(catchData.photoData) && catchData.photoData.length > photoIndex) {
    const photo = catchData.photoData[photoIndex];
    return `data:${photo.mimeType};base64,${photo.data}`;
  }
  
  return null;
}

export function hasPhotos(catchData: any): boolean {
  return (catchData.photoData && Array.isArray(catchData.photoData) && catchData.photoData.length > 0);
}

export function getPhotoCount(catchData: any): number {
  if (catchData.photoData && Array.isArray(catchData.photoData)) {
    return catchData.photoData.length;
  }
  return 0;
}