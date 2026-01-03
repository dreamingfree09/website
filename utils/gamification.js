const User = require('../models/User');
const Post = require('../models/Post');

// Badge definitions
const BADGES = {
  FIRST_POST: {
    name: 'First Post',
    icon: '✍️',
    description: 'Created your first post',
    criteria: async (userId) => {
      const postCount = await Post.countDocuments({ author: userId });
      return postCount >= 1;
    }
  },
  
  ACTIVE_MEMBER: {
    name: 'Active Member',
    icon: '⚡',
    description: 'Created 10 posts',
    criteria: async (userId) => {
      const postCount = await Post.countDocuments({ author: userId });
      return postCount >= 10;
    }
  },
  
  VETERAN: {
    name: 'Veteran',
    icon: '🏆',
    description: 'Created 100 posts',
    criteria: async (userId) => {
      const postCount = await Post.countDocuments({ author: userId });
      return postCount >= 100;
    }
  },
  
  POPULAR: {
    name: 'Popular',
    icon: '⭐',
    description: 'Received 100 total likes',
    criteria: async (userId) => {
      const posts = await Post.find({ author: userId });
      const totalLikes = posts.reduce((sum, post) => sum + post.likes.length, 0);
      return totalLikes >= 100;
    }
  },
  
  HELPFUL: {
    name: 'Helpful',
    icon: '🤝',
    description: 'Created 50 replies',
    criteria: async (userId) => {
      const posts = await Post.find({ 'replies.author': userId });
      let replyCount = 0;
      posts.forEach(post => {
        replyCount += post.replies.filter(r => r.author.toString() === userId.toString()).length;
      });
      return replyCount >= 50;
    }
  },
  
  INFLUENTIAL: {
    name: 'Influential',
    icon: '👑',
    description: 'Reputation over 1000',
    criteria: async (userId) => {
      const user = await User.findById(userId);
      return user && user.reputation >= 1000;
    }
  },
  
  EARLY_ADOPTER: {
    name: 'Early Adopter',
    icon: '🌟',
    description: 'Joined in the first month',
    criteria: async (userId) => {
      const user = await User.findById(userId);
      if (!user) return false;
      
      const firstUser = await User.findOne().sort({ createdAt: 1 });
      if (!firstUser) return false;
      
      const oneMonthAfterFirst = new Date(firstUser.createdAt);
      oneMonthAfterFirst.setMonth(oneMonthAfterFirst.getMonth() + 1);
      
      return user.createdAt <= oneMonthAfterFirst;
    }
  },
  
  CONVERSATION_STARTER: {
    name: 'Conversation Starter',
    icon: '💬',
    description: 'Post received 50+ replies',
    criteria: async (userId) => {
      const posts = await Post.find({ author: userId });
      return posts.some(post => post.replies.length >= 50);
    }
  }
};

// Check and award badges for a user
const checkAndAwardBadges = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const currentBadgeNames = user.badges.map(b => b.name);
    const newBadges = [];

    for (const [key, badge] of Object.entries(BADGES)) {
      // Skip if user already has this badge
      if (currentBadgeNames.includes(badge.name)) continue;

      // Check if user meets criteria
      const meetsСriteria = await badge.criteria(userId);
      
      if (meetsСriteria) {
        user.badges.push({
          name: badge.name,
          icon: badge.icon,
          earnedAt: new Date()
        });

        // Create notification
        user.notifications.push({
          type: 'badge',
          message: `Achievement unlocked: ${badge.name} ${badge.icon}`,
          link: `/profile.html?user=${user.username}`,
          read: false,
          createdAt: new Date()
        });

        newBadges.push(badge.name);

        // Award reputation points for earning badges
        user.reputation += 50;

        // Send real-time notification via WebSocket
        if (global.wsManager) {
          global.wsManager.sendNotification(userId, {
            type: 'badge',
            message: `🏆 Achievement unlocked: ${badge.name}!`,
            link: `/profile.html?user=${user.username}`
          });
        }
      }
    }

    if (newBadges.length > 0) {
      await user.save();
      console.log(`Awarded ${newBadges.length} badge(s) to ${user.username}:`, newBadges);
    }

    return newBadges;
  } catch (error) {
    console.error('Error checking badges:', error);
    return [];
  }
};

// Update user reputation based on activity
const updateReputation = async (userId, action) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const reputationPoints = {
      POST_CREATED: 10,
      POST_LIKED: 5,
      REPLY_CREATED: 3,
      POST_DELETED: -10,
      HELPFUL_REPLY: 15
    };

    const points = reputationPoints[action] || 0;
    user.reputation = Math.max(0, user.reputation + points);

    await user.save();

    // Check for badges after reputation update
    await checkAndAwardBadges(userId);

    return user.reputation;
  } catch (error) {
    console.error('Error updating reputation:', error);
  }
};

module.exports = {
  BADGES,
  checkAndAwardBadges,
  updateReputation
};
