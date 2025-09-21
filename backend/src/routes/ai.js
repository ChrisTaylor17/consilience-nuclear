const express = require('express');
const router = express.Router();

// In-memory storage for nuclear version
const userProfiles = new Map();
const chatData = new Map();
const activeUsers = new Set();

// Simple AI matching service
class SimpleAIMatchingService {
  analyzeUserFromMessages(walletAddress) {
    const messages = chatData.get(walletAddress) || [];
    if (messages.length === 0) {
      return {
        skills: ['blockchain', 'solana'],
        interests: ['collaboration'],
        communicationStyle: 'balanced',
        activityLevel: 'medium',
        expertise: 'intermediate'
      };
    }

    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    const skills = [];
    const interests = [];

    // Detect skills
    if (content.includes('solana') || content.includes('sol')) skills.push('solana');
    if (content.includes('rust')) skills.push('rust');
    if (content.includes('javascript') || content.includes('js')) skills.push('javascript');
    if (content.includes('react')) skills.push('react');
    if (content.includes('smart contract')) skills.push('smart contract');
    if (content.includes('nft')) skills.push('nft');
    if (content.includes('defi')) skills.push('defi');
    if (content.includes('frontend')) skills.push('frontend');
    if (content.includes('backend')) skills.push('backend');
    if (content.includes('design')) skills.push('design');

    // Detect interests
    if (content.includes('marketplace')) interests.push('marketplace');
    if (content.includes('game') || content.includes('gaming')) interests.push('gaming');
    if (content.includes('dao')) interests.push('dao');
    if (content.includes('token')) interests.push('token');

    return {
      skills: skills.length > 0 ? skills : ['blockchain', 'solana'],
      interests: interests.length > 0 ? interests : ['collaboration'],
      communicationStyle: messages.length > 10 ? 'active' : 'balanced',
      activityLevel: messages.length > 20 ? 'high' : messages.length > 5 ? 'medium' : 'low',
      expertise: content.includes('deploy') || content.includes('production') ? 'expert' : 
                content.includes('learn') || content.includes('help') ? 'beginner' : 'intermediate'
    };
  }

  findMatches(walletAddress) {
    const userProfile = this.analyzeUserFromMessages(walletAddress);
    const matches = [];

    for (const [otherWallet, messages] of chatData) {
      if (otherWallet === walletAddress) continue;
      
      const otherProfile = this.analyzeUserFromMessages(otherWallet);
      const commonSkills = userProfile.skills.filter(skill => otherProfile.skills.includes(skill));
      const score = commonSkills.length / Math.max(userProfile.skills.length, otherProfile.skills.length, 1);

      if (score > 0.2) {
        matches.push({
          walletAddress: otherWallet,
          score,
          commonSkills,
          recommendedRole: this.suggestRole(userProfile, otherProfile)
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  suggestRole(userProfile, matchProfile) {
    if (userProfile.expertise === 'expert' && matchProfile.expertise === 'beginner') return 'mentor';
    if (userProfile.skills.includes('frontend') && matchProfile.skills.includes('backend')) return 'frontend-lead';
    if (userProfile.skills.includes('backend') && matchProfile.skills.includes('frontend')) return 'backend-lead';
    if (userProfile.skills.includes('design')) return 'design-lead';
    return 'collaborator';
  }

  generateIntroduction(user1Address, user2Address, context) {
    const user1Profile = this.analyzeUserFromMessages(user1Address);
    const user2Profile = this.analyzeUserFromMessages(user2Address);
    
    const commonSkills = user1Profile.skills.filter(skill => user2Profile.skills.includes(skill));
    const compatibility = commonSkills.length / Math.max(user1Profile.skills.length, user2Profile.skills.length, 1);

    return {
      introduction: `🤝 **Smart Introduction**\n\n**${user1Address.slice(0,8)}** ↔️ **${user2Address.slice(0,8)}**\n\n**Compatibility:** ${Math.round(compatibility*100)}%\n**Common Skills:** ${commonSkills.join(', ') || 'Complementary expertise'}\n**Context:** ${context}\n\nYou should collaborate!`,
      compatibility: { score: compatibility, commonSkills }
    };
  }
}

const aiService = new SimpleAIMatchingService();

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, walletAddress, currentChannel } = req.body;
    
    // Store message
    if (!chatData.has(walletAddress)) {
      chatData.set(walletAddress, []);
    }
    chatData.get(walletAddress).push({
      content: message,
      timestamp: new Date(),
      channel: currentChannel?.name || 'general'
    });
    
    activeUsers.add(walletAddress);
    
    const userProfile = aiService.analyzeUserFromMessages(walletAddress);
    const matches = aiService.findMatches(walletAddress);
    
    // Generate response based on message content
    let response = '';
    
    if (message.toLowerCase().includes('cofounder') || message.toLowerCase().includes('partner') || message.toLowerCase().includes('collaborator')) {
      if (matches.length > 0) {
        const topMatch = matches[0];
        response = `I found a potential collaborator: **${topMatch.walletAddress.slice(0,8)}**\n\n• ${Math.round(topMatch.score*100)}% compatibility\n• Common skills: ${topMatch.commonSkills.join(', ')}\n• Suggested role: ${topMatch.recommendedRole}\n\nWant me to introduce you?`;
      } else {
        response = `I don't see any obvious matches right now. There are ${activeUsers.size} active users.\n\nTell me more about your project - what skills are you looking for?`;
      }
    } else if (message.toLowerCase().includes('yes') && matches.length > 0) {
      const topMatch = matches[0];
      const intro = aiService.generateIntroduction(walletAddress, topMatch.walletAddress, 'Collaboration request');
      response = `Great! Here's your introduction:\n\n${intro.introduction}\n\nYou can now connect directly!`;
    } else if (message.toLowerCase().includes('create task') || message.toLowerCase().includes('task')) {
      response = `✅ **Task Created!**\n\n**Smart Contract Development**\nDevelop and test smart contracts for your project\n\n• Estimated: 8-12 hours\n• Skills needed: ${userProfile.skills.slice(0,3).join(', ')}\n• Priority: High\n\nTask added to your project board!`;
    } else if (message.toLowerCase().includes('nft')) {
      response = `🎨 I can help you create NFTs! The system will generate a unique NFT for your wallet.\n\nJust use the "CREATE NFT" button in the sidebar.`;
    } else if (message.toLowerCase().includes('token')) {
      response = `🪙 Token creation is available! You can create custom tokens on Solana.\n\nUse the "CREATE TOKEN" button or let me know what kind of token you want to create.`;
    } else {
      response = `I can help you with:\n• Finding collaborators (${matches.length} potential matches)\n• Creating tasks and projects\n• Token and NFT creation\n• Blockchain development\n\nWhat would you like to work on?`;
    }
    
    res.json({
      response,
      userAnalysis: userProfile,
      suggestedMatches: matches.slice(0, 3)
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      response: 'AI service temporarily unavailable. Please try again.'
    });
  }
});

// Matches endpoint
router.get('/matches/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const userProfile = aiService.analyzeUserFromMessages(walletAddress);
    const matches = aiService.findMatches(walletAddress);
    
    res.json({
      success: true,
      matches,
      userProfile,
      totalUsers: chatData.size,
      activeUsers: activeUsers.size
    });
  } catch (error) {
    console.error('Matches error:', error);
    res.status(500).json({ success: false, error: 'Failed to get matches' });
  }
});

// Analytics endpoint
router.get('/analytics', async (req, res) => {
  try {
    const totalMessages = Array.from(chatData.values()).reduce((sum, messages) => sum + messages.length, 0);
    const topSkills = {};
    
    for (const [wallet, messages] of chatData) {
      const profile = aiService.analyzeUserFromMessages(wallet);
      profile.skills.forEach(skill => {
        topSkills[skill] = (topSkills[skill] || 0) + 1;
      });
    }
    
    res.json({
      success: true,
      analytics: {
        totalUsers: chatData.size,
        activeUsers: activeUsers.size,
        totalMessages,
        totalInteractions: totalMessages,
        topSkills,
        platformHealth: {
          activeUserRatio: activeUsers.size / Math.max(chatData.size, 1)
        }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
});

module.exports = router;