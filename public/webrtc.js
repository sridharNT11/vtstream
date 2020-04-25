var localVideo;
var firstPerson = false;
var socketCount = 0;
var socketId;
var localStream;
var connections = [];
var clients = [];
var isFirefox = false;
var isChrome = false;
var constraints = {
        video: true,
        audio: true,
    };

var btnScreenShare = document.getElementById("btnScreenShare");
var btnCamera = document.getElementById("btnCamera");
var container = document.getElementById("container");


localVideo = document.getElementById('localVideo');

//remoteVideo = document.getElementById('remoteVideo');

videoResize();
document.getElementsByTagName("BODY")[0].onresize = function() {videoResize()};



var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
        {
          url: 'turn:numb.viagenie.ca',
          credential: 'sridharan',
          username: 'sridharan.r@numerotec.com'
        }
    ]
};


// https://www.geeksforgeeks.org/how-to-detect-the-user-browser-safari-chrome-ie-firefox-and-opera-using-javascript/
if (navigator.userAgent.indexOf('Chrome') > -1)
{
    isChrome = true;
}
if (navigator.userAgent.indexOf('Firefox') > -1)
{
    isFirefox = true;
}



btnScreenShare.addEventListener("click", function()
{
    var screen =  new  startScreenCapture();
    screen.then(
      stream => {
      if (localVideo) {
        if(!navigator.getDisplayMedia && !navigator.mediaDevices.getDisplayMedia) {
            if(isChrome)
            {
                $('#Modal').modal('show');
            }
            else
            {
                alert("Your browser does NOT supports Screen Sharing.");
            }
        }
        localVideo.srcObject = stream;
        localStream = stream;
        clientsConnection(true);
        btnScreenShare.style.display = "none";   
        btnCamera.style.display = "block";   
      }
    });
});


btnCamera.addEventListener("click", function()
{

    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(getUserMediaSuccess)
             .then(function(){
                clientsConnection(true);
             });
    } 

    btnCamera.style.display = "none";   
    btnScreenShare.style.display = "block";   
    

});




function  startScreenCapture() {
    if (navigator.getDisplayMedia) {
        return navigator.getDisplayMedia({audio:true,video: true});
    } else if (navigator.mediaDevices.getDisplayMedia && !isFirefox) {
        return navigator.mediaDevices.getDisplayMedia({audio:true, video: true});
    } else {
        return navigator.mediaDevices.getUserMedia({audio:true,video: {mediaSource: 'screen'}});
    }
}


function pageReady() {

    // localVideo = document.getElementById('localVideo');
    // remoteVideo = document.getElementById('remoteVideo');

    

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
                        delete connections[id]
                        var div = document.getElementById(id);
                        if(div)
                        {

                            div.remove();
                        }
                        videoResize()

                    });


                    socket.on('user-joined', function(id, count, _clients){
                        // console.log("clients : " + clients)
                        // console.log("count : " + count)
                        // console.log("id : " + id)
                        // console.log("socketId : " + socketId)
                        // //alert("id : " + id)

                        socketCount = count;
                        clients = _clients;

                        clientsConnection(false);

                         if(count >= 2){
                            connections[id].createOffer().then(function(description){
                                connections[id].setLocalDescription(description).then(function() {
                                    // console.log(connections);
                                    socket.emit('signal', id, JSON.stringify({'sdp': connections[id].localDescription}));
                                }).catch(e => console.log(e));        
                            });
                        }

                        //Create an offer to connect with your local description
                        
                        
                    });                    
                })  

                // localStream.getVideoTracks()[0].addEventListener('ended', function()
                // {
                //     console.log('screensharing has ended')
                //     if(btnCamera.style.display === "none")
                //     {
                //             btnScreenShare.style.display = "block";   
                //             btnCamera.style.display = "block";   
                //     }
                //     else
                //     {
                //             btnCamera.style.display = "none";   
                //             btnScreenShare.style.display = "block";   
                //     }
                // });     
        
            }); 
    } else {
        alert('Your browser does not support getUserMedia API');
    } 
}


function clientsConnection(isupdatestream)
{
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
                    console.log('SENDING ICE New');
                    socket.emit('signal', socketListId, JSON.stringify({'ice': event.candidate}));
                }
            }

            //Wait for their video stream

            // connections[socketListId].onaddstream = function(event){
            //  //   alert("new user :" + socketListId)
            //     gotRemoteStream(event, socketListId)
            // }    

            connections[socketListId].ontrack = function({ streams: [stream] }) {
             event = {"stream": stream}   
              gotRemoteStream(event, socketListId)
            };

            //Add the local video stream
            if(connections[socketListId])
            {
                // connections[socketListId].removeStream(localStream);
                //connections[socketListId].addStream(localStream);       
                localStream.getTracks().forEach(track => connections[socketListId].addTrack(track, localStream));
            }

            // localStream.getTracks().forEach(track => connections[socketListId].addTrack(track, localStream));                                                         
        }
        else if(isupdatestream)
        {
            //update the local video stream
            if(connections[socketListId])
            {   
                let videoTrack = localStream.getVideoTracks()[0];
                var sender = connections[socketListId].getSenders().find(function(s) {
                    return s.track.kind == videoTrack.kind;
                });
                console.log('found sender:', sender);
                sender.replaceTrack(videoTrack);

            }
        }
    });
                       
}



function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideo.srcObject = stream;
}

function gotRemoteStream(event, id) {
    var video = document.querySelector('[data-socket="'+ id +'"]');
    //video elemet aleady here update remoote stream  else we will create new video element 
    if(video)
    {       
        video.srcObject         = event.stream;
    }
    else 
    {
        // this new joind users video stream create 
        var videos = document.querySelectorAll('video'),
            video  = document.createElement('video'),
            div_col    = document.createElement('div')
            div    = document.createElement('div')

        

        video.setAttribute('data-socket', id);
        video.setAttribute('class','embed-responsive-item')
        video.srcObject         = event.stream;
        video.autoplay    = true; 
        // video.muted       = true;
        video.playsinline = true;
        
        div_col.setAttribute("id",id)
        div_col.setAttribute("class","col-6")
        //div_col.appendChild(div);      
        div_col.appendChild(video)
        document.querySelector('.videos').appendChild(div_col);   
    }
    videoResize();
    //getminhegit(id);
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






function videoResize()
{

// 320px
// 480px
// 600px
// 768px
// 900px
// 1024px
// 1200px

    var page_width = container.offsetWidth;
                console.log(page_width);
                
                var r_21by9 = "embed-responsive embed-responsive-21by9";
                var r_16by9 = "embed-responsive embed-responsive-16by9";
                var r_4by3  = "embed-responsive embed-responsive-4by3";
                var r_1by1  = "embed-responsive embed-responsive-1by1";
                var col_6   = "col-6";
                var col_4   = "col-4";
                var col_3   = "col-3";
                var col_2   = "col-2";
                var col_1   = "col-1";
                var childCount = document.querySelector(".row").childElementCount;
                var cls = col_6 + " " + r_1by1; 

                if(page_width <= 480)
                {
                   cls = col_6 + " " + r_1by1; 
                   console.log(page_width + " " + 480)
                }
                else if(page_width <= 600)
                {   
                    cls = col_6 + " " + r_1by1; 
                    console.log(page_width + " " + 600)
                }
                else if(page_width <= 768)
                {
                    if(childCount <= 2)
                        cls = col_6 + " " + r_1by1;
                    else if(childCount<= 4)
                        cls = col_6 + " " + r_16by9;
                    else 
                        cls = col_4 + " " + r_1by1;
                    
                   console.log(page_width + " " + 768)
                }
                else if(page_width <= 1024)
                {
                    if(childCount <= 2)
                        cls = col_6 + " " + r_1by1;
                    else if(childCount<= 4)
                        cls = col_6 + " " + r_16by9;
                    else if(childCount <= 6)
                        cls = col_4 + " " + r_1by1;
                    else 
                        cls = col_3 + " " + r_1by1;
                    
                    
                   console.log(page_width + " " + 1024)
                }
                // else if(page_width <= 1200)
                else
                {
                    if(childCount <= 2)
                        cls = col_6 + " " + r_1by1;
                    else if(childCount<= 4)
                        cls = col_6 + " " + r_16by9;
                    else if(childCount <= 6)
                        cls = col_4 + " " + r_1by1;
                    else if(childCount <= 8)
                        cls = col_3 + " " + r_1by1;
                    // else if(childCount <= 18)
                    else
                        cls = col_2 + " " + r_1by1;
                    // else 
                    //     cls = col_1 + " " + r_1by1;
                     
                    console.log(page_width + " " + 1200)   
                    console.log(cls);   
                }



                for(i = 0; i < childCount; i++) {
                   document.querySelector(".row").children[i].className = cls;
                }  
}
