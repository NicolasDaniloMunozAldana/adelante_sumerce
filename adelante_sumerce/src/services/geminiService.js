const { GoogleGenAI } = require('@google/genai');

/**
 * Servicio para interactuar con Gemini AI
 * Proporciona soporte contextual a emprendedores sobre el proceso de caracterización
 */
class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.ai = null;
        this.model = 'gemini-2.5-flash'; // Modelo estable con mejor disponibilidad para free tier

        // Inicializar cliente si hay API key
        if (this.apiKey && this.apiKey !== 'your_gemini_api_key_here') {
            try {
                this.ai = new GoogleGenAI({ apiKey: this.apiKey });
            } catch (error) {
                console.error('Error al inicializar GoogleGenAI:', error.message);
            }
        }

        // Contexto específico sobre Salga Adelante Sumercé
        this.systemContext = `Eres un asistente virtual experto de "Salga Adelante Sumercé", un programa de caracterización y apoyo a emprendimientos desarrollado por Creativos Sumercé.

SOBRE CREATIVOS SUMERCÉ:
- Es una empresa dedicada al fortalecimiento del ecosistema emprendedor en Colombia
- Ofrece servicios de consultoría, capacitación y acompañamiento a emprendedores
- Desarrolla soluciones tecnológicas para la gestión de emprendimientos
- Su misión es impulsar el crecimiento sostenible de las MiPymes y emprendimientos

SOBRE SALGA ADELANTE SUMERCÉ:
- Es una plataforma digital para caracterizar emprendimientos
- Ayuda a los emprendedores a identificar el nivel de madurez de su negocio
- Genera reportes detallados con análisis de 5 dimensiones: Datos Generales, Modelo de Negocio, Finanzas, Equipo de Trabajo e Impacto Social/Ambiental
- Clasifica emprendimientos en: Idea Inicial, En Desarrollo o Consolidado
- Proporciona recomendaciones personalizadas para mejorar

SECCIONES DEL FORMULARIO DE CARACTERIZACIÓN:

A. Datos Generales:
- Nombre del emprendimiento
- Año de creación
- Sector económico
- Datos del encargado (nombre, celular, correo)
- Tiempo de operación en meses

B. Modelo de Negocio:
- Propuesta de valor: ¿Qué problema resuelve? ¿Qué hace único al emprendimiento?
- Segmento de clientes: ¿A quién va dirigido el producto/servicio?
- Canales de venta: ¿Cómo llega a los clientes? (físico, digital, mixto)
- Fuentes de ingreso: ¿Cómo genera dinero? (ventas directas, suscripciones, etc.)

C. Finanzas:
- Ventas netas mensuales (en SMMLV: menos de 1, entre 1-3, más de 3)
- Rentabilidad mensual (en SMMLV)
- Fuentes de financiamiento (recursos propios, crédito, inversionistas, subsidios)
- Costos fijos mensuales

D. Equipo de Trabajo:
- Nivel de formación empresarial del equipo
- Si tienen personal capacitado
- Si hay roles definidos
- Cantidad de empleados

E. Impacto Social y Ambiental:
- Empleos generados
- Si contribuye al medio ambiente
- Estrategias ambientales implementadas
- Si tiene innovación social

TU COMPORTAMIENTO:
- Sé amable, motivador y profesional
- Da respuestas concisas pero informativas
- Si te preguntan por un campo específico, explica qué información necesitan y por qué es importante
- Proporciona ejemplos prácticos cuando sea útil
- Si no sabes algo, sé honesto y recomienda contactar al equipo de soporte
- Usa un lenguaje cercano y comprensible, evita tecnicismos innecesarios
- Anima al emprendedor a completar todo el formulario para obtener un mejor análisis

IMPORTANTE: Tu función es ayudar durante el proceso de caracterización. No puedes acceder a datos específicos del usuario ni realizar acciones en el sistema, solo proporcionar orientación e información.`;
    }

    /**
     * Valida que el servicio esté configurado correctamente
     */
    isConfigured() {
        return !!this.apiKey && this.apiKey !== 'your_gemini_api_key_here' && !!this.ai;
    }

    /**
     * Envía un mensaje al chatbot y obtiene una respuesta
     */
    async sendMessage(userMessage, conversationHistory = []) {
        if (!this.isConfigured()) {
            throw new Error('Gemini API no está configurada. Por favor, agrega tu API key en el archivo .env');
        }

        try {
            // Construir el prompt completo con contexto y historial
            const fullPrompt = this._buildPrompt(userMessage, conversationHistory);

            // Usar la nueva API de @google/genai
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: fullPrompt,
                config: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            });

            // Extraer la respuesta del modelo
            const aiResponse = response.text;

            if (!aiResponse) {
                throw new Error('No se pudo obtener una respuesta válida de Gemini');
            }

            return {
                success: true,
                message: aiResponse,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error al comunicarse con Gemini API:', error.message);

            if (error.response) {
                console.error('Respuesta de error:', error.response.data);
            }

            return {
                success: false,
                message: 'Lo siento, estoy teniendo problemas para responder en este momento. Por favor, intenta de nuevo en un momento.',
                error: error.message
            };
        }
    }

    /**
     * Construye el prompt completo incluyendo contexto e historial
     */
    _buildPrompt(userMessage, conversationHistory) {
        let prompt = this.systemContext + '\n\n';

        // Agregar historial de conversación (últimos 5 mensajes)
        if (conversationHistory.length > 0) {
            prompt += 'CONVERSACIÓN PREVIA:\n';
            const recentHistory = conversationHistory.slice(-5);
            recentHistory.forEach(msg => {
                prompt += `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}\n`;
            });
            prompt += '\n';
        }

        prompt += `Usuario: ${userMessage}\n\nAsistente:`;

        return prompt;
    }

    /**
     * Genera un mensaje de bienvenida personalizado
     */
    getWelcomeMessage() {
        return {
            success: true,
            message: '¡Hola! 👋 Soy tu asistente virtual de Salga Adelante Sumercé. Estoy aquí para ayudarte durante el proceso de caracterización de tu emprendimiento. ¿En qué puedo ayudarte hoy?',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Genera sugerencias rápidas para el usuario
     */
    getQuickSuggestions() {
        return [
            '¿Qué es la caracterización?',
            '¿Cómo lleno el modelo de negocio?',
            '¿Qué significa SMMLV?',
            '¿Qué es Creativos Sumercé?'
        ];
    }
}

module.exports = new GeminiService();
