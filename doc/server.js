const port = process.env.PORT || 4058
const express = require('express')
const app = express()
const swaggerUi = require('swagger-ui-express')
const swaggerDocument = require('./spec.json')

app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

module.exports = app

app.listen(port, () => console.log(`Server has been started on ${port}`))
