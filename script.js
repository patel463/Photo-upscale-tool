// script.js - Upscaler.js आधारित browser upscaler
// आवश्यक: index.html मेंUpscaler library CDN लोड होनी चाहिए:
// <script src="https://cdn.jsdelivr.net/npm/upscaler@1.0.1/dist/browser/umd/upscaler.min.js"></script>

const fileInput = document.getElementById('upload');
const progressEl = document.getElementById('progress');
const canvasEl = document.getElementById('canvas');
const downloadLink = document.getElementById('download');
const statusEl = document.getElementById('status'); // optional status area
const scaleSel = document.getElementById('scaleSel') || { value: 2 };
const qualitySel = document.getElementById('qualitySel') || { value: 'high' };

let upscalerInstance = null;
let modelLoaded = false;

// Lazy-load Upscaler instance (tab me jab zarurat ho tab hi load kare)
async function ensureUpscaler() {
  if (modelLoaded && upscalerInstance) return;
  try {
    statusText('मॉडल लोड हो रहा है — पहली बार थोड़ा समय लगेगा...');
    // dynamic import - Upscaler global is available by CDN; but we prefer constructor from global
    // if Upscaler global is not found, try dynamic import (fallback)
    if (typeof Upscaler !== 'undefined') {
      upscalerInstance = new Upscaler({ /* options: tileSize, tileOverlap, model, etc. */ });
    } else {
      // fallback dynamic import if CDN didn't expose global
      const mod = await import('https://cdn.jsdelivr.net/npm/upscaler@1.0.1/dist/browser/umd/upscaler.min.js');
      // Some bundlers won't allow import from URL; typically CDN global is present.
      upscalerInstance = new mod.default ? new mod.default() : new Upscaler();
    }
    modelLoaded = true;
    statusText('मॉडल तैयार है।');
  } catch (err) {
    console.error('Upscaler load error', err);
    statusText('मॉडल लोड नहीं हुआ — ब्राउज़र पर निर्भरता। फ़ॉलबैक चालू करें।');
    modelLoaded = false;
    upscalerInstance = null;
  }
}

// File select handler
fileInput?.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  loadImageAndShow(file);
});

// Load image and show on canvas (original)
function loadImageAndShow(file) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const url = URL.createObjectURL(file);
  img.src = url;

  img.onload = () => {
    // show original in canvas (fit to element width)
    drawImageOnCanvas(img, img.naturalWidth, img.naturalHeight);
    statusText(`Image loaded: ${img.naturalWidth}×${img.naturalHeight}. अब Upscale करें।`);
    // cleanup URL later if needed
    // store original image element for processing
    window.__UP_ORIG_IMG = img;
    downloadLink.classList.add('hidden');
  };

  img.onerror = () => {
    statusText('Image load failed। कृपया अलग फ़ाइल try करें।');
    URL.revokeObjectURL(url);
  };
}

// Draw image on canvas, optionally scale
function drawImageOnCanvas(img, w, h) {
  const canvas = canvasEl;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  // clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, w, h);
}

// Run upscale process (call from button)
async function runUpscale() {
  const img = window.__UP_ORIG_IMG;
  if (!img) {
    alert('कृपया पहले image चुनें।');
    return;
  }

  // chosen options
  const scale = parseFloat(scaleSel?.value) || 2;
  const quality = qualitySel?.value || 'high';

  // ensure upscaler loaded
  await ensureUpscaler();

  statusText('Processing... कृपया प्रतीक्षा करें।');
  showProgress(true);

  try {
    // If upscaler is available, use it. Otherwise fallback to canvas scaling.
    if (upscalerInstance && modelLoaded) {
      // upscaler.enhance may accept image element and options like scale
      // NOTE: API depends on the upscaler version; this example assumes enhance/enhance or upscale method
      // Using enhance or upscale depending on library
      let outCanvas;
      if (typeof upscalerInstance.enhance === 'function') {
        outCanvas = await upscalerInstance.enhance(img, { scale: scale });
      } else if (typeof upscalerInstance.upscale === 'function') {
        outCanvas = await upscalerInstance.upscale(img, { scale: scale });
      } else {
        throw new Error('Upscaler API not supported in this build.');
      }

      // If returned canvas-like element, draw directly
      if (outCanvas && outCanvas instanceof HTMLCanvasElement) {
        // copy result canvas into visible canvasEl
        canvasEl.width = outCanvas.width;
        canvasEl.height = outCanvas.height;
        const ctx = canvasEl.getContext('2d');
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.drawImage(outCanvas, 0, 0);
      } else if (outCanvas && outCanvas instanceof ImageBitmap) {
        canvasEl.width = outCanvas.width;
        canvasEl.height = outCanvas.height;
        const ctx = canvasEl.getContext('2d');
        ctx.drawImage(outCanvas, 0, 0);
      } else if (outCanvas && outCanvas.src) {
        // if library returned an image-like object with src
        const tmpImg = new Image();
        tmpImg.src = outCanvas.src;
        await tmpImg.decode();
        canvasEl.width = tmpImg.naturalWidth;
        canvasEl.height = tmpImg.naturalHeight;
        const ctx = canvasEl.getContext('2d');
        ctx.drawImage(tmpImg, 0, 0);
      } else {
        throw new Error('Upscaler returned unsupported result.');
      }
    } else {
      // Fallback: simple canvas scaling with imageSmoothingQuality
      await fallbackCanvasUpscale(img, scale, quality);
    }

    // Prepare download link
    const dataUrl = canvasEl.toDataURL('image/png');
    downloadLink.href = dataUrl;
    downloadLink.classList.remove('hidden');
    statusText('Upscale पूरा हुआ — डाउनलोड बटन देखें।');
  } catch (err) {
    console.error('Upscale error:', err);
    statusText('Upscale में त्रुटि: ' + (err.message || err));
    // try fallback once if upscaler failed
    if (!upscalerInstance) {
      try {
        await fallbackCanvasUpscale(img, scale, quality);
        const dataUrl2 = canvasEl.toDataURL('image/png');
        downloadLink.href = dataUrl2;
        downloadLink.classList.remove('hidden');
        statusText('Fallback upscale पूरा हुआ।');
      } catch (e2) {
        statusText('Fallback भी असफल रहा।');
      }
    }
  } finally {
    showProgress(false);
  }
}

// Simple fallback upscale using canvas interpolation
async function fallbackCanvasUpscale(img, scale = 2, quality = 'high') {
  return new Promise((resolve, reject) => {
    try {
      const targetW = Math.round(img.naturalWidth * scale);
      const targetH = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      // Set smoothing options
      if (quality === 'pixel') {
        ctx.imageSmoothingEnabled = false;
      } else {
        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = quality === 'high' ? 'high' : 'medium';
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);

      // draw into visible canvas
      canvasEl.width = targetW;
      canvasEl.height = targetH;
      const visibleCtx = canvasEl.getContext('2d');
      visibleCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      visibleCtx.drawImage(canvas, 0, 0);

      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

// UI helpers
function showProgress(show) {
  if (!progressEl) return;
  if (show) progressEl.classList.remove('hidden');
  else progressEl.classList.add('hidden');
}

function statusText(txt) {
  if (!statusEl) return;
  statusEl.textContent = txt;
}

// Bind runUpscale to a button (if you have a button with id 'upBtn')
const upBtn = document.getElementById('upBtn');
if (upBtn) upBtn.addEventListener('click', runUpscale);

// Optional: expose runUpscale globally for manual call
window.runUpscale = runUpscale;
