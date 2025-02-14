
const express = require("express")
const cors = require("cors")
require('dotenv').config();
const movieModule = require('./api/movie')
const instaModule = require('./api/instagram')
const uploadModule = require('./api/upload_hashtags')
const overviewModule = require('./api/overview')

const app = express()
const port = process.env.PORT || 3000


app.use(cors())
app.use(express.json())
app.use('/api', movieModule);
app.use('/api', instaModule);
app.use('/api', uploadModule);
app.use('/api', overviewModule);


// Movies API

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})

