var localVideo;
var firstPerson = false;
var socketCount = 0;
var socketId;
var localStream;
var connections = [];

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

function pageReady() {

    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    var constraints = {
        video: true,
        audio: true,
    };

    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(getUserMediaSuccess)
            .then(function(){

                socket = io.connect(window.location.origin, {secure: true});
                socket.on('signal', gotMessageFromServer);    

                socket.on('connect', function(){

                    socketId = socket.id;

                    socket.on('user-left', function(id){
                        // var video = document.querySelector('[data-socket="'+ id +'"]');
                        // var parentDiv = video.parentElement;
                        // video.parentElement.parentElement.removeChild(parentDiv);
                        var div = document.getElementById(id);
                        if(div)
                            div.remove();

                        getminhegit(id);

                    });


                    socket.on('user-joined', function(id, count, clients){
                        clients.forEach(function(socketListId) {

                            if(!connections[socketListId]){
                                connections[socketListId] = new RTCPeerConnection(peerConnectionConfig);
                                //Wait for their ice candidate   
                                // connections[socketListId].onicecandidate = event => {
                                //     if (event.candidate) {
                                //       console.log('SENDING ICE');
                                //         socket.emit('signal', socketListId, JSON.stringify({'ice': event.candidate}));
                                //     }
                                // };    
                                connections[socketListId].onicecandidate = function(event){
                                    if(event.candidate != null) {
                                        console.log('SENDING ICE');
                                        socket.emit('signal', socketListId, JSON.stringify({'ice': event.candidate}));
                                    }
                                }

                                //Wait for their video stream

                                connections[socketListId].onaddstream = function(event){
                                    gotRemoteStream(event, socketListId)
                                }    

                                //Add the local video stream
                                if(connections[socketListId])
                                    connections[socketListId].addStream(localStream);       

                                // localStream.getTracks().forEach(track => connections[socketListId].addTrack(track, localStream));                                                         
                            }
                        });

                        //Create an offer to connect with your local description
                        
                        if(count >= 2){
                            connections[id].createOffer().then(function(description){
                                connections[id].setLocalDescription(description).then(function() {
                                    // console.log(connections);
                                    socket.emit('signal', id, JSON.stringify({'sdp': connections[id].localDescription}));
                                }).catch(e => console.log(e));        
                            });
                        }
                    });                    
                })       
        
            }); 
    } else {
        alert('Your browser does not support getUserMedia API');
    } 
}

function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideo.srcObject = stream;
}

function gotRemoteStream(event, id) {

    var videos = document.querySelectorAll('video'),
        video  = document.createElement('video'),
        div    = document.createElement('div')

    

    video.setAttribute('data-socket', id);
    video.srcObject         = event.stream;
    video.autoplay    = true; 
    video.muted       = true;
    video.playsinline = true;

    
    div.setAttribute("id",id)
    div.setAttribute("class","col col-lg col-md col-sm col-xs")
    div.appendChild(video);      
    document.querySelector('.videos').appendChild(div);   
    getminhegit(id);
    // var min_height =   getminhegit(id)
    // if(min_height>0)
    //     video.style.height  = min_height + "px";
   
    
}



function gotMessageFromServer(fromId, message) {

    //Parse the incoming signal
    var signal = JSON.parse(message)

    //Make sure it's not coming from yourself
    if(fromId != socketId) {

        if(signal.sdp){            
            connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {                
                if(signal.sdp.type == 'offer') {
                    connections[fromId].createAnswer().then(function(description){
                        connections[fromId].setLocalDescription(description).then(function() {
                            socket.emit('signal', fromId, JSON.stringify({'sdp': connections[fromId].localDescription}));
                        }).catch(e => console.log(e));        
                    }).catch(e => console.log(e));
                }
            }).catch(e => console.log(e));
        }
    
        if(signal.ice) {
            connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
        }                
    }
}
function getminhegit(id)
{
  var test_elements = document.querySelectorAll("video");
  var min_height = 0;
  var arr = [];
  if(test_elements.length>1)
  {
  for (var i = 0; i < test_elements.length; i++) {
    if(id !=  test_elements[i].parentNode.id)
    {
        var test_elements_height = test_elements[i].clientHeight;
        arr[i] = test_elements_height;    
    }
    //alert(test_elements_width);
    // min_height = Math.min(min_height, test_elements_width);
    }
  }
    min_height = Math.min.apply(Math, arr); 
    
      for (var i = 0; i < test_elements.length; i++) {
        if(min_height >0) 
            test_elements[i].style.height  = min_height + "px";
        else
            test_elements[i].style.height  = "auto";
    }  
  
  return min_height;
}
