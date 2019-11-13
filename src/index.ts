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

client.on('ready', () => {
  client.on('message', (message: Message) => {
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
          fs: Object.getOwnPropertyNames(fs)
            .filter((k) => k.endsWith('Sync'))
            .reduce((res, k) => ({...res, [k]: mfs[k].bind(mfs)}), {}),
        },
      });
      console.log('In', message.content);
      const returnValue = vm.run(message.content);
      out.push(returnValue);
      const outStr = out.join('\n');
      if (outStr.length > 0) {
        message.channel.send(outStr);
        console.log('Out', outStr);
      }
    } catch (err) {
      if (err.message && err.message.length > 0) {
        message.channel.send(err.message);
        console.log('Err', err);
      } else if (err) {
        message.channel.send(err);
        console.log('err', err);
      }
    }
  });
});

client.login(secrets.discord_token)
  .then(() => {
    console.info(`Login successful`);
  })
  .catch((err) => {
    console.error(`Login failed`);
    throw err;
  });
