const express = require('express');
const app = express();
const config = require('./config');
const package_detail = require('../package.json');
const port = process.env.PORT || config.default_port;

//app.use(express.static('dist'));

app.listen(port, () => {
  console.log(`${package_detail.name} app listening at http://localhost:${port}`);
});