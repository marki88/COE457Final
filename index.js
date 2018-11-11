var nano = require('nano')('http://localhost:5984'); //connect nano to db
var express = require('express');
var cors = require('cors');
var app = express();

var police = nano.use('police'); //use the police database 
var alerts = nano.use('alerts'); //use the alerts database
//for encryting the passwords
const bcrypt = require('bcrypt');
const saltRounds = 10;

var bodyParser = require('body-parser');
// Create application/x-wwsw-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.set('port', process.env.PORT || 2500);

app.use(cors());

app.use(express.static(__dirname));


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/tabs.html');
})
app.get('/about', (req, res) => {
  res.sendFile(__dirname + '/about.html');
})
app.get('/crimealerts', (req, res) => {
  res.sendFile(__dirname + '/alerts.html');
})
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/Login.html');
})
app.get('/signup', (req, res) => {
  res.sendFile(__dirname + '/signup.html');
})


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
//---------------------------- ALERTS -----------------------------------------
//-------ADD ALERTS SENT FROM THE WATCH TO DB----------------------
app.post('/processalert_post', function (req, res) {
  // Prepare output in JSON format
  //console.log(req.body.lat);
  response = {
    time: req.body.time, //get the date sene by the watch
    coords: { //get the location
      "lat": req.body.lat,
      "lng": req.body.lng,
    },
    alert_status: req.body.alert_status, //get the status of the alert (if confirmed or unconfirmed by watch user)
  };
console.log(response);
  //add the response to the alerts database
  id1 = 'alert'.concat(req.body.time);
  id2 = id1.concat(req.body.lat);
  id3 = id2.concat(req.body.lng);
  alerts.insert(response, id3, function (err, body, header) {
    if (err) {
      console.log('[alerts.insert] ', err.message);
      return;
    }
    res.end(JSON.stringify(response));
  });
})

//-------UPDATE THE ALERTS----------------------
//Get the coordinates from the database and add the updated location points on the map
app.get('/update-console', function (req, res) {
  // Prepare output in JSON format
  alerts.view('browser-side-views', 'view_all_alerts', function (err, body) {
      if (!err) {
          console.log(body.rows);
          var rows = body.rows; //the rows returned
          res.end(JSON.stringify(rows))
      } else {
          console.log('Error found: ' + err);
      }
   }
  );
});
//---------------------------- SIGN UP -------------------------------------------------------
//when the user submits the signup form, the form data is sent to the server
app.post('/processignup_post', urlencodedParser, function (req, res) {
  // Prepare the sign up form inputs in JSON format

  var k = 'no_exist'; //used to check if the user does or doesn't exist in the database 

  //check if the username already exists in the db
  police.view('design2', 'username-view', {
    key: req.body.username
  }, (err, body) => {
    if (body.rows.length != 0) { //if the username exists, k = exists 
      var k = 'exists';
      res.end('failure1'); //send sign in failure due to existing username
    }
  });

  //check if the user already exits in the database and store only non exisitng users to the db
  police.view('design1', 'name-view', {
    key: req.body.name
  }, (err, body) => {
    var i = body.rows.length; //get length of rows for entires with the given key 
    //(thus with the same name)
    var j = i - 1;
    if (i > 0) {
      //loop through each entry with the same name as the name entered by the user
      while (j >= 0) {
        //if an entry with the same name and the same email exists, 
        //don't allow user to register
        if (body.rows[j].value.email == req.body.email) {
          k = 'exists';
          res.end('failure'); //registration failed is sent as an alert
        }
        j--;
      }
      //if the user doesnot exist add user to the database
      if (k == 'no_exist') {
        //user with the same name but different email exists
        //add user to the db
        id = 'police'.concat(req.body.username); //unique id is given to every new entry 
        //add the entry to the db
        bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
          //Store hashed password in the database
          if (!err) {
            response = {
              name: req.body.name,
              username: req.body.username,
              email: req.body.email,
              mobilenumber: req.body.mobilenumber,
              password: hash
            };
            police.insert(response, id, function (err, body, header) {
              if (err) {
                console.log('[police.insert] ', err.message);
                return;
              }
              res.end('success'); //registration successful alert is sent
            });
          }
          else {
            console.log(err);
            res.status(500).send('Error')
          }
        });
      }
    }
    else if (i == 0) {
      //adding a user with a name that doesnot exist in the database
      id = 'police'.concat(req.body.username); //unique id is given to every new entry 
      bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        //Store hashed password in the database
        if (!err) {
          response = {
            name: req.body.name,
            username: req.body.username,
            email: req.body.email,
            mobilenumber: req.body.mobilenumber,
            password: hash
          };
          police.insert(response, id, function (err, body, header) {
            if (err) {
              console.log('[police.insert] ', err.message);
              return;
            }
            res.end('success'); //registration successful alert is sent
          });
        }
        else {
          console.log(err);
          res.status(500).send('Error')
        }
      });
    }
  });
})

//---------------------------- LOG IN -------------------------------------------------------
//when the user submits the log in form, the data is sent to the server
app.post('/processlogin_post', urlencodedParser, function (req, res) {
  // // Prepare output in JSON format
  // loginresponse = {
  //   theusername: req.body.username,
  //   thepassword: req.body.password
  // };

  //successfully log in user if the username and the corresponding password exists in the database
  police.view('design2', 'username-view', {
    key: req.body.username
  }, (err, body) => {
    if (body.rows.length == 0) { //if username doesnot exist in the database, log in fails
      res.end('failure');
    }
    else{
    bcrypt.compare(req.body.password, body.rows[0].value, function(err, result) {
       //if username exists and the entered password is equal to the
      //the db password, log in is successful
      if(result==true){ //passwords are equal
        res.end('success');
      }
       //if username exists in the database but the entered password is not equal to the
      //the db password, log in fails
      else if(result==false){
        res.end('failure');
      }
     });
    }
  });
})
app.listen(app.get('port'), function () {
  console.log('Express started on http://localhost:' +
    app.get('port') + '; press Ctrl-C to terminate.');
});
