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

app.get('/admin', function(req, res){
  res.sendFile(__dirname + '/admin.html');
//  res.send('<h1>Hello world</h1>');
});



/**
 * WebSocketにおけるユーザ管理用のModel
 */
class WebSocketUserModel {

  constructor(systemName) {
    this.systemName = systemName || 'defaults';
    this.users = {};
  }

  login(socketId, options) {
    var user = {};
    user.socketId = socketId;

    // system名のチェック
    if (options.systemName) {
      user.systemName = options.systemName;
    } else {
      user.systemName = this.systemName;
    }

    // user_idをチェック
    if (options.userId) {
      user.userId = options.userId;
    } else {
      user.userId = socketId;
    }

    // groupのチェック
    if (options.groups && options.groups.length > 0) {
      user.groups = options.groups;
    } else {
      user.groups = [];
    }
    /*
      loginUser.groups.forEach((value) => {
        var groupName = loginUser.systemName + value;
        socket.join(groupName);
      });
    */
    this.users[socketId] = user;

    console.log('ログイン中のユーザ');
    console.log(this.users);
    return user;
  }

  getLoginUsers() {
    var users = this.users;
    return Object.keys(users).map(function (key) { return users[key]; });
  }

  getUser(socketId) {
    return this.users[socketId];
  }

  /**
   * userIdを元にユーザを検索する
   */
  getUserFromUserId(userId) {
    var users = this.users;
    var socketId =  Object.keys(users).find(function (key) { 
      return users[key].userId === userId;
    });
    if (socketId) {
      return users[socketId];
    }
    return null;
  }

  logout(socketId) {
    if (this.getUser(socketId)) {
      delete this.users[socketId];
    }
    console.log('ログイン中のユーザ');
    console.log(this.users);
  }

};


/**
 * BrigtVieライブラリからの共通の処理はnotification_をプレフィックスにつける
 */

var userModel = new WebSocketUserModel();

io.on('connection', function(socket){

  // ログイン処理
  socket.on('login', function(loginUser) {
    var user = userModel.login(socket.id, loginUser);

    // システムのグループにジョインさせる
    socket.join(user.systemName);

    // グループ指定がある場合は、対象のグループにジョインさせる
    // - グループは、
    user.groups.forEach((value) => {
      //var groupName = user.systemName + value;
      var groupName = value;
      socket.join(groupName);
    });
    // 管理者にのみユーザがログアウトした旨を通知する
    io.to('Admin').emit('notification_user_list', userModel.getLoginUsers());
  });

  // 接続終了したときの処理
  socket.on('disconnect', function(){
    var logoutUser = userModel.getUser(socket.id);
    userModel.logout(socket.id);
    // 管理者にのみユーザがログアウトした旨を通知する
    io.to('Admin').emit('notification_user_list', userModel.getLoginUsers());
  });


  // 外部からリクエストを送る場合
  app.post('/notification', function(req, res){
    console.log(req.body);

    var resMsg = '';
    var isError = false;

    // 指定がない場合は、全コネクションを貼っているユーザに通知
    // - 現状は、all, system, group, user の4種類
    var sendType = req.body.type || 'all';

    // 基本的に配列で受け取る
    var target = [];
    if (req.body.target && req.body.target.length > 0) {
      target = req.body.target;
    }

    // 送信用のメッセージの設定
    var sendMessage = {};
    if (req.body.message) {
      try {
        sendMessage.message = JSON.parse(req.body.message);
      } catch(e) {
        res.send({statusCode: 500, message: 'JSONを解析出来ませんでした', target: target}, 500);
      }
    };


    // 送信するメッセージには、受信日や送信タイプを付与しておく
    sendMessage.sendDate = new Date();
    sendMessage.sendType = sendType;
    console.log('送信内容');
    console.log(sendMessage);


    // 全接続ユーザに通知
    if (sendType === 'all') {
      resMsg = '[notification] 全接続ユーザに通知しました。';
      console.log(resMsg);
      socket.broadcast.emit('notification', sendMessage);
 
    // システム または グループ に対して通知する
    } else if (sendType === 'system' || sendType === 'group') {
      resMsg = '[notification] ' + sendType + 'に属するユーザに通知しました。';
      console.log(resMsg);
      req.body.target.forEach((val) => {
        io.to(val).emit('notification', sendMessage);
      });

    // ユーザ個別に通知する
    } else if (sendType === 'user') {
      resMsg = '[notification] 個別ユーザに通知しました。';
      console.log(resMsg);
      req.body.target.forEach((userId) => {
        var user = userModel.getUserFromUserId(userId)
        if (user) {
          console.log('通知ユーザ');
          console.log(user);
          socket.to(user.socketId).emit('notification', sendMessage);
        } else {
          resMsg = 'Error: ユーザが見つかりませんでした。 userId = ' + userId;
          console.log(resMsg);
          isError = true;
        }
      });
    } else {
      resMsg = '通知先の指定が正しくないので送信しません';
      console.log(resMsg);
      isError = true;
    }

    if (isError) {
      res.send({statusCode: 500, message: resMsg, target: target}, 500);
    } else {
      res.send({statusCode: 200, message: resMsg, target: target}, 200);
    }

  });

  // chat messageというイベントを受け取ったときの処理
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
    socket.emit('chat message', msg);
  });

});


http.listen(3000, function(){
  console.log('listening on *:3000');
});



