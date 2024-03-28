require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

new (require("./src/classes/interactions.js"))(client);
new (require("./src/classes/events.js"))(client);

client.login(process.env.token);