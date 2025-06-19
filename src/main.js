import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDDuHTfi_ev9KwM9v8jHHpftngGvcGuY04",
    authDomain: "myku-app.firebaseapp.com",
    projectId: "myku-app",
    storageBucket: "myku-app.firebasestorage.app",
    messagingSenderId: "7421661636",
    appId: "1:7421661636:web:8d96372be104d7e97454b8",
    measurementId: "G-34JJ9HH3V8"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const fartyImage = httpsCallable(functions, 'fartyImage');

// DOM elements
const toggleBtns = document.querySelectorAll('.toggle-btn');
const mediaInput = document.getElementById('mediaInput');
const uploadLabel = document.getElementById('uploadLabel');
const mediaContainer = document.getElementById('mediaContainer');
const placeholderText = document.getElementById('placeholderText');
const videoControls = document.getElementById('videoControls');
const scrubber = document.getElementById('scrubber');
const timeDisplay = document.getElementById('timeDisplay');
const generateBtn = document.getElementById('generateBtn');
const loading = document.getElementById('loading');
const actionButtons = document.getElementById('actionButtons');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const resetBtn = document.getElementById('resetBtn');

let currentMode = 'image';
let selectedFile = null;
let currentVideo = null;
let generatedImageUrl = null;
let totalFrames = 0;
let frameRate = 30;

// Media type toggle
toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        toggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.type;
        
        if (currentMode === 'image') {
            mediaInput.accept = 'image/*';
            uploadLabel.textContent = '📁 Select Image';
            placeholderText.textContent = 'Select an image to transform with AI';
        } else {
            mediaInput.accept = 'video/*';
            uploadLabel.textContent = '🎬 Select Video';
            placeholderText.textContent = 'Select a video to choose frame from';
        }
        
        resetApp();
    });
});

// File selection
mediaInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    selectedFile = file;
    
    if (currentMode === 'image' && file.type.startsWith('image/')) {
        displayImage(file);
    } else if (currentMode === 'video' && file.type.startsWith('video/')) {
        displayVideo(file);
    } else {
        alert(`Please select a valid ${currentMode} file`);
    }
});

function displayImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        showMedia('image', e.target.result);
        generateBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

function displayVideo(file) {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.controls = false;
    video.muted = true;
    video.preload = 'metadata';
    video.playsInline = true;
    
    video.addEventListener('loadedmetadata', () => {
        console.log('Video metadata loaded:', {
            duration: video.duration,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight
        });
        
        frameRate = 30;
        totalFrames = Math.floor(video.duration * frameRate);
        
        scrubber.min = 0;
        scrubber.max = totalFrames - 1;
        scrubber.step = 1;
        scrubber.value = 0;
        
        updateTimeDisplay();
        generateBtn.disabled = false; // Enable generate button for videos
        video.currentTime = 0;
    });
    
    currentVideo = video;
    showMedia('video', video);
    videoControls.classList.remove('hidden');
}

function showMedia(type, content) {
    mediaContainer.classList.add('has-media');
    placeholderText.style.display = 'none';
    
    // Clear previous content
    const existingMedia = mediaContainer.querySelector('img, video');
    if (existingMedia) existingMedia.remove();
    
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = content;
        img.className = 'media-preview';
        mediaContainer.appendChild(img);
    } else {
        content.className = 'media-preview';
        mediaContainer.appendChild(content);
    }
}

// Video controls
scrubber.addEventListener('input', (e) => {
    if (currentVideo) {
        const frameNumber = parseInt(e.target.value);
        const timeInSeconds = frameNumber / frameRate;
        currentVideo.currentTime = timeInSeconds;
        updateTimeDisplay(frameNumber);
    }
});

scrubber.addEventListener('change', (e) => {
    if (currentVideo) {
        const frameNumber = parseInt(e.target.value);
        const timeInSeconds = frameNumber / frameRate;
        currentVideo.currentTime = timeInSeconds;
        updateTimeDisplay(frameNumber);
    }
});

function updateTimeDisplay(frameNumber = null) {
    if (currentVideo) {
        const currentFrame = frameNumber !== null ? frameNumber : Math.floor(currentVideo.currentTime * frameRate);
        const currentTime = currentFrame / frameRate;
        const totalTime = currentVideo.duration;
        
        const current = formatTime(currentTime);
        const total = formatTime(totalTime);
        
        timeDisplay.textContent = `${current} / ${total} (Frame ${currentFrame + 1}/${totalFrames})`;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

// Extract current frame from video
async function extractCurrentFrame() {
    return new Promise((resolve) => {
        setTimeout(() => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = currentVideo.videoWidth;
            canvas.height = currentVideo.videoHeight;
            ctx.drawImage(currentVideo, 0, 0);
            
            canvas.toBlob((blob) => {
                const extractedFrame = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
                const currentFrame = Math.floor(currentVideo.currentTime * frameRate);
                console.log(`Frame ${currentFrame + 1} extracted for AI processing`);
                resolve(extractedFrame);
            }, 'image/jpeg', 0.9);
        }, 100);
    });
}

// Generate AI image
generateBtn.addEventListener('click', async () => {
    let fileToProcess = selectedFile;
    
    // If we have a video, extract the current frame first
    if (currentVideo && currentMode === 'video') {
        try {
            fileToProcess = await extractCurrentFrame();
        } catch (err) {
            console.error('Failed to extract frame:', err);
            alert('Failed to extract video frame');
            return;
        }
    }
    
    if (!fileToProcess) return;
    
    try {
        loading.classList.remove('hidden');
        generateBtn.disabled = true;
        
        const base64Image = await fileToBase64(fileToProcess);
        
        const response = await fartyImage({
            base64Image: base64Image,
            promptStyle: 'cryptopunk'
        });
        
        if (response.data && response.data.outputImage) {
            generatedImageUrl = `data:image/jpeg;base64,${response.data.outputImage}`;
            
            // Replace current media with generated image
            showMedia('image', generatedImageUrl);
            videoControls.classList.add('hidden'); // Hide video controls after generation
            actionButtons.classList.remove('hidden');
            
            console.log('Image generation successful!');
        } else {
            throw new Error('No image returned from function');
        }
        
    } catch (err) {
        console.error('Generation error:', err);
        alert(`Error: ${err.message}`);
        generateBtn.disabled = false; // Re-enable on error
    } finally {
        loading.classList.add('hidden');
        generateBtn.style.display = 'none'; // Hide generate button after use
    }
});

// Action buttons
downloadBtn.addEventListener('click', () => {
    if (generatedImageUrl) {
        const a = document.createElement('a');
        a.href = generatedImageUrl;
        a.download = 'farty-generated-image.jpg';
        a.click();
    }
});

shareBtn.addEventListener('click', async () => {
    if (generatedImageUrl && navigator.share) {
        try {
            const response = await fetch(generatedImageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'farty-image.jpg', { type: 'image/jpeg' });
            
            await navigator.share({
                files: [file],
                title: 'FARTY AI Generated Image'
            });
        } catch (err) {
            console.log('Share failed:', err);
            downloadBtn.click();
        }
    } else {
        downloadBtn.click();
    }
});

resetBtn.addEventListener('click', resetApp);

function resetApp() {
    selectedFile = null;
    currentVideo = null;
    generatedImageUrl = null;
    totalFrames = 0;
    frameRate = 30;
    
    mediaContainer.classList.remove('has-media');
    placeholderText.style.display = 'block';
    videoControls.classList.add('hidden');
    actionButtons.classList.add('hidden');
    generateBtn.style.display = 'block';
    generateBtn.disabled = true;
    
    const existingMedia = mediaContainer.querySelector('img, video');
    if (existingMedia) existingMedia.remove();
    
    mediaInput.value = '';
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

console.log('FARTY Video Transform app loaded successfully!');
