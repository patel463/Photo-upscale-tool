// DOM Elements
const uploadContainer = document.getElementById('uploadContainer');
const resultContainer = document.getElementById('resultContainer');
const loadingContainer = document.getElementById('loadingContainer');
const progressText = document.getElementById('progressText');
const upscaleLevel = document.getElementById('upscaleLevel');
const modelSelect = document.getElementById('modelSelect');
const afterImage = document.getElementById('afterImage');
const uploadInput = document.getElementById('uploadInput');

let originalImage = new Image();
let upscaledImage;

// File input handler
uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      originalImage.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Main processing function
async function processImage() {
  if (!originalImage.src) {
    alert("Please upload an image first!");
    return;
  }

  uploadContainer.classList.add('hidden');
  resultContainer.classList.add('hidden');
  loadingContainer.classList.remove('hidden');

  const scale = parseInt(upscaleLevel.value);
  const modelName = modelSelect.value;

  try {
    progressText.textContent = 'Loading AI model...';

    // Load model
    let model;
    if (modelName === 'realesrgan') {
      model = await RealESRGAN.load();
    } else {
      model = await Waifu2x.load();
    }

    progressText.textContent = 'Processing image...';

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width * scale;
    canvas.height = originalImage.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    // Upscale
    const startTime = performance.now();
    if (modelName === 'realesrgan') {
      upscaledImage = await model.enhance(canvas);
    } else {
      upscaledImage = await model.upscale(canvas);
    }
    const endTime = performance.now();

    console.log(`Upscaling took ${((endTime - startTime) / 1000).toFixed(2)} seconds`);

    loadingContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    afterImage.src = upscaledImage;
  } catch (error) {
    console.error('Error:', error);
    progressText.textContent = 'Error: ' + error.message;
    setTimeout(() => {
      loadingContainer.classList.add('hidden');
      uploadContainer.classList.remove('hidden');
    }, 3000);
  }
}
