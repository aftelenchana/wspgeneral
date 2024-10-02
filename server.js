const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).send({ error: 'Número y mensaje son requeridos.' });
    }

    try {
        // Aquí llamas a la función que envía el mensaje de WhatsApp
        await sendMessageToWhatsApp(number, message);
        res.send({ success: true, message: 'Mensaje enviado correctamente.' });
    } catch (error) {
        res.status(500).send({ error: 'Error al enviar el mensaje.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

async function sendMessageToWhatsApp(number, message) {
    // Implementa la lógica para enviar un mensaje a través de tu proveedor de WhatsApp
    console.log(`Enviando mensaje a ${number}: ${message}`);
    // Aquí iría el código para conectar con tu proveedor de WhatsApp y enviar el mensaje
}