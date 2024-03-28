require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const Logger = require("./src/logger.js");

const commands = [];
const foldersPath = path.join(__dirname, "/src/commands");
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const command = require(commandsPath);
    if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
    } else {
        Logger.warn(
            `The command at ${folder} is missing a required "data" or "execute" property.`
        );
    };
};

const rest = new REST().setToken(process.env.token);
(async () => {
    try {
        Logger.log(
            `Started refreshing ${commands.length} application (/) commands.`
        );

        await rest.put(Routes.applicationCommands(process.env.clientId), {
            body: commands,
        });

        Logger.success(
            `Successfully reloaded ${commands.length} application (/) commands.`
        );
    } catch {};
})();
