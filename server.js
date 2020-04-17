const express = require('express')
const app = express()
//const http = require('http').Server(app) 
const http = require('http')
const https = require('https')
// const io = require('socket.io')(http) 
const ioServer = require('socket.io') 
const port_http = process.env.PORT || 3000 //for http 
const port_https = process.env.PORT || 3443 // for https 
const debug  = require('debug')('https')

var fs = require('fs');


var opts = {
  key: fs.readFileSync('ssl_cert/privatekey.pem'),
  cert: fs.readFileSync('ssl_cert/server.crt')
};
var httpsServer = https.createServer(opts, app)
var httpServer = http.createServer(app);
var clients = 11
var activeSockets = []
var io = new ioServer()

app.use(express.static(__dirname + "/public"))



io.attach(httpServer);
io.attach(httpsServer);

//commanted by sridhar
io.on('connection', function (socket) {
    console.log(activeSockets)
    console.log('test for EC2')
    const existingSocket = activeSockets.find(
       existingSocket => existingSocket === socket.id
     );

    if (!existingSocket) {
       activeSockets.push(socket.id);
 
       socket.emit("update-user-list", {
         users: activeSockets.filter(
           existingSocket => existingSocket !== socket.id
         )
       });
 
       socket.broadcast.emit("update-user-list", {
         users: [socket.id]
       });
     }

     socket.on("call-user",CallUser);
     socket.on("make-answer",MakeAnswer);
     socket.on("reject-call",RejectCall);
     socket.on("disconnect",Disconnect);
 
    // socket.on("NewClient", function () {
    //     console.log(clients)
    //     //if (clients < 2) {
    //         // if (clients == 1) {
    //             this.emit('CreatePeer')
    //         // }
    //     //}
    //     // else
    //     //     this.emit('SessionActive')
    //     clients++;
    // })
    // socket.on('Offer', SendOffer)
    // socket.on('Answer', SendAnswer)
    // socket.on('disconnect', Disconnect)
})

function CallUser(data) {
    this.to(data.to).emit("call-made", {
          offer: data.offer,
          socket: this.id
    });
}

function MakeAnswer(data) {
    this.to(data.to).emit("answer-made", {
          socket: this.id,
          answer: data.answer
    });
}

function RejectCall(data) {
    this.to(data.from).emit("call-rejected", {
          socket: this.id
    });
}

function Disconnect() {
    activeSockets = activeSockets.filter(
          existingSocket => existingSocket !== this.id
        );
    this.broadcast.emit("remove-user", {
          socketId: this.id
    });
}

//old fun
function Disconnect_old() {
    console.log("Disconnect")
    if (clients > 0) {
        if (clients <= 2)
            console.log("Disconnect 2")
           this.broadcast.emit("Disconnect")
        clients--
    }
}

function SendOffer(offer) {
    console.log("SendOffer")
    this.broadcast.emit("BackOffer", offer)
}

function SendAnswer(data) {
    console.log("SendAnswer")
    this.broadcast.emit("BackAnswer", data)
}



httpServer.listen(port_http, () => console.log(`Active on ${port_http} port`))
httpsServer.listen(port_https, () => console.log(`Active on ${port_https} port`))
