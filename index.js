const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const slack = require('slack');
const moment = require('moment-timezone');

const app = express();
const port = process.env.PORT || 5000;

app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const router = express.Router();

app.post('/', (req, res, next) => {
  // check for secret token
  if (!req.body.token || req.body.token !== process.env.SECRET_TOKEN) next();
  console.log('handling request', req.body);
  console.log('server time zone', moment.tz.guess());
  // grab status and clean it up
  let status = req.body.title;
  const dndToken = ' [DND]';
  // parse event start/stop time
  const dateFormat = 'MMM D, YYYY [at] hh:mmA';
  const timeZone = 'US/Eastern';
  const start = moment.tz(req.body.start, dateFormat, timeZone);
  const end = moment.tz(req.body.end, dateFormat, timeZone);
  const end_unix = end.unix();
  // check for DND
  if (status.includes(dndToken)) {
    slack.dnd.setSnooze({
      token: process.env.SLACK_TOKEN,
      num_minutes: end.diff(start, 'minutes')
    });
    status = status.replace(dndToken, '');
  }
  // set status
  slack.users.profile.set({
    token: process.env.SLACK_TOKEN,
    profile: JSON.stringify({
      "status_text": `${status} from ${start.format('h:mm')} to ${end.format('h:mm a')} ${process.env.TIME_ZONE}`,
        "status_emoji": ":calendar:",
        "status_expiration": end_unix,
    })
  });
  res.status(200);
  res.send('ok');
});

// app.get('/', (req, res, next) => {
//   // welcome message
//   res.send(`
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <meta charset="utf-8">
//         <title>Welcome!</title>
//         <style>
//           pre {
//             background-color: #DDD;
//             padding: 1em;
//             display: inline-block;
//           }
//         </style>
//       </head>
//       <body>
//         <h1>Your Heroku server is running!</h1>
//         <p>You'll need the following information for your IFTTT recipe:</p>
//         <h3>Body</h3>
// <pre>{
//   "title":"<<<{{Title}}>>>",
//   "start":"{{Starts}}",
//   "end":"{{Ends}}",
//   "token": "${process.env.SECRET_TOKEN}"
// }</pre>
//       </body>
//     </html>
//   `);
// });

app.use((req, res, next) => {
  res.status(404);
  res.send('Not found');
});

app.listen(port);
console.log(`Server running on port ${port}`);
