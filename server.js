const express = require('express');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const { MongoClient, MongoExpiredSessionError } = require('mongodb');
const path = require('path');
const uuid = require('uuid');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT

app.use(express.json())
app.use(express.urlencoded({extended:false}))

app.set('view engine', 'ejs')
// Configure Google Cloud Storage
const storage = new Storage({
  keyFilename: "key.json",
});
const bucketName = process.env.BUCKET_NAME;
const bucket = storage.bucket(bucketName);

// Configure MongoDB
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient("mongodb://localhost:27017");
const dbName = 'file_database';
let db;



client.connect(err => {
  if (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
  db = client.db(dbName);
  console.log('Connected to MongoDB');
});

// Configure Multer
const upload = multer({
  storage: multer.memoryStorage(),
});

app.get('/', async (req, res) => {
    
  //return res.status(200).json({ message: "Server is Live." });
  try{
    const [files] = await bucket.getFiles()
    res.render("index", {files})
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = `${uuid.v4()}${path.extname(file.originalname)}`;
    const blob = bucket.file(filename);

    const blobStream = blob.createWriteStream({
      resumable: false,
        
    });

    blobStream.on('error', err => {
      return res.status(500).json({ error: err.message });
    });

    blobStream.on('finish', async () => {
    //   const imageUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
    //   const imageMetadata = {
    //     filename: filename,
    //     contentType: file.mimetype,
    //     size: file.size,
    //     url: imageUrl,
    //   };
        //res.send("File saved")
        res.redirect('/')
    //   try {
    //     const result = await db.collection('images').insertOne(imageMetadata);
    //     res.status(201).json({ message: 'Image uploaded successfully', metadata: imageMetadata });
    //   } catch (error) {
    //     console.log(error);
    //     res.status(500).json({ error: error.message });
    //   }
     });
    
    blobStream.end(file.buffer);
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

// app.get('/download/:filename', async (req, res) => {
//     const filename = req.params.filename;
//     const file = bucket.file(filaname);
//     try{
//         const [exists] = await file.exists()
//         if(!exists) {
//             res.status(404).send("File not Found");
//             return
//         }
//         const signedUrl = await file.getSignedUrl({
//             action:'read',
//             expires:Date.now() + 5 * 60 * 1000
//         }) 
//         res.redirect(signedUrl)
//     }
//     catch (error) {
//         console.log(error)
//     }
// })

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
