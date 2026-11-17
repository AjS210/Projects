export async function loadImage(url) {
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    throw new Error('This image could not be read. Try a JPG, PNG, or WebP photo.');
  }
  return img;
}
function imageCanvas(img, limit) {
  const scale = Math.min(1, limit / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}
export async function openPhoto(file) {
  if (!file || !file.type.startsWith('image/'))
    throw new Error('Choose an image file, such as a JPG, PNG, or WebP.');
  if (file.size > 25 * 1024 * 1024)
    throw new Error('This photo is too large. Choose one smaller than 25 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (Math.min(img.naturalWidth, img.naturalHeight) < 30)
      throw new Error('This image is too small. Try a clearer photo of your board.');
    const { canvas } = imageCanvas(img, 1500);
    return {
      url: canvas.toDataURL('image/jpeg', 0.93),
      width: canvas.width,
      height: canvas.height,
      name: file.name,
      sample: false,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function scanPhoto(photo, corners, signal) {
  const img = await loadImage(photo.url);
  signal.throwIfAborted();
  const { canvas, ctx } = imageCanvas(img, 960);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./scanner.worker.js', import.meta.url), { type: 'module' });
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      worker.terminate();
    };
    const abort = () => {
      cleanup();
      reject(new DOMException('Scan cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Reading took too long. Adjust the frame or enter the grid by hand.'));
    }, 20000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }) => {
      cleanup();
      if (data.error) reject(new Error(data.error));
      else resolve(data.result);
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('The photo could not be processed. Try again or edit the grid by hand.'));
    };
    worker.postMessage(
      { image: { width: pixels.width, height: pixels.height, data: pixels.data }, corners },
      [pixels.data.buffer],
    );
  });
}
