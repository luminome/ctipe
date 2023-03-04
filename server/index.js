const express = require('express');
const app = express();
app.use(require('express-status-monitor')());
const cors = require('cors');
app.set('json spaces', 2);
app.use(cors());
app.use(express.static('assets'));
//
//
// const scheduledFunctions = require('./scheduled/get-data');
const config = require('./config');
const package_detail = require('../package.json');
const port = process.env.PORT || config.default_port;


const map_router = require('./routes/map');

app.use('/m', map_router);



// ADD CALL to execute your function(s)
// scheduledFunctions.initScheduledJobs();

app.listen(port, () => {
  console.log(`${package_detail.name} app listening at http://localhost:${port}`);
});