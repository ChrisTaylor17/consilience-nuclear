const express = require('express');
const userService = require('../services/userService');
const { authenticateWallet } = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/profile/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = await userService.getUserByWallet(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update user profile
router.post('/profile', async (req, res) => {
  try {
    const { walletAddress, profileData } = req.body;
    const user = await userService.createUser(walletAddress, profileData);
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user matches
router.get('/matches/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { limit = 10 } = req.query;
    
    const matches = await userService.findMatches(walletAddress, parseInt(limit));
    
    res.json({ success: true, matches });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Award tokens to user
router.post('/award-tokens', async (req, res) => {
  try {
    const { walletAddress, amount, reason } = req.body;
    const result = await userService.awardTokens(walletAddress, amount, reason);
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const leaderboard = await userService.getLeaderboard(parseInt(limit));
    
    res.json({ success: true, leaderboard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user activity
router.post('/activity/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    await userService.updateUserActivity(walletAddress);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;