
const express = require("express")
const cors = require("cors")
require('dotenv').config();
const movieModule = require('./api/movie')
const instaModule = require('./api/instagram')

const app = express()
const port = process.env.PORT || 3000


app.use(cors())
app.use(express.json())
app.use('/api', movieModule);
app.use('/api', instaModule);


// Movies API

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})

