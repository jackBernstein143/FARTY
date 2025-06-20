import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
import { getStorage, ref, uploadBytes } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

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
const storage = getStorage(app);

const fartyImage = httpsCallable(functions, 'fartyImage');
const createFartyVideo = httpsCallable(functions, 'createFartyVideo');

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
const downloadVideoBtn = document.getElementById('downloadVideoBtn');
const shareVideoBtn = document.getElementById('shareVideoBtn');
const resetBtn = document.getElementById('resetBtn');

let currentVideo = null;
let currentVideoFile = null;
let finalVideoUrl = null;
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
    currentVideoFile = file; // Save the file for later upload
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
    if (!currentVideo || !currentVideoFile) return;

    generateBtn.style.display = 'none';
    loading.classList.remove('hidden');
    const loadingText = loading.querySelector('p');
    loadingText.textContent = 'Generating AI image...';

    try {
        // Step 1: Generate the AI image from the current frame
        const frameBlob = await extractCurrentFrame();
        const base64Image = await blobToBase64(frameBlob);
        const imageResult = await fartyImage({ base64Image: base64Image });

        if (!imageResult.data || !imageResult.data.outputImage) {
            throw new Error('AI image generation failed to return an image.');
        }
        const outputImageBase64 = imageResult.data.outputImage;

        // Step 2: Upload BOTH video and generated image to Storage
        loadingText.textContent = 'Uploading assets...';
        const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        
        // Upload video
        const videoPath = `uploads/video-${uniqueId}.mp4`;
        const videoStorageRef = ref(storage, videoPath);
        await uploadBytes(videoStorageRef, currentVideoFile);

        // Upload generated image
        const imagePath = `uploads/image-${uniqueId}.jpg`;
        const imageStorageRef = ref(storage, imagePath);
        const imageBlob = await (await fetch(`data:image/jpeg;base64,${outputImageBase64}`)).blob();
        await uploadBytes(imageStorageRef, imageBlob);

        // Step 3: Call the stitching function with storage paths
        loadingText.textContent = 'Stitching final video...';
        const cutTimestamp = currentVideo.currentTime;
        
        const payload = {
            originalVideoPath: videoPath,
            generatedImagePath: imagePath, // Use storage path instead of base64
            cutTimestamp: cutTimestamp
        };

        console.log('DEBUG: Payload sent to createFartyVideo:', {
            originalVideoPath: payload.originalVideoPath,
            generatedImagePath: payload.generatedImagePath,
            cutTimestamp: payload.cutTimestamp
        });

        const stitchResult = await createFartyVideo(payload);

        if (!stitchResult.data || !stitchResult.data.url) {
            throw new Error('Video stitching failed to return a URL.');
        }

        // Final Step: Display the new stitched video
        finalVideoUrl = stitchResult.data.url;
        const finalVideo = document.createElement('video');
        finalVideo.src = finalVideoUrl;
        finalVideo.className = 'video-preview';
        finalVideo.controls = true;
        finalVideo.autoplay = true;

        videoWrapper.innerHTML = '';
        videoWrapper.appendChild(finalVideo);
        videoControls.classList.add('hidden');
        loading.classList.add('hidden');
        resultActions.classList.remove('hidden');

    } catch (error) {
        console.error('Error in the generation process:', error);
        console.error('Full error object:', error);
        alert(`Could not create the final video: ${error.message}`);
        resetToAction();
    }
});

function resetToAction() {
    loading.classList.add('hidden');
    resultActions.classList.add('hidden');
    generateBtn.style.display = 'block';
}

// Download result
downloadVideoBtn.addEventListener('click', () => {
    if (!finalVideoUrl) return;
    const link = document.createElement('a');
    link.href = finalVideoUrl;
    link.download = 'farty-video.mp4';
    link.click();
});

// Share result
shareVideoBtn.addEventListener('click', async () => {
    if (!finalVideoUrl) return;
    try {
        if (!navigator.share) throw new Error('Web Share API not supported.');
        await navigator.share({
            title: 'FARTY AI Video',
            text: 'Check out this AI-transformed video!',
            url: finalVideoUrl
        });
    } catch (error) {
        console.log('Share failed, copying to clipboard:', error);
        copyToClipboard(finalVideoUrl);
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
    currentVideoFile = null;
    finalVideoUrl = null;
    
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