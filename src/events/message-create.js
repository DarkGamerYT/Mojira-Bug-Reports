const { Events, Message } = require("discord.js");
const { getReport, jiraRegex } = require("../utils");
module.exports = {
    name: Events.MessageCreate,
    /** @param { Message } message  */
    async execute(message) {
        if (jiraRegex.test(message.content)) {
            const reportId = message.content.match(jiraRegex)[0];
            const data = await getReport(reportId);
            if (data === undefined) return;

            try {
                const msg = await message.reply({
                    embeds: [ data.embed ],
                    components: [
                        { type: 1, components: data.buttons }
                    ],
                    allowedMentions: { repliedUser: false },
                });

                await msg.react("🚫");
                const collector = msg.createReactionCollector({
                    filter: (reaction, user) =>
                        reaction.emoji.name == "🚫" &&
                        user.id == message.author.id,
                    time: 10 * 1000,
                });

                collector.on("collect", () => msg.delete());
                collector.on("end", (collected, reason) => {
                    const reaction = msg.reactions.resolve("🚫");
                    reaction.users
                        .remove(message.client.user.id)
                        .catch(() => {});
                });
            } catch(e) {
                console.error(e);
            };
        };
    },
};