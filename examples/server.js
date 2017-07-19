var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

// urlencodedとjsonは別々に初期化する
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


// ユーザ管理の仕組みの初期化も含めてここで実施
var WebSocketNotification = require('websocket-notification');
var webSocketNotification = new WebSocketNotification();


/**
 * 同じioインスタンスであれば、複数connectionを定義してもsokcet.idも同じになる
 * ioインスタンスが違う場合は、別のsokcet.idとなるので注意
 */
io.on('connection', function(socket){
  console.log('接続しました');
  console.log(socket.id);

  // WebSocket Notification Libraryで標準で用意されているメソッドを付与する
  // 同じイベントを複数記載することはかのうなため、
  // - ユーザ管理: login, disconnect
  // - 通知: POST /notification
  webSocketNotification.setMethod(io, socket, app);

  socket.on('disconnect', function(){
    console.log('接続が切れました');
    console.log(socket.id);
  });

});

http.listen(3000, function(){
  console.log('listening on *:3000');
});



