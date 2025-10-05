const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Importar fs normal para funciones síncronas
const fsSync = require('fs');

// Configuración mejorada de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    
    // Crear directorio si no existe de forma síncrona
    if (!fsSync.existsSync(uploadPath)) {
      fsSync.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Limpiar el nombre del archivo
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const uniqueName = `${uuidv4()}-${cleanName}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF)'), false);
    }
  }
});

// Ruta del archivo JSON
const DB_PATH = path.join(__dirname, '../database/servicios.json');

// Función para leer la base de datos
async function readDatabase() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Si el archivo no existe, crear uno vacío
    if (error.code === 'ENOENT') {
      const initialData = { servicios: [] };
      await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    throw error;
  }
}

// Función para escribir en la base de datos
async function writeDatabase(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// GET - Obtener todos los servicios
router.get('/', async (req, res) => {
  try {
    const db = await readDatabase();
    res.json(db.servicios);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// GET - Obtener un servicio por ID
router.get('/:id', async (req, res) => {
  try {
    const db = await readDatabase();
    const servicio = db.servicios.find(s => s.id === parseInt(req.params.id));
    
    if (!servicio) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    res.json(servicio);
  } catch (error) {
    console.error('Error al obtener servicio:', error);
    res.status(500).json({ error: 'Error al obtener el servicio' });
  }
});

// POST - Crear nuevo servicio
router.post('/', upload.single('imagen'), async (req, res) => {
  try {
    console.log('Body recibido:', req.body);
    console.log('Archivo recibido:', req.file);
    
    const db = await readDatabase();
    const { nombre, precio, cantidad, descripcion, promocion } = req.body;
    
    // Validaciones
    if (!nombre || !precio || !cantidad || !descripcion) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Generar nuevo ID
    const newId = db.servicios.length > 0 
      ? Math.max(...db.servicios.map(s => s.id)) + 1 
      : 1;
    
    const nuevoServicio = {
      id: newId,
      nombre: nombre.toString().trim(),
      precio: parseFloat(precio),
      cantidad: parseInt(cantidad),
      descripcion: descripcion.toString().trim(),
      promocion: promocion === 'true',
      imagen: req.file ? `/uploads/${req.file.filename}` : null,
      fechaCreacion: new Date().toISOString()
    };
    
    db.servicios.push(nuevoServicio);
    await writeDatabase(db);
    
    console.log('Servicio creado exitosamente:', nuevoServicio);
    res.status(201).json(nuevoServicio);
    
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear servicio: ' + error.message });
  }
});

// PUT - Actualizar servicio
router.put('/:id', upload.single('imagen'), async (req, res) => {
  try {
    const db = await readDatabase();
    const servicioIndex = db.servicios.findIndex(s => s.id === parseInt(req.params.id));
    
    if (servicioIndex === -1) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    const { nombre, precio, cantidad, descripcion, promocion } = req.body;
    
    // Actualizar servicio
    db.servicios[servicioIndex] = {
      ...db.servicios[servicioIndex],
      nombre: nombre.toString().trim(),
      precio: parseFloat(precio),
      cantidad: parseInt(cantidad),
      descripcion: descripcion.toString().trim(),
      promocion: promocion === 'true',
      ...(req.file && { imagen: `/uploads/${req.file.filename}` }),
      fechaActualizacion: new Date().toISOString()
    };
    
    await writeDatabase(db);
    res.json(db.servicios[servicioIndex]);
    
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error al actualizar servicio: ' + error.message });
  }
});

// DELETE - Eliminar servicio
router.delete('/:id', async (req, res) => {
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
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

// Manejo de errores de multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 5MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

module.exports = router;