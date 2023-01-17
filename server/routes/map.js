const express = require('express');
const router = express.Router();

const cors = require('cors');

const package_detail = require('../../package.json');
const config = require('./../config');
const fs = require('fs');

const loader = require('../request');


const auto_load = {
    count: 0,
    in_queue: 0,
    bytes_loaded: 0,
    delta_time: 0,
    manifest_data: [],
    load_index: 0,
    limit: null,
    complete(resource, cat){

        console.log(resource);


        const res = resource[0];

        if(cat === 'manifest'){


            console.log(res, typeof resource[0].raw.data);

            const r = res.raw.data;

            auto_load.manifest_data = r.map((obj_str,id) => {
                const var_id = obj_str.split('.')[0];
                return {url:config.assets_path+obj_str, variable:var_id, size:'loading', type:'json', cat:'asset', id:(r.length-1)-id}
            })

            console.log('manifest loaded', auto_load.manifest_data.length);
            if(auto_load.limit !== null) auto_load.manifest_data.splice(auto_load.limit, auto_load.manifest_data.length);

            auto_load.in_queue = auto_load.manifest_data.length;
            auto_load.manifest_data.reverse();
            auto_load.count = 0;

            auto_load.load_asset(0);
            ///console.log('loaded manifest', auto_load.manifest_data);
        }

        if(cat === 'asset'){

            console.log('asset loaded', res.variable);

            const datum = JSON.stringify(res.raw);
            fs.writeFile(`${vars.data_store}/${res.variable}.json`, datum, {flag:'w+'}, err => {
              if (err) {
                console.error(err);
              }
            });

            auto_load.load_index++;
            if(auto_load.load_index < auto_load.in_queue){
                auto_load.load_asset(auto_load.load_index);
            }else{
                console.log('assets were loaded');
            }
        }

        return true;
    },
    status(count, obj){
        console.log(obj.variable, auto_load.count, 'of', auto_load.in_queue);
        if(count === -1){
            auto_load.count ++;
        }
    },
    load_manifest(){
        const queue = [{url:`${config.manifest_path}`, variable:'manifest', size:'loading', type:'json', cat:'manifest', id:0}];
        auto_load.in_queue = (queue.length);
        loader(queue, auto_load.status).then(r => auto_load.complete(r, 'manifest'));
    },
    load_asset(index){
        const queue = [auto_load.manifest_data[index]];
        loader(queue, auto_load.status).then(r => auto_load.complete(r,'asset'));
    }
}








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
    const values = clean.slice(6, clean.length-1).map(d => Number(d));
	
	if(vars.test){
        vars.test_output = [t_sta, values[0], values[values.length-1], values.length];
        return;
    }
	
    const datum = JSON.stringify({"data":values});
    fs.writeFile(`${vars.data_store}/${t_sta}.json`, datum, {flag:'w+'}, err => {
      if (err) {
        console.error(err);
      }
    });

    traverse();
}

const vars = {
    req_ip: null,
    data_path: 'https://services.swpc.noaa.gov/experimental/text/ctipe-tec-output.txt',
    data_store: './assets',
    call_time: null,
    start_time: null,
    delta_time: null,
    time_string: null,
    pings: 0,
    ping_delay: 10*60,
    max_history: 576, //4 days 288, //two days of data.
    files_arr: [],
	test: false,
    test_output:null,
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


    if(query.hasOwnProperty('load') && vars.req_ip ==='::1'){
        console.log(`${package_detail.name} api load was called.`);
        auto_load.load_manifest();
        const result = {
            message:`${package_detail.name} api load was called.`,
            query:query,
            vars: vars
        }
        res.json(result);

    }else if(query.hasOwnProperty('test') && vars.req_ip ==='::1'){
		console.log(`${package_detail.name} api test was called.`);
		vars.test = true;
		loader([{url:vars.data_path}]).then(r => load_complete(r));
		
        const result = {
            message:`${package_detail.name} api test was called.`,
            value:vars.test_output,
            query:query,
            vars: vars
        }
        res.json(result);
		
	}else if(query.hasOwnProperty('manifest')){
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

const corsOptions = {
  origin: ['http://localhost:3000','https://scottandrecampbell.com'],
  methods: "GET,HEAD",
  preflightContinue: true,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

/* GET quotes listing. */
router.get('/', cors(corsOptions), function (req, res, next) {
    try {
        vars.req_ip = req.ip;

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