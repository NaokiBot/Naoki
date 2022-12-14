import { Message } from 'discord.js';
import Event from '../../../structures/ClientEventStructure.js';
const ClientMention = (clientId) => new RegExp(`^<@!?${clientId}>( |)$`);
let t;

export default class MessageCreateEvent extends Event {
    constructor(client) {
        super(client, {
            name: 'messageCreate',
            once: false
        });
    }
    /** @param {Message} message */
    async runEvent(message) {
        if (message.author.bot || !message.guild) return;

        const mentionRegex = message.content.match(new RegExp(`^<@!?(${this.client.user.id})>`, 'gi'));
        const guild = await this.client.getData(message.guild.id, 'guild');
        const prefix = mentionRegex?.[0] ? String(mentionRegex) : guild.prefix;
        const { lang } = guild;

        t = await this.client.getTranslate(message.guild.id);
        if (message.content.match(ClientMention(this.client.user.id))) return message.reply(t('client:mentioned', { 'author-tag': message.author.tag, prefix: guild?.prefix || 'n.' }));
        if (!message.content.toLowerCase().startsWith(prefix?.toLowerCase())) return;

        const args = message.content.slice(prefix?.length).trim().split(/ +/g);
        const cmd = args.shift().toLowerCase();

        const command = this.client.commands.vanilla.get(`${cmd}-prefix`) || this.client.commands.vanilla.find(c => c.options.aliases?.includes(cmd));
        if (!command) return;

        try {
            const cmdD = await this.client.database.commands.findOne({ cmdName: command.options.name });
            if (!cmdD) {
                await this.client.database.commands.create({ cmdName: command.options.name });
                command.runCommand({ message, args, lang }, t, cmd);

                return;
            }

            cmdD.usos = cmdD.usos + 1;
            cmdD.save();

            await command.runCommand({ message, args, lang }, t, cmd);
        } catch (err) { console.log(err); }
    }
}
