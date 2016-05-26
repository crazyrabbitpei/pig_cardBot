'use strict'
var request = require('request');
var HashMap = require('hashmap');
var run = require('./run.js');
var fs = require('fs');
var dateFormat = require('dateformat');
var retry_cnt=0;
var current_links_content = 0;
var current_links_comment = 0;
var test_cnt=0;
var next_forum=0;

var currentDate;
var newtime;

var tag = setInterval(function(){
    
    var rec = "";
    if(typeof newtime!=="undefined"){
        console.log("--write to forums.list--");
        newtime.forEach(function(value,key){
            //console.log('currentDate:'+key+','+value);
            rec +=key+','+value+'\n';

        });
        if(rec!=""){
            fs.writeFile('./id_manage/forums.list',rec);
        }
    }
},10*1000);



function crawler(forum_cnt,setting,url,latestTime)
{
    var base_url = setting.target;

    if(forum_cnt==0){
        newtime  = run.newtime;
    }
    test_cnt++;
    var forumName = url.match(/forums\/(.*)\/post/);
    if(typeof newtime.get(forumName[1])!=="undefined"){
        latestTime = newtime.get(forumName[1]);
    }
    /*
    if(test_cnt==3){
        console.log("--end--");
        return;
    }
    */

    if(next_forum==1){
        next_forum=0;
        console.log("===Next Forum==");
        retry_cnt=0;
        forum_cnt++;
        run.restart(setting,forum_cnt);
        return;
    }

    else{
        console.log("Start crawler:"+url);
        request({
            url:url,
            header:{
                'User-Agent':'dcardBot_demo/1.0'
            },
            timeout:60*1000
        },function(err,rep,body){
            if(!err&&rep.statusCode==200){
                var info = JSON.parse(body);
                if(typeof info==="undefined"||info.length==0){
                    console.log("===Next Forum==");
                    retry_cnt=0;
                    forum_cnt++;
                    run.restart(setting,forum_cnt);
                }
                else{
                    var len = info.length;
                    var next_id = info[len-1].id;
                    var forum_name = url.match(/forums\/(.*)\/post/);
                    var next_url = base_url+'/'+forum_name[1]+'/posts?before='+next_id+'&popular='+setting.fetch_popular+'&limit='+setting.perContent_limit;
                    //console.log('next:'+next_url);
                    updateTime(setting,info[0].createdAt,latestTime,forum_name[1]);
                    fetchPostId(forum_cnt,setting,info,fetchPostContent,fetchPostComment,next_url,latestTime);
                }
            }
            else{
                if(rep){
                    var code = rep.statusCode;
                    if(code>=500&&code<=599){
                        retry_cnt++;
                        if(retry_cnt>setting.retryLimit){
                            console.log("Over retry limit:"+retry_cnt);
                            var msg = "Over retry limit:"+retry_cnt;
                            writeLog(setting,msg,'retry limit');
                        }
                        else{
                            console.log('['+url+'] retry crawler:'+code);
                            setTimeout(function(){
                                crawler(forum_cnt,setting,url,latestTime);
                            },setting.againTime*1000);
                        }
                    }
                    else if(code==404){
                        console.log('[404]');
                        var msg = 'Can\'t find the website.';
                        writeLog(setting,msg,'404');
                    }
                    else{
                        console.log('['+code+']');   
                        writeLog(setting,JSON.stringify(rep,null,3),'error');

                        retry_cnt++;
                        if(retry_cnt>setting.retryLimit){
                            console.log("Over retry limit:"+retry_cnt);
                            var msg = "Over retry limit:"+retry_cnt;
                            writeLog(setting,msg,'retry limit');
                        }
                        else{
                            console.log('['+url+'] retry crawler:'+code);
                            setTimeout(function(){
                                crawler(forum_cnt,setting,url,latestTime);
                            },setting.againTime*1000);
                        }
                    }
                }
                else{
                    console.log(err);
                    writeLog(setting,err,'error');
                    retry_cnt++;
                    if(retry_cnt>setting.retryLimit){
                        console.log("Over retry limit:"+retry_cnt);
                        var msg = "Over retry limit:"+retry_cnt;
                        writeLog(setting,msg,'retry limit');
                    }
                    else{
                        console.log('['+url+'] retry crawler');
                        setTimeout(function(){
                            crawler(forum_cnt,setting,url,latestTime);
                        },setting.againTime*1000);
                    }
                }

            }
        });
    }
    

}


function fetchPostId(forum_cnt,setting,info,getContentbyId,getCommentbyId,next_url,latestTime)
{

    var len = info.length;
    var req_num = parseInt(setting.perComment_limit);

    var i;
    var latest_time,current_time;
    current_links_content = len;
    current_links_comment = len;
    /*
    if(len==0){
        if(current_links_content==0&&current_links_comment==0){
            next_forum=1;
            crawler(forum_cnt,setting,next_url,latestTime);
        }
        return;
    }
    */
    for(i=0;i<len;i++){
        if(latestTime!=0){
            current_time = new Date(info[i].createdAt);
            latest_time = new Date(latestTime);

            if(current_time.getTime()<=latest_time.getTime()){
                current_links_content = current_links_content-(len-i);
                current_links_comment = current_links_comment-(len-i);
                console.log(current_time+"--reach end--"+latest_time);
                //if(current_links_content==0&&current_links_comment==0){
                next_forum=1;
                if(i==0){
                    crawler(forum_cnt,setting,next_url,latestTime);
                }
                break;
            }
            else{
                //console.log("current_time:"+current_time+" latest_time:"+latest_time);
                getContentbyId(forum_cnt,setting,info[i].id,len,next_url,latestTime);
                getCommentbyId(forum_cnt,setting,info[i].id,len,next_url,latestTime,info[i].commentCount,req_num,0);
                fs.appendFile(setting.id_manage,info[i].id+","+info[i].commentCount+","+info[i].likeCount+"\n");
            }
        }
        else{
            /*
            if(crawledId.get(info[i].id)==1){
                current_links_content = current_links_content-(len-i);
                current_links_comment = current_links_content-(len-i);
                console.log(current_time+"--reach end--"+latest_time);
                break;
            }
            */
            //else{
                current_time = new Date(info[i].createdAt);
                latest_time = new Date(latestTime);
                //console.log("current_time:"+current_time+" latest_time:"+latest_time);
                getContentbyId(forum_cnt,setting,info[i].id,len,next_url,latestTime);
                getCommentbyId(forum_cnt,setting,info[i].id,len,next_url,latestTime,info[i].commentCount,req_num,0);
                fs.appendFile(setting.id_manage,info[i].id+","+info[i].commentCount+","+info[i].likeCount+"\n");
            //}
        }
    }
}
function fetchPostContent(forum_cnt,setting,post_id,totalp,next_url,latestTime)
{
    var base_url = setting.article_target;
    var url = base_url+'/'+post_id;
    //console.log('Processing:'+url);
    request({
        url:url,
        header:{
            'User-Agent':'dcardBot_demo/1.0'
        },
        timeout:60*1000
    },(err,rep,body)=>{
        if(!err&&rep.statusCode==200){
            current_links_content--;
            var content = JSON.parse(body);
            //console.log('['+post_id+']title:'+content.title);
            convert2gais(setting,post_id,content,'content');
            console.log("current_links_content:"+current_links_content+" current_links_comment:"+current_links_comment);
            if(current_links_content==0&&current_links_comment==0){
                crawler(forum_cnt,setting,next_url,latestTime);
                //console.log('next range...:'+next_url);
            }
        }
        else{
            if(rep){
                var code = rep.statusCode;
                if(code>=500&&code<=599){
                    retry_cnt++;
                    if(retry_cnt>setting.retryLimit){
                        console.log("Over retry limit:"+retry_cnt);
                        var msg = "Over retry limit:"+retry_cnt;
                        writeLog(setting,msg,'retry limit');
                    }
                    else{
                        console.log('['+post_id+'] retry crawler:'+code);
                        setTimeout(function(){
                            fetchPostContent(forum_cnt,setting,post_id,totalp,next_url,latestTime);
                        },setting.againTime*1000);
                    }
                }
                else if(code==404){
                    current_links_content--;
                    console.log('[404] '+post_id);
                    var msg = 'Can\'t find the post_id:'+post_id;
                    writeLog(setting,msg,'404');
                    
                    console.log("current_links_content:"+current_links_content+" current_links_comment:"+current_links_comment);
                    if(current_links_content==0&&current_links_comment==0){
                        crawler(forum_cnt,setting,next_url,latestTime);
                        //console.log('next range...:'+next_url);
                    }
                }
                else{
                    console.log('['+code+']');   
                    writeLog(setting,JSON.stringify(rep,null,3),'error');
                    
                    retry_cnt++;
                    if(retry_cnt>setting.retryLimit){
                        console.log("Over retry limit:"+retry_cnt);
                        var msg = "Over retry limit:"+retry_cnt;
                        writeLog(setting,msg,'retry limit');
                    }
                    else{
                        console.log('['+post_id+'] retry crawler:'+code);
                        setTimeout(function(){
                            fetchPostContent(forum_cnt,setting,post_id,totalp,next_url,latestTime);
                        },setting.againTime*1000);
                    }
                }
            }
            else{
                console.log(err);
                writeLog(setting,err,'error');
                retry_cnt++;
                if(retry_cnt>setting.retryLimit){
                    console.log("Over retry limit:"+retry_cnt);
                    var msg = "Over retry limit:"+retry_cnt;
                    writeLog(setting,msg,'retry limit');
                }
                else{
                    console.log('['+post_id+'] retry crawler');
                    setTimeout(function(){
                        fetchPostContent(forum_cnt,setting,post_id,totalp,next_url,latestTime);
                    },setting.againTime*1000);
                }
            }

        }
    });
}
function fetchPostComment(forum_cnt,setting,post_id,totalp,next_url,latestTime,comment_len,req_num,after)
{
    var base_url = setting.article_target;
    var url = base_url+'/'+post_id+'/comments?limit='+req_num+"&after="+after;
    //console.log('Processing:'+url);
    request({
        url:url,
        header:{
            'User-Agent':'dcardBot_demo/1.0'
        },
        timeout:60*1000
    },(err,rep,body)=>{
        if(!err&&rep.statusCode==200){
            comment_len = comment_len-req_num;
            var content = JSON.parse(body);
            var i;
            for(i=0;i<content.length;i++){
                //console.log("["+post_id+"]comment:"+content[i].content);
                convert2gais(setting,post_id,content[i],'comment');
            }

            console.log("0.current_links_content:"+current_links_content+" current_links_comment:"+current_links_comment);
            console.log("content.length:"+content.length+" comment_len:"+comment_len);
            if(content.length==0||comment_len<0){
                current_links_comment--;
                if(current_links_content==0&&current_links_comment==0){
                    crawler(forum_cnt,setting,next_url,latestTime);
                    //console.log('next range...:'+next_url);
                }
            }
            else if(comment_len>0||content.length!=0){
                var next_after=after+req_num;
                fetchPostComment(forum_cnt,setting,post_id,totalp,next_url,latestTime,comment_len,req_num,next_after);
            }
            else{
                console.log("else occur");
                console.log("content.length:"+content.length+" comment_len:"+comment_len);
            }

        }
        else{
            if(rep){
                var code = rep.statusCode;
                if(code>=500&&code<=599){
                    retry_cnt++;
                    if(retry_cnt>setting.retryLimit){
                        console.log("Over retry limit:"+retry_cnt);
                        var msg = "Over retry limit:"+retry_cnt;
                        writeLog(setting,msg,'retry limit');
                    }
                    else{
                        console.log('['+post_id+'] retry crawler:'+code);
                        setTimeout(function(){
                            fetchPostComment(forum_cnt,setting,post_id,totalp,next_url,latestTime,comment_len,req_num,after)   
                        },setting.againTime*1000);
                    }
                }
                else if(code==404){
                    current_links_comment--;
                    console.log('[404] '+post_id);
                    var msg = 'Can\'t find the post_id:'+post_id;
                    writeLog(setting,msg,'404');
                    
                    console.log("1.current_links_content:"+current_links_content+" current_links_comment:"+current_links_comment);
                    if(current_links_content==0&&current_links_comment==0){
                        //console.log('next range...:'+next_url);
                        crawler(forum_cnt,setting,next_url,latestTime);
                    }
                }
                else{
                    console.log('['+code+']');   
                    writeLog(setting,JSON.stringify(rep,null,3),'error');

                    retry_cnt++;
                    if(retry_cnt>setting.retryLimit){
                        console.log("Over retry limit:"+retry_cnt);
                        var msg = "Over retry limit:"+retry_cnt;
                        writeLog(setting,msg,'retry limit');
                    }
                    else{
                        console.log('['+post_id+'] retry crawler:'+code);
                        setTimeout(function(){
                            fetchPostComment(forum_cnt,setting,post_id,totalp,next_url,latestTime,comment_len,req_num,after)   
                        },setting.againTime*1000);
                    }
                }
            }
            else{
                console.log(err);
                writeLog(setting,err,'error');
                retry_cnt++;
                if(retry_cnt>setting.retryLimit){
                    console.log("Over retry limit:"+retry_cnt);
                    var msg = "Over retry limit:"+retry_cnt;
                    writeLog(setting,msg,'retry limit');
                }
                else{
                    console.log('['+post_id+'] retry crawler');
                    setTimeout(function(){
                        fetchPostComment(forum_cnt,setting,post_id,totalp,next_url,latestTime,comment_len,req_num,after)   
                    },setting.againTime*1000);
                }
            }

        }
    });

}

exports.crawler=crawler;
exports.fetchPostId=fetchPostId;
exports.fetchPostContent=fetchPostContent;
exports.fetchPostComment=fetchPostComment;

function updateTime(setting,time,latestTime,forum_name)
{
    if(typeof newtime.get(forum_name)==="undefined"&&latestTime==0){
        newtime.set(forum_name,time);
        console.log('Update time=>'+time);
        //fs.writeFile(setting.latestTime,time);
    }
    else if(typeof newtime.get(forum_name)==="undefined"&&latestTime!=0){
        newtime.set(forum_name,latestTime);
    }

    var current_new=new Date(newtime.get(forum_name));
    var compare_time=new Date(time)
    if(current_new.getTime()<compare_time.getTime()){
        newtime.set(forum_name,time);
        console.log('Update time=>'+time);
        //fs.writeFile(setting.latestTime,time);
    }
}

function fetchImage(url)
{
    //use phantom screenshot
}

function convert2gais(setting,post_id,data,type)
{
    var date = new Date();
    var rec_name = dateFormat(date,"yyyymmdd");
    //type:content,comment
    var date = new Date();
    var date_name = dateFormat(date,"yyyymmdd");
    if(type=="content"){
        var recFilename = setting.recFile+date_name+'.content'
        var rec="@GaisRec"+
                "\n@id:"+data.id+
                "\n@title:"+data.title+
                "\n@content:"+data.content+
                "\n@excerpt:"+data.excerpt+
                "\n@createdAt:"+data.createdAt+
                "\n@commentCount:"+data.commentCount+
                "\n@likeCount:"+data.likeCount+
                "\n@tags:"+data.tags+
                "\n@forumName:"+data.forumName+
                "\n@forumAlias:"+data.forumAlias+
                "\n@gender:"+data.gender+
                "\n@school:"+data.school+"\n";
    }
    else if(type=="comment"){
        var recFilename = setting.recFile+date_name+'.comment'
        var rec="@GaisRec"+
                "\n@post_id:"+data.postId+
                "\n@id:"+data.id+
                "\n@createdAt:"+data.createdAt+
                "\n@content:"+data.content+
                "\n@likeCount:"+data.likeCount+
                "\n@gender:"+data.gender+
                "\n@school:"+data.school+"\n";
    }
    fs.appendFile(recFilename,rec);
}
function import2elastic()
{
    
}
function writeLog(setting,data,type)
{
    var date = new Date();
    var log_name = dateFormat(date,"yyyymmdd");
    fs.appendFile(setting.logFile+log_name+'.log','['+date+']['+type+'] '+data+'\n--\n');
}
