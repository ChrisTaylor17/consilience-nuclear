import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@primer/css/dist/primer.css';
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
    <div className="color-bg-default color-fg-default" style={{minHeight: '100vh', backgroundColor: 'black', color: 'white', padding: '20px'}}>
      <div className="container-xl">
        <div className="Header d-flex flex-justify-between flex-items-center mb-4">
          <h1 className="h1-mktg">🚀 CONSILIENCE NUCLEAR - ZERO CACHE 🚀</h1>
          <WalletMultiButton className="btn btn-primary" />
        </div>

        {connected ? (
          <div className="d-flex" style={{gap: '20px', height: '80vh'}}>
            {/* Chat */}
            <div className="Box p-3 d-flex flex-column" style={{flex: '2', backgroundColor: 'rgba(0,0,0,0.8)'}}>
              <h2 className="h2 mb-3">Chat</h2>
              <div className="flex-1 overflow-auto mb-3">
                {messages.map(msg => (
                  <div key={msg.id} className="Box p-2 mb-2" style={{backgroundColor: 'rgba(255,255,255,0.1)'}}>
                    <div className="text-small color-fg-muted">{msg.sender}</div>
                    <div className="color-fg-default">{msg.content}</div>
                  </div>
                ))}
              </div>
              <div className="d-flex" style={{gap: '10px'}}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="form-control flex-1"
                  style={{backgroundColor: 'black', borderColor: 'rgba(255,255,255,0.2)', color: 'white'}}
                  placeholder="Type message... (use /ai for AI)"
                />
                <button onClick={sendMessage} className="btn btn-outline">
                  Send
                </button>
              </div>
            </div>

            {/* Tasks */}
            <div className="Box p-3" style={{flex: '1', backgroundColor: 'rgba(0,0,0,0.8)'}}>
              <h2 className="h2 mb-3">Tasks</h2>
              <div className="mb-3">
                <input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  className="form-control mb-2"
                  style={{backgroundColor: 'black', borderColor: 'rgba(255,255,255,0.2)', color: 'white'}}
                  placeholder="Add task..."
                />
                <button onClick={addTask} className="btn btn-outline btn-sm">
                  Add Task
                </button>
              </div>
              <div>
                {tasks.map(task => (
                  <div key={task.id} className={`Box p-2 mb-2 d-flex flex-justify-between flex-items-center ${task.done ? 'opacity-50' : ''}`} style={{backgroundColor: 'rgba(255,255,255,0.1)'}}>
                    <span className="color-fg-default">{task.done ? '✅ ' : ''}{task.text}</span>
                    <button 
                      onClick={() => toggleTask(task.id)}
                      className="btn btn-sm btn-outline"
                    >
                      {task.done ? 'Undo' : 'Done'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center pt-6">
            <h2 className="h2 mb-3">Connect your wallet to start</h2>
            <WalletMultiButton className="btn btn-primary btn-large" />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;