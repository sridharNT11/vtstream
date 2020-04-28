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

io.listen(httpServer);
io.listen(httpsServer);

app.use(express.static(__dirname + "/public"))

app.engine('html', require('ejs').renderFile);

app.get('/room/:room_id', function(req, res) {
  console.log()
  room_id = req.params.room_id;
  res.render(__dirname + "/public/room.html",{room_id,room_id});
});



//commanted by sridhar
// io.on('connection', function (socket) {
//     console.log(activeSockets)
//     console.log(socket.id)
//     const existingSocket = activeSockets.find(
//        existingSocket => existingSocket === socket.id
//      );

//     // if (!existingSocket) {
//     //    activeSockets.push(socket.id);
 
//     //    socket.emit("update-user-list", {
//     //       users: activeSockets.filter(
//     //         existingSocket => existingSocket !== socket.id
//     //       )
//     //    });
 
//     //    socket.broadcast.emit("update-user-list", {
//     //      users: [socket.id]
//     //    });
//     //  }




//      // socket.on("call-user",CallUser);
//      // socket.on("make-answer",MakeAnswer);
//      // socket.on("reject-call",RejectCall);
//      // socket.on("disconnect",Disconnect);




//   socket.on("update-user-list", () => {
//     broadcaster = socket.id;
//     console.log("update-user-list")
//     console.log(broadcaster)
//      if (!existingSocket) {
//        activeSockets.push(socket.id);
//        //all connection
//        socket.emit("update-user-list", {
//          users: activeSockets.filter(
//            existingSocket => existingSocket !== socket.id
//          ),
//          myid: socket.id
//          // users: activeSockets
//        });
//        //new connection
//        socket.broadcast.emit("update-user-list", {
//          users: [socket.id]
//        });

//      }
//   });




//     socket.on("offer", (id, message) => {
//       console.log("offer")
//       console.log(id)
//       console.log(socket.id)
//       socket.to(id).emit("offer", socket.id, message);
//     });

//     socket.on("answer", (id, message) => {
//       socket.to(id).emit("answer", socket.id, message);
//     });

//     socket.on("candidate", (id, message) => {
//       //console.log("candidate")
//       socket.to(id).emit("candidate", socket.id, message);
//     });

//     socket.on("disconnect", () => {
//       console.log("disconnect")
//       activeSockets = activeSockets.filter(
//           existingSocket => existingSocket !== socket.id
//       );
//       socket.broadcast.emit("disconnectPeer", socket.id);
//     });


 
//     // socket.on("NewClient", function () {
//     //     console.log(clients)
//     //     //if (clients < 2) {
//     //         // if (clients == 1) {
//     //             this.emit('CreatePeer')
//     //         // }
//     //     //}
//     //     // else
//     //     //     this.emit('SessionActive')
//     //     clients++;
//     // })
//     // socket.on('Offer', SendOffer)
//     // socket.on('Answer', SendAnswer)
//     // socket.on('disconnect', Disconnect)
// })

// function CallUser(data) {
//     this.to(data.to).emit("call-made", {
//           offer: data.offer,
//           socket: this.id
//     });
// }

// function MakeAnswer(data) {
//     this.to(data.to).emit("answer-made", {
//           socket: this.id,
//           answer: data.answer
//     });
// }

// function RejectCall(data) {
//     this.to(data.from).emit("call-rejected", {
//           socket: this.id
//     });
// }

// function Disconnect() {
//     activeSockets = activeSockets.filter(
//           existingSocket => existingSocket !== this.id
//         );
//     this.broadcast.emit("remove-user", {
//           socketId: this.id
//     });
// }

// //old fun
// function Disconnect_old() {
//     console.log("Disconnect")
//     if (clients > 0) {
//         if (clients <= 2)
//             console.log("Disconnect 2")
//            this.broadcast.emit("Disconnect")
//         clients--
//     }
// }

// function SendOffer(offer) {
//     console.log("SendOffer")
//     this.broadcast.emit("BackOffer", offer)
// }

// function SendAnswer(data) {
//     console.log("SendAnswer")
//     this.broadcast.emit("BackAnswer", data)
// }



io.on('connection', function(socket){

  console.log("i am socket");
  
  socket.on('join', function(room) {
    console.log("i am join : " + room);
    socket.room = room;
    socket.join(room);
    // console.log(socket.id + " now in rooms ", socket.rooms);
    var count =  io.sockets.adapter.rooms[room].length;
    var sockets =  io.sockets.adapter.rooms[room].sockets;
    console.log(io.in(socket.room).clients().sockets);

    io.sockets.in(socket.room).emit("user-joined", socket.id, count, Object.keys(sockets),socket.room);

  });
  
  
  socket.on('signal', (toId, message) => {
      // console.log(" to : " + toId)
      // console.log(" socket.id : " + socket.id)
      io.to(toId).emit('signal', socket.id, message);
      //socket.broadcast.to(socket.room).emit('signal', socket.id, message);
  });

  socket.on("message", function(data){
      console.log(" message : " + socket.room)
      io.sockets.in(socket.room).emit("broadcast-message", socket.id, data);
  })

  socket.on('disconnect', function() {
    console.log(" disconnect : " + socket.room)
    io.sockets.in(socket.room).emit("user-left", socket.id);
    socket.leave(socket.room);
  })
});


httpServer.listen(port_http, () => console.log(`Active on ${port_http} port`))
httpsServer.listen(port_https, () => console.log(`Active on ${port_https} port`))
