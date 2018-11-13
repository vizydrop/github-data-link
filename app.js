const express = require('express');
const app = express();
const body = require('body-parser');

app.use(body.json());

app.get('/', (req, res) => {
    res.json([]);
});

const server = app.listen(process.env.PORT || 8080);
module.exports = () => server;
