function sort(a, b) {
    const aTime = new Date(a.releaseDate ?? a.created).getTime();
    const bTime = new Date(b.releaseDate ?? b.created).getTime();
    return bTime - aTime;
};

const jiraRegex = /(?<=(?<=https|http):\/\/bugs\.mojang\.com\/browse\/)[^\s\/]+/;
const statusColors = {
    2: 0xffcc00,
    3: 0x46ff27,
    4: 0x0052cc,
};

async function getReportData(value) {
    const response = await fetch(
        "https://bugs.mojang.com/rest/api/latest/issue/".concat(value), {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        },
    ).then((data) => data.json());
    if (response === undefined || response?.errorMessages !== undefined) return;
    const { key, fields: data } = response;

    const project = data.project;
    const jiraLink = "https://bugs.mojang.com/browse/".concat(key);
    const fixVersion = data.fixVersions.sort(sort)[0]?.name;
    const sinceVersion = data.versions.sort(sort).reverse()[0].name;
    const status = data.status.statusCategory.name;
    const resolution = data.resolution?.name;
    const created = Math.floor(new Date(data.created).getTime() / 1000);
    const updated = Math.floor(new Date(data.updated).getTime() / 1000);
    const reporter = data.reporter.displayName;
    const reporterAvatar = data.reporter.avatarUrls["48x48"].concat("0");
    const attachment = data.attachment
        .filter((a) => a.mimeType === "image/png")
        .sort(sort)?.[0];

    
    return {
        key, data, project,
        jiraLink, fixVersion,
        sinceVersion, status,
        resolution,
        created, updated,
        reporter,
        reporterAvatar, attachment,
    };
};

async function getReport(value) {
    const reportData = await getReportData(value);
    if (!reportData) return;

    const {
        key, data, project,
        jiraLink, fixVersion,
        sinceVersion, status,
        resolution,
        created, updated,
        reporter,
        reporterAvatar, attachment,
    } = reportData;

    const title = "(".concat(key).concat(") ").concat(data.summary);
    const embed = {
        title: title.length < 256 ? title : title.substring(0, 253).concat("..."),
        url: jiraLink,
        thumbnail: { url: reporterAvatar },
        color: statusColors[data.status.statusCategory.id] ?? 0x4e5058,
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
                value: `${status} (${data.status.name})`,
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

    return { embed, reportData };
};

async function getSimpleReport(value) {
    const reportData = await getReportData(value);
    if (!reportData) return;

    const {
        key, data, jiraLink,
        status, resolution,
        reporter,
    } = reportData;
    const buttons = [
        { type: 1, components: [
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
        ] },
    ];

    if (resolution === "Duplicate") {
        const originalReport = data.issuelinks[0].outwardIssue;
        buttons[0].components.push({
            type: 2,
            style: 5,
            label: "View duplicate",
            url: "https://bugs.mojang.com/browse/".concat(originalReport.key),
            emoji: {
                id: "1090311574423609416",
                name: "changelog",
            },
        });

        buttons.push({ type: 1, components: [
            {
                type: 2,
                style: 2,
                label: "More details",
                custom_id: "report-".concat(value),
                emoji: {
                    id: "1090311572024463380",
                    name: "feedback",
                },
            },
        ] });
    } else {
        buttons[0].components.push({
            type: 2,
            style: 2,
            label: "More details",
            custom_id: "report-".concat(value),
            emoji: {
                id: "1090311572024463380",
                name: "feedback",
            },
        });
    };

    const title = "(".concat(key).concat(") ").concat(data.summary);
    const embed = {
        title: title.length < 256 ? title : title.substring(0, 253).concat("..."),
        url: jiraLink,
        color: statusColors[data.status.statusCategory.id] ?? 0x4e5058,
        image: null,
        video: null,
        fields: [
            {
                name: "Reported by",
                value: reporter,
                inline: true,
            },
            {
                name: "Status",
                value: `${status} (${data.status.name})`,
                inline: true,
            },
            {
                name: "Resolution",
                value: resolution ?? "Unresolved",
                inline: true,
            },
        ],
    };

    return { embed, buttons };
};

module.exports = {
    sort,
    jiraRegex,
    statusColors,
    getSimpleReport,
    getReport,
};