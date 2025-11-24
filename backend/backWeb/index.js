const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());


const dbConfig = {
  host: "localhost",
  user: "root",
  password: "root", 
  database: "dbventas",
  port: "3306",
};

const dbConnection = mysql.createConnection(dbConfig);

dbConnection.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
    return;
  }
  console.log("Conexión a MySQL establecida correctamente.");
});


app.post("/ollama-prompt", (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }


  const query = "SELECT * FROM productos";

  dbConnection.query(query, async (err, results) => {
    if (err) {
      console.error("Error al leer noticias de la base de datos:", err);
      return res.status(500).json({ error: "Error de base de datos" });
    }

   
    const contextoNoticias = results.map((row) => {
      return ` TITULAR: ${row.nombre}\nCONTENIDO: ${row.descripcion || "Sin detalles"}`;
    }).join("\n\n----------------\n\n");

   
    const systemPrompt = `
      Eres un periodista y asistente de noticias experto.
      Tu única fuente de verdad es la siguiente base de datos de noticias.
      
      === NOTICIAS DISPONIBLES ===
      ${contextoNoticias}
      ============================

      Instrucciones:
      1. Responde a la pregunta del usuario basándote EXCLUSIVAMENTE en las noticias de arriba.
      2. Si la respuesta no está en las noticias, di "No tengo información sobre ese tema en mi base de datos actual".
      3. Sé claro, profesional y directo.
    `;

    const fullPrompt = `${systemPrompt}\n\nPregunta del usuario: ${prompt}\nRespuesta:`;

    try {
      // Enviamos a Ollama
      const ollamaResponse = await axios.post(
        "http://127.0.0.1:11434/api/generate",
        {
          model: "llama3.1:8b", 
          prompt: fullPrompt,
          stream: true,
        },
        { responseType: "stream" }
      );

      let result = "";


      ollamaResponse.data.on("data", (chunk) => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) result += json.response;
          } catch (e) { }
        }
      });

      ollamaResponse.data.on("end", () => {
        res.json({ response: result.trim() });
      });

    } catch (error) {
      console.error("Error comunicando con Ollama:", error.message);
      res.status(500).json({ error: "Error al conectar con la IA local" });
    }
  });
});


app.post("/api/save-noticia", (req, res) => {
  const { titulo, contenido } = req.body; 

  if (!titulo || !contenido) {
    return res.status(400).json({ error: "Titulo y contenido son requeridos" });
  }


  const query = "INSERT INTO productos (nombre, descripcion, precio, imagen, estado) VALUES (?, ?, 0, 'x', '1')";
  
  dbConnection.query(query, [titulo, contenido], (error, results) => {
    if (error) {
      console.error("Error SQL:", error);
      return res.status(500).json({ error: "Error al guardar noticia en BD" });
    }
    res.status(201).json({ message: "Noticia guardada correctamente", id: results.insertId });
  });
});

app.post("/api/registro", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Faltan datos" });

  const query = "INSERT INTO contactos (nombre, email, mensaje) VALUES (?, ?, ?)";
  dbConnection.query(query, [name, email, message], (error, results) => {
    if (error) return res.status(500).json({ error: "Error BD" });
    res.status(201).json({ message: "Guardado", id: results.insertId });
  });
});

app.get("/api/productos", (req, res) => {
  const query = "SELECT * FROM productos";
  dbConnection.query(query, (error, results) => {
    if (error) return res.status(500).json({ error: "Error BD" });
    res.status(200).json(results);
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor de Noticias IA corriendo en puerto ${port}`);
});