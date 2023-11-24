
const express = require('express')
const cors = require('cors')
require('dotenv').config()

const port = process.env.PORT || 3000
const app = express()


// middleware
app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
    res.send("Gadgetier server is running");
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})