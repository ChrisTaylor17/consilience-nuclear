import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import io from 'socket.io-client';

const App = () => {
  const { connected, publicKey } = useWallet();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [balance, setBalance] = useState(0);
  const [connection] = useState(new Connection('https://api.devnet.solana.com'));
  const [activeUsers, setActiveUsers] = useState([]);
  // const [userProfile, setUserProfile] = useState(null);
  const [aiMatches, setAiMatches] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const getWalletBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Balance error:', error);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (!connected || !publicKey) return;
    
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5002');
    setSocket(newSocket);
    
    newSocket.emit('join', { walletAddress: publicKey.toString() });
    
    newSocket.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    newSocket.on('userJoined', (users) => {
      setActiveUsers(users);
    });
    
    newSocket.on('aiMatch', (matches) => {
      setAiMatches(matches);
    });

    getWalletBalance();
    
    return () => newSocket.close();
  }, [connected, publicKey, getWalletBalance]);

  const sendMessage = async () => {
    if (!input.trim() || !socket) return;

    const message = {
      id: Date.now(),
      sender: publicKey.toString(),
      content: input,
      timestamp: new Date(),
      type: input.startsWith('/ai') ? 'ai' : 'user'
    };

    socket.emit('message', message);
    setInput('');
  };

  const createToken = async () => {
    if (!connected || !publicKey) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5002'}/api/blockchain/create-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: publicKey.toString(),
          tokenName: 'CONSILIENCE',
          tokenSymbol: 'CS'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const tokenMessage = {
          id: Date.now(),
          sender: 'SYSTEM',
          content: `✅ Token created: ${result.name} (${result.symbol})`,
          timestamp: new Date(),
          type: 'system'
        };
        setMessages(prev => [...prev, tokenMessage]);
      }
    } catch (error) {
      console.error('Token creation error:', error);
    }
  };

  if (!connected) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className={`text-6xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🚀 CONSILIENCE
            </h1>
            <p className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              AI-Powered Collaboration Platform
            </p>
          </div>
          <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg !px-8 !py-3 !text-white !font-semibold" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} flex`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} transition-all duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} border-r flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {sidebarOpen && (
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          )}
        </div>

        {sidebarOpen && (
          <>
            {/* Profile */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {publicKey?.toString().slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{publicKey?.toString().slice(0, 8)}...</div>
                  <div className="text-sm text-gray-400">{balance.toFixed(2)} SOL</div>
                </div>
              </div>
            </div>

            {/* Active Users */}
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-400">Active Users</h3>
              <div className="space-y-2">
                {activeUsers.slice(0, 5).map((user, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">{user.slice(0, 8)}...</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Matches */}
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-400">AI Matches</h3>
              <div className="space-y-2">
                {aiMatches.slice(0, 3).map((match, i) => (
                  <div key={i} className="p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                    <div className="text-sm font-medium">{match.name || match.walletAddress?.slice(0, 8)}</div>
                    <div className="text-xs text-gray-400">{Math.round(match.compatibility || 85)}% match</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 space-y-3">
              <button 
                onClick={createToken}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Create Token
              </button>
              <WalletMultiButton className="!w-full !bg-gray-700 hover:!bg-gray-600 !rounded-lg" />
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} flex items-center justify-between`}>
          <div>
            <h2 className="text-xl font-bold">Global Chat</h2>
            <p className="text-sm text-gray-400">{activeUsers.length} users online</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">Live</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === publicKey?.toString() ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                msg.sender === publicKey?.toString() 
                  ? 'bg-blue-600 text-white' 
                  : msg.type === 'system' 
                    ? 'bg-green-600 text-white'
                    : msg.type === 'ai'
                      ? 'bg-purple-600 text-white'
                      : darkMode 
                        ? 'bg-gray-700 text-white' 
                        : 'bg-gray-200 text-gray-900'
              }`}>
                {msg.sender !== publicKey?.toString() && msg.type !== 'system' && (
                  <div className="text-xs opacity-75 mb-1">
                    {msg.type === 'ai' ? '🤖 AI Assistant' : msg.sender?.slice(0, 8)}
                  </div>
                )}
                <div className="text-sm">{msg.content}</div>
                <div className="text-xs opacity-75 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex space-x-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message... (use /ai for AI assistance)"
              className={`flex-1 px-4 py-3 rounded-full border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-full font-medium transition-colors"
            >
              Send
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-400 text-center">
            Use /ai to get AI assistance • Connected to Solana Devnet
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;