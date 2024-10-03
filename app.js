const http = require('http');
require("dotenv").config();

const {
    createBot,
    createProvider,
    createFlow,
    addKeyword,
    EVENTS,
} = require("@bot-whatsapp/bot");

const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');

const { init } = require("bot-ws-plugin-openai");
const { handlerAI } = require("./utils");
const { textToVoice } = require("./services/eventlab");

// Configuración del plugin OpenAI
const employeesAddonConfig = {
    model: "gpt-3.5-turbo",
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
};
const employeesAddon = init(employeesAddonConfig);

// Flujos del Bot
const flowVentas = addKeyword(["pedir", "ordenar"])
    .addAnswer(
        ["Claro que te interesa?", "mejor te envío audio.."],
        null,
        async (_, { flowDynamic }) => {
            console.log("🙉 texto a voz....");
            const path = await textToVoice(
                "Si claro, ¿cómo te puedo ayudar? Si gustas, envíame el detalle de técnicos que necesitas para tu servidor."
            );
            console.log(`🙉 Fin texto a voz....[PATH]: ${path}`);
            await flowDynamic([{ body: "escucha", media: path }]);
        }
    );

const flowSoporte = addKeyword(["necesito ayuda"]).addAnswer(
    "Claro, ¿cómo te puedo ayudar?"
);

const flowVoiceNote = addKeyword(EVENTS.VOICE_NOTE).addAction(
    async (ctx, ctxFn) => {
        // Verificar si el mensaje es una nota de voz
        if (ctx.type === 'audio' && ctx.isVoice) {
            await ctxFn.flowDynamic("Dame un momento para escucharte... 🙉");
            console.log("🤖 voz a texto....");
            
            let text;

            try {
                text = await handlerAI(ctx);
                console.log(`🤖 Fin voz a texto....[TEXT]: ${text}`);

                const empleado = await employeesAddon.determine(text);
                if (!empleado) {
                    throw new Error('No se pudo determinar el flujo para el empleado.');
                }

                employeesAddon.gotoFlow(empleado, ctxFn);
            } catch (error) {
                if (error.code === 'insufficient_quota') {
                    console.error('Error de cuota: has excedido tu límite. Por favor, verifica tu plan y detalles de facturación.');
                    await ctxFn.flowDynamic('Lo siento, he alcanzado mi límite de uso. Por favor, inténtalo más tarde.');
                } else {
                    console.error('Error al procesar la voz:', error);
                    await ctxFn.flowDynamic('Ocurrió un error al procesar tu mensaje. Por favor, inténtalo de nuevo.');
                }
            }
        } else {
            // No hacer nada si no es una nota de voz
            console.log('Este mensaje no es una nota de voz.');
        }
    }
);

const flowDocs = addKeyword(['doc', 'documentacion', 'documentación']).addAnswer(
    [
        '📄 Aquí encontrarás la documentación, recuerda que puedes mejorarla.',
        'https://bot-whatsapp.netlify.app/',
    ]
);






const flowPrincipal = addKeyword(['Consulta de 1103482996001'])
    .addAnswer('🙌 Hola, bienvenido a este *Chatbot*')
    .addAnswer(
        async (ctx) => {
            try {
                // Capturamos el mensaje que llega
                const mensaje = ctx.body;

                // Utilizamos una expresión regular para extraer el número de la cédula
                const regex = /Consulta de (\d{13})/;
                const match = mensaje.match(regex);

                if (match && match[1]) {
                    const cedula = match[1]; // Aquí tenemos la cédula

                    // JSON a enviar a la API
                    const jsonData = {
                        "identificacion": cedula
                    };

                    // Llamamos a tu API local utilizando el método que ya tienes implementado
                    const respuestaAPI = await fetch('https://guibis.com/dev/wspguibis/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(jsonData)
                    });

                    // Verificar si la respuesta es exitosa
                    if (!respuestaAPI.ok) {
                        throw new Error(`Error en la API: ${respuestaAPI.statusText}`);
                    }

                    // Extraemos el cuerpo de la respuesta
                    const datos = await respuestaAPI.json();

                    // Responde con el resultado de la API
                    return `La respuesta de la API para la identificación ${cedula} es: ${JSON.stringify(datos)}`;
                } else {
                    return 'No se encontró una identificación válida en el mensaje.';
                }
            } catch (error) {
                // Capturamos y mostramos cualquier error que ocurra
                console.error('Error al conectar con la API:', error);
                return 'Hubo un error al procesar tu solicitud. Intenta de nuevo más tarde.';
            }
        },
        [flowDocs, flowVentas, flowSoporte, flowVoiceNote] // Flujos adicionales si es necesario
    );


const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([
        flowPrincipal,
        flowVentas,
        flowSoporte,
        flowVoiceNote,
    ]);
    const adapterProvider = createProvider(BaileysProvider);

    // Eliminar la variable 'bot' para evitar el error no-unused-vars
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });



    QRPortalWeb();

    // Crear un servidor HTTP para manejar solicitudes POST
    const server = http.createServer((req, res) => {
        console.log('Solicitud recibida:', req.method, req.url);
        if (req.method === 'POST' && req.url === '/send-message') {
            let body = '';

            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const { number, message } = JSON.parse(body);
                    const formattedNumber = `${number}@s.whatsapp.net`;

                    // Extraer todas las URLs de imágenes del mensaje
                    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|pdf|xml|mp4))/ig;
                    const urlMatches = message.match(urlRegex);
                    const textWithoutUrls = message.replace(urlRegex, '').trim();

                    // Enviar texto primero si hay texto aparte de las URLs
                    if (textWithoutUrls) {
                        await adapterProvider.sendText(formattedNumber, textWithoutUrls);
                    }

                    // Luego, si hay URLs de imagen, enviar cada imagen
                    if (urlMatches && urlMatches.length > 0) {
                        for (const imageUrl of urlMatches) {
                            await adapterProvider.sendMedia(formattedNumber, imageUrl);
                        }
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Mensaje y/o imagen enviados' }));
                } catch (error) {
                    console.error(error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: error.message }));
                }
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    });

    server.listen(3001, () => {
        console.log('Servidor HTTP corriendo en el puerto 3001');
    });
};

main();
