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
  const [aiMatches, setAiMatches] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [isTyping] = useState(false);

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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-12 px-8">
          <div className="space-y-6">
            <div className="relative">
              <h1 className="text-8xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
                CONSILIENCE
              </h1>
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 animate-pulse"></div>
            </div>
            <p className="text-2xl text-gray-300 font-light tracking-wide">
              The Future of AI-Powered Collaboration
            </p>
            <div className="flex items-center justify-center space-x-4 text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Solana Devnet</span>
              </div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Real-time Chat</span>
              </div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span>AI Matching</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-700 hover:!to-pink-700 !rounded-2xl !px-12 !py-4 !text-white !font-bold !text-lg !shadow-2xl !transform !transition-all !duration-300 hover:!scale-105" />
            <p className="text-sm text-gray-500">Connect your Solana wallet to enter the future</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50'} text-white flex relative overflow-hidden`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} transition-all duration-500 ease-in-out backdrop-blur-xl ${darkMode ? 'bg-black/20 border-white/10' : 'bg-white/20 border-black/10'} border-r flex flex-col relative z-10`}>
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-3 rounded-xl hover:bg-white/10 transition-all duration-300 transform hover:scale-110"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
          {sidebarOpen && (
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-3 rounded-xl hover:bg-white/10 transition-all duration-300 transform hover:scale-110"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <div className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                C
              </div>
            </div>
          )}
        </div>

        {sidebarOpen && (
          <>
            {/* Profile */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-2xl">
                    {publicKey?.toString().slice(0, 2).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-black animate-pulse"></div>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg">{publicKey?.toString().slice(0, 8)}...</div>
                  <div className="text-sm text-gray-300 flex items-center space-x-2">
                    <span>{balance.toFixed(3)} SOL</span>
                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                    <span className="text-green-400">Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="p-6 border-b border-white/10">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{activeUsers.length}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Online</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{messages.length}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Messages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-400">{aiMatches.length}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Matches</div>
                </div>
              </div>
            </div>

            {/* Active Users */}
            <div className="p-6 border-b border-white/10 flex-1 overflow-y-auto">
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300 flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                Active Users
              </h3>
              <div className="space-y-3">
                {activeUsers.slice(0, 8).map((user, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-300 cursor-pointer group">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                      {user.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium group-hover:text-purple-300 transition-colors">{user.slice(0, 12)}...</div>
                      <div className="text-xs text-gray-400">Active now</div>
                    </div>
                    <div className="w-2 h-2 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 space-y-4">
              <button 
                onClick={createToken}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 px-6 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-2xl"
              >
                🚀 Create Token
              </button>
              <WalletMultiButton className="!w-full !bg-white/10 hover:!bg-white/20 !rounded-2xl !py-3 !backdrop-blur-sm !border !border-white/20" />
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Chat Header */}
        <div className="p-6 border-b border-white/10 backdrop-blur-xl bg-black/20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Global Chat</h2>
                <p className="text-sm text-gray-400 flex items-center space-x-2">
                  <span>{activeUsers.length} users online</span>
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <span className="text-green-400">Real-time</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/30">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
              <span className="text-sm font-medium text-green-300">Live</span>
            </div>
            <div className="text-xs text-gray-400 bg-white/5 px-3 py-2 rounded-full">
              Solana Devnet
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 opacity-50">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-300">Welcome to Consilience</h3>
                  <p className="text-gray-500">Start a conversation or use /ai for AI assistance</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === publicKey?.toString() ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                <div className={`max-w-md lg:max-w-lg group`}>
                  {msg.sender !== publicKey?.toString() && msg.type !== 'system' && (
                    <div className="flex items-center space-x-2 mb-2 ml-4">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        msg.type === 'ai' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-gradient-to-r from-blue-400 to-purple-400 text-white'
                      }`}>
                        {msg.type === 'ai' ? '🤖' : msg.sender?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-gray-400">
                        {msg.type === 'ai' ? 'AI Assistant' : msg.sender?.slice(0, 8)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  <div className={`px-6 py-4 rounded-3xl shadow-2xl backdrop-blur-sm border transition-all duration-300 group-hover:scale-105 ${
                    msg.sender === publicKey?.toString() 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-500/30 ml-8' 
                      : msg.type === 'system' 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-500/30'
                        : msg.type === 'ai'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500/30'
                          : 'bg-white/10 text-white border-white/20 mr-8'
                  }`}>
                    <div className="text-sm leading-relaxed">{msg.content}</div>
                    {msg.sender === publicKey?.toString() && (
                      <div className="text-xs opacity-75 mt-2 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-4 rounded-3xl">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-xs text-gray-400">Someone is typing...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-white/10 backdrop-blur-xl bg-black/20">
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your message... ✨"
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 pr-12"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                {input.startsWith('/ai') && (
                  <div className="flex items-center space-x-1 text-xs bg-purple-500/20 px-2 py-1 rounded-full">
                    <span>🤖</span>
                    <span>AI Mode</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white p-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-2xl group"
            >
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono">Enter</kbd>
                <span>to send</span>
              </div>
              <div className="flex items-center space-x-2">
                <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono">/ai</kbd>
                <span>for AI assistance</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Connected to Solana Devnet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;