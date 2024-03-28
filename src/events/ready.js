const { Events, Client } = require("discord.js");
const Logger = require("../logger.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    /** @param { Client } client  */
    execute(client) {
        Logger.log(`Logged in as ${client.user.tag}`);
        client.user.setStatus("invisible");
    },
};