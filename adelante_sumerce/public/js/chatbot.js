/**
 * Chatbot Component - JavaScript
 * Maneja la interacción con el asistente virtual de Gemini AI
 */

// Estado del chatbot
const chatbotState = {
    isOpen: false,
    conversationHistory: [],
    isTyping: false,
    hasShownWelcome: false
};

// Constantes
const CHATBOT_STORAGE_KEY = 'chatbot_welcome_shown';
const MAX_HISTORY_LENGTH = 10;

/**
 * Inicializa el chatbot cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', function () {
    initializeChatbot();
});

/**
 * Inicializa el chatbot
 */
async function initializeChatbot() {
    // Mostrar el tooltip de bienvenida cada vez que el usuario entra a la aplicación
    setTimeout(() => {
        showWelcomeTooltip();
    }, 2000);

    // Cargar mensaje de bienvenida del chatbot
    try {
        const response = await fetch('/api/chatbot/welcome');
        const data = await response.json();

        if (data.success) {
            // Agregar mensaje de bienvenida a la interfaz (oculto hasta que se abra)
            addMessageToChat('assistant', data.message);

            // Cargar sugerencias
            if (data.suggestions && data.suggestions.length > 0) {
                loadSuggestions(data.suggestions);
            }
        }
    } catch (error) {
        console.error('Error al cargar mensaje de bienvenida:', error);
    }
}

/**
 * Muestra el tooltip de bienvenida inicial
 */
function showWelcomeTooltip() {
    const tooltip = document.getElementById('chatbot-welcome-tooltip');
    // No mostrar el tooltip si el chatbot ya está abierto
    if (tooltip && !chatbotState.isOpen) {
        tooltip.style.display = 'block';

        // Auto-ocultar después de 10 segundos
        setTimeout(() => {
            closeChatbotTooltip();
        }, 10000);
    }
}

/**
 * Cierra el tooltip de bienvenida
 */
function closeChatbotTooltip() {
    const tooltip = document.getElementById('chatbot-welcome-tooltip');
    if (tooltip && tooltip.style.display !== 'none') {
        tooltip.classList.add('fade-out');
        setTimeout(() => {
            tooltip.style.display = 'none';
            tooltip.classList.remove('fade-out');
        }, 500);
    }
}

/**
 * Alterna la visibilidad del chatbot
 */
function toggleChatbot() {
    const window = document.getElementById('chatbot-window');
    const badge = document.getElementById('chatbot-badge');

    chatbotState.isOpen = !chatbotState.isOpen;

    if (chatbotState.isOpen) {
        window.classList.add('active');
        badge.style.display = 'none';
        closeChatbotTooltip();

        // Hacer scroll al último mensaje
        setTimeout(() => {
            scrollToBottom();
            focusInput();
        }, 100);
    } else {
        window.classList.remove('active');
    }
}

/**
 * Carga las sugerencias rápidas
 */
function loadSuggestions(suggestions) {
    const container = document.getElementById('chatbot-suggestions');
    if (!container) return;

    container.innerHTML = '';

    suggestions.forEach(suggestion => {
        const btn = document.createElement('button');
        btn.className = 'chatbot-suggestion-btn';
        btn.textContent = suggestion;
        btn.onclick = () => {
            document.getElementById('chatbot-input').value = suggestion;
            // Remover el botón de sugerencia después de hacer clic
            btn.remove();
            sendChatbotMessage();
        };
        container.appendChild(btn);
    });
}

/**
 * Agrega un mensaje al chat
 */
function addMessageToChat(role, content, timestamp = null) {
    const messagesContainer = document.getElementById('chatbot-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'chatbot-message-content';
    contentDiv.innerHTML = formatMessage(content);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'chatbot-message-time';

    // FORMATEAMOS SIEMPRE
    timeDiv.textContent = formatTimestamp(timestamp);

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    messagesContainer.appendChild(messageDiv);

    scrollToBottom();

    chatbotState.conversationHistory.push({
        role: role,
        content: content
    });

    if (chatbotState.conversationHistory.length > MAX_HISTORY_LENGTH) {
        chatbotState.conversationHistory.shift();
    }
}

function formatTimestamp(ts) {
    if (!ts) {
        return getCurrentTime();
    }

    const date = new Date(ts);
    if (isNaN(date.getTime())) {
        return getCurrentTime();
    }

    return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit'
    });
}


/**
 * Formatea el mensaje con markdown básico
 */
function formatMessage(text) {
    // Escapar HTML
    text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Negrita
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Cursiva
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Saltos de línea
    text = text.replace(/\n/g, '<br>');

    // Enlaces
    text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    return text;
}

/**
 * Muestra el indicador de escritura
 */
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatbot-messages');
    if (!messagesContainer) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbot-message assistant';
    typingDiv.id = 'typing-indicator';

    const typingContent = document.createElement('div');
    typingContent.className = 'chatbot-typing';
    typingContent.innerHTML = '<span></span><span></span><span></span>';

    typingDiv.appendChild(typingContent);
    messagesContainer.appendChild(typingDiv);

    scrollToBottom();
}

/**
 * Oculta el indicador de escritura
 */
function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

/**
 * Envía un mensaje al chatbot
 */
async function sendChatbotMessage() {
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send-btn');
    const message = input.value.trim();

    if (!message || chatbotState.isTyping) return;

    // Deshabilitar input y botón
    input.disabled = true;
    sendBtn.disabled = true;
    chatbotState.isTyping = true;

    // Agregar mensaje del usuario
    addMessageToChat('user', message);
    input.value = '';
    
    // Resetear altura del textarea
    input.style.height = 'auto';

    // Ocultar sugerencias después del primer mensaje
    const suggestionsContainer = document.getElementById('chatbot-suggestions');
    if (suggestionsContainer && chatbotState.conversationHistory.length > 2) {
        suggestionsContainer.style.display = 'none';
    }

    // Mostrar indicador de escritura
    showTypingIndicator();

    try {
        // Enviar mensaje al servidor
        const response = await fetch('/api/chatbot/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                conversationHistory: chatbotState.conversationHistory.slice(-5) // Últimos 5 mensajes
            })
        });

        const data = await response.json();

        // Ocultar indicador de escritura
        hideTypingIndicator();

        if (data.success) {
            // Agregar respuesta del asistente
            addMessageToChat('assistant', data.message, data.timestamp);
        } else {
            // Mostrar mensaje de error
            addMessageToChat('assistant', data.error || 'Lo siento, no pude procesar tu mensaje. Por favor, intenta de nuevo.');
        }

    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        hideTypingIndicator();
        addMessageToChat('assistant', 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor, verifica tu conexión e intenta nuevamente.');
    } finally {
        // Rehabilitar input y botón
        input.disabled = false;
        sendBtn.disabled = false;
        chatbotState.isTyping = false;
        focusInput();
    }
}

/**
 * Maneja el evento de presionar Enter en el input
 */
function handleChatbotKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatbotMessage();
    }
}

/**
 * Hace scroll al último mensaje
 */
function scrollToBottom() {
    const messagesContainer = document.getElementById('chatbot-messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

/**
 * Enfoca el input del chatbot
 */
function focusInput() {
    const input = document.getElementById('chatbot-input');
    if (input && !input.disabled) {
        input.focus();
    }
}

/**
 * Obtiene la hora actual formateada
 */
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Auto-redimensiona el textarea según el contenido
 */
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

/**
 * Limpia el historial del chat (función auxiliar para debugging)
 */
function clearChatHistory() {
    chatbotState.conversationHistory = [];
    const messagesContainer = document.getElementById('chatbot-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
    console.log('Historial del chat limpiado');
}
