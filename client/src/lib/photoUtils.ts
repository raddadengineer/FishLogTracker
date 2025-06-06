// Utility functions for handling photo display from both legacy and new storage formats

export function getPhotoUrl(catchData: any, photoIndex: number = 0): string | null {
  // New database storage format
  if (catchData.photoData && catchData.photoData.length > photoIndex) {
    const photo = catchData.photoData[photoIndex];
    return `/api/photos/${catchData.id}/${photo.id}`;
  }
  
  // Legacy file system format (backward compatibility)
  if (catchData.photos && catchData.photos.length > photoIndex) {
    const photoPath = catchData.photos[photoIndex];
    // If it's already a data URL, return it
    if (photoPath.startsWith('data:')) {
      return photoPath;
    }
    // If it's a file path, return it as is
    return photoPath;
  }
  
  return null;
}

export function hasPhotos(catchData: any): boolean {
  return (
    (catchData.photoData && catchData.photoData.length > 0) ||
    (catchData.photos && catchData.photos.length > 0)
  );
}

export function getPhotoCount(catchData: any): number {
  if (catchData.photoData) {
    return catchData.photoData.length;
  }
  if (catchData.photos) {
    return catchData.photos.length;
  }
  return 0;
}