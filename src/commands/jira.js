const { SlashCommandBuilder } = require("discord.js");
const { getReport, jiraRegex } = require("../utils");
module.exports = {
    data: new SlashCommandBuilder()
        .setName("jira")
        .setDescription("Query a Mojira report")
        .addStringOption((option) => option
            .setName("issue")
            .setDescription("The id or name of the report")
            .setRequired(true)
            .setAutocomplete(true)
        ),
    /**
     * @param { import("discord.js").AutocompleteInteraction } interaction
     */
    autocomplete: async (interaction) => {
        const focusedValue = interaction.options.getFocused().toLowerCase().trim();
        const value = jiraRegex.test(focusedValue) ? focusedValue.match(jiraRegex)[0] : focusedValue;
        fetch(
            "https://bugs.mojang.com/rest/quicksearch/1.0/productsearch/search?q=".concat(value.length == 0 ? "MCPE-" : value), {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            },
        )
        .then((data) => data.json())
        .then(async (data) => {
            const items = data.find(({ id }) => id === "quick-search-issues").items;
            const options = items.filter((_, index) => index < 25);

            interaction.respond(
                options.map((a) => {
                    let name = "(".concat(a.subtitle).concat(") ").concat(a.title);
                    if (name.length > 100) {
                        name = name.substring(0, 97).concat("...");
                    };

                    return {
                        name,
                        value: a.subtitle,
                    };
                }),
            ).catch(() => {});
        });
    },
    /**
     * @param { import("discord.js").Interaction } interaction
     */
    async execute(interaction) {
        const reportId = interaction.options.getString("issue");
        const value = jiraRegex.test(reportId) ? reportId.match(jiraRegex)[0] : reportId;
        await interaction.deferReply({ ephemeral: false });

        const data = await getReport(value);
        if (data === undefined) {
            interaction.editReply({
                content: `> Failed to find bug report with id: **${reportId}**.`,
            });

            return;
        };

        const message = await interaction.editReply({
            embeds: [ data.embed ],
            components: [
                { type: 1, components: data.buttons }
            ],
        });

        try {
            await message.react("🚫");
            const collector = message.createReactionCollector({
                filter: (reaction, user) =>
                    reaction.emoji.name == "🚫" &&
                    user.id == interaction.user.id,
                time: 10 * 1000,
            });

            collector.on("collect", () => message.delete());
            collector.on("end", (collected, reason) => {
                const reaction = message.reactions.resolve("🚫");
                reaction.users
                    .remove(interaction.client.user.id)
                    .catch(() => {});
            });
        } catch {};
    },
};