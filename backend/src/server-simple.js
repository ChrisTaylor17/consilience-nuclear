const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://consilience-nuclear.netlify.app"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage
const users = new Map();
const projects = new Map();
const collaborations = new Map();

// AI matching route
app.post('/api/ai/match', (req, res) => {
  const { userProfile, preferences } = req.body;
  
  // Simple matching logic
  const matches = Array.from(users.values())
    .filter(user => user.id !== userProfile.id)
    .slice(0, 3)
    .map(user => ({
      id: user.id,
      name: user.name,
      skills: user.skills || [],
      compatibility: Math.floor(Math.random() * 40) + 60
    }));

  res.json({ matches });
});

// User routes
app.post('/api/users/register', (req, res) => {
  const { name, email, skills } = req.body;
  const id = Date.now().toString();
  const user = { id, name, email, skills };
  users.set(id, user);
  res.json({ user, token: `token_${id}` });
});

app.post('/api/users/login', (req, res) => {
  const { email } = req.body;
  const user = Array.from(users.values()).find(u => u.email === email);
  if (user) {
    res.json({ user, token: `token_${user.id}` });
  } else {
    res.status(401).json({ error: 'User not found' });
  }
});

// Project routes
app.get('/api/projects', (req, res) => {
  res.json(Array.from(projects.values()));
});

app.post('/api/projects', (req, res) => {
  const { title, description, skills } = req.body;
  const id = Date.now().toString();
  const project = { id, title, description, skills, createdAt: new Date() };
  projects.set(id, project);
  res.json(project);
});

// Blockchain routes
app.post('/api/blockchain/create-token', (req, res) => {
  const { name, symbol, supply } = req.body;
  const token = {
    id: Date.now().toString(),
    name,
    symbol,
    supply,
    address: `0x${Math.random().toString(16).substr(2, 40)}`,
    createdAt: new Date()
  };
  res.json(token);
});

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-collaboration', (collaborationId) => {
    socket.join(collaborationId);
  });
  
  socket.on('chat-message', (data) => {
    socket.to(data.collaborationId).emit('chat-message', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});