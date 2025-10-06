require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fsSync.existsSync(uploadPath)) {
      fsSync.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const uniqueName = `${uuidv4()}-${cleanName}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Base de datos
const DB_PATH = path.join(__dirname, 'database', 'servicios.json');

async function readDatabase() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initialData = { servicios: [] };
      await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    throw error;
  }
}

async function writeDatabase(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// API Routes
app.get('/api/servicios', async (req, res) => {
  try {
    const db = await readDatabase();
    res.json(db.servicios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

app.post('/api/servicios', upload.single('imagen'), async (req, res) => {
  try {
    const db = await readDatabase();
    const { nombre, precio, cantidad, descripcion, promocion } = req.body;
    
    const newId = db.servicios.length > 0 
      ? Math.max(...db.servicios.map(s => s.id)) + 1 
      : 1;
    
    const nuevoServicio = {
      id: newId,
      nombre,
      precio: parseFloat(precio),
      cantidad: parseInt(cantidad),
      descripcion,
      promocion: promocion === 'true',
      imagen: req.file ? `/uploads/${req.file.filename}` : null,
      fechaCreacion: new Date().toISOString()
    };
    
    db.servicios.push(nuevoServicio);
    await writeDatabase(db);
    res.status(201).json(nuevoServicio);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

app.put('/api/servicios/:id', upload.single('imagen'), async (req, res) => {
  try {
    const db = await readDatabase();
    const servicioIndex = db.servicios.findIndex(s => s.id === parseInt(req.params.id));
    
    if (servicioIndex === -1) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    const { nombre, precio, cantidad, descripcion, promocion } = req.body;
    
    db.servicios[servicioIndex] = {
      ...db.servicios[servicioIndex],
      nombre,
      precio: parseFloat(precio),
      cantidad: parseInt(cantidad),
      descripcion,
      promocion: promocion === 'true',
      ...(req.file && { imagen: `/uploads/${req.file.filename}` }),
      fechaActualizacion: new Date().toISOString()
    };
    
    await writeDatabase(db);
    res.json(db.servicios[servicioIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

app.delete('/api/servicios/:id', async (req, res) => {
  try {
    const db = await readDatabase();
    const servicioIndex = db.servicios.findIndex(s => s.id === parseInt(req.params.id));
    
    if (servicioIndex === -1) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    const servicioEliminado = db.servicios.splice(servicioIndex, 1)[0];
    await writeDatabase(db);
    res.json({ message: 'Servicio eliminado', servicio: servicioEliminado });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

// Servir archivos subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta principal - redirigir a index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

// Para todas las demás rutas, servir el frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 TecnoApps ejecutándose en puerto ${PORT}`);
  console.log(`📁 Frontend: /pages/index.html`);
  console.log(`🔗 API: /api/servicios`);
});
