import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import logo from './logo.png';

function App() {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([
    { sender: 'bot', text: 'Hi There..!', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [loading, setLoading] = useState(false);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize session ID
  useEffect(() => {
    if (!localStorage.getItem('session_id')) {
      const id = crypto.randomUUID();
      localStorage.setItem('session_id', id);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  // Set initial focus and pre-fill "hello" for first interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isFirstInteraction && inputRef.current) {
        setMessage('hello');
        inputRef.current.focus();
        inputRef.current.selectionStart = inputRef.current.value.length;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isFirstInteraction]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = {
      sender: 'user',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversation(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    setIsFirstInteraction(false); // Mark first interaction as complete

    try {
      const response = await axios.post('http://localhost:5000/chat', {
        message: message,
        session_id: localStorage.getItem('session_id'),
        refresh: conversation.length <= 1
      });

      if (response.data.session_id) {
        localStorage.setItem('session_id', response.data.session_id);
      }

      const botMessage = {
        sender: 'bot',
        text: response.data.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversation(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        sender: 'bot',
        text: 'Sorry, I encountered an error. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setConversation(prev => [...prev, errorMessage]);
      console.error(error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.selectionStart = inputRef.current.value.length;
        }
      }, 50);
    }
  };

  const handleRefresh = () => {
    // Generate new session ID
    const newSessionId = crypto.randomUUID();
    localStorage.setItem('session_id', newSessionId);
    
    // Clear conversation and reset first interaction state
    setConversation([
      { sender: 'bot', text: 'Hi There..!', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setMessage('');
    setIsFirstInteraction(true);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = inputRef.current.value.length;
      }
    }, 50);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-title-wrapper">
            <img src={logo} alt="TalentSpotify Logo" className="header-logo" />
            <div>
              <h1>TALENTSPOTIFY</h1>
              <p className="tagline">Detect Bias Agent</p>
            </div>
          </div>
          <span className="chatbot-tag">AI Assistant</span>
        </div>
      </header>

      <div className="chat-container">
        <div className="message-area">
          {conversation.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              <div className="message-content">{msg.text}</div>
              <div className="message-time">{msg.time}</div>
            </div>
          ))}
          {loading && (
            <div className="message bot">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isFirstInteraction ? "Press Enter to send 'hello'" : "Type your message...."}
            disabled={loading}
          />
          <button type="button" onClick={handleRefresh} className="refresh-button" title="Refresh">
            <i className="send-icon">⟳</i>
          </button>
          <button type="submit" disabled={loading || !message.trim()}>
            {loading ? <span className="spinner"></span> : <i className="send-icon">→</i>}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;