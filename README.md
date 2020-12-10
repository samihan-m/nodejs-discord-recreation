# nodejs-discord-recreation
 A one-page NodeJS recreation of Discord, with servers and channels and messages that only are visible to the channels they are sent in. The only thing missing is User Accounts.
 
 <b>Project Description</b>
 You can create a server, create a channel, and send messages, like in Discord, and other people connected to the site can see it all update on their own screen in real time. There are no permission-locked channels or anything, and anything someone creates is visible to everyone who uses the website, but I just felt like making a public chatroom so I am happy with where the project is at, this was the end goal and I have reached it.
 
 <b>Storage Solution and the Thought Behind It</b>
 I store the server/channel/message objects using a MongoDB cloud collection. Each server has an array for its channels, and each channel has an array for its messages, as opposed to an initial design I had where I had three collections for server objects, channel objects, and message objects, with each object having a property that represented its owner. I did not like the initial design because if a client wanted to load messages, it would have to load every single message object and perform client-side processing on that collection to see which ones to display on the screen (based on the server and channel the client is viewing). I feel like that would be bad for a few reasons, mainly that loading everything would take longer and expend unnecessary bandwidth, as well as the fact that if I eventually added permission-locking certain channels to certain users, I wouldn't want non-permissioned users to receive all of the messages when they shouldn't. So, I switched to the current design, which checks which server object to load from, and then which channel within that server to load from, which loads only the messages that are necessary.
 
 <b>Technologies I Used For the Site</b>
 I used ExpressJS and socket.io for the server-client communication. I used JQuery (for the first time, that was cool) in creating the one HTML page the one-page app uses.
 
 <b>Public Hosting Solution</b>
 I hosted it on Heroku so people can use/test it for me, before then I ran it through my localhost and shared it through ngrok, but I wanted a more permanent place, so first I tried to host it on Vercel (it didn't work for some reason, after a lot of trial and error), then tried it on Heroku, where it immediately worked. Cool!
