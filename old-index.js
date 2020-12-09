const express = require('express');
const { readFile } = require('fs').promises;
const app = express();
const port = 3000;

var mongoose = require('mongoose');
var dbURL = 'mongodb+srv://programuser:dontdoxme@clusterzero.yhx1e.mongodb.net/chatroom-hub?retryWrites=true&w=majority';

//Connecting to the DB
mongoose.connect(dbURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('MongoDB Connected…');
  })
  .catch(err => console.log(err))

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

var http = require('http').Server(app);
var io = require('socket.io')(http);

/*
var Message = mongoose.model('Message', {userID: String, content: String, date: Date, wasEdited: Boolean, editDate: Date, channel: String, ip: String, visible: Boolean});
//visible might be used for deletion
//How messages are loaded from DB
app.get('/messages', (req, res) => {            
    //The req.query is an object that looks like: {channel: 'blank'}, filters the messages that come from a specific channel
    Message.find(req.query,(err, messages)=> {  //the channel is sent as a message filter
      res.send(messages); 
    })
    //Worth noting is that because I am using ngrok to open localhost to public access, the only IP that will ever be saved is "::1". Not very useful.
    console.log("Message GET from", req.connection.remoteAddress);
});
//How messages are sent to DB
app.post('/messages', (req, res) => {
  var message = new Message(req.body);
  message.save((err) => {
    if(err)
      sendStatus(500);
    io.emit('message', message);
    console.log("Message POST from", req.connection.remoteAddress);
    res.sendStatus(200);
  })
});
*/

/*
//The server variable used to generate new user IDs.
userID = 0;
var User = mongoose.model('User', {uid: String, name: String});
*/

/*
var Channel = mongoose.model('Channel', {uid: String, name: String});
//The server variable used to generate new channel IDs.
channelID = 0;
//How channels are loaded from DB
app.get('/channels', (req, res) => {
    Channel.find({},(err, channels) => {
      res.send(channels);
      channelID = updateID(channels);
      console.log("ID after loading all channels:", channelID);
    })
    console.log("Channel GET");
});
//How channels are sent to DB
app.post('/channels', (req, res) => {
  var channel = new Channel(req.body);    //The only value sent for the req is the channel name.
  channel.uid = getNextID(channelID);
  channel.save((err) => {
    if(err)
      sendStatus(500);
    io.emit('channel', channel);
    console.log("Channel POST");
    res.sendStatus(200);
  })
});
*/

/*
var Server = mongoose.model('Server', {uid: String, name: String});
//How servers are loaded from DB
app.get('/servers', (req, res) => {
  Server.find({}, (err, servers) => {
    res.send(servers);
  })
  console.log("Server GET");
});
//How servers are sent to DB (Prob won't be used)
app.post('/servers', (req, res) => {
  var server = new Server(req.body);
  server.save((err) => {
    if(err) {
      sendStatus(500);
    }
    io.emit('server', server);
    console.log("SERVER POST");
    res.sendStatus(200);
  })
});
*/

io.on('connection', () => {
    console.log('a user is connected');
});

//Used to serve the CSS sheet for the webpage
app.use(express.static('pages/static/'));


/*
TODO:
  Rework the storage situation.
  Current:
    Top
      >Channels
      >Messages
  What I Want:
    Top
      >Servers
        >Channels
          >Messages

  Basically, I want a collection of servers, each of which have a collection of channels, each of which have a collection of messages.
*/

//Increments the variable and returns it, while also logging it in the console. Useful because I get to see if things go wrong.
function getNextID(id) {
  id++;
  console.log("Dispensed ID", id);
  return id;
}

//This returns the value of the largest uid found within the array, to prevent repeats. 
//Setting it to equal to highest instead of greater than the highest already used uid is ok because uid is always incremented when getting the ID for a new object.
function updateID(array) {
  var max = 0;
  for (var object of array) {
    //Using parseInt because uid is a String across all objects, and comparisons only work right if channel.uid is an int.
    //This won't throw an error for channels because channels will only have numbers for IDs. The default channel "PRIME" is not saved in the database. It is built into the webpage.
    intID = parseInt(object.uid);
    if (max < intID) {
      max = intID;
    }
  }
  return max;
}

var Server = mongoose.model('Server', {uid: String, name: String, channels: Array});
var serverUID = 0;
var Channel = mongoose.model('Channel', {uid: String, name: String, messages: Array});
var channelUID = 0;
var Message = mongoose.model('Message', {uid: String, sender: String, content: String, date: Date, edited: Boolean, editDate: Date, visible: Boolean});
var messageUID = 0;
/*
UID Generation Process:
  1. Load the messages of the channel as an array.
  2. Run the updateID function on that array.
  3. Now we have a UID that is updated, so increment it for the next UID.
  4. Return that incremented UID.

What I am doing:
  1. Assume that objects will be loaded before an object is posted
  2. This means that UID will always be updated.
*/

//How messages are loaded from DB
app.get('/messages', (req, res) => {            
  //The req.query is an object that looks like: {channel: 'blank'}, filters the messages that come from a specific channel
  Message.find(req.query,(err, messages)=> {  //the channel is sent as a message filter
    console.log("Message GET Filter:", req.query);
    messageUID = updateID(messages);
    res.send(messages);
  })
  //Worth noting is that because I am using ngrok to open localhost to public access, the only IP that will ever be saved is "::1". Not very useful.
  console.log("Message GET from", req.connection.remoteAddress);
});
//How messages are sent to DB
app.post('/messages', (req, res) => {
  var message = new Message(req.body);
  message.uid = getNextID(messageUID);
  message.save((err) => {
    if(err) {
      sendStatus(500);
    }
    io.emit('message', message);
    console.log("Message POST from", req.connection.remoteAddress);
    res.sendStatus(200);
  })
});

//How channels are loaded from DB
app.get('/channels', (req, res) => {
  //The option for filtering this is available.
  Channel.find(req.query,(err, channels) => {
    channelUID = updateID(channels);
    res.send(channels);
    console.log("ID after loading all channels:", channelUID);
  })
  console.log("Channel GET");
});
//How channels are sent to DB
app.post('/channels', (req, res) => {
  var channel = new Channel(req.body);
  channel.uid = getNextID(channelUID);

  channel.save((err) => {
    if(err)
      sendStatus(500);
    io.emit('channel', channel);
    console.log("Channel POST from", req.connection.remoteAddress);
    res.sendStatus(200);
  })
});

//How servers are loaded from DB
app.get('/servers', (req, res) => {
  //The option to filter is available.
  Server.find(req.query, (err, servers) => {
    serverUID = updateID(servers);
    res.send(servers);
  })
  console.log("Server GET from", req.connection.remoteAddress);
});
//How servers are sent to DB
app.post('/servers', (req, res) => {
  var server = new Server(req.body);
  server.uid = getNextID(serverUID);
  server.save((err) => {
    if(err) {
      sendStatus(500);
    }
    io.emit('server', server);
    console.log("SERVER POST");
    res.sendStatus(200);
  })
});



//On going to the page, redirect to the given page. Currently it is /main, but I am going to change this to the server selection page eventually.
app.get('/', async (request, response) => {
  res.redirect(307, '/main')
})
//Displays the chatroom.html file
app.get('/main', async (request, response) => {
    response.send(await readFile('./pages/chatroom.html', 'utf8'));
});

var server = http.listen(port, () => console.log(`App available on http://localhost:${port}`));