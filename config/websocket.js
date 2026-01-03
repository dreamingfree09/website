/**
 * config/websocket.js
 *
 * Socket.IO server manager.
 *
 * Maintains a connected-user map and initializes the chat namespace.
 */
const { Server } = require('socket.io');
const { Logger } = require('../utils/logger');
const User = require('../models/User');

class WebSocketManager {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
        credentials: true
      }
    });

    this.connectedUsers = new Map(); // userId -> socketId
    this.init();
  }

  init() {
    // Chat namespace (kept separate from main app events)
    try {
      const initChatNamespace = require('../chat/chatNamespace');
      this.chat = this.io.of('/chat');
      initChatNamespace(this.chat);
      Logger.info('Chat namespace initialized');
    } catch (error) {
      Logger.error('Chat namespace initialization failed; continuing without chat', {
        error: error?.message
      });
    }

    this.io.on('connection', (socket) => {
      Logger.info('WebSocket client connected', { socketId: socket.id });

      // Handle user authentication
      socket.on('authenticate', async (userId) => {
        try {
          const user = await User.findById(userId);
          if (user) {
            this.connectedUsers.set(userId, socket.id);
            socket.userId = userId;
            socket.join(`user:${userId}`);
            Logger.info('User authenticated', { userId, socketId: socket.id });
            
            // Send initial connection success
            socket.emit('authenticated', { 
              success: true,
              userId 
            });
          }
        } catch (error) {
          Logger.error('WebSocket authentication failed', { error: error.message });
        }
      });

      // Handle typing indicators
      socket.on('typing', (data) => {
        socket.to(`post:${data.postId}`).emit('user-typing', {
          username: data.username,
          postId: data.postId
        });
      });

      // Handle post interactions
      socket.on('join-post', (postId) => {
        socket.join(`post:${postId}`);
        Logger.info('User joined post room', { postId, socketId: socket.id });
      });

      socket.on('leave-post', (postId) => {
        socket.leave(`post:${postId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          Logger.info('User disconnected', { userId: socket.userId });
        }
      });
    });
  }

  // Send notification to specific user
  sendNotification(userId, notification) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
      Logger.info('Notification sent via WebSocket', { userId, type: notification.type });
    }
  }

  // Broadcast new post to all users
  broadcastNewPost(post) {
    this.io.emit('new-post', post);
    Logger.info('New post broadcasted', { postId: post._id });
  }

  // Send update to post room
  sendPostUpdate(postId, update) {
    this.io.to(`post:${postId}`).emit('post-update', update);
  }

  // Send like update
  sendLikeUpdate(postId, data) {
    this.io.to(`post:${postId}`).emit('like-update', data);
  }

  // Send new reply notification
  sendReplyNotification(postId, reply) {
    const payload = reply && typeof reply.toObject === 'function'
      ? reply.toObject()
      : reply;
    this.io.to(`post:${postId}`).emit('new-reply', {
      postId,
      ...payload
    });
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId.toString());
  }
}

module.exports = WebSocketManager;
