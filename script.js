// Initialize Web Audio API
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let analyser = audioContext.createAnalyser();
let microphone;
let gainNode = audioContext.createGain();
let pitchShiftNode = audioContext.createGain();  // For pitch effect
let reverbNode = audioContext.createConvolver();  // For reverb effect

// Microphone access
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(gainNode);
        gainNode.connect(pitchShiftNode);
        pitchShiftNode.connect(reverbNode);
        reverbNode.connect(analyser);
        analyser.connect(audioContext.destination);
    })
    .catch(err => {
        console.error('Error accessing the microphone:', err);
    });

// Handle real-time effect adjustments
document.getElementById("mic-input").addEventListener("input", function() {
    gainNode.gain.value = this.value / 100;
});

document.getElementById("pitch").addEventListener("input", function() {
    pitchShiftNode.gain.value = this.value / 10;  // Adjust pitch
});

document.getElementById("reverb").addEventListener("input", function() {
    // For simplicity, you can apply a basic reverb effect here
    fetch('path_to_reverb_impulse_response.wav')
        .then(response => response.arrayBuffer())
        .then(buffer => {
            audioContext.decodeAudioData(buffer, (decodedData) => {
                reverbNode.buffer = decodedData;
            });
        });
});

// Distortion effect (can be added similarly)
document.getElementById("distortion").addEventListener("input", function() {
    let distortionAmount = this.value / 100;
    let distortionNode = audioContext.createWaveShaper();
    distortionNode.curve = makeDistortionCurve(distortionAmount);
    gainNode.connect(distortionNode);
    distortionNode.connect(audioContext.destination);
});

// Helper function to create distortion curve
function makeDistortionCurve(amount) {
    let curve = new Float32Array(44100);
    let deg = Math.PI / 2;
    for (let i = 0; i < 44100; i++) {
        let x = i * 2 / 44100 - 1;
        curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

// Visualizer (simple bar chart based on analyser)
function createVisualizer() {
    const canvas = document.getElementById("visualizer");
    const ctx = canvas.getContext("2d");
    let frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frequencyData.forEach((value, index) => {
        ctx.fillStyle = 'rgb(' + (value + 100) + ', 50, 50)';
        ctx.fillRect(index * 3, canvas.height - value, 2, value);
    });

    requestAnimationFrame(createVisualizer);
}

createVisualizer();

// WebRTC Integration (Basic Peer Connection Setup)
let peerConnection = new RTCPeerConnection();

// Assuming you have a signaling mechanism (WebSocket or similar)
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        // Send the candidate to the other peer via signaling server
    }
};

// Assuming you have the processed stream ready, you can add it to the connection
peerConnection.addTrack(gainNode);

// Firebase Storage Integration (For Uploading Sound Files)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();

// Upload sound file to Firebase
document.getElementById("file-upload").addEventListener("change", function(event) {
    let file = event.target.files[0];
    if (file) {
        const storageRef = storage.ref();
        const fileRef = storageRef.child('sounds/' + file.name);
        fileRef.put(file).then(() => {
            console.log("File uploaded successfully");
            fileRef.getDownloadURL().then(url => {
                console.log("File URL:", url);
            });
        });
    }
});
