'use strict'
var request = require('request');
var fs = require('fs');
var dateFormat = require('dateformat');
var retry_cnt=0;
var current_links_content = 0;
var current_links_comment = 0;
var newtime=0;

var test_cnt=0;


function crawler(setting,url,latestTime)
{
    /*
    if(test_cnt==3){
        console.log("--end--");
        return;
    }
    */
    var base_url = setting.target;
    test_cnt++;

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
            var len = info.length;
            var next_id = info[len-1].id;
            var next_url = base_url+'?before='+next_id+'&popular='+setting.fetch_popular+'&limit='+setting.perContent_limit;
            
            updateTime(setting,info[0].createdAt,latestTime);

            //console.log('next:'+next_url);
            fetchPostId(setting,info,fetchPostContent,fetchPostComment,next_url,latestTime);
        }
        else{
            if(rep){
                var code = rep.statusCode;
                if(code>=500&&code<=599){
                    retry_cnt++;
                    if(retry_cnt>setting.retryLimit){
                        console.log("Over retry limit:"+retry_limit);
                        var msg = "Over retry limit:"+retry_limit;
                        writeLog(setting,msg,'retry limit');
                    }
                    else{
                        console.log('['+url+'] retry crawler:'+code);
                        test_cnt--;
                        setTimeout(function(){
                            crawler(setting,url,latestTime);
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
                }
            }
            else{
                console.log(err);
                writeLog(setting,err,'error');
                retry_cnt++;
                if(retry_cnt>setting.retryLimit){
                    console.log("Over retry limit:"+retry_limit);
                    var msg = "Over retry limit:"+retry_limit;
                    writeLog(setting,msg,'retry limit');
                }
                else{
                    console.log('['+url+'] retry crawler:'+code);
                    setTimeout(function(){
                        crawler(setting,url,latestTime);
                    },setting.againTime*1000);
                }
            }

        }
    });
}


function fetchPostId(setting,info,getContentbyId,getCommentbyId,next_url,latestTime)
{
    var len = info.length;
    var req_num = parseInt(setting.perComment_limit);

    var i;
    var latest_time,current_time;
    current_links_content = len;
    current_links_comment = len;
    for(i=0;i<len;i++){
        if(latestTime!=0){
            current_time = new Date(info[i].createdAt);
            latest_time = new Date(latestTime);

            if(current_time.getTime()<=latest_time.getTime()){
                current_links_content = current_links_content-(len-i);
                current_links_comment = current_links_content-(len-i);
                console.log(current_time+"--reach end--"+latest_time);
                break;
            }
            else{
                console.log("current_time:"+current_time+" latest_time:"+latest_time);
                getContentbyId(setting,info[i].id,len,next_url,latestTime);
                getCommentbyId(setting,info[i].id,len,next_url,latestTime,info[i].commentCount,req_num,0);
                fs.appendFile(setting.id_manage,info[i].id+","+info[i].commentCount+","+info[i].likeCount+"\n");
            }
        }
        else{
            current_time = new Date(info[i].createdAt);
            latest_time = new Date(latestTime);
            console.log("current_time:"+current_time+" latest_time:"+latest_time);
            getContentbyId(setting,info[i].id,len,next_url,latestTime);
            getCommentbyId(setting,info[i].id,len,next_url,latestTime,info[i].commentCount,req_num,0);
            fs.appendFile(setting.id_manage,info[i].id+","+info[i].commentCount+","+info[i].likeCount+"\n");
        }
    }
}
function fetchPostContent(setting,post_id,totalp,next_url,latestTime)
{
    var base_url = setting.target;
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
            
            if(current_links_content==0&&current_links_comment==0){
                crawler(setting,next_url,latestTime);
                //console.log('next range...:'+next_url);
            }
        }
        else{
            if(rep){
                var code = rep.statusCode;
                if(code>=500&&code<=599){
                    retry_cnt++;
                    if(retry_cnt>setting.retryLimit){
                        console.log("Over retry limit:"+retry_limit);
                        var msg = "Over retry limit:"+retry_limit;
                        writeLog(setting,msg,'retry limit');
                    }
                    else{
                        console.log('['+post_id+'] retry crawler:'+code);
                        setTimeout(function(){
                            fetchPostContent(setting,post_id,totalp,next_url,latestTime);
                        },setting.againTime*1000);
                    }
                }
                else if(code==404){
                    current_links_content--;
                    console.log('[404] '+post_id);
                    var msg = 'Can\'t find the post_id:'+post_id;
                    writeLog(setting,msg,'404');
                    
                    if(current_links_content==0&&current_links_comment==0){
                        crawler(setting,next_url,latestTime);
                        //console.log('next range...:'+next_url);
                    }
                }
                else{
                    console.log('['+code+']');   
                    writeLog(setting,JSON.stringify(rep,null,3),'error');
                }
            }
            else{
                console.log(err);
                writeLog(setting,err,'error');
                retry_cnt++;
                if(retry_cnt>setting.retryLimit){
                    console.log("Over retry limit:"+retry_limit);
                    var msg = "Over retry limit:"+retry_limit;
                    writeLog(setting,msg,'retry limit');
                }
                else{
                    console.log('['+post_id+'] retry crawler:'+code);
                    setTimeout(function(){
                        fetchPostContent(setting,post_id,totalp,next_url,latestTime);
                    },setting.againTime*1000);
                }
            }

        }
    });
}
function fetchPostComment(setting,post_id,totalp,next_url,latestTime,comment_len,req_num,after)
{
    var base_url = setting.target;
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

            if(content.length==0||comment_len<0){
                current_links_comment--;
                if(current_links_content==0&&current_links_comment==0){
                    crawler(setting,next_url,latestTime);

                    //console.log('next range...:'+next_url);
                }
            }
            else if(comment_len>0){
                var next_after=after+req_num;
                fetchPostComment(setting,post_id,totalp,next_url,latestTime,comment_len,req_num,next_after)   
            }

        }
        else{
            if(rep){
                var code = rep.statusCode;
                if(code>=500&&code<=599){
                    retry_cnt++;
                    if(retry_cnt>setting.retryLimit){
                        console.log("Over retry limit:"+retry_limit);
                        var msg = "Over retry limit:"+retry_limit;
                        writeLog(setting,msg,'retry limit');
                    }
                    else{
                        console.log('['+post_id+'] retry crawler:'+code);
                        setTimeout(function(){
                            fetchPostComment(setting,post_id,totalp,next_url,latestTime,comment_len,req_num,after)   
                        },setting.againTime*1000);
                    }
                }
                else if(code==404){
                    current_links_comment--;
                    console.log('[404] '+post_id);
                    var msg = 'Can\'t find the post_id:'+post_id;
                    writeLog(setting,msg,'404');
                    
                    if(current_links_content==0&&current_links_comment==0){
                        //console.log('next range...:'+next_url);
                        crawler(setting,next_url,latestTime);
                    }
                }
                else{
                    console.log('['+code+']');   
                    writeLog(setting,JSON.stringify(rep,null,3),'error');
                }
            }
            else{
                console.log(err);
                writeLog(setting,err,'error');
                retry_cnt++;
                if(retry_cnt>setting.retryLimit){
                    console.log("Over retry limit:"+retry_limit);
                    var msg = "Over retry limit:"+retry_limit;
                    writeLog(setting,msg,'retry limit');
                }
                else{
                    console.log('['+post_id+'] retry crawler:'+code);
                    setTimeout(function(){
                        fetchPostComment(setting,post_id,totalp,next_url,latestTime,comment_len,req_num,after)   
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

function updateTime(setting,time,latestTime)
{

    if(newtime==0&&latestTime==0){
        newtime=time;
        console.log('Update time=>'+time);
        fs.writeFile(setting.latestTime,time);
    }
    else if(newtime==0&&latestTime!=0){
        newtime=latestTime;
    }

    var current_new=new Date(newtime);
    var compare_time=new Date(time)
    if(current_new.getTime()<compare_time.getTime()){
        newtime=time;
        console.log('Update time=>'+time);
        fs.writeFile(setting.latestTime,time);
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
