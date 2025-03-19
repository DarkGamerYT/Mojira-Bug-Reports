const { Events, Message } = require("discord.js");
const { getSimpleReport, matchRegex } = require("../utils");
module.exports = {
    name: Events.MessageCreate,
    /** @param { Message } message  */
    async execute(message) {
        const match = matchRegex(message.content);
        if (match == void 0)
            return;
        
        const data = await getSimpleReport(match.project, match.issueId);
        if (data == void 0)
            return;

        try {
            const msg = await message.reply({
                embeds: [ data.embed ],
                components: data.buttons,
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
    },
};