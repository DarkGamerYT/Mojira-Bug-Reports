const { SlashCommandBuilder } = require("discord.js");
const { getReport, matchRegex } = require("../utils");
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
        const focusedValue = interaction.options.getFocused().toUpperCase().trim();
        const match = focusedValue.match(/^([A-Z]+)-(\d+)$/);
        if (match == void 0) {
            interaction.respond([]);
            return;
        };
        
        const project = match[1];
        const issueId = match[2];
        const reportId = project.concat("-", issueId);
        
        const response = await fetch(
            "https://bugs.mojang.com/api/jql-search-post", {
                method: "POST",
                body: JSON.stringify({
                    advanced: true,
                    filter: "all",
                    maxResults: 25,
                    project,
                    search: "key = ".concat(reportId),
                    startAt: 0,
                }),
                headers: { "Content-Type": "application/json" },
            },
        ).then((data) => data.json());
        if (response?.statusCode !== void 0 && response?.statusCode !== 200)
            return;

        const options = response.issues.filter((_, index) => index < 25);
        interaction.respond(
            options.map((a) => {
                let name = "(".concat(a.key).concat(") ").concat(a.fields.summary);
                if (name.length > 100) {
                    name = name.substring(0, 97).concat("...");
                };

                return {
                    name,
                    value: a.key,
                };
            }),
        ).catch(() => {});
    },
    /**
     * @param { import("discord.js").Interaction } interaction
     */
    async execute(interaction) {
        const reportId = interaction.options.getString("issue");
        await interaction.deferReply({ ephemeral: false });
        
        const match = matchRegex(reportId);
        let project = match?.project;
        let issueId = match?.issueId;
        
        if (match == void 0) {
            const match = reportId.match(/^([A-Z]+)-(\d+)$/);
            if (match == void 0) {
                interaction.editReply({
                    content: `> Failed to find bug report with id: **${reportId}**.`,
                });
                return;
            };
            
            project = match[1];
            issueId = match[2];
        };
        
        const data = await getReport(project, issueId);
        if (data === undefined) {
            interaction.editReply({
                content: `> Failed to find bug report with id: **${reportId}**.`,
            });

            return;
        };

        const buttons = [
            {
                type: 2,
                style: 5,
                label: "View on Jira",
                url: data.reportData.jiraLink,
                emoji: {
                    id: "1090311574423609416",
                    name: "changelog",
                },
            },
        ];
    
        if (data.reportData.resolution === "Duplicate") {
            const originalReport = data.reportData.data.issuelinks[0].outwardIssue;
            buttons.push({
                type: 2,
                style: 5,
                label: "View duplicate",
                url: "https://bugs.mojang.com/browse/".concat(originalReport.key),
                emoji: {
                    id: "1090311574423609416",
                    name: "changelog",
                },
            });
        };

        const message = await interaction.editReply({
            embeds: [ data.embed ],
            components: [
                { type: 1, components: buttons },
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