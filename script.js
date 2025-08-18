// Elements
const fileInput = document.getElementById('fileInput');
const modelSelect = document.getElementById('modelSelect');
const scaleSelect = document.getElementById('scaleSelect');
const btn = document.getElementById('upscaleBtn');
const statusEl = document.getElementById('status');
const imgEl = document.getElementById('preview');
const downloadLink = document.getElementById('downloadLink');
const note = document.getElementById('note');

let originalBitmap = null;

// read file and show preview
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  imgEl.src = url;
  downloadLink.removeAttribute('href');
  note.textContent = '';
  statusEl.textContent = 'Image loaded. Choose options and Upscale.';
  // also keep an ImageBitmap for processing (fast)
  originalBitmap = await createImageBitmap(file);
});

// load available model helper (handles different global names)
async function loadModel(kind) {
  // Prefer globals if present (from browser builds)
  if (kind === 'realesrgan') {
    if (typeof realesrgan !== 'undefined' && realesrgan.load) return realesrgan.load();
    if (typeof RealESRGAN !== 'undefined' && RealESRGAN.load) return RealESRGAN.load();
  } else {
    if (typeof waifu2x !== 'undefined' && waifu2x.load) return waifu2x.load();
    if (typeof Waifu2x !== 'undefined' && Waifu2x.load) return Waifu2x.load();
  }
  // If none found, throw so we can fallback gracefully
  throw new Error('AI model library not available (CDN blocked or unsupported).');
}

// upscale using canvas interpolation (fallback)
async function resizeFallback(bitmap, scale) {
  const off = new OffscreenCanvas(bitmap.width * scale, bitmap.height * scale);
  const ctx = off.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, off.width, off.height);
  const blob = await off.convertToBlob({ type: 'image/png', quality: 1 });
  return URL.createObjectURL(blob);
}

// do upscaling
btn.addEventListener('click', async () => {
  if (!originalBitmap) return alert('Please upload an image first.');

  const scale = parseInt(scaleSelect.value, 10);
  const modelName = modelSelect.value;

  statusEl.textContent = 'Loading AI model…';
  btn.disabled = true;

  let outUrl = null;
  let usedAI = false;

  try {
    // Try AI path
    const model = await loadModel(modelName);
    statusEl.textContent = 'Processing image with AI…';

    // For different libs, method names may differ; handle common ones.
    // Create a canvas from bitmap first:
    const canvas = document.createElement('canvas');
    canvas.width = originalBitmap.width * scale;
    canvas.height = originalBitmap.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(originalBitmap, 0, 0, canvas.width, canvas.height);

    let resultDataUrl = null;

    if (modelName === 'realesrgan' && model.enhance) {
      // expected: returns dataURL or blob/url
      const out = await model.enhance(canvas);
      resultDataUrl = typeof out === 'string' ? out : canvas.toDataURL('image/png');
    } else if (model.upscale) {
      const out = await model.upscale(canvas);
      resultDataUrl = typeof out === 'string' ? out : canvas.toDataURL('image/png');
    } else {
      // Unknown API shape → fall back to high-quality resize we already drew
      resultDataUrl = canvas.toDataURL('image/png');
    }

    outUrl = resultDataUrl;
    usedAI = true;
  } catch (err) {
    // AI model unavailable → fallback
    console.warn('AI model unavailable, using high-quality resize:', err.message);
    statusEl.textContent = 'AI model unavailable — using high-quality resize.';
    outUrl = await resizeFallback(originalBitmap, scale);
    usedAI = false;
  }

  // show + enable download
  imgEl.src = outUrl;
  downloadLink.href = outUrl;
  note.textContent = usedAI ? 'AI upscaling completed.' : 'Note: Fallback resize used (AI CDN not available on this device).';
  statusEl.textContent = 'Done.';
  btn.disabled = false;
});
