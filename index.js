const { createWorker } = require('tesseract.js');
const getColors = require('get-image-colors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { Client, Intents, MessageAttachment } = require('discord.js');
const yamlDoctor = require('yaml-doctor');
const { token } = require('./config.json');

var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

const worker = createWorker({ logger: m => console.log(m) });
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

async function parseImage(url, message) {
  var img = await fetch(url).then(response => response.buffer());
  getColors(img, 'image/png').then(colors => {
      console.log(colors)
  })
  console.log('Parsing ' + url);
  var { data: { lines } } = await worker.recognize(img);
  var parsed_text = "";
  lines.forEach(line => {
    parsed_text += " ".repeat(Math.ceil(line.baseline.x0/3)*3) + line.text
  })
  parsed_text = parsed_text.replace(/”/gi, `"`);
  console.log(parsed_text);
  if (parsed_text.includes('Server thread')) {
    parsed_text = parsed_text.replace(/\n\n/g, '\n');
    client.channels.cache.get(847677341248258068).send({ content: `Parsed text from ${message.url}`, files: [new MessageAttachment(Buffer.from(text), 'console.log')] })
  } else {
    var results = yamlDoctor.check(parsed_text);
    client.channels.cache.get(847677341248258068).send({ content: `Ran analysis on config from ${message.url}`, files: [new MessageAttachment(Buffer.from(results), 'config.log')] })
  }
}

async function uploadText(textUrl, message) {
  var text = await fetch(textUrl).then(response => response.text());
  fetch('https://api.mclo.gs/1/log', {
    method: 'POST',
    body: new URLSearchParams({ content: text })
  }).then(res => res.json()).then(json => {
    if (json.success) {
      message.reply(`Here's a link to a pastebin of this file - ${json.url}`);
    }
  });
}

function onMessage(message) {
  if (/version.{1,5}1\.(3\.0|4\.0|5\.[0,1,2,3])/ig.test(message.content)) {
    message.reply("The plugin has been since updated and the latest version is now 1.5.4, please download the latest version from https://dev.bukkit.org/projects/drivebackupv2");
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  await worker.setParameters({
    preserve_interword_spaces: '1',
  });
  console.log('Loaded tesseract.js');
});

client.on('messageCreate', async message => {
  if (message.attachments.size > 0) {
    var [attachment] = message.attachments.values();
    console.log(attachment)
    if (attachment.contentType != null && attachment.contentType.startsWith('image')) {
      parseImage(attachment.url, message);
    } else if (attachment.contentType != null && attachment.contentType.startsWith('text/plain')) {
      uploadText(attachment.url, message);
    }
  }
  onMessage(message);
});

client.login(token);