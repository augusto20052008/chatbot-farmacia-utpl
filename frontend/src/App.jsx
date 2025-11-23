import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown'; // Importamos la librería de formato
import './App.css';

// Función auxiliar para detectar imágenes en el texto
function parseBotResponse(text) {
  const imageUrlRegex = /\[Imagen: (https?:\/\/[^\s]+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = imageUrlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'image', content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }
  
  if (parts.length === 0) {
    return [{ type: 'text', content: text }];
  }
  return parts;
}

const suggestions = [
  '¿Qué productos tienen?',
  '¿Cuál es su horario?',
  'Dime sus servicios',
];

function App() {
  const [message, setMessage] = useState('');
  
  // Estado inicial del chat
  const initialMessage = {
    role: 'model',
    parts: [{ type: 'text', content: "¡Hola! 👋 Soy FarmaBot, tu asistente de confianza en la **Farmacia Bienestar**. ¿En qué te puedo ayudar hoy?" }]
  };

  const [chatHistory, setChatHistory] = useState([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const chatWindowRef = useRef(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // ✨ NUEVO: Función para borrar el chat
  const clearChat = () => {
    setChatHistory([initialMessage]); // Reinicia al mensaje de bienvenida
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      parts: [{ type: 'text', content: messageText }]
    };

    setChatHistory(prev => [...prev, userMessage]);
    setMessage(''); 
    setIsLoading(true);

    try {
      const historyForBackend = chatHistory.map(msg => ({
        role: msg.role,
        parts: msg.parts.map(part => (part.type === 'text' ? part.content : '[Imagen]')).join('')
      }));

      // NOTA: Aquí preparamos el terreno para cuando lo subamos a internet
      // Si existe una variable de entorno, la usa. Si no, usa localhost.
      const backendURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/chat';

      const res = await axios.post(backendURL, {
        message: messageText,
        history: historyForBackend
      });

      const botResponseParts = parseBotResponse(res.data.response);
      const botMessage = {
        role: 'model',
        parts: botResponseParts
      };
      setChatHistory(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Error al contactar el backend:", error);
      const errorMessage = {
        role: 'model',
        parts: [{ type: 'text', content: "⚠️ Lo siento, tuve un problema de conexión. Por favor, intenta de nuevo." }]
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(message);
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  return (
    <div className="chat-app">
      {/* ✨ NUEVO: Encabezado con botón de borrar */}
      <header className="chat-header">
        <h1>Chatbot Farmacia 🤖</h1>
        <button onClick={clearChat} className="clear-button" title="Reiniciar conversación">
          Borrar 🗑️
        </button>
      </header>
      
      <div className="chat-window" ref={chatWindowRef}>
        {chatHistory.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.parts.map((part, partIndex) => {
              if (part.type === 'text') {
                // 🟢 LÍNEA CORREGIDA (Lo que debes poner)
                return <ReactMarkdown key={partIndex}>{part.content}</ReactMarkdown>;
              }
              if (part.type === 'image') {
                return <img key={partIndex} src={part.content} alt="Producto" />;
              }
              return null;
            })}
          </div>
        ))}
        {isLoading && <div className="message model loading-indicator">FarmaBot está escribiendo... 💬</div>}
      </div>

      <div className="suggestions-container">
        {suggestions.map((text, index) => (
          <button key={index} className="suggestion-button" onClick={() => handleSuggestionClick(text)} disabled={isLoading}>
            {text}
          </button>
        ))}
      </div>

      <form className="input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe tu consulta aquí..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Enviar
        </button>
      </form>

      {/* ✨ NUEVO: Pie de página Ético */}
      <footer className="disclaimer">
        ⚠️ FarmaBot es una IA experimental. No sustituye el consejo médico profesional.
      </footer>
    </div>
  );
}

export default App;