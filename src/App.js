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
    <div className="h-screen bg-gray-800 text-white flex">
      {connected ? (
        <>
          {/* Left Sidebar - Channels */}
          <div className="w-60 bg-gray-900 flex flex-col">
            {/* Server Header */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-gray-700 shadow-sm">
              <h1 className="font-semibold text-white">CONSILIENCE</h1>
              <button 
                onClick={() => setShowCreateProject(true)}
                className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-sm flex items-center justify-center"
              >
                +
              </button>
            </div>

            {/* Create Project Modal */}
            {showCreateProject && (
              <div className="p-3 bg-gray-800 border-b border-gray-700">
                <input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createProject()}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
                  placeholder="Project name"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={createProject} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs">Create</button>
                  <button onClick={() => setShowCreateProject(false)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">Cancel</button>
                </div>
              </div>
            )}

            {/* Channels List */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-2">Channels</div>
                <div 
                  onClick={() => {setCurrentProject(null); setMessages([]); setTasks([]);}}
                  className={`flex items-center px-2 py-1 rounded cursor-pointer text-gray-300 hover:bg-gray-700 hover:text-white ${
                    !currentProject ? 'bg-gray-700 text-white' : ''
                  }`}
                >
                  <span className="mr-2">#</span>
                  <span className="text-sm">general</span>
                </div>
              </div>
              
              {projects.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-2">Projects</div>
                  {projects.map(project => (
                    <div 
                      key={project.id}
                      onClick={() => joinProject(project)}
                      className={`flex items-center px-2 py-1 rounded cursor-pointer text-gray-300 hover:bg-gray-700 hover:text-white ${
                        currentProject?.id === project.id ? 'bg-gray-700 text-white' : ''
                      }`}
                    >
                      <span className="mr-2">🚀</span>
                      <span className="text-sm">{project.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="h-14 bg-gray-800 border-t border-gray-700 px-2 flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                {publicKey?.toString().slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{publicKey?.toString().slice(0, 8)}...</div>
                <div className="text-xs text-gray-400">Online</div>
              </div>
              <WalletMultiButton className="!bg-transparent !text-xs !p-1" />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Channel Header */}
            <div className="h-12 bg-white border-b border-gray-200 px-4 flex items-center shadow-sm">
              <span className="text-gray-600 mr-2">#</span>
              <h2 className="font-semibold text-gray-900">{currentProject ? currentProject.name : 'general'}</h2>
              <div className="ml-auto text-sm text-gray-500">
                {messages.length} messages
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">Welcome to #{currentProject ? currentProject.name : 'general'}</div>
                    <div className="text-sm text-gray-500">This is the start of your conversation.</div>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className="flex items-start space-x-3 hover:bg-gray-50 px-2 py-1 rounded">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {msg.type === 'ai' ? '🤖' : msg.sender?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline space-x-2">
                          <span className="font-medium text-gray-900 text-sm">
                            {msg.type === 'ai' ? 'AI Assistant' : msg.sender?.slice(0, 8)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-gray-800 text-sm mt-1 break-words">{msg.content}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Message #${currentProject ? currentProject.name : 'general'}`}
                  />
                  <div className="text-xs text-gray-500 mt-1 px-1">
                    Use /ai for AI assistance
                  </div>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Tasks */}
          <div className="w-64 bg-gray-100 border-l border-gray-200 flex flex-col">
            <div className="h-12 px-4 flex items-center border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Tasks</h3>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-gray-900 placeholder-gray-500 text-sm"
                  placeholder="Add a task..."
                />
                <button 
                  onClick={addTask} 
                  className="w-full mt-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                >
                  Add Task
                </button>
              </div>
              
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className={`p-3 bg-white border border-gray-200 rounded ${task.done ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between">
                      <span className={`text-sm text-gray-900 flex-1 ${task.done ? 'line-through' : ''}`}>
                        {task.done ? '✅ ' : ''}{task.text}
                      </span>
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className="ml-2 text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
                      >
                        {task.done ? 'Undo' : 'Done'}
                      </button>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No tasks yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">CONSILIENCE NUCLEAR</h1>
            <p className="text-gray-400 mb-8">Connect your wallet to start collaborating</p>
            <WalletMultiButton />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;