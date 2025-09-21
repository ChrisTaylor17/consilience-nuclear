const { pool } = require('../config/database');

class UserService {
  async createUser(walletAddress, profileData = {}) {
    const query = `
      INSERT INTO users (wallet_address, username, skills, interests, experience_level, profile_data)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (wallet_address) DO UPDATE SET
        last_active = NOW(),
        profile_data = $6
      RETURNING *;
    `;
    
    const values = [
      walletAddress,
      profileData.username || null,
      profileData.skills || [],
      profileData.interests || [],
      profileData.experienceLevel || 'beginner',
      profileData
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getUserByWallet(walletAddress) {
    const query = 'SELECT * FROM users WHERE wallet_address = $1';
    const result = await pool.query(query, [walletAddress]);
    return result.rows[0];
  }

  async updateUserActivity(walletAddress) {
    const query = 'UPDATE users SET last_active = NOW() WHERE wallet_address = $1';
    await pool.query(query, [walletAddress]);
  }

  async findMatches(walletAddress, limit = 10) {
    const query = `
      SELECT u.*, 
             array_length(array(SELECT unnest(u.skills) INTERSECT SELECT unnest(target.skills)), 1) as common_skills_count
      FROM users u
      CROSS JOIN (SELECT skills FROM users WHERE wallet_address = $1) target
      WHERE u.wallet_address != $1 
        AND u.last_active > NOW() - INTERVAL '7 days'
      ORDER BY common_skills_count DESC NULLS LAST, u.reputation_score DESC
      LIMIT $2;
    `;
    
    const result = await pool.query(query, [walletAddress, limit]);
    return result.rows;
  }

  async awardTokens(walletAddress, amount, reason) {
    const query = `
      UPDATE users 
      SET tokens_earned = tokens_earned + $2,
          reputation_score = reputation_score + $3
      WHERE wallet_address = $1
      RETURNING tokens_earned, reputation_score;
    `;
    
    const reputationBonus = Math.floor(amount / 10);
    const result = await pool.query(query, [walletAddress, amount, reputationBonus]);
    return result.rows[0];
  }

  async getLeaderboard(limit = 50) {
    const query = `
      SELECT wallet_address, username, reputation_score, tokens_earned, skills
      FROM users 
      ORDER BY reputation_score DESC, tokens_earned DESC
      LIMIT $1;
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}

module.exports = new UserService();