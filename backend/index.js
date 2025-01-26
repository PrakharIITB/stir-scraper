const cors = require('cors');
require('dotenv').config();
const express = require('express');
const uploadModule = require('./api/upload-module');

const app = express();
app.use(cors({
  credentials: true,  
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'AccessKey', 'st-auth-mode', 'rid', 'x-file-name', 'x-start-byte', 'x-end-byte', 'x-total-size']
}));
app.use(express.json());

app.use('/api', uploadModule);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0',  () => {
  console.log(`Server listening on port ${PORT}`);
});
