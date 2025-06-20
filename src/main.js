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

const videoForm = document.getElementById('videoForm');
const videoInput = document.getElementById('videoInput');
const videoContainer = document.getElementById('videoContainer');
const videoWrapper = document.getElementById('videoWrapper');
const videoControls = document.getElementById('videoControls');
const scrubber = document.getElementById('scrubber');
const timeDisplay = document.getElementById('timeDisplay');
const generateBtn = document.getElementById('generateBtn');
const loading = document.getElementById('loading');
const resultActions = document.getElementById('resultActions');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const resetBtn = document.getElementById('resetBtn');

let currentVideo = null;
let generatedImageUrl = null;
let totalFrames = 0;
const frameRate = 30;

// File selection
videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
        alert('Please select a valid video file');
        videoForm.reset();
        return;
    }
    displayVideo(file);
});

function displayVideo(file) {
    if (currentVideo && currentVideo.src) {
        URL.revokeObjectURL(currentVideo.src);
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.className = 'video-preview';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    video.addEventListener('loadedmetadata', () => {
        totalFrames = Math.floor(video.duration * frameRate);
        scrubber.max = totalFrames > 0 ? totalFrames - 1 : 0;
        scrubber.value = 0;
        updateTimeDisplay();
        generateBtn.disabled = false;
        video.currentTime = 0;
    });

    currentVideo = video;
    videoContainer.classList.add('has-video');
    videoWrapper.innerHTML = '';
    videoWrapper.appendChild(video);
    videoWrapper.classList.add('active');
    videoControls.classList.remove('hidden');
}

// Video controls
function updateScrubber() {
    if (!currentVideo) return;
    const frameNumber = parseInt(scrubber.value);
    currentVideo.currentTime = frameNumber / frameRate;
    updateTimeDisplay(frameNumber);
}

scrubber.addEventListener('input', updateScrubber);
scrubber.addEventListener('change', updateScrubber);

function updateTimeDisplay(frame = null) {
    if (!currentVideo || !isFinite(currentVideo.duration)) return;
    const currentFrame = frame !== null ? frame : Math.floor(currentVideo.currentTime * frameRate);
    const currentTime = currentFrame / frameRate;
    const totalTime = currentVideo.duration;
    
    timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(totalTime)}`;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Extract current frame from video
async function extractCurrentFrame() {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = currentVideo.videoWidth;
        canvas.height = currentVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(currentVideo, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
    });
}

// Generate AI image
generateBtn.addEventListener('click', async () => {
    if (!currentVideo) return;

    generateBtn.style.display = 'none';
    loading.classList.remove('hidden');

    try {
        const frameBlob = await extractCurrentFrame();
        const base64Image = await blobToBase64(frameBlob);
        const result = await fartyImage({ base64Image: base64Image });

        if (result.data && result.data.outputImage) {
            generatedImageUrl = `data:image/jpeg;base64,${result.data.outputImage}`;

            // Create and display the new image, replacing the video
            const img = document.createElement('img');
            img.src = generatedImageUrl;
            img.className = 'video-preview generated-image';
            
            videoWrapper.innerHTML = ''; // Clear the video
            videoWrapper.appendChild(img); // Add the image

            // Hide video controls and show result actions
            videoControls.classList.add('hidden');
            loading.classList.add('hidden');
            resultActions.classList.remove('hidden');
        } else {
            throw new Error('No valid image data received from AI service');
        }
    } catch (error) {
        console.error('Error generating AI image:', error);
        alert('Could not generate AI image. Please try again.');
        resetToAction();
    }
});

function resetToAction() {
    loading.classList.add('hidden');
    resultActions.classList.add('hidden');
    generateBtn.style.display = 'block';
}

// Download result
downloadBtn.addEventListener('click', () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = 'farty-ai-image.jpg';
    link.click();
});

// Share result
shareBtn.addEventListener('click', async () => {
    if (!generatedImageUrl) return;
    try {
        if (!navigator.share) throw new Error('Web Share API not supported.');
        await navigator.share({
            title: 'FARTY AI Video Transform',
            text: 'Check out this AI-transformed video!',
            url: generatedImageUrl
        });
    } catch (error) {
        console.log('Share failed, copying to clipboard:', error);
        copyToClipboard(generatedImageUrl);
    }
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard!');
    }, () => {
        alert('Failed to copy link.');
    });
}

// Reset app
resetBtn.addEventListener('click', resetApp);

function resetApp() {
    if (currentVideo && currentVideo.src) {
        currentVideo.pause();
        URL.revokeObjectURL(currentVideo.src);
    }
    currentVideo = null;
    generatedImageUrl = null;
    
    videoContainer.classList.remove('has-video');
    videoWrapper.classList.remove('active');
    videoWrapper.innerHTML = '';
    videoControls.classList.add('hidden');
    
    resetToAction();
    generateBtn.disabled = true;
    
    videoForm.reset();
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            resolve(reader.result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
}

console.log('FARTY Video Transform app loaded successfully!');
