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
    <div style={{minHeight: '100vh', backgroundColor: 'black', color: 'white', padding: '20px'}}>
      <div style={{maxWidth: '1200px', margin: '0 auto'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
          <h1 style={{fontSize: '24px', fontWeight: 'bold'}}>🚀 CONSILIENCE NUCLEAR - ZERO CACHE 🚀</h1>
          <WalletMultiButton />
        </div>

        {connected ? (
          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: '80vh'}}>
            {/* Chat */}
            <div style={{border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column'}}>
              <h2 style={{fontSize: '18px', marginBottom: '20px'}}>Chat</h2>
              <div style={{flex: 1, overflowY: 'auto', marginBottom: '20px'}}>
                {messages.map(msg => (
                  <div key={msg.id} style={{padding: '10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', marginBottom: '10px'}}>
                    <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>{msg.sender}</div>
                    <div>{msg.content}</div>
                  </div>
                ))}
              </div>
              <div style={{display: 'flex', gap: '10px'}}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  style={{flex: 1, padding: '10px', backgroundColor: 'black', border: '1px solid rgba(255,255,255,0.2)', color: 'white'}}
                  placeholder="Type message... (use /ai for AI)"
                />
                <button onClick={sendMessage} style={{padding: '10px 20px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: 'white'}}>
                  Send
                </button>
              </div>
            </div>

            {/* Tasks */}
            <div style={{border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '20px'}}>
              <h2 style={{fontSize: '18px', marginBottom: '20px'}}>Tasks</h2>
              <div style={{marginBottom: '20px'}}>
                <input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  style={{width: '100%', padding: '10px', backgroundColor: 'black', border: '1px solid rgba(255,255,255,0.2)', color: 'white', marginBottom: '10px'}}
                  placeholder="Add task..."
                />
                <button onClick={addTask} style={{padding: '8px 16px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: 'white'}}>
                  Add Task
                </button>
              </div>
              <div>
                {tasks.map(task => (
                  <div key={task.id} style={{padding: '10px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', marginBottom: '10px', opacity: task.done ? 0.5 : 1}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span>{task.done ? '✅ ' : ''}{task.text}</span>
                      <button 
                        onClick={() => toggleTask(task.id)}
                        style={{fontSize: '12px', padding: '4px 8px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: 'white'}}
                      >
                        {task.done ? 'Undo' : 'Done'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{textAlign: 'center', paddingTop: '100px'}}>
            <h2 style={{fontSize: '20px', marginBottom: '20px'}}>Connect your wallet to start</h2>
            <WalletMultiButton />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;