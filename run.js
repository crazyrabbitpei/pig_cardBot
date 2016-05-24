'use strict'
var dcardBot = require('./dcardBot.js');
var fs = require('fs');

var config_name="./config/setting.json";

readConfig(config_name,start);

function readConfig(filename,fin)
{
    fs.readFile(filename,(err,data)=>{
        var setting = JSON.parse(data);
        fin(setting);
    })

}
function start(setting)
{
    var url = setting.target+'?popular='+setting.fetch_popular+'&limit='+setting.perContent_limit;
    fs.readFile(setting.latestTime,(err,latestTime)=>{
        dcardBot.crawler(setting,url,latestTime);
    });

}
