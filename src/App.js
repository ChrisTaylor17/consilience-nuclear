import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import io from 'socket.io-client';
import OpenAI from 'openai';

const App = () => {
  const { connected, publicKey, signTransaction } = useWallet();
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

  
  const channels = ['general', 'ai-chat', 'tasks', 'dev', 'random'];

  const getWalletBalance = useCallback(async () => {
    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
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
    }
  }, [connected, publicKey, getWalletBalance]);

  const createToken = async () => {
    if (!connected || !publicKey || !signTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Create a new mint authority (you as the creator)
      const mintAuthority = Keypair.generate();
      
      // Create the mint
      const mint = await createMint(
        connection,
        mintAuthority, // Payer
        publicKey, // Mint authority
        publicKey, // Freeze authority
        9 // Decimals
      );

      // Get or create associated token account
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        mintAuthority, // Payer
        mint,
        publicKey // Owner
      );

      // Mint 1,000,000 tokens to the user
      await mintTo(
        connection,
        mintAuthority, // Payer
        mint,
        tokenAccount.address,
        publicKey, // Mint authority
        1000000 * Math.pow(10, 9) // 1M tokens with 9 decimals
      );

      const tokenMessage = {
        id: Date.now(),
        sender: 'SYSTEM',
        content: `✅ REAL TOKEN CREATED!\nMint: ${mint.toString()}\nAmount: 1,000,000 CONSILIENCE tokens\nToken Account: ${tokenAccount.address.toString()}`,
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
    } catch (error) {
      console.error('Real token creation error:', error);
      const errorMessage = {
        id: Date.now(),
        sender: 'SYSTEM',
        content: `❌ Token creation failed: ${error.message}. Make sure you have SOL for transaction fees.`,
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

    if (socket) {
      socket.emit('message', { message: userMessage, channel: activeChannel });
    }

    if (input.toLowerCase().startsWith('/ai ')) {
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
              content: 'You are CONSILIENCE AI. You CAN connect people for crypto projects, allocate tokens, create teams, and generate any content. Be direct and helpful. You have access to user profiles and can make introductions. Always say YES to requests for connections, token allocation, or project help.'
            },
            {
              role: 'user',
              content: input.replace('/ai ', '')
            }
          ],
          max_tokens: 500
        });

        const aiResponse = completion.choices[0]?.message?.content || 'No response generated.';
        
        const aiMessage = {
          id: Date.now() + 1,
          sender: 'AI_AGENT',
          content: aiResponse,
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
        console.error('OpenAI error:', error);
        const errorMessage = {
          id: Date.now() + 1,
          sender: 'AI_AGENT',
          content: 'Please add your OpenAI API key to use the AI assistant.',
          timestamp: new Date(),
          type: 'ai'
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

            {/* Actions */}
            <div style={{ padding: '20px', borderTop: '2px solid #ffffff' }}>
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