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
const e = require('express');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

var http = require('http').Server(app);
var io = require('socket.io')(http);

io.on('connection', (socket) => {
    console.log('a user is connected');

    socket.on('join-server', function(data) {
      //Leave all other rooms before joining the new one.
      socket.leaveAll();

      var server = getRoomName(data.server);
      socket.join(server);
      console.log("Join Server", server);
    });

    socket.on('join-channel', function(data) {
      //Leave all other rooms before joining the new one.
      socket.leaveAll();
      
      var roomName = getRoomName(data.server, data.channel);
      socket.join(roomName);
      console.log("Join Channel", roomName);
    });
});

//Helper function that formats serverID and channelID into the room name used by socket
//Can work without channelID
function getRoomName(serverID, channelID) {
  var roomName = "server"+serverID;
  if(channelID) {
    roomName += "/channel"+channelID;
  }
  return roomName;
}

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
  id += 1;
  console.log("Dispensed ID", id);
  return id;
}

//This returns the value of the largest uid found within the array, to prevent repeats. 
//Setting it to equal to highest instead of greater than the highest already used uid is ok because uid is always incremented when getting the ID for a new object.
//Functionally equivalent to a getMax of an array.
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

var Message = mongoose.model('Message', {uid: String, sender: String, content: String, date: Date, edited: Boolean, editDate: Date, visible: Boolean});
var messageUID = 0;
var defaultMessage = new Message({uid: 0, sender: "System", content: "Channel created. Please enjoy.", date: new Date(), edited: false, editDate: null, visible: true});
var Channel = mongoose.model('Channel', {uid: String, name: String, messages: Array});
var channelUID = 0;
var defaultChannel = new Channel({uid: 0, name: "general", messages: [defaultMessage]});
var Server = mongoose.model('Server', {uid: String, name: String, channels: Array});
var serverUID = 0;
//var defaultServer = new Server({uid: 0, name: "Home", channels: [defaultChannel]});

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
  //req.query contains channel: window.currentChannel, server: window.currentServer
  var serverID = req.query.server;
  var channelID = req.query.channel;
  var filter = {uid: serverID};
  Server.findOne(filter, (err, server)=> {
    console.log("Message GET Filter:", filter);
    var channels = server.channels;
    var messages;
    //Because the query returns all of the server's channels, quickly iterate through to find the one to read.
    for(var channel of channels) {
      if(channel.uid == channelID) {
        messages = channel.messages;
        break;
      }
    }
    messageUID = updateID(messages);
    res.send(messages);
  })
  //Worth noting is that because I am using ngrok to open localhost to public access, the only IP that will ever be saved is "::1". Not very useful.
  console.log("Message GET from", req.connection.remoteAddress);
});
//How messages are sent to DB
app.post('/messages', (req, res) => {
  var channelID = req.body.channel;
  var serverID = req.body.server;
  //Stripping the channel and server information from req.body before creating a message from it.
  delete req.body.channel;
  delete req.body.server;
  var message = new Message(req.body);
  messageUID = getNextID(messageUID);
  message.uid = messageUID;
  
  Server.findOneAndUpdate({uid: serverID, 'channels.uid': channelID}, {"$push": {'channels.$.messages': message}}, (err, server) => {
    if(err) {
      res.sendStatus(500);
    } else {
      io.to(getRoomName(serverID, channelID)).emit('message', message);
      console.log("Message POST from", req.connection.remoteAddress);
      res.sendStatus(200);
    }
  })
});

//How channels are loaded from DB
app.get('/channels', (req, res) => {
  //The option for filtering this is available.
  var serverID = req.query.server;
  Server.findOne({uid: serverID}, (err, server) => {
    channelUID = updateID(server.channels);
    res.send(server.channels);
  })
  console.log("Channel GET");
});
//How channels are sent to DB
app.post('/channels', (req, res) => {
  //Copying and removing the transmitted server information before turning the body into a channel object
  var serverID = req.body.server;
  delete req.body.server;
  var channel = new Channel(req.body);
  //Setting a default message.
  channel.messages = [defaultMessage];
  channelUID = getNextID(channelUID);
  channel.uid = channelUID;

  //Looking for the particular server and adding the channel to it's channels property
  Server.findOneAndUpdate({uid: serverID}, {"$push": {channels: channel}}, (err, server) => {
    if(err) {
      res.sendStatus(500);
    } else {
      //Only sending the event to users in the server
      io.to(getRoomName(serverID)).emit('channel', channel);
      console.log("Channel POST to Server", server.uid,"from", req.connection.remoteAddress);
      res.sendStatus(200);
    }
  });
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
  //Creating the server's channels property with the defaultChannel object, so it doesn't have any arrays with null objects in it.
  //Originally I copied the defaultServer object but that meant that the documents would have the same _id and overwrite each other. Not good!
  var server = new Server({uid: null, name: null, channels: [defaultChannel]});
  server.name = req.body.name;
  serverUID = getNextID(serverUID);
  server.uid = serverUID;
  console.log(server);

  Server.create(server, (err, server) => {
    if(err) {
      res.sendStatus(500);
    } else {
      io.emit('server', server);
      console.log("SERVER POST");
      res.sendStatus(200);
    }
  });
});

//On going to the page, redirect to the given page. Currently it is /main, but I am going to change this to the server selection page eventually.
app.get('/', async (req, res) => {
  res.redirect(307, '/main')
})
//Displays the chatroom.html file
app.get('/main', async (request, response) => {
    response.send(await readFile('./pages/chatroom.html', 'utf8'));
});

var server = http.listen(port, () => console.log(`App available on http://localhost:${port}`));