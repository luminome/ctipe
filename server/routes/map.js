const express = require('express');
const router = express.Router();
const package_detail = require('../../package.json');
const fs = require('fs');

const loader = require('../request');

function traverse(){
    //passsing directoryPath and callback function
    fs.readdir(vars.data_store, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        vars.files_arr = [];
        //listing all files using forEach
        files.forEach(function (file) {
            // Do whatever you want to do with the file
            const file_path = `${vars.data_store}/${file}`;
            const t_dat = new Date(createdDate(file_path));
            const lex = {name:file, path:file_path, time:t_dat.valueOf()}
            vars.files_arr.push(lex);
        });

        vars.files_arr.sort((a, b) => a.time < b.time ? 1 : -1).map((f,i) => {
            if(i > vars.max_history-1){
                ///console.log('delete',f,i);
                fs.unlink(f.path, (err) => {
                  if (err) {
                    console.error(err);
                  }
                  //file removed`
                })
            }
        });

        vars.files_arr.splice(vars.max_history, vars.files_arr.length);

    });
}

function load_complete(res){
    const clean = res[0].raw.split(/\s*[\s]\s*/);
    const t_sta = clean.slice(1,6).join('-');
    const values = clean.slice(7, clean.length).map(d => Number(d));
    const datum = JSON.stringify({"data":values});

    fs.writeFile(`${vars.data_store}/${t_sta}.json`, datum, {flag:'w+'}, err => {
      if (err) {
        console.error(err);
      }
    });

    traverse();
}

const vars = {
    data_path: 'https://services.swpc.noaa.gov/experimental/text/ctipe-tec-output.txt',
    data_store: './assets',
    call_time: null,
    start_time: null,
    delta_time: null,
    time_string: null,
    pings: 0,
    ping_delay: 10*60,
    max_history: 288, //two days of data.
    files_arr: [],
    timer:() => {
        vars.pings++;
        loader([{url:vars.data_path}]).then(r => load_complete(r));
        setTimeout(() => vars.timer(), vars.ping_delay*1000);
    }
}


function createdDate (file) {
  const { birthtime } = fs.statSync(file)
  return birthtime
}





const process = (res, query, data) => {

    if(query.hasOwnProperty('manifest')){
        const result = {
            data: vars.files_arr.map(fa => fa.name),
            stat: vars.files_arr.length+' items'
        }
        res.json(result);
    }else{
        const result = {
            value:data,
            query:query,
            vars: vars
        }
        res.json(result);
    }

    //console.log(`${package_detail.name} api process was called.`);
}

/* GET quotes listing. */
router.get('/', function (req, res, next) {
    try {
        const data = null;//map_service.get_all(req.query);
        if(vars.start_time === null){
            vars.timer();
            vars.start_time = new Date();
        }
        vars.call_time = new Date();
        const offset = vars.call_time.getTimezoneOffset()/60.0; //minutes
        vars.delta_time = (vars.call_time - vars.start_time)/1000.0+'s';
        vars.time_string = [
            (vars.call_time.getMonth()+1),
            vars.call_time.getDate(),
            vars.call_time.getFullYear(),
            (vars.call_time.getHours()+offset),
            vars.call_time.getMinutes()].join('-');



        return process(res, req.query, data);
    } catch (err) {
        res.json(err.message);
        console.error(`Error while getting what `, err.message);
        next(err);
    }
});

module.exports = router ;