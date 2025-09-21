const { pool } = require('../config/database');

class ProjectService {
  async createProject(projectData) {
    const query = `
      INSERT INTO projects (name, description, creator_wallet, project_type, required_skills, funding_goal, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    
    const values = [
      projectData.name,
      projectData.description,
      projectData.creatorWallet,
      projectData.projectType || 'general',
      projectData.requiredSkills || [],
      projectData.fundingGoal || 0,
      projectData.metadata || {}
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getProject(projectId) {
    const query = `
      SELECT p.*, u.username as creator_username,
             COUNT(c.user_wallet) as team_count
      FROM projects p
      LEFT JOIN users u ON p.creator_wallet = u.wallet_address
      LEFT JOIN collaborations c ON p.id = c.project_id AND c.status = 'active'
      WHERE p.id = $1
      GROUP BY p.id, u.username;
    `;
    
    const result = await pool.query(query, [projectId]);
    return result.rows[0];
  }

  async getActiveProjects(limit = 20) {
    const query = `
      SELECT p.*, u.username as creator_username,
             COUNT(c.user_wallet) as team_count,
             AVG(u2.reputation_score) as avg_team_reputation
      FROM projects p
      LEFT JOIN users u ON p.creator_wallet = u.wallet_address
      LEFT JOIN collaborations c ON p.id = c.project_id AND c.status = 'active'
      LEFT JOIN users u2 ON c.user_wallet = u2.wallet_address
      WHERE p.status = 'active'
      GROUP BY p.id, u.username
      ORDER BY p.created_at DESC
      LIMIT $1;
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  async joinProject(projectId, userWallet, role = 'contributor') {
    const query = `
      INSERT INTO collaborations (project_id, user_wallet, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (project_id, user_wallet) DO UPDATE SET
        status = 'active',
        role = $3
      RETURNING *;
    `;
    
    const result = await pool.query(query, [projectId, userWallet, role]);
    return result.rows[0];
  }

  async getProjectTeam(projectId) {
    const query = `
      SELECT c.*, u.username, u.skills, u.reputation_score
      FROM collaborations c
      JOIN users u ON c.user_wallet = u.wallet_address
      WHERE c.project_id = $1 AND c.status = 'active'
      ORDER BY c.joined_at;
    `;
    
    const result = await pool.query(query, [projectId]);
    return result.rows;
  }

  async updateProjectStatus(projectId, status, updatedBy) {
    const query = `
      UPDATE projects 
      SET status = $2, metadata = metadata || jsonb_build_object('updated_by', $3, 'updated_at', NOW())
      WHERE id = $1
      RETURNING *;
    `;
    
    const result = await pool.query(query, [projectId, status, updatedBy]);
    return result.rows[0];
  }
}

module.exports = new ProjectService();