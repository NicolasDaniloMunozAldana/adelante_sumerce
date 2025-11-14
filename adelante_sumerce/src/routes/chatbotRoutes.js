const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

/**
 * POST /api/chatbot/message
 * Envía un mensaje al chatbot y recibe una respuesta
 */
router.post('/message', ensureAuthenticated, async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        // Validar que el mensaje no esté vacío
        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'El mensaje no puede estar vacío'
            });
        }

        // Validar longitud del mensaje
        if (message.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'El mensaje es demasiado largo (máximo 1000 caracteres)'
            });
        }

        // Verificar que Gemini esté configurado
        if (!geminiService.isConfigured()) {
            return res.status(503).json({
                success: false,
                error: 'El servicio de chatbot no está disponible en este momento'
            });
        }

        // Enviar mensaje a Gemini
        const response = await geminiService.sendMessage(message, conversationHistory || []);

        res.json(response);

    } catch (error) {
        console.error('Error en endpoint de chatbot:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar tu mensaje. Por favor, intenta de nuevo.'
        });
    }
});

/**
 * GET /api/chatbot/welcome
 * Obtiene el mensaje de bienvenida
 */
router.get('/welcome', ensureAuthenticated, (req, res) => {
    try {
        const welcomeMessage = geminiService.getWelcomeMessage();
        const suggestions = geminiService.getQuickSuggestions();

        res.json({
            ...welcomeMessage,
            suggestions
        });
    } catch (error) {
        console.error('Error al obtener mensaje de bienvenida:', error);
        res.status(500).json({
            success: false,
            error: 'Error al cargar el chatbot'
        });
    }
});

/**
 * GET /api/chatbot/status
 * Verifica si el chatbot está disponible
 */
router.get('/status', ensureAuthenticated, (req, res) => {
    const isAvailable = geminiService.isConfigured();
    
    res.json({
        success: true,
        available: isAvailable,
        message: isAvailable 
            ? 'Chatbot disponible' 
            : 'Chatbot no configurado. Contacta al administrador.'
    });
});

module.exports = router;
