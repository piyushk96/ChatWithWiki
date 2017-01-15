/**
 * Created by piyush on 13/1/17.
 */
'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const app = express();

app.set('port', process.env.PORT||5000);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    if(req.query['hub.verify_token'] == "verifycode")
        res.send(req.query['hub.challenge']);
    res.send('error, wrong validation token');
});

const FBurl = "https://graph.facebook.com/v2.6/me/messages?access_token=EAADAe2s8ddwBAMPZCZCl" +
    "cHn9VAjTK8rSNoc4orl6yzu1y49TGAWCIfGWu0G4k9hAMKU13TGtZBnKzsSp5ZAbJCwqwO5OlWG7YZCeMyJ0xySk" +
    "6Mh0tQieZCD6ZCqnhweZCHUEkhpyV0m0UZBJClDoXO0etQyJJwv6XZBtZAQn9TarrUK0gZDZD";

//////////////////////////////Send help message or payload message///////////////////////
function sendMessage(id, msg){
    const options = {
        uri : FBurl,
        method : 'POST',
        json : {
            "recipient" : {"id" : id},
            "message" : {"text" : msg}
        }
    };
    //POST request - sending message to messenger
    request(options, function (error, response, body) {
        if(error)
            console.log(error.message);
    });
}

/////////////////////////////Send Generic template content////////////////////////////
function wikiBot(id, query){
    let options;
    //GET request to Wikipedia
    request("https://en.wikipedia.org/w/api.php?format=json&action=query&generator=search&gsrnamespace" +
        "=0&gsrlimit=10&prop=extracts&exintro&explaintext&exsentences=5&exlimit=max&gsrsearch=" + query,
        function (error, response, body) {
            if(error)
                console.log(error.message);

            options = {
                url : FBurl,
                method : 'POST',
                json : true,
                body : {                             ////generic template
                    recipient : {"id" : id},
                    message : {
                        attachment : {
                            type : "template",
                            payload : {
                                template_type : "generic",
                                elements : []
                            }
                        }
                    }
                }
            };
            try{
                body = JSON.parse(body);
                const pages = body.query.pages;
                for(let i in pages){
                    const elem = {
                        title : pages[i].title,
                        subtitle : pages[i].extract.substr(0, 80).trim(),
                        buttons : [{
                            type : "postback",
                            title : "Read More",
                            payload : ""
                        }, {
                            type : "web_url",
                            url : "https://en.wikipedia.org/?curid=" + pages[i].pageid,
                            title : "View in browser"
                        }]
                    };
                    if(pages[i].extract != "")
                        elem.buttons[0].payload = pages[i].extract.substr(0, 1000).trim();
                    else
                        elem.buttons[0].payload = "Nothing here, Please view in browser";

                    options.body.message.attachment.payload.elements.push(elem);
                }
            }
            catch(err){
                console.log("error : " + err);
                options = {
                    uri : FBurl,
                    method : 'POST',
                    json : {
                        "recipient" : {"id" : id},
                        "message" : {"text" : "Something went wrong, please try again."}
                    }
                };
            }

            //POST request - sending message to messenger
            request(options, function (error, response, body) {
                if(error)
                    console.log(error.message);
            });
        }
    );
}

//Receives query from messenger
app.post('/', function (req, res) {
    req.body.entry[0].messaging.forEach(function (data, id) {
        if(data.message && data.message.text) {
            const text = data.message.text.toLowerCase().trim();
            if(text.substr(0, 4) == 'wiki')
                wikiBot(data.sender.id, text.replace('wiki ', ''));
            else
                sendMessage(data.sender.id, "Send wiki space 'Your query' to search wikipedia");
        }
        else if(data.postback && data.postback.payload)         /////Postback -> (Read More)
            sendMessage(data.sender.id, data.postback.payload);
    });
    res.end('replied!');
});

app.listen(app.get('port'), function () {
    console.log('http://localhost:' + app.get('port'));
});