var express = require('express');
var router = express.Router();

var http = require ('http');
var fs = require('fs');

router.get('/', function(req, res, next){
    res.writeHead(200, {'Content-Type': 'text/html'}); Tabs/signup.html
    fs.readFile('./tabs.html', null, function (error, data){
        if(error){
            res.writeHead(404);
            res.write('File not found!');
        }
        else{
            res.write(data);
        }
        res.end();
    });//call back function, executed once node js has finished reading login.html
});

module.exports = router; //allows us to acces it from a different file 