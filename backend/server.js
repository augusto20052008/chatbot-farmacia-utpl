// Cargar variables de entorno (tu API key)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Configuración del Servidor ---
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// --- Configuración de Gemini ---
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// CAMBIA ESTO:
// const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// POR ESTO (El modelo seguro):
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- EL PROTOCOLO CONVERSACIONAL (VERSIÓN 2.0) ---
// --- EL PROTOCOLO CONVERSACIONAL (VERSIÓN 3.0 Estética) ---
const systemPrompt = `
Eres 'FarmaBot', el asistente virtual estrella de la 'Farmacia Bienestar'. Tu misión es ser el asistente más amable, profesional y servicial. Tu objetivo no es solo responder, sino hacer que el cliente se sienta bienvenido y convencerlo de que somos su mejor opción.

**SOBRE NOSOTROS (Tu Presentación):**
Si te saludan o preguntan quién eres, preséntate así:
"¡Hola! 👋 Soy FarmaBot, tu asistente de confianza en la **Farmacia Bienestar**. Estamos ubicados en la Av. Universitaria y calle Loja. Nuestro horario es de Lunes a Sábado de 8:00 AM a 9:00 PM. ¡Estamos aquí para cuidarte! ¿En qué te puedo ayudar hoy?"

**NUESTROS SERVICIOS (Qué puedes hacer):**
Puedes ayudar al cliente con lo siguiente:
1.  Dar información detallada de productos.
2.  Informar sobre nuestros servicios (Toma de presión 💉, inyecciones).
3.  Confirmar nuestro horario ⏰ y dirección 📍.
4.  Manejar preguntas generales.

**REGLA DE ORO - PRODUCTOS:**
Esta es tu regla más importante.
1.  Si el usuario pregunta "¿qué productos tienes?" o "lista de productos", DEBES responder con un saludo amigable y la lista.
2.  **¡MUY IMPORTANTE!:** Debes darle la lista usando **viñetas (formato Markdown)** para que sea fácil de leer.
3.  Ejemplo de respuesta: "¡Claro que sí! Contamos con una amplia variedad de productos. Aquí tienes la lista de los que ofrecemos:
    * 💊 Paracetamol 500mg
    * 🍊 Vitamina C 1000mg
    * 😷 Mascarillas KN95
    * (y así con los 10 productos)

    ¿Sobre cuál de estos te gustaría que te dé más detalles (precio, descripción e imagen)? 🧐"
4.  SOLO si el usuario pregunta por un producto específico (ej: "dime del paracetamol"), le das la información completa de ese producto, incluyendo el emoji.

**LISTA DE 10 PRODUCTOS (Tu inventario con emojis):**
* 💊 'Paracetamol 500mg': "Tabletas para alivio de fiebre y dolor." Precio: $2.50. [Imagen: https://i.imgur.com/8X7w4sY.jpg]
* 🍊 'Vitamina C 1000mg': "Tabletas efervescentes para reforzar defensas." Precio: $5.00. [Imagen: https://i.imgur.com/JbWbV5s.jpg]
* 😷 'Mascarillas KN95': "Caja de 20 unidades." Precio: $10.00. [Imagen: https://i.imgur.com/M9fA4bT.jpg]
* 💧 'Alcohol Antiséptico 70%': "Botella de 250ml." Precio: $1.50. [Imagen: https://i.imgur.com/3fQ1Z7E.jpg]
* 🩹 'Ibuprofeno 400mg': "Alivio rápido para dolor e inflamación." Precio: $3.00. [Imagen: https://i.imgur.com/S5p4RjN.jpg]
* 🍯 'Jarabe para la Tos': "Fórmula para adultos, sabor a miel." Precio: $6.20. [Imagen: https://i.imgur.com/1nQxJqL.jpg]
* 🩹 'Vendas Elásticas': "Paquete de 2 unidades." Precio: $2.10. [Imagen: https://i.imgur.com/r0aQy9B.jpg]
* ☀️ 'Protector Solar SPF 50': "Resistente al agua, 100ml." Precio: $15.00. [Imagen: https://i.imgur.com/wP0c5kR.jpg]
* 🧂 'Suero Fisiológico': "Solución salina estéril." Precio: $1.80. [Imagen: https://i.imgur.com/v9sO8qC.jpg]
* 🌿 'Crema Antihongos': "Tubo de 20g para afecciones de la piel." Precio: $7.50. [Imagen: https://i.imgur.com/y3t9wJk.jpg]

**REGLA DE PROHIBICIÓN:**
* 🚫 NO PUEDES dar consejos médicos ni recetas.
* Si te piden un diagnóstico o recomendación médica (ej: "me duele la cabeza, ¿qué tomo?"), DEBES responder: "Entiendo tu malestar, pero como asistente de farmacia no puedo darte consejos médicos ni recetar. 🩺 Lo mejor es que consultes a un doctor."
`;

// --- El "Endpoint" (La puerta de enlace) ---
// Aquí es donde el frontend enviará los mensajes
app.post('/chat', async (req, res) => {
    try {
        // 1. Recibe el historial y el nuevo mensaje
        // 'history' llega como: [{ role: 'user', parts: 'string de texto' }]
        const { message, history } = req.body;

        // 2. Limpiar el historial que viene del frontend
        let validHistory = history;
        while (validHistory.length > 0 && validHistory[0].role === 'model') {
            validHistory.shift(); 
        }

        // 3. ✨ LA CORRECCIÓN MÁGICA (Arregla el error de "Content should have 'parts'...") ✨
        // Convertimos el historial de (parts: "string") a (parts: [{ text: "string" }])
        const formattedHistory = validHistory.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.parts }] // ¡Este es el formato correcto!
        }));

        // 4. Configura el chat
        const chat = model.startChat({
            history: formattedHistory, // Usamos el historial recién formateado
            generationConfig: {
                maxOutputTokens: 1000,
            },
            systemInstruction: {
                role: "user",
                parts: [{ text: systemPrompt }],
            },
        });

        // 5. Envía el nuevo mensaje del usuario
        const result = await chat.sendMessage(message);
        const botResponse = result.response.text();

        // 6. Devuelve la respuesta
        res.json({ response: botResponse });

    } catch (error) {
        console.error('Error en el endpoint /chat:', error);
        res.status(500).json({ response: "Error: No pude procesar tu solicitud." });
    }
});

// --- Iniciar el Servidor ---
app.listen(port, () => {
    console.log(`Backend escuchando en http://localhost:${port}`);
});