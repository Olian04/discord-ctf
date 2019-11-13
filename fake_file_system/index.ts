// tslint:disable:no-console
import { Client, Message } from 'discord.js';
import * as fs from 'fs';
import { VM } from 'vm2';

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
            .reduce((res, k) => ({...res, [k]: fs[k]}), {}),
        },
      });
      const returnValue = vm.run(message.content);
      out.push(returnValue);
      if (out.length > 0) {
        message.channel.send(out.join('\n'));
      }
    } catch (err) {
      if (err.message && err.message.length > 0) {
        message.channel.send(err.message);
      } else if (err) {
        message.channel.send(err);
      }
      console.log(err);
    }
  });
});

client.login(process.env.discord_token)
  .then(() => {
    console.info(`Login successful`);
  })
  .catch((err) => {
    console.error(`Login failed`);
    throw err;
  });

const flag = 'Things are not always what they seem';
