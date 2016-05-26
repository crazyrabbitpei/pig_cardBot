'use strict'
var dcardBot = require('./dcardBot.js');
var fs = require('fs');
var HashMap = require('hashmap');
var LineByLineReader = require('line-by-line');

var forumList = new Array();
var latestDate = new HashMap();
var newtime;

var crawledId = new HashMap();

var config_name="./config/setting.json";
var flag=0;

readConfig(config_name,start);



function readConfig(filename,runCrawler)
{

    fs.readFile(filename,(err,data)=>{
        var setting = JSON.parse(data);
        readForums(setting.catagory_list,()=>{
            readDate(setting.forums_manage,()=>{
                //readCrawledID(setting.id_manage,()=>{
                    var forum_cnt=0;
                    exports.newtime = newtime;
                    //exports.crawledId = crawledId;
                    runCrawler(setting,forum_cnt);
                //});
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
    var rec ="";
    var lr = new LineByLineReader(filename);
    lr.on('error',(err)=>{
       console.log(err); 
    });
    lr.on('line',(line)=>{
        var data = line.split(",");
        console.log("key:"+data[0]+" value:"+data[1]);
        latestDate.set(data[0],data[1]);
        rec +=data[0]+','+data[1]+'\n';

    });
    lr.on('end',()=>{
        console.log("Forum latest date read done");
        fs.writeFile('./id_manage/backup_forums.list',rec);
        newtime = latestDate.clone();
        fin();
    });
}
function readCrawledID(filename,fin)
{
    var lr = new LineByLineReader(filename);
    lr.on('error',(err)=>{
       console.log(err); 
    });
    lr.on('line',(line)=>{
        var data = line.split(",");
        crawledId.set(data[0],1);
    });
    lr.on('end',()=>{
        console.log("Crawled id list read done");
        fin();
    });
}
function start(setting,forum_cnt)
{
    //console.log(forumList[forum_cnt]+":"+latestTime);
    if(typeof latestTime==="undefined"){
        latestTime=0;
    }

    if(typeof forumList[forum_cnt]==="undefined"){
        console.log("--All forums done--");
        forumList = [];
        console.log("Waiting 60 secs...");
        setTimeout(function(){
            console.log("==Restart==");
            //readConfig(config_name,start);
            readForums(setting.catagory_list,()=>{
                readDate(setting.forums_manage,()=>{
                    exports.newtime = newtime;
                    forum_cnt=0;
                    var latestTime = latestDate.get(forumList[forum_cnt]);
                    var url = setting.target+'/'+forumList[forum_cnt]+'/posts?popular='+setting.fetch_popular+'&limit='+setting.perContent_limit;
                    dcardBot.crawler(0,setting,url,latestTime);
                });
            });
        },60*1000);

    }
    else{
        var latestTime = latestDate.get(forumList[forum_cnt]);
        var url = setting.target+'/'+forumList[forum_cnt]+'/posts?popular='+setting.fetch_popular+'&limit='+setting.perContent_limit;
        dcardBot.crawler(forum_cnt,setting,url,latestTime);
    }
}
exports.restart=start;

