/**
 * 必ずこのファイルの読み込み前に下記行を追加お願いします。
 * ```
 * <script src="/socket.io/socket.io.js"></script>
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


  var getInstance = function(url) {
    url = url || null;

    var socket = io(url);

    // ログインユーザの情報をサーバに通知
    socket.emit('login', this.loginUser);

    // サーバ側から接続解除されたときの処理を記載
    socket.on('http notification', function(msg) {
      console.log(msg);
    });

    return socket;
  };
  this.getInstance = getInstance;
};
