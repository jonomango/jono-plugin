//META{"name":"JonoPlugin", "source":"https://github.com/jonomango/jono-plugin/blob/master/Jono's%20Plugin.plugin.js"}*//

// https://github.com/rauenzi/BetterDiscordApp/wiki/Creating-Plugins
class JonoPlugin {
    getName() {
        return "Jono's Plugin";
    }
    getDescription() {
        return "plugin that does plugin stuff";
    }
    getVersion() {
        return "1.0";
    }
    getAuthor() {
        return "jono";
    }
    getSettingsPanel() {
        if (!this.settings_panel) {
            this.settings_panel = JonoUtils.createSettingsPanel();

            this.settings_panel.addInput("Command Prefix", "Command Prefix", JonoUtils.settings.command_prefix, value => {
                JonoUtils.settings.command_prefix = value;
                JonoUtils.saveSettings();
            });

            this.settings_panel.addHorizontalRule();

            this.settings_panel.addCheckbox("Custom Notifications", JonoUtils.settings.custom_notifications.enabled, value => {
                JonoUtils.settings.custom_notifications.enabled = value;
                JonoUtils.saveSettings();
            });

            this.settings_panel.addCheckbox("Direct Messages Only", JonoUtils.settings.custom_notifications.dms_only, value => {
                JonoUtils.settings.custom_notifications.dms_only = value;
                JonoUtils.saveSettings();
            });

            this.settings_panel.addCheckbox("Status Updates", JonoUtils.settings.custom_notifications.status_updates, value => {
                JonoUtils.settings.custom_notifications.status_updates = value;
                JonoUtils.saveSettings();
            });

            this.settings_panel.addInput("Notification Duration", "Duration", JonoUtils.settings.custom_notifications.duration, value => {
                JonoUtils.settings.custom_notifications.duration = value;
                JonoUtils.saveSettings();
            }, "number");

            this.settings_panel.addHorizontalRule();

            this.settings_panel.addInput("API Key: omdbapi.com", "API Key", JonoUtils.settings.api_keys.omdbapi, value => {
                JonoUtils.settings.api_keys.omdbapi = value;
                JonoUtils.saveSettings();
            }, "password");

            this.settings_panel.addInput("API Key: ipdata.co", "API Key", JonoUtils.settings.api_keys.ipdata, value => {
                JonoUtils.settings.api_keys.ipdata = value;
                JonoUtils.saveSettings();
            }, "password");
        }

        return this.settings_panel.getMainElement();
    }

    start() {
        JonoUtils.setup(this);

        JonoUtils.loadSettings({
            command_prefix: "~",
            custom_notifications: {
                enabled: true,
                dms_only: false,
                status_updates: true,
                duration: 6000,
                muted_guilds: [],
                muted_channels: []
            },
            api_keys: {
                omdbapi: "",
                ipdata: ""
            },
            aliases: {}
        });

        this.setupCommands();
        this.setupAliases();
    }
    stop() {
        JonoUtils.saveSettings();
        JonoUtils.release();
    }

    onDispatch(data) {
        // only messages
        if (data.methodArguments[0].type != "MESSAGE_CREATE") {
            return;
        }

        // custom notifications disabled
        if (!JonoUtils.settings.custom_notifications.enabled) {
            return;
        }

        const message = data.methodArguments[0].message;
        if (!message) {
            return;
        }

        // ignore messages from us
        if (message.author.id == JonoUtils.getUser().id) {
            return;
        }

        const channel = JonoUtils.getChannel(message.channel_id);
        if (!channel) {
            return;
        }

        // we're in this channel
        if (channel.id == JonoUtils.getCurrentChannelID()) {
            return;
        }

        // only accept direct messages
        if (JonoUtils.settings.custom_notifications.dms_only && channel.type != 1) {
            return;
        } else {
            // if not mentioned, ignore muted channels
            if (message.mentions.filter(x => x.id == JonoUtils.getUser().id).length <= 0) {
                // guild is muted
                if (JonoUtils.settings.custom_notifications.muted_guilds.includes(message.guild_id)) {
                    return;
                }

                // channel is muted
                if (JonoUtils.settings.custom_notifications.muted_channels.includes(message.channel_id)) {
                    return;
                }
            }
        }

        let msg_location = "", channel_name = "";
        if (channel.type == 1) {
            msg_location = "Direct Message";
        } else {
            // #channelname, guildname
            channel_name = "#";
            if (!channel.name) {
                channel_name += channel.recipients.reduce((total, user) => {
                    user = JonoUtils.getUser(user);
                    if (!user) {
                        return total;
                    }
                    if (!total) {
                        return user.username;
                    }
                    return total + ", " + user.username;
                }, null);
            } else {
                channel_name += channel.name;
            }
        }

        // channel icon
        if (channel.icon) {
            msg_location += ` <img class="emoji" src="https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.webp" width="20" height="20" style="border-radius: 10px; margin-right:5px" />`;
        }

        msg_location += channel_name;

        // guild icon
        if (message.guild_id) {
            const guild = JonoUtils.getGuild(message.guild_id);
            msg_location += ` <img class="emoji" src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp" width="20" height="20" style="border-radius: 10px; margin-right:5px" />`;
            msg_location += guild.name;
        }

        // **username** #channelname, guildname
        let title = `<b>${JonoUtils.encodeHTMLEntities(message.author.username)}</b> <span style="color:lightgrey;">${msg_location}</span>`;

        JonoUtils.showToast(title, JonoUtils.messageToHTML(message), {
            icon_url: JonoUtils.getAvatarURL(message.author),
            duration: JonoUtils.settings.custom_notifications.duration,
            callback: () => {
                JonoUtils.switchToChannel(message.guild_id, message.channel_id);
            }
        });
    }
    onContextMenu() { // credits to the ExtendedContextMenu plugin
        const context_menu = document.getElementsByClassName(JonoUtils.ContextMenuSelector.contextMenu)[0];
        if (!context_menu) {
            return;
        }

        const react_instance = JonoUtils.getReactInstance(context_menu);
        if (!react_instance) {
            return;
        }

        const props = react_instance.return.memoizedProps;
        if (!props) {
            return;
        }

        const channel = props.channel, 
            guild = props.guild,
            message = props.message;

        if (message || (!channel && !guild)) {
            return;
        }

        const catagory = JonoUtils.createContextMenuCatagory();
        context_menu.appendChild(catagory);

        if (channel) {
            catagory.appendChild(JonoUtils.createContextMenuCheckbox("Mute (Jono's Plugin)", JonoUtils.settings.custom_notifications.muted_channels.includes(channel.id), value => {
                if (value) {
                    JonoUtils.settings.custom_notifications.muted_channels.push(channel.id);
                } else {
                    JonoUtils.settings.custom_notifications.muted_channels.splice(JonoUtils.settings.custom_notifications.muted_channels.indexOf(channel.id), 1);
                }

                JonoUtils.saveSettings();
            }));
        } else if (guild) {
            catagory.appendChild(JonoUtils.createContextMenuCheckbox("Mute (Jono's Plugin)", JonoUtils.settings.custom_notifications.muted_guilds.includes(guild.id), value => {
                if (value) {
                    JonoUtils.settings.custom_notifications.muted_guilds.push(guild.id);
                } else {
                    JonoUtils.settings.custom_notifications.muted_guilds.splice(JonoUtils.settings.custom_notifications.muted_guilds.indexOf(guild.id), 1);
                }

                JonoUtils.saveSettings();
            }));
        }

        if (react_instance.return.stateNode) {
            react_instance.return.stateNode.props.onHeightUpdate();
        }
    }
    onClick() {
        const target = event.target;
        if (target.nodeName != "A") {
            return;
        }

        const url = new JonoUtils.url.URL(target.href);

        // removes any forward slashes at the end of a str
        const removeTrailingSlashes = str => {
            while (str.length > 0 && str[str.length - 1] == "/") {
                str = str.slice(0, str.length - 1);
            }
            return str;
        };
        const chooseOption = onconfirm => {
            event.preventDefault();

            BdApi.showConfirmationModal("Jono's Plugin", "How do you wish to view this video?", {          
                confirmText: "Discord",
                onConfirm: onconfirm,
    
                cancelText: "Browser",
                onCancel: () => JonoUtils.electron.shell.openExternal(target.href)
            });
        };
        const openYoutubeInDiscord = (id, time) => {
            JonoUtils.createIframeWindow(`https://www.youtube.com/embed/${removeTrailingSlashes(id)}?autoplay=1&start=${time || 0}`, {
                title: "YouTube",
                ratio: 9/16
            });
        };
        const openTwitchInDiscord = path => {
            path = removeTrailingSlashes(path).split("/");
            if (path.length <= 0) {
                return;
            }

            const channelname = path[0];
            if (path.length == 3) { // clip
                if (path[1] != "clip") {
                    return;
                }

                JonoUtils.createIframeWindow(`https://clips.twitch.tv/embed?clip=${path[2]}`, {
                    title: "Twitch",
                    ratio: 9/16
                });
            } else { // channel
                JonoUtils.createIframeWindow(`https://player.twitch.tv/?channel=${channelname}`, {
                    title: "Twitch",
                    ratio: 9/16,
                    x: 200,
                    y: 200
                });

                JonoUtils.createIframeWindow(`https://www.twitch.tv/embed/${channelname}/chat`, {
                    title: "Twitch Chat",
                    x: 800,
                    y: 200,
                    height: 600,
                    width: 400
                });
            }
        };

        // parse the clicked link for videos
        switch (url.hostname) {
            case "youtu.be":
                chooseOption(() => openYoutubeInDiscord(url.pathname.slice(1), url.searchParams.get("t")));
                break;
            case "youtube.com":
            case "www.youtube.com":
                if (url.pathname == "/watch" || url.pathname == "/watch/") {
                    chooseOption(() => openYoutubeInDiscord(url.searchParams.get("v"), url.searchParams.get("t")));
                }
                break;
            case "twitch.tv":
            case "www.twitch.tv":
                chooseOption(() => openTwitchInDiscord(url.pathname.slice(1)));
                break;
        }
    }
    onHeartbeat() {
        if (!JonoUtils.settings.custom_notifications.status_updates) {
            this.previous_friend_statuses = {}; // so that it fetches againe on enable
            return;
        }

        this.previous_friend_statuses = this.previous_friend_statuses || {};
        const friend_ids = JonoUtils.getFriendIDs();

        // loop through each friend
        for (const i in friend_ids) {
            const userid = friend_ids[i];
            const is_online = JonoUtils.isUserOnline(userid);

            if (!(userid in this.previous_friend_statuses)) { // if they its the first run or they added the friend
                this.previous_friend_statuses[userid] = is_online;
            } else if (this.previous_friend_statuses[userid] != is_online) { // status changed
                this.previous_friend_statuses[userid] = is_online;

                const user = JonoUtils.getUser(userid);
                const color = is_online ? "rgb(0, 200, 0)" : "rgb(200, 0, 0)",
                    text = is_online ? "online" : "offline";

                const title = `<b>${JonoUtils.encodeHTMLEntities(user.username)}</b> is now <b style="color: ${color}">${text}</b>`;
                JonoUtils._showToast(title, "", { 
                    icon_url: JonoUtils.getAvatarURL(user), 
                    duration: JonoUtils.settings.custom_notifications.duration,
                    callback: async () => {
                        JonoUtils.switchToChannel(null, await JonoUtils.getPrivateChannelID(userid));
                    }
                });
            }
        }
    }
    onSwitch() {
        JonoUtils.onSwitch();
    }
    onInput(input) {
        if (input.length <= 0) {
            return;
        }

        // if not command, call the on_input() callback
        if (!input.startsWith(JonoUtils.settings.command_prefix)) {
            let ret = null;

            for (const key in this.commands) {
                if (!this.commands[key].callbacks.on_input) {
                    continue;
                }

                if (this.commands[key].callbacks.on_input(input)) {
                    ret = "";
                }
            }

            return ret;
        }

        input = input.slice(JonoUtils.settings.command_prefix.length).split(" ");
        const command_name = input[0];
        input = input.slice(1).join(" ");

        // if command doesn't exist
        if (!(command_name in this.commands)) {
            JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "Command not found");
            return "";
        }

        const cmd = this.commands[command_name];
        if (!cmd.callbacks.on_command) {
            return "";
        }

        this.onCommand(cmd, input);
        return "";
    }
    onCommand(command, input) {
        const parseArgs = (cmd, str) => {
            str = str.trim();
            if (!str) {
                return {};
            }

            let args = [];
            let cached_str = "";
            let is_in_quotes = false;
            for (let i = 0, len = str.length; i < len; ++i) {
                // escaped stuff
                if (i + 1 < len && str[i] == "\\") {
                    switch (str[i + 1]) {
                        case "\"":
                            cached_str += "\"";
                            break;
                        case "\\":
                            cached_str += "\\";
                            break;
                        default:
                            JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `\`\\${str[i + 1]}\` is not a supported escape sequence.`);
                    }

                    i += 1;
                    continue;
                }

                // shizzle between "" counts as one arg
                if (str[i] == "\"") {
                    is_in_quotes = !is_in_quotes;
                    continue;
                }

                if (!is_in_quotes && str[i] == " ") { // clear the string and add it to the args array
                    args.push(cached_str);
                    cached_str = "";
                } else { // add the char to the cached string
                    cached_str += str[i];
                }
            }

            // last argument
            if (cached_str) {
                args.push(cached_str);
            }

            let obj = {};

            const cmd_args = cmd.required_args.concat(cmd.optional_args);
            const num_args = Math.min(cmd_args.length, args.length);
            for (let i = 0; i < num_args; ++i) {
                if (i == num_args - 1 && cmd_args[i].endsWith("...")) {
                    obj[cmd_args[i].slice(0, cmd_args[i].length - 3)] = args.slice(i);
                } else {
                    obj[cmd_args[i]] = args[i];
                }
            }

            return obj;
        };

        const args = parseArgs(command, input);

        // check args
        let missing_args = [];
        for (let i = 0, len = command.required_args.length; i < len; ++i) {
            let arg = command.required_args[i];
            if (i == command.required_args.length - 1 && arg.endsWith("...")) {
                arg = arg.slice(0, arg.length - 3);
            }

            if (!(arg in args)) {
                missing_args.push(arg);
            }
        }

        // if missing args
        if (missing_args.length > 0) {
            JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `Missing arguments: \`${missing_args.join("\`, \`")}\``);
            return;
        }

        command.callbacks.on_command(args);
    }

    addCommand(name, description, required_args, optional_args) {
        return this.commands[name] = new class {
            constructor() {
                this.name = name;
                this.description = description;
                this.required_args = required_args;
                this.optional_args = optional_args;
                this.is_alias = false;
                this.callbacks = {};
            }

            // allows chaining
            onCommand(on_command) {
                this.callbacks.on_command = on_command;
                return this;
            }
            onInput(on_input) {
                this.callbacks.on_input = on_input;
                return this;
            }
        };
    }
    setupCommands() {
        this.commands = {};

        // help
        this.addCommand("help", "Helps you bruh", [], ["command"])
            .onCommand(args => {
                let embed = {
                    type: "rich",
                    color: 0x00FF00, // green
                    fields: []
                };

                const addCommandField = (command) => {
                    let description = "";

                    if (command.description) {
                        description += `*${command.description}*\n`;
                    }

                    // required args
                    description += "arguments: [";
                    if (command.required_args.length > 0) {
                        description += "**";
                    }
                    description += command.required_args.join("**, **");
                    if (command.required_args.length > 0) {
                        description += "**";
                    }
                    description += "]\n";

                    // optional args
                    description += "optional: [";
                    if (command.optional_args.length > 0) {
                        description += "**";
                    }
                    description += command.optional_args.join("**, **");
                    if (command.optional_args.length > 0) {
                        description += "**";
                    }
                    description += "]\n";

                    embed.fields.push({
                        inline: false,
                        name: command.name,
                        value: description
                    });
                }

                if (args.command) {
                    if (!(args.command in this.commands)) {
                        embed.color = 0xFF0000; // red
                        embed.title = "Error";
                        embed.description = `Failed to find command: **${args.command}**`;
                    } else {
                        const command = this.commands[args.command];
                        addCommandField(command);
                    }
                } else {
                    const commands = Object.keys(this.commands).filter(name => !this.commands[name].is_alias);
                    const aliases = Object.keys(this.commands).filter(name => this.commands[name].is_alias);

                    // commands
                    embed.fields.push({
                        inline: false,
                        name: `**Commands** (${commands.length}):`,
                        value: ""
                    });

                    commands.forEach(name => {
                        const command = this.commands[name];
                        addCommandField(command);
                    });

                    // aliases
                    embed.fields.push({
                        inline: false,
                        name: `**Aliases** (${aliases.length}):`,
                        value: ""
                    });   
                    
                    aliases.forEach(name => {
                        const alias = this.commands[name];
                        addCommandField(alias);
                    });
                }

                JonoUtils.sendBotEmbed(JonoUtils.getCurrentChannelID(), embed);
        });

        // purge
        // this.addCommand("purge", "Mass deletes your last messages", ["amount"], [])
        //     .onCommand(async args => {
        //         const userid = JonoUtils.getUser().id;
        //         const amount = Math.min(parseInt(args.amount), 1000);

        //         const messages = await JonoUtils.getMessages({ userid, amount });
        //         for (let i = 0; i < messages.length; ++i) {
        //             JonoUtils.deleteMessage(messages[i].channel_id, messages[i].id);
        //             await JonoUtils.sleep(500);
        //         }

        //         JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `Purged ${amount} messages`);
        // });

        // eval
        this.addCommand("eval", "Evaluates javascript codenz", ["code"], [])
            .onCommand(args => {
                try {
                    eval(args.code);
                } catch (e) {
                    JonoUtils.sendMessage(JonoUtils.getCurrentChannelID(), e.toString());
                }
        });

        // repeat
        this.addCommand("repeat", "Repeats text", ["amount", "text"], [])
            .onCommand(args => {
                JonoUtils.sendMessage(JonoUtils.getCurrentChannelID(), args.text.repeat(args.amount));
        });

        // clear
        this.addCommand("clear", "Clears chat", [], [])
            .onCommand(() => {
                JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "`." + "\n".repeat(1990) + "cleared`");
        });

        // imdb
        this.addCommand("imdb", "Search up a movie/show on imdb", ["title"], [])
            .onCommand(async args => {
                if (!JonoUtils.settings.api_keys.omdbapi) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `\`omdbapi.com\` API key not provided\n`);
                    return;
                }

                const response = await JonoUtils.request_promise({
                    method: "GET",
                    uri: "http://www.omdbapi.com",
                    qs: {
                        apikey: JonoUtils.settings.api_keys.omdbapi,
                        s: args.title,
                        r: "json"
                    },
                    json: true
                });

                if (!response) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "Failed to get omdbapi.com response");
                    return;
                }

                if (!response.Search && response.Error) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), response.Error);
                    return;
                }

                const embed = {
                    type: "rich",
                    title: `Showing results for \`${args.title}\``,
                    fields: []
                }

                response.Search.forEach(movie => {
                    embed.fields.push({
                        inline: false,
                        name: `**${movie.Title}** (${movie.Type}, ${movie.Year})`,
                        value: `<https://www.imdb.com/title/${movie.imdbID}>`
                    });
                });

                JonoUtils.sendBotEmbed(JonoUtils.getCurrentChannelID(), embed);
        });

        // ip
        this.addCommand("ip", "Shows information about a specific ip", ["ip"], [])
            .onCommand(async args => {
                if (!JonoUtils.settings.api_keys.ipdata) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `\`ipdata.co\` API key not provided\n`);
                    return;
                }

                const response = await JonoUtils.request_promise({
                    uri: `https://api.ipdata.co/${args.ip}`,
                    qs: {
                        "api-key": JonoUtils.settings.api_keys.ipdata
                    },
                    json: true
                });
                
                if (!response) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "Failed to get api.ipdata.co response");
                    return;
                }

                if (response.message) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), response.message);
                    return;
                }
                
                const embed = {
                    type: "rich",
                    color: 0x00FF00,
                    title: args.ip,
                    fields: []
                };

                // continent
                if (response.continent_name) {
                    embed.fields.push({
                        inline: true,
                        name: "Continent",
                        value: response.continent_name
                    });
                }

                // country
                if (response.country_name) {
                    embed.fields.push({
                        inline: true,
                        name: "Country",
                        value: response.country_name
                    });
                }

                // region
                if (response.region) {
                    embed.fields.push({
                        inline: true,
                        name: "Region",
                        value: response.region
                    });
                }

                // city
                if (response.city) {
                    embed.fields.push({
                        inline: true,
                        name: "City",
                        value: response.city
                    });
                }

                // postal
                if (response.postal) {
                    embed.fields.push({
                        inline: true,
                        name: "Postal Code",
                        value: response.postal
                    });
                }

                // TOR / proxy
                if (response.threat) {
                    embed.fields.push({
                        inline: true,
                        name: "Tor / Proxy",
                        value: response.threat.is_anonymous ? "True" : "False"
                    });
                }

                // ASN
                if (response.asn) {
                    embed.fields.push({
                        inline: true,
                        name: `ASN (${response.asn.type})`,
                        value: response.asn.name
                    });
                }

                JonoUtils.sendBotEmbed(JonoUtils.getCurrentChannelID(), embed);
        });

        // mc
        this.addCommand("mc", "Shows information about the minecraft user", ["username"], [])
            .onCommand(async args => {
                // get the uuid from the username
                let response = await JonoUtils.request_promise({
                    uri: `https://api.mojang.com/users/profiles/minecraft/${args.username}`,
                    qs: {
                        at: Date.now()
                    },
                    json: true
                });

                // error
                if (!response || !response.id) {
                    if (response && response.errorMessage) {
                        JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), response.errorMessage);
                    } else {
                        JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "Failed to get api.mojang.com response");
                    }

                    return;
                }

                const uuid = response.id

                response = await JonoUtils.request_promise({
                    uri: `https://api.mojang.com/user/profiles/${uuid}/names`,
                    json: true
                });

                const embed = {
                    type: "rich",
                    fields: [],
                    author: {
                        name: args.username,
                        url: `https://namemc.com/profile/${uuid}`,
                    },
                    image: {
                        height: 270,
                        width: 120,
                        proxyURL: `https://crafatar.com/renders/body/${uuid}`,
                        url: `https://crafatar.com/renders/body/${uuid}`
                    },
                };

                // uid
                embed.fields.push({
                    inline: false,
                    name: "UUID",
                    value: uuid
                });

                // previous names
                embed.fields.push({
                    inline: false,
                    name: "Previous Names",
                    value: response.reverse().reduce((total, x) => {
                        if (x.changedToAt) {
                            return total + x.name + " - **" + (new Date(x.changedToAt)).toUTCString().slice(5, 16) + "**\n";
                        } else {
                            return total + x.name + "\n";
                        }
                    }, "")
                });

                JonoUtils.sendBotEmbed(JonoUtils.getCurrentChannelID(), embed);
        });

        // steam
        this.addCommand("steam", "Shows information about the steam user", ["id"], [])
            .onCommand(async args => {
                const response = await JonoUtils.request_promise({
                    uri: `https://steamid.io/lookup/${args.id}`,
                });

                if (!response) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "Failed to get steamid.io response");
                    return;
                }

                const html_doc = (new DOMParser).parseFromString(response, 'text/html'),
                    html_keys = html_doc.getElementsByClassName("key"),
                    html_values = html_doc.getElementsByClassName("value");
    
                const steam_info = {};
                for (let i = 0; i < html_keys.length; ++i) {
                    steam_info[html_keys[i].innerText] = html_values[i].innerText.trim();
                }

                if (Object.keys(steam_info).length <= 0) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "No steam info found");
                    return;
                }

                const embed = {
                    type: "rich",
                    author: {
                        name: steam_info["name"],
                        url: steam_info["profile"]
                    },
                    fields: [{
                        inline: true,
                        name: "SteamID",
                        value: steam_info["steamID"]
                    }, {
                        inline: true,
                        name: "SteamID3",
                        value: steam_info["steamID3"]
                    }, {
                        inline: true,
                        name: "SteamID64",
                        value: steam_info["steamID64"]
                    },{
                        inline: true,
                        name: "Status",
                        value: steam_info["status"]
                    }, {
                        inline: true,
                        name: "Type",
                        value: steam_info["profile state"]
                    },  {
                        inline: true,
                        name: "Created",
                        value: steam_info["profile created"]
                    }, {
                        inline: false,
                        name: "Location",
                        value: steam_info["location"]
                    }]
                };


                JonoUtils.sendBotEmbed(JonoUtils.getCurrentChannelID(), embed);
        });

        // echo
        this.addCommand("echo", "Echoes stuff", ["text"], [])
            .onCommand(args => {
                JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), args.text);
        });

        // seibmoz
        this.addCommand("seibmoz", "Seibmoz mode", [], ["text"])
            .onCommand(function (args) {
                this.text = args.text || ":ok_hand::skin-tone-5:";

                // always enable if they provide an arg
                if (args.text) {
                    this.enabled = true;
                } else {
                    this.enabled = !this.enabled;
                }

                if (this.enabled) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "Seibmoz mode enabled.");
                } else {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "Seibmoz mode disabled.");
                }
        })
            .onInput(function (input) {
                if (!this.enabled) {
                    return;
                }

                JonoUtils.sendMessage(JonoUtils.getCurrentChannelID(), `${this.text} ${input} ${this.text}`);
                return true;
        });

        // draw
        this.addCommand("draw", "Create ascii art to send in the current channel", ["caption"], ["width", "height"])
            .onCommand(args => {
                const width = parseInt(args.width) || 60,
                    height = parseInt(args.height) || 30;

                // dimensions too big
                if (width * height > 1900) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "width * height > 1900");
                    return;
                }

                const window = JonoUtils.createWindow({ 
                    title: "Draw",
                    noresize: true
                });

                let clicked_array = [...Array(width)].map(() => [...Array(height)].map(() => false));

                /* table */
                const table = document.createElement("table");
                table.style["border-collapse"] = "collapse";
                table.style["background-color"] = "rgb(60, 60, 60)";

                // each td is a square
                for (let y = 0; y < height; ++y) {
                    const tr = document.createElement("tr");
                    table.appendChild(tr);

                    for (let x = 0; x < width; ++x) {
                        const td = document.createElement("td");
                        tr.appendChild(td);

                        td.className = `${x}_${y}`;
                        td.style["width"] = "10px";
                        td.style["height"] = "10px";
                        td.style["border"] = "1px solid black";

                        td.onmousedown = td.onmouseenter = () => {
                            const split_class = event.target.className.split("_");
                            const x = parseInt(split_class[0]),
                                y = parseInt(split_class[1]);
                            
                            if (event.which == 1) {
                                event.target.style["background-color"] = "black";
                                clicked_array[x][y] = true;
                            } else if (event.which == 3) {
                                event.target.style["background-color"] = null;
                                clicked_array[x][y] = false;
                            }
                        }
                    }
                }

                window.content.appendChild(table);
                /* table */

                /* submit button */
                const submit_button = document.createElement("div");

                submit_button.innerText = "Submit";
                submit_button.style["margin-top"] = "8px";
                submit_button.style["padding"] = "2px";
                submit_button.style["color"] = "lightgrey";
                submit_button.style["text-align"] = "center";
                submit_button.style["border"] = "1px solid black";
                submit_button.style["background-color"] = "rgb(60, 60, 60)";

                submit_button.onclick = () => {
                    window.window.remove();

                    const channelid = JonoUtils.getCurrentChannelID();
                    if (!channelid) {
                        return;
                    }

                    // create the message
                    let content = "";
                    for (let y = 0; y < height; ++y) {
                        let line = "";
                        for (let x = 0; x < width; ++x) {
                            line += clicked_array[x][y] ? "." : " ";
                        }

                        if (line.trim()) {
                            if (content) {
                                content += line + "\n"
                            } else {
                                content += `${args.caption}\n${line}\n`;
                            }
                        }
                    }

                    // send the message (if they drew something)
                    if (content) {
                        JonoUtils.sendMessage(channelid, `\`\`\`\n\n${content}\`\`\``);
                    }
                };

                window.content.appendChild(submit_button);
                /* submit button */
        });

        // pickle
        this.addCommand("pickle", "Watch the pickle rick episode", [], [])
            .onCommand(args => {
                JonoUtils.createIframeWindow("//vidcloud.icu/streaming.php?id=MTAxOTAy", {
                    title: "Pickle Rick",
                    ratio: 9/16
                });
        });

        // alias
        this.addCommand("alias", "Add an alias for text", ["name", "author", "values..."], [])
            .onCommand(args => {
                // command already exists
                if (args.name in this.commands) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `Command/alias already exists with the name \`${args.name}\`.`)
                    return;
                }

                const userid = args.author || JonoUtils.getCurrentUserID();
                this.addAlias(args.name, userid, args.values);

                JonoUtils.settings.aliases[args.name] = {
                    author: userid,
                    values: args.values
                };
                JonoUtils.saveSettings();

                JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `Successfully added alias \`${args.name}\`.`);
        });

        // rm_alias
        this.addCommand("rm_alias", "Removes an alias", ["name"], [])
            .onCommand(args => {
                const alias = this.commands[args.name];
                if (!alias) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `\`${args.name}\` does not exist.`);
                    return;
                }

                if (!alias.is_alias) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "Cannot remove a command.");
                    return;
                }

                delete this.commands[args.name];
                delete JonoUtils.settings.aliases[args.name];
                JonoUtils.saveSettings();

                JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `Successfully removed the \`${args.name}\` alias.`);
        });

        // ex_alias
        this.addCommand("ex_alias", "Export an alias in chat", ["name"], [])
            .onCommand(args => {
                const alias = JonoUtils.settings.aliases[args.name];
                if (!alias) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `\`${args.name}\` does not exist.`);
                    return;
                }

                let content = `\`\`\`~alias ${args.name} ${alias.author}`;

                alias.values.forEach(value => {
                    value = value.replace(/\\/g, "\\\\");
                    value = value.replace(/\"/g, "\\\"");

                    content += ` "${value}"`;
                });

                content += "\`\`\`";
                JonoUtils.sendMessage(JonoUtils.getCurrentChannelID(), content);
        });

        // test
        this.addCommand("test", "Testing purposes", [], ["frog"])
            .onCommand(args => {
                //JonoUtils.createIframeWindow("https://twitter.com/i/videos/1177295660468592643?embed_source=facebook&autoplay=1&auto_play=1");
                console.log(args);
        });
    }
    addAlias(name, author, values) {
        return this.commands[name] = new class {
            constructor() {
                this.name = name;
                this.description = `Alias by ${JonoUtils.getUser(author).tag}`;
                this.required_args = [];
                this.optional_args = [];
                this.is_alias = true;

                this.callbacks = {
                    on_command: () => {
                        values.forEach(value => {
                            const str = JonoUtils.main_plugin.onInput(value);
                            if (typeof str == "string") {
                                value = str;
                            }

                            // empty string
                            if (!value) {
                                return;
                            }

                            JonoUtils.sendMessage(JonoUtils.getCurrentChannelID(), value);
                        });
                    }
                };
            }
        };
    }
    setupAliases() {
        for (const name in JonoUtils.settings.aliases) {
            const alias = JonoUtils.settings.aliases[name];
            this.addAlias(name, alias.author, alias.values);
        }
    }
}

// wrapper around some BdApi functions (heavily inspired by Zere's Library)
const JonoUtils = {
    setup: plugin => {
        JonoUtils.main_plugin = plugin;

        // constants
        JonoUtils.MAX_TOASTS = 5;

        // discord modules
        JonoUtils.MessageActions = BdApi.findModuleByProps("jumpToMessage", "_sendMessage");
        JonoUtils.UserInfoStore = BdApi.findModuleByProps("getToken");
        JonoUtils.UserStore = BdApi.findModuleByProps("getCurrentUser");
        JonoUtils.TextArea = BdApi.findModuleByProps("channelTextArea", "textArea");
        JonoUtils.SelectedChannelStore = BdApi.findModuleByProps("getLastSelectedChannelId");
        JonoUtils.ChannelStore = BdApi.findModuleByProps("getChannels", "getDMFromUserId");
        JonoUtils.MessageStore = BdApi.findModuleByProps("getMessages");
        JonoUtils.MessageParser = BdApi.findModuleByProps("createMessage", "parse", "unparse");
        JonoUtils.SimpleMarkdown = BdApi.findModuleByProps("parseBlock", "parseInline", "defaultOutput");
        JonoUtils.AvatarDefaults = BdApi.findModuleByProps("getUserAvatarURL", "DEFAULT_AVATARS");
        JonoUtils.GuildStore = BdApi.findModuleByProps("getGuild");
        JonoUtils.SelectedGuildStore = BdApi.findModuleByProps("getLastSelectedGuildId");
        JonoUtils.ChannelGuildSettings = BdApi.findModuleByProps("isGuildOrCategoryOrChannelMuted");
        JonoUtils.ChannelActions = BdApi.findModuleByProps("selectChannel");
        JonoUtils.UserStatusStore = BdApi.findModuleByProps("getStatus", "getState");
        JonoUtils.RelationshipStore = BdApi.findModuleByProps("isBlocked", "getFriendIDs");
        JonoUtils.PrivateChannelActions = BdApi.findModuleByProps("openPrivateChannel");
        JonoUtils.GuildMemberStore = BdApi.findModuleByProps("getMember");

        // discord selectors
        JonoUtils.ContextMenuSelector = BdApi.findModuleByProps("contextMenu");
        JonoUtils.CheckboxSelector = BdApi.findModuleByProps("checkboxInner");
        JonoUtils.MarkupSelector = BdApi.findModuleByProps("markup");
        JonoUtils.MessagesSelector = BdApi.findModuleByProps("username", "divider");
        JonoUtils.AppSelector = BdApi.findModuleByProps("app");

        JonoUtils.url = require("url");
        JonoUtils.request = require("request");
        JonoUtils.electron = require("electron");

        // request wrapper that uses promises
        JonoUtils.request_promise = options => {
            return new Promise((resolve, reject) => {
                JonoUtils.request(options, (error, response, data) => {
                    if (error)
                        reject(error);
                    else
                        resolve(data);
                });
            });
        };

        // dispatch callback
        JonoUtils.dispatch_unpatch = BdApi.monkeyPatch(BdApi.findModuleByProps("dispatch"), 'dispatch', { after: data => {
            if (JonoUtils.main_plugin.onDispatch) {
                JonoUtils.main_plugin.onDispatch(data);
            }
        }});

        // click callback
        document.addEventListener("click", JonoUtils.click_event_listener = () => {
            if (JonoUtils.main_plugin.onClick) {
                JonoUtils.main_plugin.onClick();
            }
        });

        // context menu callback
        document.addEventListener("contextmenu", JonoUtils.context_menu_event_listener = () => {
            if (JonoUtils.main_plugin.onContextMenu) {
                JonoUtils.main_plugin.onContextMenu();
            }
        });

        setTimeout(() => {
            // heartbeat function thats called every 500ms
            JonoUtils.heartbeat_interval = setInterval(() => {
                JonoUtils._flushToasts();
            
                if (JonoUtils.main_plugin.onHeartbeat) {
                    JonoUtils.main_plugin.onHeartbeat();
                }
            }, 500);
        }, 2000);

        JonoUtils.onSwitch();
    },
    onSwitch: () => {
        // attach keydown listener
        const textarea = JonoUtils.getTextArea();
        if (textarea) {
            textarea.addEventListener("keydown", JonoUtils._onKeyDown);
        }
    },
    release: () => {
        JonoUtils._removeWindows();
        JonoUtils.dispatch_unpatch();

        document.removeEventListener("click", JonoUtils.click_event_listener);
        document.removeEventListener("contextmenu", JonoUtils.context_menu_event_listener);

        clearInterval(JonoUtils.heartbeat_interval);

        // remove keydown listener
        const textarea = JonoUtils.getTextArea();
        if (textarea) {
            textarea.removeEventListener("keydown", JonoUtils._onKeyDown);
        }
    },

    _onKeyDown: () => {
        const setInput = str => {
            // dont send the original text into the channel
            const el = document.querySelector('.chat-3bRxxu form');
            if (el) {
                BdApi.getInternalInstance(el).return.stateNode.setState({ textValue: str });
            }
        };

        if (event.key != "Enter" || event.shiftKey || event.ctrlKey || event.altKey) {
            return;
        }

        const textarea = JonoUtils.getTextArea();
        if (!textarea) {
            return;
        }

        const str = JonoUtils.main_plugin.onInput(textarea.value);
        if (typeof str == "string") {
            setInput(str);
        }
    },

    getUser: userid => {
        if (userid) {
            return JonoUtils.UserStore.getUser(userid);
        }

        return JonoUtils.UserStore.getCurrentUser();
    },
    getChannel: channelid => {
        channelid = channelid || JonoUtils.SelectedChannelStore.getChannelId();
        return JonoUtils.ChannelStore.getChannel(channelid);
    },
    getGuild: guildid => {
        guildid = guildid || JonoUtils.SelectedGuildStore.getGuildId();
        return JonoUtils.GuildStore.getGuild(guildid);
    },
    getPrivateChannelID: async userid => {
        return JonoUtils.PrivateChannelActions.ensurePrivateChannel(JonoUtils.getCurrentUserID(), userid);
    },
    getCurrentUserID: () => {
        return JonoUtils.UserStore.getCurrentUser().id; // probably should change this but whatever
    },
    getCurrentChannelID: () => {
        return JonoUtils.SelectedChannelStore.getChannelId();
    },
    getCurrentGuildID: () => {
        return JonoUtils.SelectedGuildStore.getGuildId();
    },
    getMessages: async options => { // options: channelid, beforeid, amount, userid
        if (!options) {
            options = {};
        }
        
        let channelid = options.channelid;
        if (!channelid) {
            channelid = JonoUtils.SelectedChannelStore.getChannelId();
        }

        // only return messages from before this msg id
        let beforeid = options.beforeid;
        if (!options.beforeid) {
            beforeid = undefined;
        }

        let amount = options.amount;
        if (!amount) {
            amount = 50;
        }

        let messages = [];
        while (messages.length < amount) {
            let new_messages = await JonoUtils.request_promise({
                method: "GET",
                uri: "https://discordapp.com/api/channels/" + channelid + "/messages",
                headers: {
                    authorization: JonoUtils.getToken()
                },
                qs: {
                    before: beforeid,
                    limit: Math.min(amount - messages.length, 100)
                },
                json: true
            });

            // end
            if (new_messages.length <= 0) {
                break;
            }

            beforeid = new_messages[new_messages.length - 1].id;

            // filter only messages sent by userid
            if (options.userid) {
                new_messages = new_messages.filter(x => x.author.id == options.userid);
            }

            messages = messages.concat(new_messages);
        }

        return messages;
    },
    getToken: () => {
        return JonoUtils.UserInfoStore.getToken();
    },
    getTextArea: () => {
        return document.getElementsByClassName(JonoUtils.TextArea.textArea)[0];
    },
    getAvatarURL: author => {
        return JonoUtils.AvatarDefaults.getUserAvatarURL(author);
    },
    getFriendIDs: () => {
        return JonoUtils.RelationshipStore.getFriendIDs();
    },
    getStatus: userid => {
        userid = userid || JonoUtils.getCurrentUserID();
        return JonoUtils.UserStatusStore.getStatus(userid);
    },
    getGuildMembers: guildid => {
        return JonoUtils.GuildMemberStore.getMembers(guildid);
    },

    sendMessage: async (channelid, content) => {
        // can't send an empty message :P
        if (!content) {
            return null;
        }

        return (await JonoUtils.MessageActions._sendMessage(channelid, { 
            content,
            tts: false
        })).body;
    },
    sendEmbed: (channelid, embed) => {
        JonoUtils.request_promise({
            method: "POST",
            uri: "https://discordapp.com/api/channels/" + channelid + "/messages",
            headers: {
                authorization: JonoUtils.getToken()
            },
            json: { embed }
        });
    },
    sendBotMessage: (channelid, content) => {
        const msg = JonoUtils.createBotMessage(channelid, content);
        JonoUtils.MessageActions.receiveMessage(channelid, msg);
        return msg;
    },
    sendBotEmbed: (channelid, embed) => {
        let msg = JonoUtils.createBotMessage(channelid, "");
        msg.embeds = [embed];
        JonoUtils.MessageActions.receiveMessage(channelid, msg);
        return msg;
    },

    createBotMessage: (channelid, content, options = { username: "Jono", discriminator: "0069" }) => {
        let msg = JonoUtils.MessageParser.createMessage(channelid, content);
        msg.author.username = options.username;
        msg.author.discriminator = options.discriminator;
        msg.author.avatar = "clyde";
        msg.author.bot = true;
        msg.author.id = 69;
        msg.state = "SENT";
        return msg;
    },
    deleteMessage: (channelid, messageid) => {
        JonoUtils.MessageActions.deleteMessage(channelid, messageid);
    },

    // settings
    saveSettings: () => {
        if (!JonoUtils.settings) {
            JonoUtils.settings = {};
        }

        BdApi.saveData(JonoUtils.main_plugin.getName(), "settings", JonoUtils.settings);
    },
    loadSettings: (default_settings = {}) => {
        JonoUtils.settings = BdApi.loadData(JonoUtils.main_plugin.getName(), "settings") || default_settings;

        const recursive_func = (settings, def) => {
            for (const key in def) {
                if (!(key in settings)) {
                    settings[key] = def[key];
                }

                if (typeof(def[key]) == "object") {
                    recursive_func(settings[key], def[key]);
                }
            }
        };

        recursive_func(JonoUtils.settings, default_settings);
    },
    createSettingsPanel: () => {
        return new class {
            constructor() {
                this.main_div = document.createElement("div");
            }

            getMainElement() {
                return this.main_div;
            }
            addInput(name, placeholder, value, callback, type = "text") {
                const element = document.createElement("input");

                element.onchange = () => { callback(element.value); };

                element.setAttribute("type", type);
                element.setAttribute("style", "margin:6px; margin-left: 0px");
                element.setAttribute("placeholder", placeholder);
                element.setAttribute("value", value);

                this.main_div.appendChild(element);
                this.main_div.appendChild(document.createTextNode(name));

                this.main_div.appendChild(document.createElement("br"));
            }
            addCheckbox(name, value, callback) {          
                const bda_controls = document.createElement("span");
                bda_controls.classList.add("bda-controls");

                const label = document.createElement("element");
                label.classList.add("ui-switch-wrapper");
                label.classList.add("ui-flex-child");
                label.style = "flex: 0 0 auto";

                const input = document.createElement("input");
                input.classList.add("ui-switch-checkbox");
                input.type = "checkbox";
                input.checked = value;
                input.onchange = () => { 
                    div.classList = ["ui-switch"];
                    if (input.checked) {
                        div.classList.add("checked");
                    }

                    callback(input.checked); 
                };

                const div = document.createElement("div");
                div.classList.add("ui-switch");

                if (value) {
                    div.classList.add("checked");
                }

                label.appendChild(input);
                label.appendChild(div);
         
                const text_div = document.createElement("div");
                text_div.style = "margin-left: 6px; align-self: center";
                text_div.appendChild(document.createTextNode(name));

                bda_controls.appendChild(label);
                bda_controls.appendChild(text_div);

                this.main_div.appendChild(bda_controls);
                this.main_div.appendChild(document.createElement("br"));
            }
            addHorizontalRule() {
                const hr = document.createElement("hr");
                hr.className = JonoUtils.MessagesSelector.dividerEnabled;
                this.main_div.appendChild(hr);
            }
        };
    },

    // toasts
    numToasts: () => {
        const container = document.querySelector(".bd-toasts");
        return container ? container.children.length : 0;
    },
    showToast: (title, content, options = {}) => {
        JonoUtils._flushToasts();

        // too many
        if (JonoUtils.numToasts() >= JonoUtils.MAX_TOASTS) {
            return;
        }

        // if not focused
        if (!document.hasFocus()) {
            JonoUtils.queued_toasts = JonoUtils.queued_toasts || [];
            if (JonoUtils.queued_toasts.length < JonoUtils.MAX_TOASTS) {
                JonoUtils.queued_toasts.push({ title, content, options });
            }

            return;
        } 

        JonoUtils._showToast(title, content, options);
    },
    _showToast: (title, content, options = {}) => {
        if (!bdConfig.deferLoaded)
            return;

        const { icon_url = null, duration = 3000, callback = null } = options;

        // if the container for toasts doesn't exist, create it
        if (!document.querySelector(".bd-toasts")) {
            let toastsContainer = document.createElement("div");
            toastsContainer.classList.add("bd-toasts");     

            let chatForm = document.querySelector(".chat-3bRxxu form, #friends, .noChannel-Z1DQK7, .activityFeed-28jde9");
            toastsContainer.style.setProperty("left", chatForm ? chatForm.getBoundingClientRect().left + "px" : "0px");
            toastsContainer.style.setProperty("width", chatForm ? chatForm.offsetWidth + "px" : "100%");
            toastsContainer.style.setProperty("bottom", (document.querySelector(".chat-3bRxxu form") ? document.querySelector(".chat-3bRxxu form").offsetHeight : 80) + "px");
            JonoUtils.getAppElement().appendChild(toastsContainer);
        }

        // make the toast
        let toast_elem = document.createElement("div");
        toast_elem.className = "bd-toast " + JonoUtils.MarkupSelector.markup;
        toast_elem.style = "font-weight:lighter; max-width: 800px; pointer-events: auto";

        let image_html = "";

        // if they have an icon
        if (icon_url) {
            image_html = `<img src="${icon_url}" width="20" height="20" style="border-radius: 10px; margin-right:5px; vertical-align: middle" />`;
        }

        toast_elem.innerHTML = `${image_html}<span style="vertical-align: middle">${title}</span><br>${content}`;
        
        // this removes the toast
        const removeToast = () => {
            toast_elem.classList.add("closing");
            toast_elem.onclick = null;

            // wait 300ms for the closing animation (i think) before actually removing the toast
            setTimeout(() => {
                toast_elem.remove();

                // didn't really understand why they remove the container but turns out its for when the window resizes
                if (document.querySelectorAll(".bd-toasts .bd-toast").length <= 0) {
                    document.querySelector(".bd-toasts").remove();
                }
            }, 300);
        };

        // remove the toast after timeout has elapsed
        const timeout = setTimeout(removeToast, duration);

        // if callback provided, add dis stuff
        if (callback) {
            toast_elem.style.cursor = "pointer";
            toast_elem.onclick = () => {
                clearTimeout(timeout);
                removeToast();
                callback();
            }
        }
 
        // add the toast
        document.querySelector(".bd-toasts").appendChild(toast_elem);
    },
    _flushToasts: () => {
        if (!document.hasFocus() || JonoUtils.numToasts() >= JonoUtils.MAX_TOASTS) {
            return;
        }

        JonoUtils.queued_toasts = JonoUtils.queued_toasts || [];
        if (JonoUtils.queued_toasts.length <= 0) {
            return
        }

        const toast = JonoUtils.queued_toasts[0];
        JonoUtils._showToast(toast.title, toast.content, toast.options);
        JonoUtils.queued_toasts = JonoUtils.queued_toasts.slice(1);
    },

    // context menu stuff
    createContextMenuCatagory: () => {
        const div = document.createElement("div");
        div.className = "itemGroup-1tL0uz da-itemGroup";
        return div;
    },
    createContextMenuButton: (name, callback) => {
        const div = document.createElement("div");
        div.role = "button";
        div.className = JonoUtils.ContextMenuSelector.item + " " + JonoUtils.ContextMenuSelector.clickable;
        div.onclick = callback;

        const span = document.createElement('span');
        span.innerText = name;

        const hint = document.createElement('div');
        hint.className = JonoUtils.ContextMenuSelector.hintClass;

        div.appendChild(span);
        div.appendChild(hint);

        return div;
    },
    createContextMenuCheckbox: (name, value, callback) => {
        const outer_div = document.createElement("div");

        const main_div = document.createElement("div");
        main_div.role = "button";
        main_div.className = `${JonoUtils.ContextMenuSelector.itemBase} ${JonoUtils.ContextMenuSelector.itemToggle} ${JonoUtils.ContextMenuSelector.clickable}`;

        const label = document.createElement("div");
        label.className = JonoUtils.ContextMenuSelector.label;
        label.innerText = name;

        const checkbox = document.createElement("div");
        checkbox.role = "button";
        checkbox.className = `${JonoUtils.CheckboxSelector.checkbox} ${JonoUtils.ContextMenuSelector.checkbox}`;

        const inner_checkbox = document.createElement("div");
        inner_checkbox.className = JonoUtils.CheckboxSelector.checkboxInner;

        const checkbox_element = document.createElement("input");
        checkbox_element.type = "checkbox";
        checkbox_element.checked = value;
        checkbox_element.className = JonoUtils.CheckboxSelector.checkboxElement;

        inner_checkbox.appendChild(checkbox_element);
        inner_checkbox.appendChild(document.createElement("span"));

        checkbox.appendChild(inner_checkbox);

        main_div.appendChild(label);
        main_div.appendChild(checkbox);

        main_div.onclick = () => {
            checkbox_element.checked = !checkbox_element.checked;
            callback(checkbox_element.checked);
        }

        outer_div.appendChild(main_div);
        return outer_div;
    },

    /*
    options = {
        x: 123,
        y: 123,
        width: 123,
        height: 123,
        ratio: 9/16,
        spacing: 10,
        title: "Title",
        noclose: false,
        noresize: false,
        
        callbacks: {
            ondragstart: () => {},
            ondragend: () => {},
            onclose: () => {},
        }
    }*/
    createWindow: (options = {}) => {
        const app_element = JonoUtils.getAppElement();
        if (!app_element) {
            return null;
        }

        const window_id = Date.now().toString();
        const callbacks = options.callbacks || {};
        const spacing = options.spacing || 10;

        // window
        const window_div = document.createElement("div");
        window_div.className = `jono-window jono-window-id-${window_id} bd-toast`; // styled like toasts

        window_div.style["pointer-events"] = "auto"; // accept input
        window_div.style["z-index"] = "3999"; // toasts are 4000 (they have priority)
        window_div.style["position"] = "fixed";
        window_div.style["left"] = `${options.x || JonoUtils.getElementDimensions(app_element).x / 2}px`;
        window_div.style["top"] = `${options.y || JonoUtils.getElementDimensions(app_element).y / 2}px`;
        window_div.style["padding"] = "0";

        // content container
        const content_div = document.createElement("div");
        content_div.style["margin"] = `${spacing}px`;
        content_div.style["overflow"] = "hidden"

        // dimensions (if provided)
        if (options.width) {
            content_div.style["width"] = `${options.width}px`;
        }
        if (options.height) {
            content_div.style["height"] = `${options.height}px`;
        }

        // titlebar
        let titlebar = document.createElement("div");
        window_div.appendChild(titlebar);

        titlebar.innerText = options.title || "";
        titlebar.style["margin-bottom"] = `${spacing}px`;
        titlebar.style["padding"] = `${spacing}px`;
        titlebar.style["padding-bottom"] = "0";

        // window dragging
        titlebar.onmousedown = () => {
            if (event.target != titlebar) {
                return;
            }

            if (callbacks.ondragstart) {
                callbacks.ondragstart();
            }

            const rect = window_div.getBoundingClientRect();
            const offset = { x: event.clientX - rect.left, y: event.clientY - rect.top };

            const onMouseUp = () => {
                if (callbacks.ondragend) {
                    callbacks.ondragend();
                }

                content_div.style["pointer-events"] = "auto";
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };
            const onMouseMove = () => {
                window_div.style["left"] = `${event.clientX - offset.x}px`;
                window_div.style["top"] = `${event.clientY - offset.y}px`;
            };

            // ignore mouse input when dragging the window
            content_div.style["pointer-events"] = "none";

            document.addEventListener("mouseup", onMouseUp);
            document.addEventListener("mousemove", onMouseMove);
        };

        // add close button
        if (!options.noclose) {
            // close button
            const close_button = document.createElement("div");
            titlebar.append(close_button);

            close_button.style["float"] = "right";
            close_button.style["width"] = "12px";
            close_button.style["height"] = "12px";
            close_button.style["padding"] = "2px";

            close_button.onclick = () => {
                if (callbacks.onclose) {
                    callbacks.onclose();
                }

                window_div.remove();
            };

            close_button.onmouseover = () => close_button.style["background-color"] = "red"           
            close_button.onmouseout = () => close_button.style["background-color"] = null;

            // svg
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
            close_button.append(svg);

            svg.setAttribute("width", "12px");
            svg.setAttribute("height", "12px");
            svg.setAttribute("viewport", "0 0 12 12");

            // polygon
            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            svg.appendChild(polygon);

            polygon.setAttribute("fill", "white");
            polygon.setAttribute("fill-rule", "evenodd");
            polygon.setAttribute("points", "11 1.576 6.583 6 11 10.424 10.424 11 6 6.583 1.576 11 1 10.424 5.417 6 1 1.576 1.576 1 6 5.417 10.424 1");
        }

        // window resizing
        if (!options.noresize) {
            window_div.onmousedown = () => {
                if (event.target != window_div) {
                    return;
                }

                const { right, bottom } = window_div.getBoundingClientRect();
                const delta = { x: event.x - right, y: event.y - bottom };

                const onMouseUp = () => {
                    if (callbacks.onresize) {
                        const content_size = JonoUtils.getElementDimensions(content_div);
                        callbacks.onresize({ width: content_size.x, height: content_size.y });
                    }

                    window_div.style["cursor"] = "auto";
                    content_div.style["pointer-events"] = "auto";

                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);
                };
                const onMouseMove = () => {
                    const { left: x, top: y } = content_div.getBoundingClientRect();

                    let width = null, 
                        height = null;

                    // this is a lot bigger than it should be (because of maintaining ratio)
                    if (delta.x >= -spacing && delta.y >= -spacing) { // bottom right
                        width = (event.x - x + delta.x);
                        height = (event.y - y + delta.y);

                        // maintain ratio
                        if (options.ratio) {
                            if (width * options.ratio > height) {
                                height = width * options.ratio;
                            } else {
                                width = height / options.ratio;
                            }
                        }
                    } else if (delta.x >= -spacing) { // right
                        window_div.style["cursor"] = "e-resize";

                        width = event.x - x + delta.x;
                        if (options.ratio) {
                            height = width * options.ratio;
                        }
                    } else if (delta.y >= -spacing) { // bottom
                        height = event.y - y + delta.y;
                        if (options.ratio) {
                            width = height / options.ratio;
                        }
                    }

                    content_div.style["width"] = `${width}px`;
                    content_div.style["height"] = `${height}px`;
                };
    
                // ignore mouse input when resizing the window
                content_div.style["pointer-events"] = "none";

                document.addEventListener("mouseup", onMouseUp);
                document.addEventListener("mousemove", onMouseMove);
            };

            // for the cursors
            const onMouseMove = () => {
                if (!document.querySelector(`.jono-window-id-${window_id}`)) {
                    document.removeEventListener("mousemove", onMouseMove);
                    return;
                }

                window_div.style["cursor"] = "auto";
                if (event.target != window_div) {
                    return;
                }

                const { right, bottom } = window_div.getBoundingClientRect();
                const delta = { x: event.x - right, y: event.y - bottom };

                if (delta.x >= -spacing && delta.y >= -spacing) { // bottom right
                    window_div.style["cursor"] = "nwse-resize";
                } else if (delta.x >= -spacing) { // right
                    window_div.style["cursor"] = "ew-resize";
                } else if (delta.y >= -spacing) { // bottom
                    window_div.style["cursor"] = "ns-resize";
                }
            };

            document.addEventListener("mousemove", onMouseMove);
        }

        window_div.appendChild(content_div);
        app_element.appendChild(window_div);
        
        return { 
            window: window_div, 
            titlebar: titlebar, 
            content: content_div,
            id: window_id
        };
    },
      
    // src examples:
    // twitch: https://player.twitch.tv/?channel=${channelname}
    // youtube: https://www.youtube.com/embed/${videoid}
    createIframeWindow: (src, options = {}) => {
        const width = options.width || 560,
            height = options.height || 315;

        const iframe = document.createElement("iframe");

        iframe.src = src;
        iframe.width = width;
        iframe.height = height;
        iframe.frameborder = "0";
        iframe.allowFullscreen = "true";
        iframe.style["border-radius"] = "4px";

        // 16/9 ratio
        const window = JonoUtils.createWindow({
            title: options.title || "",
            ratio: options.ratio,
            x: options.x,
            y: options.y,
            width: width,
            height: height,
            spacing: 10,
            callbacks: {
                onresize: dimensions => {
                    iframe.width = dimensions.width;
                    iframe.height = dimensions.height;
                }
            }
        });

        window.content.appendChild(iframe);
    },
    _removeWindows: () => {
        document.querySelectorAll("div.jono-window").forEach(x => x.remove());
    },

    getElementDimensions: element => {
        const { left, right, top, bottom } = element.getBoundingClientRect();
        return { x: right - left, y: bottom - top };
    },
    isUserOnline: userid => {
        return JonoUtils.getStatus(userid) != "offline";
    },
    isUserFriend: userid => {
        return JonoUtils.RelationshipStore.isFriend(userid);
    },
    switchToChannel: (guildid, channelid) => {
        JonoUtils.ChannelActions.selectChannel(guildid || null, channelid);
        JonoUtils.main_plugin.onSwitch();
    },
    getAppElement: () => {
        return document.querySelector(JonoUtils.AppSelector.app.split(" ").map(x => "." + x).join(", "));
    },
    getReactInstance: element => {
        if (!(element instanceof jQuery) && !(element instanceof Element))
            return undefined;

        const dom_node = element instanceof jQuery ? element[0] : element;
        return dom_node[Object.keys(dom_node).find(key => key.startsWith("__reactInternalInstance"))];
    },
    messageToHTML: message => {
        let content = "";
        switch (message.type) {
            case 0: content = message.content; break;
            case 1: content = `Added <@${message.mentions[0].id}> to the group.`; break;
            case 2: content = `Removed <@${message.mentions[0].id}> from the group.`; break;
            case 3: content = "Incoming voice call."; break;
            case 4: content = `Changed the channel name to <#${message.channel_id}>`; break;
            case 5: content = "Changed the channel icon."; break;
            case 6: content = "Pinned a message to this channel."; break;
            case 7: content = "Joined the server."; break;
        }

        content = JonoUtils.SimpleMarkdown.markdownToHtml(content).trim();

        // attachments
        (message.attachments || []).forEach(attachment => {
            content += `<a>${attachment.filename}</a> <i>(${attachment.size} bytes)</i>`;
        });

        // embeds
        (message.embeds || []).forEach(embed => {
            if (embed.type != "rich") {
                return;
            }

            if (embed.title) {
                content += JonoUtils.SimpleMarkdown.markdownToHtml(embed.title) + "\n";
            }
            if (embed.description) {
                content += JonoUtils.SimpleMarkdown.markdownToHtml(embed.description) + "\n";
            }

            (embed.fields || []).forEach(field => {
                content += "<b>" + field.name + "</b>\n";
                content += JonoUtils.SimpleMarkdown.markdownToHtml(field.value);
            });
        });

        // mentions <@ID>
        (content.match(/&lt;@\d+?&gt;/g) || []).forEach(x => {        
            const id = x.slice(5, -4);
            const user = JonoUtils.getUser(id);

            let username = x;
            if (user) {
                username = user.username;
            }

            const seperator = `<span class="mention wrapperHover-1GktnT wrapper-3WhCwL da-wrapperHover da-wrapper">@${username}</span>`;
            content = content.replace(x, seperator);
        });

        // server mentions <@!ID>
        (content.match(/&lt;@!\d+?&gt;/g) || []).forEach(x => {        
            const id = x.slice(6, -4);
            const user = JonoUtils.getUser(id);

            let username = x;
            if (user) {
                username = user.username;
            }

            const seperator = `<span class="mention wrapperHover-1GktnT wrapper-3WhCwL da-wrapperHover da-wrapper">@${username}</span>`;
            content = content.replace(x, seperator);
        });

        // role mentions
        if (message.guild_id) {
            const guild = JonoUtils.getGuild(message.guild_id);

            message.mention_roles.forEach(mentionid => {
                const role = guild.roles[mentionid];
                const seperator = `<span class="mention" style="color: ${role.colorString}; background-color: ${role.colorString}25;">@${role.name}</span>`;
                content = content.split(`&lt;@&amp;${mentionid}&gt;`).join(seperator);
            });
        }

        // @everyone
        content = content.split(`@everyone`).join(`<span class="mention wrapperHover-1GktnT wrapper-3WhCwL da-wrapperHover da-wrapper">@everyone</span>`);

        // channels <#ID>
        (content.match(/&lt;#\d+?&gt;/g) || []).forEach(x => {
            const id = x.slice(5, -4);
            const channel = JonoUtils.getChannel(id);
            if (!channel) {
                return;                
            }

            const seperator = `<span class="mention wrapperHover-1GktnT wrapper-3WhCwL da-wrapperHover da-wrapper">#${channel.name}</span>`;
            content = content.replace(x, seperator);
        });

        // static emojis <name:id>
        (content.match(/&lt;:.+?:\d+?&gt;/g) || []).forEach(x => {
            const sliced = x.slice(5, -4);
            const name = sliced.slice(0, sliced.indexOf(":"));
            const id = sliced.slice(sliced.indexOf(":") + 1);

            content = content.replace(x, `<img src="https://cdn.discordapp.com/emojis/${id}.png?v=1" alt=":${name}:" class="emoji">`);
        });

        // animated emojis <name:id>
        (content.match(/&lt;a:.+?:\d+?&gt;/g) || []).forEach(x => {
            const sliced = x.slice(6, -4);
            const name = sliced.slice(0, sliced.indexOf(":"));
            const id = sliced.slice(sliced.indexOf(":") + 1);

            content = content.replace(x, `<img src="https://cdn.discordapp.com/emojis/${id}.gif?v=1" alt=":${name}:" class="emoji">`);
        });

        return content;
    },
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    encodeHTMLEntities(text) {
        return text.replace(/[\u00A0-\u9999<>\&]/gim, i => {
            return "&#" + i.charCodeAt(0) + ";";
        });
    }
}