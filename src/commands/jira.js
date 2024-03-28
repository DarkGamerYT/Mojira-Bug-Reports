const { SlashCommandBuilder } = require("discord.js");

function sort(a, b) {
    const aTime = new Date(a.releaseDate ?? a.created).getTime();
    const bTime = new Date(b.releaseDate ?? b.created).getTime();
    return bTime - aTime;
};

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
        const focusedValue = interaction.options.getFocused().toLowerCase();
        fetch(
            "https://bugs.mojang.com/rest/quicksearch/1.0/productsearch/search?q=".concat(focusedValue.trim().length == 0 ? "MCPE-" : focusedValue), {
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
                        name = name.substring(0, 96).concat("...");
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
        try {
            const reportId = interaction.options.getString("issue");
            await interaction.deferReply({ ephemeral: false });

            fetch(
                "https://bugs.mojang.com/rest/api/latest/issue/".concat(reportId), {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                },
            )
            .then((data) => data.json().catch(() => {}))
            .then(async (res) => {
                if (res === undefined || res?.errorMessages !== undefined) {
                    interaction.editReply({
                        content: `> Failed to find bug report with id: **${reportId}**.`,
                    });

                    return;
                };
                
                const { key, fields: data } = res;

                const project = data.project;
                const jiraLink = "https://bugs.mojang.com/browse/".concat(key);
                const fixVersion = data.fixVersions.sort(sort)[0]?.name;
                const sinceVersion = data.versions.sort(sort).reverse()[0].name;
                const status = data.status.statusCategory.name;
                const resolution = data.resolution?.name;
                const created = Math.floor( new Date(data.created).getTime() / 1000 );
                const updated = Math.floor( new Date(data.updated).getTime() / 1000 );
                const reporter = data.reporter.displayName;
                const reporterAvatar = data.reporter.avatarUrls["48x48"].concat("0");
                const attachment = data.attachment
                    .filter((a) => a.mimeType === "image/png")
                    .sort(sort)?.[0];

                const buttons = [
                    {
                        type: 2,
                        style: 5,
                        label: "View on Jira",
                        url: jiraLink,
                        emoji: {
                            id: "1090311574423609416",
                            name: "changelog",
                        },
                    },
                ];

                if (resolution === "Duplicate") {
                    const originalReport = data.issuelinks[0].outwardIssue;
                    buttons.push({
                        type: 2,
                        style: 5,
                        label: "View duplicate report",
                        url: "https://bugs.mojang.com/browse/".concat(originalReport.key),
                        emoji: {
                            id: "1090311574423609416",
                            name: "changelog",
                        },
                    });
                };

                const embed = {
                    title: "(".concat(key).concat(") ").concat(data.summary),
                    url: jiraLink,
                    thumbnail: { url: reporterAvatar },
                    color: 0x46ff27,
                    image: null,
                    video: null,
                    fields: [
                        {
                            name: "Reported by",
                            value: reporter,
                            inline: true,
                        },
                        {
                            name: "Votes",
                            value: data.votes.votes,
                            inline: true,
                        },
                        {
                            name: "Project",
                            value: `[${project.key}](https://bugs.mojang.com/projects/${project.key})`,
                            inline: true,
                        },

                        {
                            name: "Created",
                            value: `<t:${created}:R>`,
                            inline: true,
                        },
                        {
                            name: "Updated",
                            value: `<t:${updated}:R>`,
                            inline: true,
                        },
                        {
                            name: "Status",
                            value: status,
                            inline: true,
                        },

                        {
                            name: "Since version",
                            value: sinceVersion,
                            inline: true,
                        },
                        {
                            name: "Resolution",
                            value: resolution ?? "Unresolved",
                            inline: true,
                        },
                        {
                            name: "Fix version",
                            value: fixVersion ?? "Unset",
                            inline: true,
                        },
                    ],
                };

                if (attachment !== undefined) {
                    switch (attachment.mimeType) {
                        case "video/mp4": embed.video = { url: attachment.content }; break;
                        case "image/png": embed.image = { url: attachment.content }; break;
                    };
                };

                const message = await interaction.editReply({
                    embeds: [ embed ],
                    components: [ { type: 1, components: buttons } ],
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
            });
        } catch {};
    },
};