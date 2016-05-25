'use strict'
var dcardBot = require('./dcardBot.js');
var fs = require('fs');
var HashMap = require('hashmap');
var LineByLineReader = require('line-by-line');

var forumList = new Array();
var latestDate = new HashMap();


var config_name="./config/setting.json";

readConfig(config_name,start);


function readConfig(filename,runCrawler)
{

    fs.readFile(filename,(err,data)=>{
        var setting = JSON.parse(data);
        readForums(setting.catagory_list,()=>{
            readDate(setting.forums_manage,()=>{
                var forum_cnt=0;
                runCrawler(setting,forum_cnt);
            });
        });
    })
}
function readForums(filename,fin)
{
    var lr = new LineByLineReader(filename);
    lr.on('error',(err)=>{
       console.log(err); 
    });
    lr.on('line',(line)=>{
        //console.log(line);
        forumList.push(line);
    });
    lr.on('end',()=>{
        console.log("Forum list read done");
        fin();
    });
}
function readDate(filename,fin)
{
    var lr = new LineByLineReader(filename);
    lr.on('error',(err)=>{
       console.log(err); 
    });
    lr.on('line',(line)=>{
        var data = line.split(",");
        console.log("key:"+data[0]+" value:"+data[1]);
        latestDate.set(data[0],data[1]);
        fs.appedFile('./id_manage/backup_forums.list',data[0]+','+data[1]+'\n');
    });
    lr.on('end',()=>{
        console.log("Forum latest date read done");
        fin();
    });
}
function start(setting,forum_cnt)
{
    if(typeof forumList[forum_cnt]==="undefined"){
        console.log("--All forums done--");
        return;
    }

    var latestTime = latestDate.get(forumList[forum_cnt]);
    var url = setting.target+'/'+forumList[forum_cnt]+'/posts?popular='+setting.fetch_popular+'&limit='+setting.perContent_limit;
    //console.log(forumList[forum_cnt]+":"+latestTime);
    if(typeof latestTime==="undefined"){
        latestTime=0;
    }
    dcardBot.crawler(forum_cnt,setting,url,latestTime,start);
}
exports.restart=start;

