const express = require('express');
const cors = require('cors');
const path = require('path');
const serviciosRoutes = require('./routes/servicios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
app.use('/api/servicios', serviciosRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API de TecnoApps funcionando' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});