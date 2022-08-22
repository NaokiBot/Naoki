import { Client, Collection } from 'discord.js';
import { readdir } from 'node:fs/promises';
import { Colors } from './client/utils/Logger.js';
import { Emotes } from './client/utils/Emotes.js';
import { Locale } from '../lib/Locale.js';
import UserSchema from './database/UserSchema.js';
import GuildSchema from './database/GuildSchema.js';
import CommandSchema from './database/CommandSchema.js';
import dotenv from 'dotenv';
import pkg from 'mongoose';
const { connect } = pkg;
dotenv.config();

export class NaokiClient extends Client {
    commands = { vanilla: new Collection(), application: new Collection() };
    database = { users: UserSchema, guilds: GuildSchema, commands: CommandSchema };
    owners = ['930672718876147763', '343778106340802580'];
    emotes = Emotes;
    t = null;

    constructor() {
        super({
            intents: 112639,
            failIfNotExists: false,
            partials: [0, 1, 2, 3, 4],
            allowedMentions: {
                parse: ['users'],
                repliedUser: true
            },
            ws: { properties: { browser: 'Discord iOS' } },
            presence: {
                status: process.env.STATE == 'development' ? 'idle' : 'online',
                activities: [
                    { name: '/help', type: 2 }
                ]
            }
        });

        this.logger = (type, message) => console.log(`${Colors.YELLOW}${new Date().toISOString()}${Colors.RESET} [${Colors.CYAN}${type}${Colors.RESET}] ${Colors.GREY}--- ${Colors.RESET}${Colors.PURPLE}${message}${Colors.RESET}`);
    }

    async loadCommands() {
        const subfoldersV = await readdir('./src/commands/vanilla');
        for await (const folder of subfoldersV) {
            const files = await readdir(`./src/commands/vanilla/${folder}`);
            for await (const command of files) {
                if (!command.endsWith('.js')) continue;
                const { default: VCommand } = await import(`./commands/vanilla/${folder}/${command}`);
                const cmd = new VCommand(this);
                await this.commands.vanilla.set(cmd.name, cmd);
                this.logger('Commands, Vanilla', `${cmd.name[0].toUpperCase()}${cmd.name.slice(1)} command loaded successfully`);
            }
        }

        const subfoldersA = await readdir('./src/commands/application');
        for await (const folder of subfoldersA) {
            const files = await readdir(`./src/commands/application/${folder}`);
            for await (const command of files) {
                if (!command.endsWith('.js')) continue;
                const { default: ACommand } = await import(`./commands/application/${folder}/${command}`);
                const cmd = new ACommand(this);
                await this.commands.application.set(cmd.name, cmd);
                this.logger('Commands, Application', `${cmd.name[0].toUpperCase()}${cmd.name.slice(1)} command loaded successfully`);
            }
        }
    }

    async loadEvents() {
        const subfolders = await readdir('./src/client/events');
        for await (const folder of subfolders) {
            const files = await readdir(`./src/client/events/${folder}`);
            for await (const event of files) {
                if (!event.endsWith('.js')) continue;
                const { default: ClientEvent } = await import(`./client/events/${folder}/${event}`);
                const evnt = new ClientEvent(this);
                this.on(evnt.name, (...args) => evnt.execute(...args));
                this.logger('Client, Events', `${evnt.name[0].toUpperCase()}${evnt.name.slice(1)} event loaded successfully`);
            }
        }
    }

    async getLang(parameter) {
        if (isNaN(parameter)) return parameter;

        const guild = await this.database.guilds.findOne({ guildId: parameter, });

        if (guild) {
            const lang = guild?.lang;

            if (!lang) {
                guild.lang = 'pt-BR';
                guild.save();

                return 'pt-BR';
            }

            return lang;
        }
    }

    async getTranslate(guild) {
        const language = await this.getLang(guild);
        const translate = new Locale('src/languages');

        this.t = await translate.init({
            returnUndefinied: false,
        });

        translate.setLang(language);

        return this.t;
    }

    async start() {
        await this.loadCommands();
        await this.loadEvents();
        await connect(process.env.MONGO_URL);

        super.login(process.env.TOKEN);
    }
}