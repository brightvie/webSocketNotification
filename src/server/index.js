
/**
 * BrigtVieライブラリからの共通の処理はnotification_をプレフィックスにつける
 */
var WebSocketUserModel = require('./websocket-user-model');

class WebSocketNotification {

  constructor(systemName) {
    this.userModel = new WebSocketUserModel();
  }


  _login(io, socket, loginUser) {
    var user = this.userModel.login(socket.id, loginUser);

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
    io.to('Admin').emit('notification_user_list', this.userModel.getLoginUsers());
  }

  _disconnect(io, socket) {
    var logoutUser = this.userModel.getUser(socket.id);
    this.userModel.logout(socket.id);
    // 管理者にのみユーザがログアウトした旨を通知する
    io.to('Admin').emit('notification_user_list', this.userModel.getLoginUsers());
  }


  _postNotification(io, socket, req, res) {
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

      // 文字列だったらJSONに置き換える
      if (typeof req.body.message === "string") {
        try {
          sendMessage.message = JSON.parse(req.body.message);
        } catch(e) {
          res.send({statusCode: 500, message: 'JSONを解析出来ませんでした', target: target}, 500);
        }
      } else {
        sendMessage.message = req.body.message;
      }
    };


    // 送信するメッセージには、受信日や送信タイプを付与しておく
    sendMessage.sendDate = new Date();
    sendMessage.sendType = sendType;


    // 全接続ユーザに通知
    if (sendType === 'all') {
      resMsg = '[notification] 全接続ユーザに通知しました。';
      socket.broadcast.emit('notification', sendMessage);
 
    // システム または グループ に対して通知する
    } else if (sendType === 'system' || sendType === 'group') {
      resMsg = '[notification] ' + sendType + 'に属するユーザに通知しました。';
      req.body.target.forEach((val) => {
        io.to(val).emit('notification', sendMessage);
      });

    // ユーザ個別に通知する
    } else if (sendType === 'user') {
      resMsg = '[notification] 個別ユーザに通知しました。';
      req.body.target.forEach((userId) => {
        var user = this.userModel.getUserFromUserId(userId)
        if (user) {
          socket.to(user.socketId).emit('notification', sendMessage);
        } else {
          resMsg = 'Error: ユーザが見つかりませんでした。 userId = ' + userId;
          isError = true;
        }
      });
    } else {
      resMsg = '通知先の指定が正しくないので送信しません';
      isError = true;
    }

    if (isError) {
      res.send({statusCode: 500, message: resMsg, target: target}, 500);
    } else {
      res.send({statusCode: 200, message: resMsg, target: target}, 200);
    }
  }

  /**
   * デフォルトのメソッドを定義する
   * - socket: on.login
   * - socket: on.disconnect
   * - POST  : /notification
   */
  setMethod(io, socket, app) {

    // ログイン処理
    socket.on('login', (loginUser) => {
      this._login(io, socket, loginUser);
    });

    // 接続終了したときの処理
    socket.on('disconnect', () => {
      this._disconnect(io, socket);
    });

    // 外部からリクエストを送る場合
    app.post('/notification', (req, res) => {
      this._postNotification(io, socket, req, res);
    });

    return [socket, io, app];
  }
}




module.exports = WebSocketNotification;

