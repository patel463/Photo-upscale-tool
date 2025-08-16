// DOM Elements
const fileInput = document.getElementById('fileInput');
const dropArea = document.getElementById('dropArea');
const processBtn = document.getElementById('processBtn');
const upscaleLevel = document.getElementById('upscaleLevel');
const modelSelect = document.getElementById('modelSelect');
const beforeImage = document.getElementById('beforeImage');
const afterImage = document.getElementById('afterImage');
const downloadBtn = document.getElementById('downloadBtn');
const newPhotoBtn = document.getElementById('newPhotoBtn');
const uploadContainer = document.querySelector('.upload-container');
const resultContainer = document.querySelector('.result-container');
const loadingContainer = document.querySelector('.loading-container');
const progressText = document.querySelector('.progress-text');

// Variables
let originalImage = null;
let upscaledImage = null;
let currentModel = null;

// Initialize the app
function init() {
    setupEventListeners();
    registerServiceWorker();
}

// Set up event listeners
function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('drag-over');
    });
    
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('drag-over');
    });
    
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect({ target: fileInput });
        }
    });
    
    // Process button click
    processBtn.addEventListener('click', processImage);
    
    // Download button click
    downloadBtn.addEventListener('click', downloadImage);
    
    // New photo button click
    newPhotoBtn.addEventListener('click', resetApp);
    
    // Comparison slider
    setupComparisonSlider();
}

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        alert('Please select an image file (JPEG, PNG)');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        alert('File size should be less than 10MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        originalImage = new Image();
        originalImage.onload = () => {
            beforeImage.src = event.target.result;
            processBtn.disabled = false;
        };
        originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Process image with AI
async function processImage() {
    if (!originalImage) return;
    
    // Show loading state
    uploadContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    loadingContainer.classList.remove('hidden');
    
    const scale = parseInt(upscaleLevel.value);
    const modelName = modelSelect.value;
    
    try {
        progressText.textContent = 'Loading AI model...';
        
        // Load the selected model
        currentModel = await loadModel(modelName);
        
        progressText.textContent = 'Processing image (this may take a few minutes)...';
        
        // Upscale the image
        const startTime = performance.now();
        upscaledImage = await upscaleImage(originalImage, scale, currentModel);
        const endTime = performance.now();
        
        console.log(`Upscaling took ${((endTime - startTime)/1000).toFixed(2)} seconds`);
        
        // Display results
        afterImage.src = upscaledImage;
        loadingContainer.classList.add('hidden');
        resultContainer.classList.remove('hidden');
        
        // Reinitialize slider for new images
        setupComparisonSlider();
    } catch (error) {
        console.error('Error processing image:', error);
        progressText.textContent = 'Error: ' + error.message;
        setTimeout(() => {
            loadingContainer.classList.add('hidden');
            uploadContainer.classList.remove('hidden');
        }, 3000);
    }
}

// Load AI model
async function loadModel(modelName) {
    // In a real implementation, this would load the WebAssembly model
    // For this example, we'll simulate it
    
    // Simulate model loading delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
        name: modelName,
        upscale: async (image, scale) => {
            // In a real app, this would use the actual WASM model
            return simulateUpscale(image, scale);
        }
    };
}

// Simulate upscaling (replace with actual WASM model calls)
function simulateUpscale(image, scale) {
    return new Promise((resolve) => {
        // Create a canvas to "process" the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions
        canvas.width = image.width * scale;
        canvas.height = image.height * scale;
        
        // Draw original image (simulate processing)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        
        // Add some "enhancement" effects to simulate AI
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Simple "enhancement" - increase contrast slightly
        for (let i = 0; i < data.length; i += 4) {
            data[i] = data[i] < 128 ? data[i] * 0.9 : 255 - (255 - data[i]) * 0.9;
            data[i+1] = data[i+1] < 128 ? data[i+1] * 0.9 : 255 - (255 - data[i+1]) * 0.9;
            data[i+2] = data[i+2] < 128 ? data[i+2] * 0.9 : 255 - (255 - data[i+2]) * 0.9;
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Return as data URL
        setTimeout(() => {
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        }, 2000); // Simulate processing time
    });
}

// Setup before/after comparison slider
function setupComparisonSlider() {
    const slider = document.querySelector('.comparison-slider');
    const button = document.querySelector('.slider-button');
    const line = document.querySelector('.slider-line');
    const container = document.querySelector('.comparison');
    
    let isDragging = false;
    
    function moveSlider(e) {
        if (!isDragging) return;
        
        let x;
        if (e.type === 'mousemove') {
            x = e.clientX - container.getBoundingClientRect().left;
        } else {
            x = e.touches[0].clientX - container.getBoundingClientRect().left;
        }
        
        // Limit x to container bounds
        x = Math.max(0, Math.min(x, container.offsetWidth));
        
        const percent = (x / container.offsetWidth) * 100;
        
        // Update UI
        beforeImage.style.width = `${percent}%`;
        line.style.left = `${percent}%`;
        button.style.left = `${percent}%`;
    }
    
    function startDrag(e) {
        e.preventDefault();
        isDragging = true;
        
        // Change cursor
        document.body.style.cursor = 'ew-resize';
        button.style.cursor = 'grabbing';
    }
    
    function endDrag() {
        isDragging = false;
        
        // Reset cursor
        document.body.style.cursor = '';
        button.style.cursor = 'grab';
    }
    
    // Mouse events
    button.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveSlider);
    document.addEventListener('mouseup', endDrag);
    
    // Touch events
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', moveSlider);
    document.addEventListener('touchend', endDrag);
}

// Download upscaled image
function downloadImage() {
    if (!upscaledImage) return;
    
    const link = document.createElement('a');
    link.href = upscaledImage;
    link.download = `upscaled_${modelSelect.value}_${upscaleLevel.value}x.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Reset the app to initial state
function resetApp() {
    originalImage = null;
    upscaledImage = null;
    fileInput.value = '';
    processBtn.disabled = true;
    resultContainer.classList.add('hidden');
    uploadContainer.classList.remove('hidden');
}

// Register service worker for PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
}

// Toggle dark/light theme
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

// Check for saved theme preference
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
}

// Initialize the app
init();
