const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');
require('dotenv').config();

const { initDatabase, redis } = require('./config/database');
const { rateLimiter } = require('./middleware/auth');
const userService = require('./services/userService');
const projectService = require('./services/projectService');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter(1000, 15 * 60 * 1000)); // 1000 requests per 15 minutes

// Import routes
const aiRoutes = require('./routes/ai');
const blockchainRoutes = require('./routes/blockchain');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');

// Use routes
app.use('/api/ai', aiRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);

// Socket.io for real-time chat
const activeUsers = new Set();
const projectRooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('message', (data) => {
    if (data.roomId) {
      // Project room message
      socket.to(data.roomId).emit('project_message', data);
    } else {
      // Channel message
      socket.broadcast.emit('message', data);
    }
  });
  
  socket.on('create_project_room', (data) => {
    const roomId = `room_${Date.now()}`;
    const room = {
      id: roomId,
      name: data.projectName,
      creator: data.walletAddress,
      description: data.description,
      members: [data.walletAddress],
      createdAt: new Date()
    };
    
    projectRooms.set(roomId, room);
    socket.join(roomId);
    
    socket.emit('project_room_created', { room, roomId });
  });
  
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    activeUsers: activeUsers.size,
    projectRooms: projectRooms.size,
    timestamp: new Date().toISOString()
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await initDatabase();
    await redis.connect();
    
    server.listen(PORT, () => {
      logger.info(`🚀 CONSILIENCE NUCLEAR Backend running on port ${PORT}`);
      logger.info(`✅ Database connected`);
      logger.info(`✅ Redis connected`);
      logger.info(`✅ AI matching system active`);
      logger.info(`✅ Blockchain services ready`);
      logger.info(`✅ Real-time chat enabled`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});