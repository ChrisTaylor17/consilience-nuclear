import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import io from 'socket.io-client';
import OpenAI from 'openai';

const App = () => {
  const { connected, publicKey } = useWallet();
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('consilience-messages');
    return saved ? JSON.parse(saved) : {};
  });
  const [input, setInput] = useState('');
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [activeChannel, setActiveChannel] = useState('general');
  const [balance, setBalance] = useState(0);
  const [connection] = useState(new Connection('https://api.devnet.solana.com'));
  const [tokenName, setTokenName] = useState('');
  const [tokens, setTokens] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [csTokenBalance, setCsTokenBalance] = useState(0);
  const [connections, setConnections] = useState([]);
  const [projectTokens, setProjectTokens] = useState([]);
  const [aiMatches, setAiMatches] = useState([]);
  const [userAnalysis, setUserAnalysis] = useState(null);
  const [chatAnalytics, setChatAnalytics] = useState(null);


  
  const channels = ['general', 'ai-chat', 'tasks', 'dev', 'random'];

  const generateTokenName = async () => {
    try {
      const openai = new OpenAI({
        apiKey: process.env.REACT_APP_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Generate a creative, unique cryptocurrency token name (2-3 words max). Just return the name, nothing else.' }],
        max_tokens: 20
      });
      
      return completion.choices[0]?.message?.content?.trim() || 'CONSILIENCE';
    } catch (error) {
      return 'CONSILIENCE';
    }
  };

  const awardTokens = async (walletAddress, amount, reason) => {
    try {
      await fetch('https://consilience-saas-production.up.railway.app/api/blockchain/award-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, amount, reason })
      });
    } catch (error) {
      console.error('Token award error:', error);
    }
  };

  const createProjectToken = async (walletAddress, projectDescription) => {
    try {
      const response = await fetch('https://consilience-saas-production.up.railway.app/api/blockchain/create-project-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, projectDescription })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setProjectTokens(prev => [...prev, result]);
        
        const projectMessage = {
          id: Date.now() + 3,
          sender: 'AI_AGENT',
          content: `🚀 PROJECT TOKEN CREATED!\n\nProject: ${result.projectName}\nToken: ${result.symbol}\nYour Allocation: ${result.allocation} tokens\nTotal Supply: ${result.totalSupply}\n\nAI Treasury holds remaining tokens for fair distribution.`,
          timestamp: new Date(),
          type: 'ai'
        };
        
        setMessages(prev => {
          const updated = {
            ...prev,
            [activeChannel]: [...(prev[activeChannel] || []), projectMessage]
          };
          localStorage.setItem('consilience-messages', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error) {
      console.error('Project token creation error:', error);
    }
  };

  const createNFT = async (walletAddress, description) => {
    try {
      // Generate image URL from description
      const imageUrl = `https://picsum.photos/400/400?random=${Date.now()}`;
      const nftName = `CONSILIENCE NFT #${Date.now().toString().slice(-4)}`;
      
      const response = await fetch('https://consilience-saas-production.up.railway.app/api/blockchain/create-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, nftName, imageUrl })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const nftMessage = {
          id: Date.now() + 2,
          sender: 'SYSTEM',
          content: `🎨 NFT SUCCESSFULLY CREATED!\n\nName: ${result.name}\nMint: ${result.mint}\nImage: ${result.imageUrl}\nType: ${result.type}\nTransaction: ${result.transaction}\n\nYour NFT is now in your wallet!`,
          timestamp: new Date(),
          type: 'system'
        };
        
        setMessages(prev => {
          const updated = {
            ...prev,
            [activeChannel]: [...(prev[activeChannel] || []), nftMessage]
          };
          localStorage.setItem('consilience-messages', JSON.stringify(updated));
          return updated;
        });
        
        if (socket) {
          socket.emit('message', { message: nftMessage, channel: activeChannel });
        }
      } else {
        const errorMessage = {
          id: Date.now() + 3,
          sender: 'SYSTEM',
          content: `❌ NFT creation failed: ${result.error}`,
          timestamp: new Date(),
          type: 'system'
        };
        
        setMessages(prev => {
          const updated = {
            ...prev,
            [activeChannel]: [...(prev[activeChannel] || []), errorMessage]
          };
          localStorage.setItem('consilience-messages', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error) {
      console.error('NFT creation error:', error);
    }
  };

  const getWalletBalance = useCallback(async () => {
    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
      
      // Get detailed transaction data
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
      const detailedTxs = await Promise.all(
        signatures.slice(0, 5).map(async (sig) => {
          try {
            const tx = await connection.getTransaction(sig.signature);
            return {
              signature: sig.signature,
              blockTime: sig.blockTime,
              fee: tx?.meta?.fee || 0,
              status: tx?.meta?.err ? 'Failed' : 'Success',
              accounts: tx?.transaction?.message?.accountKeys?.length || 0
            };
          } catch {
            return {
              signature: sig.signature,
              blockTime: sig.blockTime,
              fee: 0,
              status: 'Unknown',
              accounts: 0
            };
          }
        })
      );
      setTransactions(detailedTxs);
    } catch (error) {
      console.error('Balance error:', error);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    const newSocket = io('https://consilience-saas-production.up.railway.app');
    setSocket(newSocket);
    
    newSocket.on('message', (data) => {
      if (data.message && data.channel) {
        setMessages(prev => {
          const updated = {
            ...prev,
            [data.channel]: [...(prev[data.channel] || []), data.message]
          };
          localStorage.setItem('consilience-messages', JSON.stringify(updated));
          return updated;
        });
      }
    });

    return () => newSocket.close();
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      getWalletBalance();
      // Load CS token balance from localStorage
      const savedBalance = localStorage.getItem(`cs-balance-${publicKey.toString()}`);
      if (savedBalance) {
        setCsTokenBalance(parseInt(savedBalance));
      }
      
      // Get AI matches and analytics
      fetchAIMatches();
      fetchChatAnalytics();
    }
  }, [connected, publicKey, getWalletBalance]);
  
  const fetchAIMatches = async () => {
    try {
      const response = await fetch(`https://consilience-saas-production.up.railway.app/api/ai/matches/${publicKey.toString()}`);
      const data = await response.json();
      if (data.success) {
        setAiMatches(data.matches || []);
        setUserAnalysis(data.userProfile);
      }
    } catch (error) {
      console.error('Failed to fetch AI matches:', error);
    }
  };
  
  const fetchChatAnalytics = async () => {
    try {
      const response = await fetch('https://consilience-saas-production.up.railway.app/api/ai/analytics');
      const data = await response.json();
      if (data.success) {
        setChatAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch chat analytics:', error);
    }
  };

  useEffect(() => {
    // Save CS token balance
    if (publicKey && csTokenBalance > 0) {
      localStorage.setItem(`cs-balance-${publicKey.toString()}`, csTokenBalance.toString());
    }
  }, [csTokenBalance, publicKey]);

  const createToken = async () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    const name = tokenName || await generateTokenName();

    try {
      const response = await fetch('https://consilience-saas-production.up.railway.app/api/blockchain/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: publicKey.toString(),
          tokenName: name,
          tokenSymbol: name.substring(0, 4).toUpperCase()
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const newToken = {
          name: result.name || name,
          symbol: result.symbol,
          mint: result.mint,
          amount: result.amount,
          tokenAccount: result.tokenAccount
        };
        
        setTokens(prev => [...prev, newToken]);
        setTokenName('');
        
        const tokenMessage = {
          id: Date.now(),
          sender: 'SYSTEM',
          content: `✅ ${result.name || name} TOKEN CREATED!\nMint: ${result.mint}\nSymbol: ${result.symbol}\nAmount: ${result.amount} tokens\nTransaction: ${result.transaction}`,
          timestamp: new Date(),
          type: 'system'
        };
        
        setMessages(prev => {
          const updated = {
            ...prev,
            [activeChannel]: [...(prev[activeChannel] || []), tokenMessage]
          };
          localStorage.setItem('consilience-messages', JSON.stringify(updated));
          return updated;
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Token creation error:', error);
      const errorMessage = {
        id: Date.now(),
        sender: 'SYSTEM',
        content: `❌ Token creation failed: ${error.message}. Start backend with 'cd backend && npm start'`,
        timestamp: new Date(),
        type: 'system'
      };
      
      setMessages(prev => {
        const updated = {
          ...prev,
          [activeChannel]: [...(prev[activeChannel] || []), errorMessage]
        };
        localStorage.setItem('consilience-messages', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: publicKey?.toString(),
      content: input,
      timestamp: new Date(),
      type: 'user'
    };

    setMessages(prev => {
      const updated = {
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), userMessage]
      };
      localStorage.setItem('consilience-messages', JSON.stringify(updated));
      return updated;
    });

    // Award tokens for participation and track connections
    if (!input.toLowerCase().startsWith('/ai ')) {
      const participationReward = Math.floor(Math.random() * 20) + 5; // 5-25 tokens
      await awardTokens(publicKey.toString(), participationReward, 'Chat participation');
      setCsTokenBalance(prev => prev + participationReward);
      
      // Track connection
      const connection = {
        wallet: publicKey.toString(),
        channel: activeChannel,
        timestamp: new Date(),
        lastMessage: input.slice(0, 50)
      };
      
      setConnections(prev => {
        const existing = prev.find(c => c.wallet === connection.wallet && c.channel === connection.channel);
        if (existing) {
          return prev.map(c => c.wallet === connection.wallet && c.channel === connection.channel ? connection : c);
        }
        return [...prev, connection];
      });
    }

    if (socket) {
      socket.emit('message', { message: userMessage, channel: activeChannel });
    }

    if (input.toLowerCase().startsWith('/ai ')) {
      try {
        // Use backend AI service for enhanced matching
        const response = await fetch('https://consilience-saas-production.up.railway.app/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input.replace('/ai ', ''),
            walletAddress: publicKey.toString(),
            currentChannel: { name: activeChannel }
          })
        });
        
        const result = await response.json();
        let aiResponse = result.response || 'AI response unavailable';
        
        // Update user analysis and matches
        if (result.userAnalysis) {
          setUserAnalysis(result.userAnalysis);
        }
        if (result.suggestedMatches) {
          setAiMatches(result.suggestedMatches);
        }
        if (result.suggestedTeam) {
          // Show team suggestions in a special message
          const teamMessage = {
            id: Date.now() + 2,
            sender: 'AI_TEAM_BUILDER',
            content: `👥 **Suggested Team Members:**\n\n${result.suggestedTeam.map(member => 
              `• ${member.wallet}... as ${member.role} (${member.compatibility}% match)`
            ).join('\n')}\n\nReady to build something amazing together!`,
            timestamp: new Date(),
            type: 'ai'
          };
          
          setMessages(prev => {
            const updated = {
              ...prev,
              [activeChannel]: [...(prev[activeChannel] || []), teamMessage]
            };
            localStorage.setItem('consilience-messages', JSON.stringify(updated));
            return updated;
          });
        }
        
        // Check if user wants NFT creation
        const userInput = input.replace('/ai ', '').toLowerCase();
        if (userInput.includes('nft') || (userInput.includes('create') && userInput.includes('image'))) {
          await createNFT(publicKey.toString(), userInput);
          aiResponse = '🎨 Creating your NFT now! Check below for confirmation.';
        }
        
        // Award CS tokens for AI interaction
        const tokenReward = Math.floor(Math.random() * 90) + 10;
        await awardTokens(publicKey.toString(), tokenReward, 'AI interaction');
        setCsTokenBalance(prev => prev + tokenReward);
        
        // Check if AI is creating project tokens
        if (aiResponse.toLowerCase().includes('project') || aiResponse.toLowerCase().includes('token')) {
          await createProjectToken(publicKey.toString(), input);
        }
        
        const aiMessage = {
          id: Date.now() + 1,
          sender: 'AI_AGENT',
          content: `${aiResponse}\n\n🪙 +${tokenReward} CS tokens awarded!`,
          timestamp: new Date(),
          type: 'ai'
        };

        setMessages(prev => {
          const updated = {
            ...prev,
            [activeChannel]: [...(prev[activeChannel] || []), aiMessage]
          };
          localStorage.setItem('consilience-messages', JSON.stringify(updated));
          return updated;
        });
        
        if (socket) {
          socket.emit('message', { message: aiMessage, channel: activeChannel });
        }
      } catch (error) {
        console.error('AI service error:', error);
        // Fallback to direct OpenAI
        try {
          const openai = new OpenAI({
            apiKey: process.env.REACT_APP_OPENAI_API_KEY || 'your-openai-key',
            dangerouslyAllowBrowser: true
          });

          const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are CONSILIENCE AI with full blockchain capabilities.'
              },
              {
                role: 'user',
                content: input.replace('/ai ', '')
              }
            ],
            max_tokens: 500
          });

          const aiResponse = completion.choices[0]?.message?.content || 'No response generated.';
          const tokenReward = Math.floor(Math.random() * 90) + 10;
          await awardTokens(publicKey.toString(), tokenReward, 'AI interaction');
          setCsTokenBalance(prev => prev + tokenReward);
          
          const aiMessage = {
            id: Date.now() + 1,
            sender: 'AI_AGENT',
            content: `${aiResponse}\n\n🪙 +${tokenReward} CS tokens awarded!`,
            timestamp: new Date(),
            type: 'ai'
          };

          setMessages(prev => {
            const updated = {
              ...prev,
              [activeChannel]: [...(prev[activeChannel] || []), aiMessage]
            };
            localStorage.setItem('consilience-messages', JSON.stringify(updated));
            return updated;
          });
        } catch (fallbackError) {
          console.error('Fallback AI error:', fallbackError);
        }
      }
    }

    setInput('');
  };

  const addTask = () => {
    if (!taskInput.trim()) return;
    
    const newTask = {
      id: Date.now(),
      text: taskInput,
      done: false
    };
    
    setTasks(prev => [...prev, newTask]);
    setTaskInput('');
  };



  const toggleTask = (id) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, done: !task.done } : task
    ));
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      fontFamily: 'Courier New, monospace',
      display: 'flex'
    }}>
      {connected ? (
        <>
          {/* Sidebar */}
          <div style={{
            width: '240px',
            backgroundColor: '#000000',
            borderRight: '2px solid #ffffff',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 0 20px rgba(255,255,255,0.1)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '2px solid #ffffff',
              textAlign: 'center'
            }}>
              <h1 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
                color: '#ffffff',
                textShadow: '0 0 20px #ffffff'
              }}>🚀 CONSILIENCE</h1>
            </div>

            {/* Profile */}
            <div style={{
              padding: '15px',
              borderBottom: '2px solid #ffffff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              ':hover': { backgroundColor: '#2a2a2a' }
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {publicKey?.toString().slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {publicKey?.toString().slice(0, 8)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#ffffff', textShadow: '0 0 10px #ffffff' }}>● {balance.toFixed(2)} SOL</div>
                </div>
              </div>
            </div>

            {/* Channels */}
            <div style={{ flex: 1, padding: '20px 0' }}>
              <div style={{
                fontSize: '12px',
                color: '#ffffff',
                fontWeight: 'bold',
                padding: '0 20px 10px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                textShadow: '0 0 10px #ffffff'
              }}>Channels</div>
              {channels.map(channel => (
                <div
                  key={channel}
                  onClick={() => setActiveChannel(channel)}
                  style={{
                    padding: '8px 20px',
                    cursor: 'pointer',
                    backgroundColor: activeChannel === channel ? '#ffffff' : 'transparent',
                    color: activeChannel === channel ? '#000000' : '#ffffff',
                    border: activeChannel === channel ? '2px solid #ffffff' : '1px solid #ffffff',
                    margin: '2px 10px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textShadow: activeChannel === channel ? 'none' : '0 0 10px #ffffff'
                  }}
                >
                  # {channel}
                </div>
              ))}
            </div>

            {/* Token Creation */}
            <div style={{ padding: '20px', borderTop: '2px solid #ffffff' }}>
              <input
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="Token name (AI generates if empty)"
                style={{
                  width: '100%',
                  backgroundColor: '#000000',
                  border: '2px solid #ffffff',
                  padding: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  marginBottom: '10px',
                  outline: 'none'
                }}
              />
              <button
                onClick={createToken}
                style={{
                  width: '100%',
                  backgroundColor: '#000000',
                  border: '2px solid #ffffff',
                  padding: '10px',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  textShadow: '0 0 10px #ffffff',
                  marginBottom: '10px',
                  cursor: 'pointer'
                }}
              >
                CREATE TOKEN
              </button>
              <button
                onClick={() => {
                  const nftName = prompt('NFT Name:') || 'CONSILIENCE NFT';
                  createNFT(publicKey.toString(), nftName);
                }}
                style={{
                  width: '100%',
                  backgroundColor: '#000000',
                  border: '2px solid #ff00ff',
                  padding: '10px',
                  color: '#ff00ff',
                  fontWeight: 'bold',
                  textShadow: '0 0 10px #ff00ff',
                  marginBottom: '10px',
                  cursor: 'pointer'
                }}
              >
                CREATE NFT
              </button>
              <WalletMultiButton style={{
                width: '100%',
                backgroundColor: '#000000',
                border: '2px solid #ffffff',
                padding: '10px',
                color: '#ffffff',
                fontWeight: 'bold',
                textShadow: '0 0 10px #ffffff'
              }} />
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Top Bar */}
            <div style={{
              height: '60px',
              backgroundColor: '#000000',
              borderBottom: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              padding: '0 30px'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 20px #ffffff'
              }}>#{activeChannel}</h2>
            </div>

            {/* Chat Area */}
            <div style={{
              flex: 1,
              padding: '20px 30px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              {(messages[activeChannel] || []).map(msg => (
                <div key={msg.id} style={{
                  backgroundColor: '#000000',
                  padding: '15px 20px',
                  border: '2px solid #ffffff',
                  margin: '5px 0'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    marginBottom: '5px',
                    textShadow: '0 0 10px #ffffff'
                  }}>
                    {msg.sender === 'AI_AGENT' ? '🤖 AI Assistant' : msg.sender?.slice(0, 8)}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: '#ffffff'
                  }}>{msg.content}</div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div style={{
              padding: '20px 30px',
              backgroundColor: '#000000',
              borderTop: '2px solid #ffffff'
            }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={`Message #${activeChannel}... (use /ai for smart matching & introductions)`}
                  style={{
                    flex: 1,
                    padding: '15px 20px',
                    backgroundColor: '#000000',
                    border: '2px solid #ffffff',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    padding: '15px 25px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    border: '2px solid #ffffff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Blockchain Sidebar */}
          <div style={{
            width: '300px',
            backgroundColor: '#000000',
            borderLeft: '2px solid #ffffff',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '2px solid #ffffff'
            }}>
              <h3 style={{
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 20px #ffffff'
              }}>AI Analysis</h3>
              {userAnalysis && (
                <div style={{
                  backgroundColor: '#000000',
                  padding: '10px',
                  marginBottom: '15px',
                  border: '2px solid #00ffff',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#00ffff' }}>Your AI Profile</div>
                  <div>Skills: {userAnalysis.skills?.join(', ') || 'Learning...'}</div>
                  <div>Interests: {userAnalysis.interests?.join(', ') || 'Exploring...'}</div>
                  <div>Style: {userAnalysis.communicationStyle || userAnalysis.messageStyle}</div>
                  <div>Level: {userAnalysis.expertise || 'Intermediate'}</div>
                  <div>Activity: {userAnalysis.activityLevel || userAnalysis.activity} </div>
                  {userAnalysis.collaborationPreference && (
                    <div>Prefers: {userAnalysis.collaborationPreference} work</div>
                  )}
                </div>
              )}
              
              <h3 style={{
                margin: '15px 0 10px 0',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 20px #ffffff'
              }}>AI Matches</h3>
              {aiMatches.slice(0, 3).map((match, i) => (
                <div key={i} style={{
                  backgroundColor: '#000000',
                  padding: '10px',
                  marginBottom: '8px',
                  border: '2px solid #ff00ff',
                  fontSize: '12px',
                  cursor: 'pointer'
                }} onClick={() => {
                  const connectMsg = `/ai introduce me to ${match.walletAddress.slice(0,8)} for ${match.recommendedRole || 'collaboration'}`;
                  setInput(connectMsg);
                }}>
                  <div style={{ fontWeight: 'bold', color: '#ff00ff' }}>{match.walletAddress.slice(0,8)}...</div>
                  <div>{Math.round(match.score*100)}% compatibility</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>Role: {match.recommendedRole || 'Collaborator'}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>Skills: {match.commonSkills?.join(', ') || 'Complementary'}</div>
                  {match.collaborationPotential && (
                    <div style={{ fontSize: '10px', color: '#00ff00' }}>Success: {Math.round(match.collaborationPotential.score*100)}%</div>
                  )}
                  <div style={{ fontSize: '10px', color: '#ff00ff' }}>Click for intro!</div>
                </div>
              ))}
              
              <h3 style={{
                margin: '15px 0 10px 0',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 20px #ffffff'
              }}>CS Token Data</h3>
              <div style={{
                backgroundColor: '#000000',
                padding: '10px',
                marginBottom: '8px',
                border: '2px solid #00ff00',
                fontSize: '12px'
              }}>
                <div style={{ fontWeight: 'bold', color: '#00ff00' }}>CONSILIENCE (CS)</div>
                <div>Your Balance: {csTokenBalance.toLocaleString()}</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>Total Supply: 1,000,000,000</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>Circulating: {(csTokenBalance * 1000).toLocaleString()}</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>AI Treasury: 999M+ CS</div>
                <div style={{ fontSize: '10px', color: '#00ff00' }}>Earn: Chat +5-25, AI +10-100</div>
              </div>
              
              <h3 style={{
                margin: '15px 0 10px 0',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 20px #ffffff'
              }}>Project Tokens</h3>
              {projectTokens.map((token, i) => (
                <div key={i} style={{
                  backgroundColor: '#000000',
                  padding: '10px',
                  marginBottom: '8px',
                  border: '2px solid #00ff00',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#00ff00' }}>{token.projectName}</div>
                  <div>{token.symbol} - {token.allocation}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>AI Treasury: {token.aiHolding}</div>
                </div>
              ))}
              
              <h3 style={{
                margin: '15px 0 10px 0',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 20px #ffffff'
              }}>My Tokens</h3>
              {tokens.map((token, i) => (
                <div key={i} style={{
                  backgroundColor: '#000000',
                  padding: '10px',
                  marginBottom: '8px',
                  border: '2px solid #ffffff',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 'bold' }}>{token.name}</div>
                  <div>{token.symbol} - {token.amount}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>{token.mint.slice(0, 8)}...</div>
                </div>
              ))}
            </div>
            <div style={{
              padding: '20px',
              borderBottom: '2px solid #ffffff'
            }}>
              <h3 style={{
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 20px #ffffff'
              }}>Blockchain Activity</h3>
              {transactions.slice(0, 3).map((tx, i) => (
                <div key={i} style={{
                  backgroundColor: '#000000',
                  padding: '8px',
                  marginBottom: '5px',
                  border: '2px solid #ffffff',
                  fontSize: '10px'
                }}>
                  <div style={{ fontWeight: 'bold', color: tx.status === 'Success' ? '#00ff00' : '#ff0000' }}>
                    {tx.status}
                  </div>
                  <div>{tx.signature.slice(0, 12)}...</div>
                  <div style={{ opacity: 0.7 }}>Fee: {(tx.fee / 1000000000).toFixed(6)} SOL</div>
                  <div style={{ opacity: 0.7 }}>{tx.accounts} accounts</div>
                  <div style={{ opacity: 0.7 }}>{new Date(tx.blockTime * 1000).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
            <div style={{
              padding: '20px',
              borderBottom: '2px solid #ffffff'
            }}>
              <h3 style={{
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 20px #ffffff'
              }}>Live Analytics</h3>
              {chatAnalytics && (
                <div style={{
                  backgroundColor: '#000000',
                  padding: '10px',
                  marginBottom: '15px',
                  border: '2px solid #00ff00',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#00ff00' }}>Platform Intelligence</div>
                  <div>Active: {chatAnalytics.activeUsers}/{chatAnalytics.totalUsers} users</div>
                  <div>Messages: {chatAnalytics.totalMessages}</div>
                  <div>Interactions: {chatAnalytics.totalInteractions || 0}</div>
                  <div>Top Skills: {Object.keys(chatAnalytics.topSkills || {}).slice(0,2).join(', ')}</div>
                  {chatAnalytics.platformHealth && (
                    <div style={{ fontSize: '10px', color: '#00ff00' }}>
                      Health: {Math.round(chatAnalytics.platformHealth.activeUserRatio * 100)}% active
                    </div>
                  )}
                </div>
              )}
              
              <h3 style={{
                margin: '15px 0 10px 0',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 20px #ffffff'
              }}>Connections</h3>
              {connections.slice(0, 3).map((conn, i) => (
                <div key={i} style={{
                  backgroundColor: '#000000',
                  padding: '8px',
                  marginBottom: '5px',
                  border: '2px solid #ffffff',
                  fontSize: '10px'
                }}>
                  <div style={{ fontWeight: 'bold' }}>{conn.wallet.slice(0, 8)}...</div>
                  <div style={{ opacity: 0.7 }}>#{conn.channel}</div>
                  <div style={{ opacity: 0.7 }}>{conn.lastMessage}...</div>
                </div>
              ))}
              
              <h3 style={{
                margin: '15px 0 15px 0',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 20px #ffffff'
              }}>Tasks</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  placeholder="Add task..."
                  style={{
                    flex: 1,
                    padding: '10px 15px',
                    backgroundColor: '#000000',
                    border: '2px solid #ffffff',
                    color: '#ffffff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={addTask}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    border: '2px solid #ffffff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </div>
            </div>
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              {tasks.map(task => (
                <div key={task.id} style={{
                  backgroundColor: '#000000',
                  padding: '12px 15px',
                  marginBottom: '10px',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: task.done ? 0.6 : 1
                }}>
                  <span style={{
                    fontSize: '13px',
                    textDecoration: task.done ? 'line-through' : 'none'
                  }}>
                    {task.done ? '✅ ' : ''}{task.text}
                  </span>
                  <button
                    onClick={() => toggleTask(task.id)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      border: '2px solid #ffffff',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    {task.done ? 'Undo' : 'Done'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: '#ffffff',
            textShadow: '0 0 30px #ffffff'
          }}>🚀 CONSILIENCE NUCLEAR</h1>
          <p style={{
            fontSize: '18px',
            marginBottom: '40px',
            color: '#ffffff'
          }}>Connect your wallet to enter the workspace</p>
          <WalletMultiButton style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            border: '2px solid #ffffff',
            padding: '15px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }} />
        </div>
      )}
    </div>
  );
};

export default App;