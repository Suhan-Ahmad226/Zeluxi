/**
 * Client-side high performance image compressor for local file uploads
 * Ensures banner and product photos look crisp while fitting safely within localStorage limits
 */

export interface CompressedImageResult {
  dataUrl: string;
  name: string;
  width: number;
  height: number;
  size: number;
}

export const compressImageFile = (
  file: File,
  maxWidth = 1600,
  maxHeight = 1200,
  quality = 0.84
): Promise<CompressedImageResult> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale dimensions down if larger than target
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback if 2d context unavailable
            resolve({
              dataUrl: e.target?.result as string,
              name: file.name,
              width: img.width,
              height: img.height,
              size: file.size,
            });
            return;
          }

          // Smooth image downsampling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Prefer webp or jpeg
          const outputType = file.type === 'image/png' && file.size < 800000 ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputType, quality);

          // Estimate data url size in bytes
          const stringLength = dataUrl.length - 'data:image/jpeg;base64,'.length;
          const sizeInBytes = Math.round(stringLength * (3 / 4));

          resolve({
            dataUrl,
            name: file.name,
            width,
            height,
            size: sizeInBytes,
          });
        } catch (err) {
          // If canvas security or memory error occurs, fallback to raw reader result
          resolve({
            dataUrl: e.target?.result as string,
            name: file.name,
            width: img.width || 800,
            height: img.height || 600,
            size: file.size,
          });
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image element'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read local file'));
    };

    reader.readAsDataURL(file);
  });
};
