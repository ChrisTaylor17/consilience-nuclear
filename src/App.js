import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import io from 'socket.io-client';
import { QBusinessClient, ChatSyncCommand } from '@aws-sdk/client-qbusiness';

const App = () => {
  const { connected, publicKey } = useWallet();
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState('');
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [activeChannel, setActiveChannel] = useState('general');

  
  const channels = ['general', 'ai-chat', 'tasks', 'dev', 'random'];

  useEffect(() => {
    const newSocket = io('https://consilience-saas-production.up.railway.app');
    setSocket(newSocket);
    
    newSocket.on('message', (data) => {
      if (data.message && data.channel) {
        setMessages(prev => ({
          ...prev,
          [data.channel]: [...(prev[data.channel] || []), data.message]
        }));
      }
    });

    return () => newSocket.close();
  }, [publicKey]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: publicKey?.toString(),
      content: input,
      timestamp: new Date(),
      type: 'user'
    };

    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), userMessage]
    }));

    if (socket) {
      socket.emit('message', { message: userMessage, channel: activeChannel });
    }

    if (input.toLowerCase().startsWith('/ai ')) {
      const userQuery = input.replace('/ai ', '').toLowerCase();
      let aiResponse = '';
      
      if (userQuery.includes('write') && (userQuery.includes('whitepaper') || userQuery.includes('white paper'))) {
        aiResponse = `# CONSILIENCE WHITEPAPER\n\n## Executive Summary\n\nCONSILIENCE is a revolutionary SaaS platform that combines artificial intelligence with blockchain technology to create a productivity ecosystem where users collaborate toward shared goals while earning crypto tokens based on their contributions.\n\n## Problem Statement\n\nTraditional productivity platforms lack incentive alignment and fail to connect like-minded individuals effectively. Users struggle to build verifiable reputation and receive fair compensation for their collaborative efforts.\n\n## Solution\n\nCONSILIENCE introduces an AI-powered agent that:\n- Guides users toward shared productivity goals\n- Allocates crypto tokens based on contribution quality\n- Builds blockchain-based reputation and credit scores\n- Connects users with complementary skills and interests\n\n## Key Features\n\n### AI-Powered Productivity Agent\n- Intelligent task allocation and project management\n- Real-time collaboration guidance\n- Performance analytics and optimization\n\n### Blockchain Integration\n- Smart contract-based token distribution\n- Immutable reputation tracking\n- Decentralized credit scoring system\n\n### Social Connectivity\n- Algorithm-driven user matching\n- Skill-based team formation\n- Community-driven goal setting\n\n## Tokenomics\n\n### Token Utility\n- Reward mechanism for productive contributions\n- Governance rights for platform decisions\n- Access to premium features and tools\n\n### Distribution Model\n- 40% - User rewards and incentives\n- 25% - Development and operations\n- 20% - Community treasury\n- 15% - Team and advisors\n\n## Technology Stack\n\n- Frontend: React.js with real-time chat\n- Backend: Node.js with AI integration\n- Blockchain: Solana for fast, low-cost transactions\n- AI: Amazon Q Business for enterprise productivity\n\n## Market Opportunity\n\nThe global productivity software market is valued at $96.36 billion and growing at 13.4% CAGR. CONSILIENCE targets the intersection of:\n- Remote work collaboration tools\n- Blockchain-based incentive systems\n- AI-powered productivity enhancement\n\n## Competitive Advantages\n\n1. **AI-First Approach**: Unlike traditional tools, our AI agent actively guides productivity\n2. **Blockchain Integration**: Verifiable reputation and fair token distribution\n3. **Community Focus**: Connecting users based on goals and complementary skills\n4. **Incentive Alignment**: Direct rewards for valuable contributions\n\n## Roadmap\n\n### Phase 1 (Q1 2024)\n- MVP launch with basic chat and task management\n- Initial AI agent deployment\n- Solana wallet integration\n\n### Phase 2 (Q2 2024)\n- Advanced AI productivity features\n- Token launch and distribution system\n- Community governance implementation\n\n### Phase 3 (Q3 2024)\n- Enterprise partnerships\n- Advanced analytics dashboard\n- Mobile application launch\n\n### Phase 4 (Q4 2024)\n- Cross-chain compatibility\n- AI marketplace for specialized agents\n- Global scaling and localization\n\n## Team\n\nCONSILIENCE is built by a team of experienced developers, AI researchers, and blockchain experts committed to revolutionizing how people collaborate and earn in the digital economy.\n\n## Conclusion\n\nCONSILIENCE represents the future of work - where AI guides productivity, blockchain ensures fair rewards, and community drives innovation. Join us in building a new economy based on collaboration, transparency, and shared success.\n\n---\n\n*This whitepaper outlines our vision for CONSILIENCE. For technical specifications, tokenomics details, and partnership opportunities, contact our team.*`;
      } else {
        aiResponse = `I'm CONSILIENCE AI - your direct productivity assistant. I can help you with:\n\n• Writing whitepapers and business plans\n• Creating technical documentation\n• Market analysis and strategy\n• Project planning and task management\n• Business model development\n\nWhat would you like me to create for you?`;
      }
      
      const aiMessage = {
        id: Date.now() + 1,
        sender: 'AI_AGENT',
        content: aiResponse,
        timestamp: new Date(),
        type: 'ai'
      };

      setMessages(prev => ({
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), aiMessage]
      }));
      
      if (socket) {
        socket.emit('message', { message: aiMessage, channel: activeChannel });
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
                  <div style={{ fontSize: '12px', color: '#ffffff', textShadow: '0 0 10px #ffffff' }}>● ONLINE</div>
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

            {/* Wallet */}
            <div style={{ padding: '20px', borderTop: '2px solid #ffffff' }}>
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
                  placeholder={`Message #${activeChannel}... (use /ai for AI)`}
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

          {/* Tasks Sidebar */}
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