// tslint:disable:no-console
import betterLogging from 'better-logging';
import { Client, Message } from 'discord.js';
import * as fs from 'fs';
import { vol as mfs} from 'memfs';
import * as path from 'path';
import { VM } from 'vm2';

const fakeFileSystemRoot = path.join(__dirname, '..', 'fake_file_system');

mfs.fromJSON(
  fs.readdirSync(fakeFileSystemRoot)
  .map((fileName) => [fileName, fs.readFileSync(path.join(fakeFileSystemRoot, fileName)).toString('utf8')])
  .reduce((res, [fileName, file]) => ({...res, [fileName]: file}), {}),
);

// Setup logging
betterLogging(console);

// tslint:disable-next-line no-var-requires
const secrets = require(path.resolve(__dirname, '..', 'secrets.json'));

const client = new Client();

const handleMessage = (message: Message) => {
  if (message.channel.type.toLowerCase() !== 'dm') {
    return;
  }
  if (message.author.bot) {
    return;
  }

  try {
    const out = [];
    const vm = new VM({
      eval: false,
      wasm: false,
      timeout: 100,
      sandbox: {
        console: {
          log: (...args: any[]) => out.push(args.map(String).join('')),
          info: (...args: any[]) => out.push(args.map(String).join('')),
          warn: (...args: any[]) => out.push(args.map(String).join('')),
          error: (...args: any[]) => out.push(args.map(String).join('')),
          debug: (...args: any[]) => out.push(args.map(String).join('')),
        },
        fs: {
          readSync: mfs.readSync.bind(mfs),
          readFileSync: mfs.readFileSync.bind(mfs),
          readdirSync: mfs.readdirSync.bind(mfs),
          statSync: mfs.statSync.bind(mfs),
          fstatSync: mfs.fstatSync.bind(mfs),
          lstatSync: mfs.lstatSync.bind(mfs),
        },
      },
    });
    console.log('In:', message.content);
    const returnValue = vm.run(message.content);
    out.push(returnValue);
    const outStr = out.join('\n');
    if (outStr.length > 0) {
      message.channel.send(outStr);
      console.log('Out:', outStr);
    }
  } catch (err) {
    const msg = String(err) || 'error message cannot be empty';
    message.channel.send(msg);
    console.log('Err:', msg);
  }
};

client.on('ready', () => {
  client.on('message', (message: Message) => handleMessage(message));
  client.on('messageUpdate', (oldMessage, newMessage: Message) => handleMessage(newMessage));
});

client.login(secrets.discord_token)
  .then(() => {
    console.info(`Login successful`);
  })
  .catch((err) => {
    console.error(`Login failed`);
    throw err;
  });
