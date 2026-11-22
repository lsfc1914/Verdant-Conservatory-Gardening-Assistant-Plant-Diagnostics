export interface ProcessedImagePayload {
  base64: string;
  mimeType: string;
  thumbnailDataUrl: string;
}

function resizeImageElement(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number
): { dataUrl: string; base64: string } {
  const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize image processor.');
  }
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.split(',')[1] ?? '';
  return { dataUrl, base64 };
}

function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for analysis.'));
    img.src = src;
  });
}

export async function processImageFile(file: File): Promise<ProcessedImagePayload> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPEG, PNG, or WebP).');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageFromSrc(objectUrl);
    const analysis = resizeImageElement(img, 1400, 0.88);
    const thumb = resizeImageElement(img, 480, 0.78);
    return {
      base64: analysis.base64,
      mimeType: 'image/jpeg',
      thumbnailDataUrl: thumb.dataUrl,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function fetchSampleImagePayload(
  imageUrl: string
): Promise<ProcessedImagePayload> {
  const img = await loadImageFromSrc(imageUrl);
  const analysis = resizeImageElement(img, 1200, 0.88);
  const thumb = resizeImageElement(img, 480, 0.78);
  return {
    base64: analysis.base64,
    mimeType: 'image/jpeg',
    thumbnailDataUrl: thumb.dataUrl,
  };
}

export async function processProgressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPEG, PNG, or WebP).');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageFromSrc(objectUrl);
    const compressed = resizeImageElement(img, 640, 0.78);
    return compressed.dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
