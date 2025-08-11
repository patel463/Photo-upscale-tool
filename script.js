// script.js
const fileInput = document.getElementById('fileInput');
const upBtn = document.getElementById('upBtn');
const previewArea = document.getElementById('previewArea');
const statusEl = document.getElementById('status');
const downloadLink = document.getElementById('downloadLink');
const resetBtn = document.getElementById('resetBtn');
const scaleSel = document.getElementById('scaleSel');
const qualitySel = document.getElementById('qualitySel');

let originalImage = null;
let upscaledDataUrl = null;

fileInput.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  loadOriginalImage(url);
});

resetBtn.addEventListener('click', () => {
  previewArea.innerHTML = '';
  statusEl.textContent = 'रीसेट किया गया — नया image चुनें।';
  downloadLink.classList.add('hidden');
  upscaledDataUrl = null;
  if (originalImage) {
    URL.revokeObjectURL(originalImage.src);
    originalImage = null;
  }
  fileInput.value = '';
});

upBtn.addEventListener('click', async () => {
  if (!originalImage) {
    alert('पहले एक image चुनें।');
    return;
  }
  const scale = parseFloat(scaleSel.value) || 2;
  const quality = qualitySel.value || 'high';
  statusEl.textContent = 'Processing... कृपया प्रतीक्षा करें';
  try {
    const up = await upscaleImage(originalImage, scale, quality);
    upscaledDataUrl = up;
    showBeforeAfter(originalImage.src, upscaledDataUrl);
    downloadLink.href = upscaledDataUrl;
    downloadLink.classList.remove('hidden');
    statusEl.textContent = 'हो गया — परिणाम नीचे देखें।';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Processing failed: ' + (err.message || err);
  }
});

// load original image into Image object
function loadOriginalImage(url) {
  previewArea.innerHTML = '';
  downloadLink.classList.add('hidden');
  const img = new Image();
  img.onload = () => {
    originalImage = img;
    // show original in preview until upscaled
    const wrapper = document.createElement('div');
    wrapper.className = 'text-center';
    const note = document.createElement('div');
    note.className = 'mb-2 text-sm text-gray-600';
    note.textContent = `Original: ${img.naturalWidth} × ${img.naturalHeight}`;
    wrapper.appendChild(note);
    wrapper.appendChild(img);
    previewArea.appendChild(wrapper);
    statusEl.textContent = 'Image loaded — अब Upscale करें।';
  };
  img.onerror = () => {
    statusEl.textContent = 'Image load failed.';
  };
  img.src = url;
}

// Upscale using canvas with different interpolation modes
async function upscaleImage(img, scale = 2, quality = 'high') {
  return new Promise((resolve, reject) => {
    try {
      // target dimensions
      const targetW = Math.round(img.naturalWidth * scale);
      const targetH = Math.round(img.naturalHeight * scale);

      // Use offscreen canvas if available for better performance
      const canvas = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(targetW, targetH) : document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      // Configure smoothing based on quality
      if (quality === 'pixel') {
        ctx.imageSmoothingEnabled = false;
      } else {
        ctx.imageSmoothingEnabled = true;
        // imageSmoothingQuality works in many browsers
        if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = (quality === 'high') ? 'high' : 'medium';
      }

      // Draw scaled image
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // If using OffscreenCanvas, convert to blob via transferToImageBitmap workaround
      if (canvas instanceof OffscreenCanvas) {
        canvas.convertToBlob().then(blob => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(blob);
        }).catch(err => reject(err));
      } else {
        // normal canvas
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      }
    } catch (err) {
      reject(err);
    }
  });
}

// Before/After slider UI
function showBeforeAfter(beforeSrc, afterDataUrl) {
  previewArea.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'before-after';

  const beforeImg = document.createElement('img');
  beforeImg.src = beforeSrc;
  beforeImg.alt = 'before';

  const afterWrap = document.createElement('div');
  afterWrap.className = 'after-wrap';
  afterWrap.style.width = '50%';

  const afterImg = document.createElement('img');
  afterImg.src = afterDataUrl;
  afterImg.alt = 'after';

  afterWrap.appendChild(afterImg);
  container.appendChild(beforeImg);
  container.appendChild(afterWrap);

  const range = document.createElement('input');
  range.type = 'range';
  range.min = 0;
  range.max = 100;
  range.value = 50;
  range.style.width = '100%';
  range.addEventListener('input', () => {
    afterWrap.style.width = range.value + '%';
  });

  previewArea.appendChild(container);
  previewArea.appendChild(range);
}
