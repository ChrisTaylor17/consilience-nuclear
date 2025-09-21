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
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001');
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
        const response = await fetch((process.env.REACT_APP_API_URL || 'http://localhost:3001') + '/api/ai/chat', {
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

  const createProject = () => {
    if (!newProjectName.trim()) return;
    
    const project = {
      id: Date.now(),
      name: newProjectName,
      creator: publicKey?.toString(),
      members: [publicKey?.toString()],
      tasks: [],
      messages: []
    };
    
    setProjects(prev => [...prev, project]);
    setCurrentProject(project);
    setNewProjectName('');
    setShowCreateProject(false);
  };

  const joinProject = (project) => {
    setCurrentProject(project);
    setMessages(project.messages || []);
    setTasks(project.tasks || []);
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, done: !task.done } : task
    ));
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">CONSILIENCE NUCLEAR</h1>
          <WalletMultiButton />
        </div>

        {connected ? (
          <div className="grid grid-cols-4 gap-4 h-[80vh]">
            {/* Projects Sidebar */}
            <div className="border border-white/20 rounded p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg">Projects</h2>
                <button 
                  onClick={() => setShowCreateProject(true)}
                  className="text-xs px-2 py-1 border border-white/20"
                >
                  +
                </button>
              </div>
              
              {showCreateProject && (
                <div className="mb-4 p-2 border border-white/20 rounded">
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createProject()}
                    className="w-full p-1 bg-black border border-white/20 text-white mb-2 text-sm"
                    placeholder="Project name"
                  />
                  <div className="flex gap-1">
                    <button onClick={createProject} className="text-xs px-2 py-1 border border-white/20">Create</button>
                    <button onClick={() => setShowCreateProject(false)} className="text-xs px-2 py-1 border border-white/20">Cancel</button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <div 
                  onClick={() => {setCurrentProject(null); setMessages([]); setTasks([]);}}
                  className={`p-2 border border-white/20 rounded cursor-pointer text-sm ${
                    !currentProject ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  # General
                </div>
                {projects.length === 0 ? (
                  <div className="text-xs text-white/60 p-2">No projects yet</div>
                ) : (
                  projects.map(project => (
                    <div 
                      key={project.id}
                      onClick={() => joinProject(project)}
                      className={`p-2 border border-white/20 rounded cursor-pointer text-sm ${
                        currentProject?.id === project.id ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      🚀 {project.name}
                    </div>
                  ))
                )}
                <div className="text-xs text-white/40 mt-2">Projects: {projects.length}</div>
              </div>
            </div>

            {/* Chat */}
            <div className="col-span-2 border border-white/20 rounded p-4 flex flex-col">
              <h2 className="text-lg mb-4">{currentProject ? `${currentProject.name}` : 'General Chat'}</h2>
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {messages.map(msg => (
                  <div key={msg.id} className="p-2 border border-white/20 rounded">
                    <div className="text-xs text-white/60">{msg.sender}</div>
                    <div>{msg.content}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 p-2 bg-black border border-white/20 text-white"
                  placeholder="Type message... (use /ai for AI)"
                />
                <button onClick={sendMessage} className="px-4 py-2 border border-white/20">
                  Send
                </button>
              </div>
            </div>

            {/* Tasks */}
            <div className="border border-white/20 rounded p-4">
              <h2 className="text-lg mb-4">Tasks</h2>
              <div className="mb-4">
                <input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  className="w-full p-2 bg-black border border-white/20 text-white mb-2"
                  placeholder="Add task..."
                />
                <button onClick={addTask} className="px-3 py-1 border border-white/20">
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className={`p-2 border border-white/20 rounded ${task.done ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-center">
                      <span>{task.done ? '✅ ' : ''}{task.text}</span>
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className="text-xs px-2 py-1 border border-white/20"
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
          <div className="text-center py-20">
            <h2 className="text-xl mb-4">Connect your wallet to start</h2>
            <WalletMultiButton />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;