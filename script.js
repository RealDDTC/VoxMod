// Initialize Firebase
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
const app = firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioContext.createGain();
gainNode.connect(audioContext.destination);

let uploadedAudioBuffer; // Store the uploaded audio file

// WebRTC setup
let localPeerConnection;
let remotePeerConnection;
let localStream;

// Upload audio file to Firebase Storage
document.getElementById('sound-upload').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function () {
      audioContext.decodeAudioData(reader.result, function (buffer) {
        uploadedAudioBuffer = buffer;
        console.log("Audio file uploaded and decoded.");
      });
    };
    reader.readAsArrayBuffer(file);

    // Upload to Firebase Storage
    const storageRef = storage.ref();
    const fileRef = storageRef.child('sounds/' + file.name);
    fileRef.put(file).then(() => {
      console.log('File uploaded successfully to Firebase');
    });
  }
});

// Play the uploaded sound
function playSound(soundName) {
  if (soundName === 'uploaded-sound' && uploadedAudioBuffer) {
    const source = audioContext.createBufferSource();
    source.buffer = uploadedAudioBuffer;
    source.connect(gainNode);
    source.start();
  } else {
    console.log("No sound uploaded yet.");
  }
}

// Advanced Audio Effects
const chorusNode = audioContext.createGain();
const flangerNode = audioContext.createGain();
const distortionNode = audioContext.createWaveShaper();

document.getElementById('chorus-slider').addEventListener('input', function () {
  adjustChorus(this.value);
});

document.getElementById('flanger-slider').addEventListener('input', function () {
  adjustFlanger(this.value);
});

document.getElementById('distortion-slider').addEventListener('input', function () {
  adjustDistortion(this.value);
});

function adjustChorus(value) {
  chorusNode.gain.setValueAtTime(value / 100, audioContext.currentTime);
}

function adjustFlanger(value) {
  flangerNode.gain.setValueAtTime(value / 100, audioContext.currentTime);
}

function adjustDistortion(value) {
  distortionNode.curve = makeDistortionCurve(value);
}

function makeDistortionCurve(amount) {
  const curve = new Float32Array(44100);
  const deg = Math.PI / 180;
  for (let i = 0; i < curve.length; i++) {
    curve[i] = (Math.sin(i * deg * amount) * 10) / 10;
  }
  return curve;
}

// WebRTC peer-to-peer call setup
async function startCall() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  localStream = stream;

  localPeerConnection = new RTCPeerConnection();
  remotePeerConnection = new RTCPeerConnection();

  localStream.getTracks().forEach(track => localPeerConnection.addTrack(track, localStream));

  remotePeerConnection.ontrack = (event) => {
    const remoteVideo = document.createElement('video');
    remoteVideo.srcObject = event.streams[0];
    document.getElementById('remote-videos').appendChild(remoteVideo);
    remoteVideo.play();
  };

  localPeerConnection.createOffer()
    .then(offer => localPeerConnection.setLocalDescription(offer))
    .then(() => remotePeerConnection.setRemoteDescription(localPeerConnection.localDescription))
    .then(() => remotePeerConnection.createAnswer())
    .then(answer => remotePeerConnection.setLocalDescription(answer))
    .then(() => localPeerConnection.setRemoteDescription(remotePeerConnection.localDescription));
}
