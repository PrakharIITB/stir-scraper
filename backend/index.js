require('dotenv').config();
const express = require('express');
const uploadModule = require('./api/upload-module');

const app = express();

app.use(express.json());

app.use('/upload', uploadModule);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});