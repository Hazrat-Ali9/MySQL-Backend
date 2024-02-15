import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import multer from 'multer'
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';



const app = express();
const port = 9000;


app.use(bodyParser.urlencoded({ extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure the destination directory exists
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const directory = 'public/images';
    fs.mkdirSync(directory, { recursive: true }); // Create directory if it doesn't exist
    cb(null, directory);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + " " + Date.now() + path.extname(file.originalname));
  }
});


const upload = multer({ storage: storage });

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.use('/public', express.static(join(__dirname, 'public')));

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password@123#',
  database: 'product'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database: ' + err.stack);
    return;
  }
  console.log('Connected to database');
});






app.post('/products', upload.single('image'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded');
    res.status(400).send('No file uploaded');
    return;
  }
  
  console.log(req.file);
  const { id, name, desc, category, price } = req.body;
  const image = req.file.filename;
  const INSERT_PRODUCTS_QUERY = `INSERT INTO products (id, name, \`desc\`, image, category, price) VALUES (?, ?, ?, ?, ?, ?)`;
  connection.query(INSERT_PRODUCTS_QUERY, [id, name, desc, image, category, price], (err, results) => {
    if (err) {
      console.error('Error adding product:', err);
      res.status(500).send('Error adding product');
    } else {
      console.log('Product added successfully');
      res.send('Product added successfully');
    }
  });
});

app.get('/products', (req, res) => {
  const SELECT_ALL_PRODUCTS_QUERY = `SELECT * FROM products`;
  connection.query(SELECT_ALL_PRODUCTS_QUERY, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});


app.get('/products/:id', (req, res)=>{
  const sql = "SELECT * FROM products Where id = ?";
  const id = req.params.id
  connection.query(sql,[id], (err, result)=>{
    if (err) return res.json({Error: err});
    return res.json(result);
  })
})

app.put('/products/:id', upload.single('image'), (req, res) => {
  const id = req.params.id;

  let image = null;
  if (req.file) {
    image = req.file.filename;
  }

  // Retrieve the previous image value from the database
  const GET_PREVIOUS_IMAGE_QUERY = "SELECT image FROM products WHERE id = ?";
  connection.query(GET_PREVIOUS_IMAGE_QUERY, [id], (error, results) => {
    if (error) {
      console.error(error);
      return res.json({ updated: false, error: "Failed to update product" });
    } else {
      const previousImage = results[0].image;

      // Use previous image if no new image uploaded
      if (!image) {
        image = previousImage;
      }

      const UPDATE_PRODUCTS_QUERY = "UPDATE products SET `name` = ?, `desc` = ?, `image` = ?, `category` = ?, `price` = ? WHERE id = ?";
      connection.query(UPDATE_PRODUCTS_QUERY, [req.body.name, req.body.desc, image, req.body.category, req.body.price, id], (error, results) => {
        if (error) {
          console.error(error);
          return res.json({ updated: false, error: "Failed to update product" });
        } else {
          return res.json({ updated: true });
        }
      });
    }
  });
});



  


app.delete('/products/:id', (req, res) => {
    const { id } = req.params;
    const DELETE_PRODUCTS_QUERY = `DELETE FROM products WHERE id = ?`;
    connection.query(DELETE_PRODUCTS_QUERY, [id], (err, results) => {
      if (err) throw err;
      res.send('User deleted successfully');
    });
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
