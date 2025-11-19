const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = 3000; // Puedes cambiar el puerto si lo deseas

const CONTEXTO_VETERINARIA = `
Eres un asistente virtual experto en veterinaria. 
Nombre de la Empresa: Veterinaria Mundo Animal.
Ubicación: Calle San Martín 123, Cochabamnba, Bolivia.
Teléfono: +591 12345678.
Servicios: Consulta veterinaria, vacunación, desparasitación, venta de alimentos y accesorios para mascotas.
Horario: Lunes a Viernes de 9:00 a 18:00, Sábados de 9:00 a 13:00.
Información adicional:
Peluquería canina y felina costo:90 Bs.
Cuidado vetrinario: 100 Bs.  
Vacunación de perros y gatos: 50 Bs.
Responde únicamente preguntas relacionadas con salud, cuidado, alimentación y bienestar de animales domésticos. 
Si la pregunta no es relevante con la veterinaria, responde amablemente que solo puedes ayudar con temas veterinarios.
`;

// Middleware para analizar noel cuerpo de las peticiones JSON
app.use(bodyParser.json());
// Middleware para habilitar CORS (permite peticiones desde diferentes dominios)
app.use(cors());

// Configuración de la conexión a la base de datos MySQL
const dbConfig = {
  host: "localhost", // Cambia esto si tu base de datos está en otro servidor
  user: "root", // Reemplaza con tu nombre de usuario de MySQL
  password: "toby123?ba", // Reemplaza con tu contraseña de MySQL
  database: "dbventas", // Reemplaza con el nombre de tu base de datos
  port: "3306",
};

const dbConnection = mysql.createConnection(dbConfig);

// Conectar a la base de datos
dbConnection.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
    return;
  }
  console.log("Conexión a la base de datos MySQL establecida");
});

app.post("/ollama-prompt", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const promptConContexto = `${CONTEXTO_VETERINARIA}\nPregunta: ${prompt}`;

    // Llamada a la API de Ollama (stream: true)
    const ollamaResponse = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: "gemma3",
        prompt: promptConContexto,
        stream: true,
      },
      { responseType: "stream" }
    );

    let result = "";
    ollamaResponse.data.on("data", (chunk) => {
      // Cada línea es un JSON
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) result += json.response;
        } catch (e) {
          // Ignorar líneas que no sean JSON válidos
        }
      }
    });

    ollamaResponse.data.on("end", () => {
      res.json({ response: result.trim() });
    });

    ollamaResponse.data.on("error", (err) => {
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Implememtamos un servicio
app.post("/api/registro", (req, res) => {
  const { name, email, message } = req.body;
  console.log("Registro");
  console.log("Datos recibidos en el servidor como JSON:", req.body);

  if (!name || !email) {
    return res
      .status(400)
      .json({ error: "Nombre, email son campos requeridos." });
  }

  const query =
    "INSERT INTO contactos (nombre, email, mensaje) VALUES (?, ?, ?)";
  dbConnection.query(query, [name, email, message], (error, results) => {
    if (error) {
      console.error("Error al insertar datos en la tabla:", error);
      return res
        .status(500)
        .json({ error: "Error al guardar los datos en la base de datos." });
    }

    res.status(201).json({
      message: "Datos guardados correctamente.",
      id: results.insertId,
    });
  });
});

app.post("/api/save", (req, res) => {
  const { nombre, correo, mensaje } = req.body;
  console.log("Registro");
  console.log("Datos recibidos en el servidor como JSON:", req.body);

  if (!nombre || !correo) {
    return res
      .status(400)
      .json({ error: "Nombre, email son campos requeridos." });
  }
  console.log("Datos recibidos:", req.nombre, req.correo, req.mensaje);

  const query =
    "INSERT INTO contactos (nombre, email, mensaje) VALUES (?, ?, ?)";
  dbConnection.query(query, [nombre, correo, mensaje], (error, results) => {
    if (error) {
      console.error("Error al insertar datos en la tabla:", error);
      return res
        .status(500)
        .json({ error: "Error al guardar los datos en la base de datos." });
    }

    res.status(201).json({
      message: "Datos guardados correctamente.",
      id: results.insertId,
    });
  });
});
//Crear un servicio para obtener todos los registros de la tabla productos
app.get("/api/productos", (req, res) => {
  const query = "SELECT * FROM productos";
  dbConnection.query(query, (error, results) => {
    if (error) {
      console.error("Error al obtener datos de la tabla:", error);
      return res
        .status(500)
        .json({ error: "Error al obtener los datos de la base de datos." });
    }

    res.status(200).json(results);
  });
});

app.get("/", (req, res) => {
  res.send("¡Hola desde mi backend con Express!");
});

app.get("/servicio", (req, res) => {
  res.send("¡Hola desde mi backend con Express! Servicio");
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor Node.js escuchando en el puerto ${port}`);
});
