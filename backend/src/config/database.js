const { Pool } = require('pg');
const Redis = require('redis');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/consilience',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(44) UNIQUE NOT NULL,
        username VARCHAR(50),
        skills TEXT[],
        interests TEXT[],
        experience_level VARCHAR(20) DEFAULT 'beginner',
        reputation_score INTEGER DEFAULT 0,
        tokens_earned BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        last_active TIMESTAMP DEFAULT NOW(),
        profile_data JSONB DEFAULT '{}'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        creator_wallet VARCHAR(44),
        status VARCHAR(20) DEFAULT 'active',
        project_type VARCHAR(50),
        required_skills TEXT[],
        team_size INTEGER DEFAULT 1,
        funding_goal BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_wallet VARCHAR(44),
        channel VARCHAR(50),
        project_id INTEGER,
        content TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text',
        created_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      );
    `);

    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database error:', error);
  }
};

module.exports = { pool, redis, initDatabase };