// const remoteVideos = document.getElementsByClassName("remote-video");
const videoElement = document.getElementById("local-video");
const audioSelect = document.querySelector("select#audioSource");
const videoSelect = document.querySelector("select#videoSource");
const videoBigScreen = document.getElementById("big-screen");

const socket = io.connect(window.location.origin);
const peerConnections = {};
const config = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"]
    }
  ]
};


//socket on  from serve js
socket.on("update-user-list", ({ users }) => {
  console.log(users)
  updateUserList(users);
});


socket.on("offer", (id, description) => {
  //alert("offer - " +id)
  peerConnection = new RTCPeerConnection(config);
  peerConnection
    .setRemoteDescription(description)
    .then(() => peerConnection.createAnswer())
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("answer", id, peerConnection.localDescription);
    });
  peerConnection.ontrack = event => {
  	const remoteVideo = document.getElementById(id);
    remoteVideo.srcObject = event.streams[0];
  };
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };
});

socket.on("answer", (id, description) => {
 //alert("answer - " +id)
 if(peerConnections[id])
  	peerConnections[id].setRemoteDescription(description);
});

socket.on("candidate", (id, candidate) => {
  // alert("candidate - " +id)
  if(peerConnections[id])
  	peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});


socket.on("disconnectPeer", id => {
	const elToRemove = document.getElementById(id);
    //peerConnections[id].close();
    delete peerConnections[id];
  	if (elToRemove) {
    	elToRemove.remove();
  	}	
});




// for (var i = 0; i < remoteVideos.length; i++) {
//     remoteVideos[i].addEventListener('click', CallBigScreen, false);
// }


audioSelect.onchange = getStream;
videoSelect.onchange = getStream;

getStream()
  .then(getDevices)
  .then(gotDevices);

function getDevices() {
  return navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos) {
  window.deviceInfos = deviceInfos;
  for (const deviceInfo of deviceInfos) {
    const option = document.createElement("option");
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === "audioinput") {
      option.text = deviceInfo.label || `Microphone ${audioSelect.length + 1}`;
      audioSelect.appendChild(option);
    } else if (deviceInfo.kind === "videoinput") {
      option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    }
  }
}

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  const audioSource = audioSelect.value;
  const videoSource = videoSelect.value;
  const constraints = {
    audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
    video: { deviceId: videoSource ? { exact: videoSource } : undefined }
  };
  return navigator.mediaDevices
    .getUserMedia(constraints)
    .then(gotStream)
    .catch(handleError);
}

function gotStream(stream) {
  window.stream = stream;
  audioSelect.selectedIndex = [...audioSelect.options].findIndex(
    option => option.text === stream.getAudioTracks()[0].label
  );
  videoSelect.selectedIndex = [...videoSelect.options].findIndex(
    option => option.text === stream.getVideoTracks()[0].label
  );
  videoElement.srcObject = stream;
  socket.emit("update-user-list");

  // const peerConnection = new RTCPeerConnection(config);
  // stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));


}

function handleError(error) {
  console.error("Error: ", error);
}



function updateUserList(socketIds) {
  const activeUserContainer = document.getElementById("active-user-container");

  socketIds.forEach(socketId => {
    const alreadyExistingUser = document.getElementById(socketId);
    if(!alreadyExistingUser) {
    	const userContainerEl = createUserVideoContainer(socketId);
  		activeUserContainer.appendChild(userContainerEl);
  		createOffer(socketId);
    }
  });
}


function createOffer(id)
{
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;

  let stream = videoElement.srcObject;
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };

  peerConnection
    .createOffer()
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("offer", id, peerConnection.localDescription);
    });
}



function createUserVideoContainer(socketId) {
  const userContainerEl = document.createElement("VIDEO");	
  // const usernameEl = document.createElement("p");

  userContainerEl.setAttribute("class", "remote-video");
  userContainerEl.setAttribute("id", socketId);
  userContainerEl.setAttribute("autoplay", "autoplay");

  userContainerEl.addEventListener("click", () => {
  		videoBigScreen.srcObject = userContainerEl.srcObject  
  });

  return userContainerEl;
}



