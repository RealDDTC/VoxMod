import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js';

// Firebase Config - Replace with your actual config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Web Audio Setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
const gainNode = audioContext.createGain();
const dryGain = audioContext.createGain();
const wetGain = audioContext.createGain();
const convolver = audioContext.createConvolver();
const distortion = audioContext.createWaveShaper();
const destination = audioContext.createMediaStreamDestination();

// Load reverb impulse
fetch('path_to_reverb_impulse_response.wav')
  .then(r => r.arrayBuffer())
  .then(data => audioContext.decodeAudioData(data))
  .then(decoded => {
    convolver.buffer = decoded;
  })
  .catch(() => {
    console.warn('Failed to load reverb impulse response');
  });

// Microphone Access & Routing
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  const micSrc = audioContext.createMediaStreamSource(stream);
  micSrc.connect(gainNode);

  // Distortion in chain
  gainNode.connect(distortion);
  distortion.connect(dryGain);

  // Dry and wet path
  gainNode.connect(convolver);
  convolver.connect(wetGain);

  // Merge paths to analyser and output
  dryGain.connect(analyser);
  wetGain.connect(analyser);

  analyser.connect(audioContext.destination);
  analyser.connect(destination);

  // WebRTC example setup (signaling logic needed)
  const pc = new RTCPeerConnection();
  destination.stream.getTracks().forEach(track => pc.addTrack(track, destination.stream));
  // TODO: Add signaling to exchange offer/answer and ICE candidates

}).catch(err => {
  console.error('Microphone access error:', err);
});

// Control Handlers
document.getElementById('mic-input').oninput = e => gainNode.gain.value = e.target.value / 100;

document.getElementById('reverb').oninput = e => {
  const mix = e.target.value / 100;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;
};

document.getElementById('distortion').oninput = e => {
  const amt = e.target.value / 100;
  distortion.curve = makeDistortionCurve(amt);
};

// Default distortion curve initialization
distortion.curve = makeDistortionCurve(0);

function makeDistortionCurve(amount) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; ++i) {
    const x = (i * 2 / samples) - 1;
    curve[i] = ((Math.PI + amount * x) / (Math.PI + amount * Math.abs(x))) || 0;
  }
  return curve;
}

// Visualizer Setup
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
analyser.fftSize = 2048;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

function draw() {
  requestAnimationFrame(draw);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = (canvas.width / bufferLength) * 2.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = dataArray[i];
    const r = barHeight + 25;
    const g = 50;
    const b = 50;

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

    x += barWidth + 1;
  }
}
draw();

// Soundboard Buttons
document.getElementById('play-sound1').onclick = () => playSample('sound1.mp3');
document.getElementById('play-sound2').onclick = () => playSample('sound2.mp3');

function playSample(src) {
  const audio = new Audio(src);
  audio.play();
}

// Firebase File Upload
document.getElementById('file-upload').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const fileRef = storageRef(storage, `sounds/${file.name}`);
  try {
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    console.log('Uploaded file URL:', url);
  } catch (err) {
    console.error('Upload failed:', err);
  }
});
