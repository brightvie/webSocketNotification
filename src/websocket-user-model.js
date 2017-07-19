'use strict';

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
    this.users[socketId] = user;
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
  }
};


module.exports = WebSocketUserModel;

