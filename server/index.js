const express = require('express');
const app = express();
const config = require('./config');
const package_detail = require('../package.json');
const port = process.env.PORT || config.default_port;
const cors = require('cors')
app.use(cors())

app.use(express.static('assets'));

const map_router = require('./routes/map');

app.use('/m', map_router);

app.set('json spaces', 2);

app.listen(port, () => {
  console.log(`${package_detail.name} app listening at http://localhost:${port}`);
});