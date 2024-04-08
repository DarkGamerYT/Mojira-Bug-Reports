const { Events, Interaction } = require("discord.js");
const interactionsHandler = require("../classes/interactions-handler.js");
const { getReport } = require("../utils");

module.exports = {
    name: Events.InteractionCreate,
    /** @param { Interaction } interaction  */
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            interactionsHandler.handleSlashcommands(interaction);
            return;
        };
        
        if (interaction.isAutocomplete()) {
            interactionsHandler.handleAutocomplete(interaction);
            return;
        };

        if (interaction.isButton()) {
            if (interaction.customId.startsWith("report-")) {
                const reportId = interaction.customId.replace("report-", "");
                await interaction.deferReply({ ephemeral: true });
                const data = await getReport(reportId);
                if (data === undefined) {
                    interaction.editReply({
                        content: `> Failed to find bug report with id: **${reportId}**.`,
                    });
        
                    return;
                };

                await interaction.editReply({ embeds: [ data.embed ] });
            };

            return;
        };
    },
};