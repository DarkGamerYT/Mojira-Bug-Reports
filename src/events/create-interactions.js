const { Events, Interaction } = require("discord.js");
const interactionsHandler = require("../classes/interactions-handler.js");

module.exports = {
    name: Events.InteractionCreate,
    /** @param { Interaction } interaction  */
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            interactionsHandler.handleSlashcommands(interaction);
        } else if (interaction.isAutocomplete()) {
            interactionsHandler.handleAutocomplete(interaction);
        };
    },
};