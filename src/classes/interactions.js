const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection } = require("discord.js");
const Logger = require("../logger.js");

/** @param { Client } client */
module.exports = function (client) {
    client.commands = new Collection();
    const foldersPath = path.join(__dirname, "../commands");
    const commandFiles = fs
        .readdirSync(foldersPath)
        .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
        const filePath = path.join(foldersPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        } else {
            Logger.warn(
                `The command at ${filePath} is missing a required "data" or "execute" property.`
            );
        };
    };
};
