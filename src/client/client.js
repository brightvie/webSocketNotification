/**
 * 必ずこのファイルの読み込み前に下記行を追加お願いします。
 * ```
 * <script src="/socket.io/socket.io.js"></script>
 * var client = new BrightVieWebSocketClient();
 * client.setOptions(obj);
 * // WebSocketのコネクションを貼る
 * var webSocket = client.getInstance(io);
 * ```
 */
var BrightVieWebSocketClient = function() {
  this.loginUser = {
                      systemName: null,
                      userId: null,
                      groups:[]
                    };

  var setOptions = function(options) {
    if (options.systemName) {
      this.loginUser.systemName = options.systemName;
    }
    if (options.userId) {
      this.loginUser.userId = options.userId;
    }
    if (options.groups) {
      this.loginUser.groups = options.groups;
    }
  };
  this.setOptions = setOptions;


  var getInstance = function(socketIO, url) {
    url = url || null;

    var socket = socketIO(url);

    // ログインユーザの情報をサーバに通知
    socket.emit('login', this.loginUser);

    // サーバ側からの通知を受け取る
    socket.on('notification', function(res) {
      console.log('[on.notification] サーバからメッセージを受信');
      console.log(res);
    });

    return socket;
  };
  this.getInstance = getInstance;
};

