require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const serviciosRoutes = require('./routes/servicios');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuración mejorada
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:8000'
];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (Postman, apps móviles)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    const msg = 'El CORS policy no permite acceso desde este origen: ' + origin;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas API
app.use('/api/servicios', serviciosRoutes);

// Ruta de health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de TecnoApps funcionando',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check para Railway/Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV}`);
  console.log(`🔗 API disponible en: /api/servicios`);
});