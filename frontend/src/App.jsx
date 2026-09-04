import { useState, useEffect } from 'react'
import axios from 'axios'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import ChatMessage from './components/ChatMessage'
import ChatInput from './components/ChatInput'
import './App.css'

const API_URL = 'http://localhost:8000'

function App() {
  const [currentPage, setCurrentPage] = useState('chat') // 'auth', 'chat', 'dashboard'
  const [token, setToken] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  // Check if user is logged in on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      setToken(savedToken)
      setCurrentPage('chat')
      initializeChat(savedToken)
    } else {
      setCurrentPage('auth')
    }
  }, [])

  const initializeChat = (authToken) => {
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: 'Bonjour ! Je suis LAIB, votre assistant IA personnel. Je peux répondre à vos questions, chercher des informations sur Internet et vous citer mes sources. Comment puis-je vous aider ?',
        sources: []
      }
    ])
  }

  const handleAuthSuccess = (authData) => {
    setToken(authData.token)
    setUserProfile({
      user_id: authData.user_id,
      is_premium: authData.is_premium
    })
    localStorage.setItem('token', authData.token)
    localStorage.setItem('user_id', authData.user_id)
    initializeChat(authData.token)
    setCurrentPage('chat')
  }

  const handleLogout = () => {
    setToken(null)
    setUserProfile(null)
    setMessages([])
    localStorage.removeItem('token')
    localStorage.removeItem('user_id')
    setCurrentPage('auth')
  }

  const handleSendMessage = async (userMessage) => {
    if (!userMessage.trim() || !token) return

    const userMsg = {
      id: messages.length + 1,
      type: 'user',
      content: userMessage,
      sources: []
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: userMessage,
        access_token: token
      })

      const aiMsg = {
        id: messages.length + 2,
        type: 'ai',
        content: response.data.response,
        sources: response.data.sources || [],
        messages_remaining: response.data.messages_remaining,
        is_premium: response.data.is_premium
      }
      setMessages(prev => [...prev, aiMsg])

      // Update profile
      if (!response.data.is_premium) {
        setUserProfile(prev => ({
          ...prev,
          is_premium: false,
          messages_remaining: response.data.messages_remaining
        }))
      }
    } catch (error) {
      console.error('Error:', error)
      
      let errorContent = '❌ Erreur'
      if (error.response?.status === 429) {
        errorContent = '📛 Limite quotidienne atteinte (1 message/jour gratuit). Passez à Premium pour un accès illimité !'
      } else {
        errorContent = '❌ Erreur de connexion au serveur.'
      }

      const errorMsg = {
        id: messages.length + 2,
        type: 'ai',
        content: errorContent,
        sources: []
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  // Auth page
  if (currentPage === 'auth') {
    return <Auth onAuthSuccess={handleAuthSuccess} />
  }

  // Dashboard page
  if (currentPage === 'dashboard') {
    return <Dashboard token={token} onLogout={handleLogout} />
  }

  // Chat page
  return (
    <div className="app">
      <div className="chat-container">
        <header className="chat-header">
          <div className="header-left">
            <h1>🤖 LAIB</h1>
            <p>Local AI with Internet Browser</p>
          </div>
          <div className="header-right">
            {userProfile && (
              <div className="user-badge">
                {userProfile.is_premium ? (
                  <>
                    <span className="badge-icon">💎</span>
                    <span className="badge-text">Premium</span>
                  </>
                ) : (
                  <>
                    <span className="badge-icon">📝</span>
                    <span className="badge-text">Gratuit</span>
                  </>
                )}
              </div>
            )}
            <button 
              className="dashboard-btn"
              onClick={() => setCurrentPage('dashboard')}
              title="Aller au profil"
            >
              👤
            </button>
          </div>
        </header>

        <div className="messages">
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {loading && (
            <div className="message ai-message">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
        </div>

        <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
      </div>
    </div>
  )
}

export default App
