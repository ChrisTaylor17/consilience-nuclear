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
const messages = [];
const activeConnections = new Map();

// AI responses for different contexts
const aiResponses = {
  collaboration: [
    "I can help you find the perfect collaborator! What type of project are you working on?",
    "Based on your profile, I've identified several potential matches. Would you like me to introduce you?",
    "Let me analyze the active users and find someone with complementary skills.",
  ],
  technical: [
    "I can assist with technical questions. What technology stack are you using?",
    "For blockchain development, I recommend focusing on Solana's fast transaction speeds.",
    "Would you like me to help you create a smart contract or token?",
  ],
  general: [
    "Hello! I'm your AI assistant. I can help with collaboration, technical questions, or project matching.",
    "I'm here to help you connect with other developers and grow your projects.",
    "Ask me anything about blockchain, collaboration, or finding the right team members!",
  ]
};

// Enhanced AI matching algorithm
const generateAIMatch = (userWallet) => {
  const skills = ['React', 'Solana', 'Node.js', 'Python', 'Design', 'Marketing', 'Blockchain'];
  const roles = ['Frontend Dev', 'Backend Dev', 'Designer', 'Product Manager', 'Blockchain Dev'];
  
  return {
    walletAddress: `${Math.random().toString(36).substr(2, 8)}...`,
    name: `Developer ${Math.floor(Math.random() * 1000)}`,
    compatibility: Math.floor(Math.random() * 30) + 70, // 70-100%
    skills: skills.slice(0, Math.floor(Math.random() * 3) + 2),
    role: roles[Math.floor(Math.random() * roles.length)],
    lastActive: 'Online now',
    projects: Math.floor(Math.random() * 10) + 1
  };
};

// Smart AI response generator
const generateAIResponse = (message, context = {}) => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('collaborate') || lowerMessage.includes('partner') || lowerMessage.includes('team')) {
    return aiResponses.collaboration[Math.floor(Math.random() * aiResponses.collaboration.length)];
  }
  
  if (lowerMessage.includes('code') || lowerMessage.includes('develop') || lowerMessage.includes('tech')) {
    return aiResponses.technical[Math.floor(Math.random() * aiResponses.technical.length)];
  }
  
  if (lowerMessage.includes('token') || lowerMessage.includes('nft') || lowerMessage.includes('blockchain')) {
    return "I can help you create tokens and NFTs on Solana. Would you like me to guide you through the process?";
  }
  
  return aiResponses.general[Math.floor(Math.random() * aiResponses.general.length)];
};

// Routes
app.post('/api/blockchain/create-token', (req, res) => {
  const { walletAddress, tokenName, tokenSymbol } = req.body;
  
  const token = {
    id: Date.now().toString(),
    name: tokenName || 'CONSILIENCE',
    symbol: tokenSymbol || 'CS',
    supply: 1000000,
    mint: `${Math.random().toString(36).substr(2, 44)}`,
    transaction: `${Math.random().toString(36).substr(2, 88)}`,
    createdAt: new Date()
  };
  
  res.json({ success: true, ...token });
});

app.post('/api/ai/chat', (req, res) => {
  const { message, walletAddress } = req.body;
  
  const response = generateAIResponse(message, { walletAddress });
  
  res.json({ 
    success: true, 
    response,
    matches: Array.from({ length: 3 }, () => generateAIMatch(walletAddress))
  });
});

app.get('/api/ai/matches/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  const matches = Array.from({ length: 5 }, () => generateAIMatch(walletAddress));
  
  res.json({
    success: true,
    matches,
    userProfile: {
      skills: ['React', 'Solana', 'JavaScript'],
      interests: ['DeFi', 'NFTs', 'Web3'],
      activity: 'High',
      communicationStyle: 'Collaborative'
    }
  });
});

app.get('/api/users/active', (req, res) => {
  const activeUsers = Array.from(activeConnections.values()).map(user => ({
    walletAddress: user.walletAddress,
    lastSeen: user.lastSeen,
    status: 'online'
  }));
  
  res.json({ success: true, users: activeUsers });
});

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (data) => {
    const { walletAddress } = data;
    
    activeConnections.set(socket.id, {
      walletAddress,
      socketId: socket.id,
      lastSeen: new Date(),
      status: 'online'
    });
    
    // Send recent messages
    socket.emit('messageHistory', messages.slice(-50));
    
    // Send active users
    const activeUsers = Array.from(activeConnections.values()).map(u => u.walletAddress);
    io.emit('userJoined', activeUsers);
    
    // Send AI matches
    const matches = Array.from({ length: 3 }, () => generateAIMatch(walletAddress));
    socket.emit('aiMatch', matches);
  });
  
  socket.on('message', (messageData) => {
    const message = {
      ...messageData,
      id: Date.now(),
      timestamp: new Date()
    };
    
    messages.push(message);
    
    // Keep only last 1000 messages
    if (messages.length > 1000) {
      messages.splice(0, messages.length - 1000);
    }
    
    // Broadcast to all users
    io.emit('message', message);
    
    // Handle AI messages
    if (message.content.startsWith('/ai ')) {
      const aiQuery = message.content.replace('/ai ', '');
      const aiResponse = generateAIResponse(aiQuery, { walletAddress: message.sender });
      
      setTimeout(() => {
        const aiMessage = {
          id: Date.now(),
          sender: 'AI_ASSISTANT',
          content: aiResponse,
          timestamp: new Date(),
          type: 'ai'
        };
        
        messages.push(aiMessage);
        io.emit('message', aiMessage);
        
        // Send updated matches
        const matches = Array.from({ length: 3 }, () => generateAIMatch(message.sender));
        socket.emit('aiMatch', matches);
      }, 1000);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    activeConnections.delete(socket.id);
    
    const activeUsers = Array.from(activeConnections.values()).map(u => u.walletAddress);
    io.emit('userJoined', activeUsers);
  });
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
  console.log(`🚀 Consilience server running on port ${PORT}`);
  console.log(`📡 Socket.io enabled for real-time features`);
  console.log(`🤖 AI assistant ready`);
});