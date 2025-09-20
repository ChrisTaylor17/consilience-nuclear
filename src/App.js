import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import io from 'socket.io-client';

const App = () => {
  const { connected, publicKey } = useWallet();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [activeChannel, setActiveChannel] = useState('general');
  const [profile, setProfile] = useState({ name: '', status: 'online' });
  const [showProfile, setShowProfile] = useState(false);
  
  const channels = ['general', 'ai-chat', 'tasks', 'dev', 'random'];

  useEffect(() => {
    const newSocket = io('https://consilience-saas-production.up.railway.app');
    setSocket(newSocket);
    
    newSocket.on('message', (data) => {
      if (data.message && data.message.sender !== publicKey?.toString()) {
        setMessages(prev => [...prev, data.message]);
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

    setMessages(prev => [...prev, userMessage]);

    if (socket) {
      socket.emit('message', { message: userMessage, channel: 'general' });
    }

    if (input.toLowerCase().startsWith('/ai ')) {
      try {
        const response = await fetch('https://consilience-saas-production.up.railway.app/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input.replace('/ai ', ''),
            walletAddress: publicKey?.toString()
          })
        });
        
        const result = await response.json();
        
        const aiMessage = {
          id: Date.now() + 1,
          sender: 'AI_AGENT',
          content: result.response,
          timestamp: new Date(),
          type: 'ai'
        };

        setMessages(prev => [...prev, aiMessage]);
        
        if (socket) {
          socket.emit('message', { message: aiMessage, channel: 'general' });
        }
      } catch (error) {
        console.error('AI error:', error);
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
      backgroundColor: '#0a0a0a',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex'
    }}>
      {connected ? (
        <>
          {/* Sidebar */}
          <div style={{
            width: '240px',
            backgroundColor: '#1a1a1a',
            borderRight: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 0 20px rgba(255,255,255,0.1)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #333',
              textAlign: 'center'
            }}>
              <h1 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
                textShadow: '0 0 10px rgba(255,255,255,0.5)',
                background: 'linear-gradient(45deg, #fff, #ccc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>🚀 CONSILIENCE</h1>
            </div>

            {/* Profile */}
            <div style={{
              padding: '15px',
              borderBottom: '1px solid #333',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              ':hover': { backgroundColor: '#2a2a2a' }
            }} onClick={() => setShowProfile(!showProfile)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#4CAF50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 15px rgba(76, 175, 80, 0.5)'
                }}>
                  {publicKey?.toString().slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {profile.name || publicKey?.toString().slice(0, 8)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4CAF50' }}>● {profile.status}</div>
                </div>
              </div>
            </div>

            {/* Channels */}
            <div style={{ flex: 1, padding: '20px 0' }}>
              <div style={{
                fontSize: '12px',
                color: '#888',
                fontWeight: 'bold',
                padding: '0 20px 10px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>Channels</div>
              {channels.map(channel => (
                <div
                  key={channel}
                  onClick={() => setActiveChannel(channel)}
                  style={{
                    padding: '8px 20px',
                    cursor: 'pointer',
                    backgroundColor: activeChannel === channel ? 'rgba(255,255,255,0.1)' : 'transparent',
                    borderRight: activeChannel === channel ? '3px solid white' : 'none',
                    transition: 'all 0.3s ease',
                    fontSize: '14px',
                    fontWeight: activeChannel === channel ? 'bold' : 'normal',
                    textShadow: activeChannel === channel ? '0 0 10px rgba(255,255,255,0.8)' : 'none'
                  }}
                >
                  # {channel}
                </div>
              ))}
            </div>

            {/* Wallet */}
            <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
              <WalletMultiButton style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: '2px solid white',
                borderRadius: '25px',
                padding: '10px',
                color: 'white',
                fontWeight: 'bold',
                boxShadow: '0 0 20px rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease'
              }} />
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Top Bar */}
            <div style={{
              height: '60px',
              backgroundColor: '#1a1a1a',
              borderBottom: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              padding: '0 30px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(255,255,255,0.5)'
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
              {messages.map(msg => (
                <div key={msg.id} style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  padding: '15px 20px',
                  borderRadius: '15px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#4CAF50',
                    fontWeight: 'bold',
                    marginBottom: '5px',
                    textShadow: '0 0 5px rgba(76, 175, 80, 0.5)'
                  }}>
                    {msg.sender === 'AI_AGENT' ? '🤖 AI Assistant' : msg.sender?.slice(0, 8)}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: 'white'
                  }}>{msg.content}</div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div style={{
              padding: '20px 30px',
              backgroundColor: '#1a1a1a',
              borderTop: '1px solid #333'
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
                    backgroundColor: '#0a0a0a',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '25px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 20px rgba(255,255,255,0.1)'
                  }}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    padding: '15px 25px',
                    backgroundColor: 'white',
                    color: 'black',
                    border: 'none',
                    borderRadius: '25px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 20px rgba(255,255,255,0.3)',
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
            backgroundColor: '#1a1a1a',
            borderLeft: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 0 20px rgba(255,255,255,0.1)'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #333'
            }}>
              <h3 style={{
                margin: '0 0 15px 0',
                fontSize: '16px',
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(255,255,255,0.5)'
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
                    backgroundColor: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '20px',
                    color: 'white',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={addTask}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: 'white',
                    color: 'black',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 0 10px rgba(255,255,255,0.3)'
                  }}
                >
                  Add
                </button>
              </div>
            </div>
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              {tasks.map(task => (
                <div key={task.id} style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  padding: '12px 15px',
                  borderRadius: '10px',
                  marginBottom: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: task.done ? 0.6 : 1,
                  transition: 'all 0.3s ease'
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
                      backgroundColor: 'transparent',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '15px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
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
            textShadow: '0 0 30px rgba(255,255,255,0.8)',
            background: 'linear-gradient(45deg, #fff, #ccc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>🚀 CONSILIENCE NUCLEAR</h1>
          <p style={{
            fontSize: '18px',
            marginBottom: '40px',
            color: '#ccc'
          }}>Connect your wallet to enter the workspace</p>
          <WalletMultiButton style={{
            backgroundColor: 'white',
            color: 'black',
            border: 'none',
            borderRadius: '30px',
            padding: '15px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(255,255,255,0.5)',
            transition: 'all 0.3s ease'
          }} />
        </div>
      )}
    </div>
  );
};

export default App;