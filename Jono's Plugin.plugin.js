//META{"name":"JonoPlugin", "source":"https://github.com/jonomango/jono-plugin/blob/master/Jono's%20Plugin.plugin.js"}*//

// https://github.com/rauenzi/BetterDiscordApp/wiki/Creating-Plugins
class JonoPlugin {
    getName() {
        return "Jono's Plugin";
    }
    getDescription() {
        return "general purpose plugin";
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
                duration: 6000,
                muted_guilds: [],
                muted_channels: []
            },
            api_keys: {
                omdbapi: "",
                ipdata: ""
            }
        });

        this.setupCommands();
        this.onSwitch();
    }
    stop() {
        JonoUtils.saveSettings();

        // remove keydown listener
        const textarea = JonoUtils.getTextArea();
        if (textarea) {
            textarea.removeEventListener("keydown", this.keydownEventListener);
        }

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

        let msg_location = "";
        if (channel.type == 1) {
            msg_location = "Direct Message";
        } else {
            // #channelname, guildname
            msg_location = "#";
            if (!channel.name) {
                msg_location += channel.recipients.reduce((total, user) => {
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
                msg_location += channel.name;
            }
        }

        // guild icon
        if (message.guild_id) {
            const guild = JonoUtils.getGuild(message.guild_id);
            msg_location += ` <img class="emoji" src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp" width="20" height="20" style="border-radius: 10px; margin-right:5px" />`;
            msg_location += guild.name;
        }

        // **username** #channelname, guildname
        let title = `<span style="position: relative; bottom: 4px">`;
        title += `<b>${JonoUtils.encodeHTMLEntities(message.author.username)}</b> <span style="color:lightgrey;">${msg_location}</span>`;
        title += `</span>`;

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

        const channel = props.channel, guild = props.guild;
        if (!channel && !guild) {
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
    onSwitch() {
        // attach keydown listener
        const textarea = JonoUtils.getTextArea();
        if (textarea) {
            textarea.addEventListener("keydown", this.keydownEventListener = this.onKeyDown.bind(this));
        }
    }
    onKeyDown(e) {
        const cancelInput = () => {
            // dont send the original text into the channel
            const el = document.querySelector('.chat-3bRxxu form');
            if (el) {
                BdApi.getInternalInstance(el).return.stateNode.setState({ textValue: "" });
            }
        };

        if (e.key != "Enter" || e.shiftKey || e.ctrlKey || e.altKey) {
            return;
        }

        const textarea = JonoUtils.getTextArea();
        if (!textarea) {
            return;
        }

        let input = textarea.value;
        if (input.length <= 0) {
            return;
        }

        // if not command, call the on_input() callback
        if (!input.startsWith(JonoUtils.settings.command_prefix)) {
            for (const key in this.commands) {
                if (!this.commands[key].callbacks.on_input) {
                    continue;
                }

                if (this.commands[key].callbacks.on_input(input)) {
                    cancelInput();
                }
            }

            return;
        }

        // dont send the message into chat if its a command
        cancelInput();

        input = input.slice(JonoUtils.settings.command_prefix.length).split(" ");
        const command_name = input[0];
        input = input.slice(1).join(" ");

        // if command doesn't exist
        if (!(command_name in this.commands)) {
            JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "Command not found");
            return
        }

        const cmd = this.commands[command_name];
        if (!cmd.callbacks.on_command) {
            return;
        }

        this.onCommand(cmd, input);
    }
    onCommand(command, input) {
        const parseArgs = (cmd, str) => {
            if (!str) {
                return {};
            }

            let args = [];
            let cached_str = "";
            let is_in_quotes = false;
            for (let i = 0, len = str.length; i < len; ++i) {
                // escaped "
                if (i + 1 < len && str[i] == "\\" && str[i + 1] == "\"") {
                    i += 1;
                    cached_str += "\"";
                    continue;
                }

                // shizzle between "" counts as one arg
                if (str[i] == "\"") {
                    is_in_quotes = !is_in_quotes;
                    continue;
                }

                if (!is_in_quotes && str[i] == " ") { // clear the string and add it to the args array
                    if (cached_str) {
                        args.push(cached_str);
                        cached_str = "";
                    }
                } else { // add the char to the cached string
                    cached_str += str[i];
                }
            }

            // any remaining shizzle
            if (cached_str) {
                args.push(cached_str);
            }

            let obj = {};

            const cmd_args = cmd.required_args.concat(cmd.optional_args);
            const num_args = Math.min(cmd_args.length, args.length);
            for (let i = 0; i < num_args; ++i) {
                obj[cmd_args[i]] = args[i];
            }

            return obj;
        };

        const args = parseArgs(command, input);

        // check args
        let missing_args = [];
        for (let i = 0, len = command.required_args.length; i < len; ++i) {
            const arg = command.required_args[i];
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

    addCommand(name, description, required_args, optional_args, callbacks = {}) {
        return this.commands[name] = new class {
            constructor() {
                this.name = name;
                this.description = description;
                this.required_args = required_args;
                this.optional_args = optional_args;
                this.callbacks = callbacks;
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
                    let description = "*" + command.description + "*\n";
                
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
                    embed.title = `Commands (${Object.keys(this.commands).length}):`;

                    for (const i in this.commands) {
                        const command = this.commands[i];
                        addCommandField(command);
                    }
                }

                JonoUtils.sendBotEmbed(JonoUtils.getCurrentChannelID(), embed);
        });

        // purge
        this.addCommand("purge", "Mass deletes your last messages", ["amount"], [])
            .onCommand(async args => {
                const userid = JonoUtils.getUser().id;
                const amount = parseInt(args.amount);

                let num_purged = 0;
                let messages = await JonoUtils.getMessages({ userid, amount });

                for (let i = 0; i < messages.length; ++i) {
                    ++num_purged;
                    JonoUtils.deleteMessage(messages[i].channel_id, messages[i].id);
                    await JonoUtils.sleep(400);
                }

                JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `Purged ${num_purged} messages`);
        });

        // eval
        this.addCommand("eval", "Evaluates javascript codenz", ["code"], [])
            .onCommand(args => {
                JonoUtils.sendMessage(JonoUtils.getCurrentChannelID(), String(eval(args.code)));
        });

        // repeat
        this.addCommand("repeat", "Repeats text", ["amount", "text"], [])
            .onCommand(args => {
                JonoUtils.sendMessage(JonoUtils.getCurrentChannelID(), args.text.repeat(args.amount));
        });

        // clear
        this.addCommand("clear", "Clears chat", [], [])
            .onCommand(args => {
                JonoUtils.sendMessage(JonoUtils.getCurrentChannelID(), "`." + "\n".repeat(1990) + "cleared`");
        });

        // imdb
        this.addCommand("imdb", "Search up a movie/show on imdb", ["title"], [])
            .onCommand(async args => {
                if (!JonoUtils.settings.api_keys.omdbapi) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), `\`omdbapi.com\` API key not provided\n`);
                    return;
                }

                JonoUtils.sendMessage(JonoUtils.getCurrentChannelID(), `Searching IMDB for \`${args.title}\``);

                const data = await JonoUtils.request_promise({
                    method: "GET",
                    uri: "http://www.omdbapi.com",
                    qs: {
                        apikey: JonoUtils.settings.api_keys.omdbapi,
                        s: args.title,
                        r: "json"
                    },
                    json: true
                });

                if (!data.Search && data.Error) {
                    JonoUtils.sendMessage(JonoUtils.getCurrentChannelID(), data.Error);
                    return;
                }

                let content = "";
                data.Search.forEach(movie => {
                    content += "**[+]** ";
                    content += "***" + movie.Title + "*** _[" + movie.Type + ", " + movie.Year + "]_";
                    content += "\n";
                    content += "<https://www.imdb.com/title/" + movie.imdbID + ">";
                    content += "\n";
                });

                JonoUtils.sendMessage(JonoUtils.getCurrentChannelID(), content);
        });

        // ipdata
        this.addCommand("ipdata", "Shows information about a specific ip", ["ip"], [])
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
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "Error requesting data");
                    return;
                }

                if (response.message) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), response.message);
                    return;
                }
                
                const embed = {
                    color: 0x00FF00,
                    type: "rich",
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
        this.addCommand("draw", "Create ascii art to send in the current channel", [], ["width", "height"])
            .onCommand(args => {
                const width = parseInt(args.width) || 60,
                    height = parseInt(args.height) || 30;

                // dimensions too big
                if (width * height > 1900) {
                    JonoUtils.sendBotMessage(JonoUtils.getCurrentChannelID(), "width * height > 1900");
                    return;
                }

                const app_element = JonoUtils.getAppElement();
                let clicked_array = [...Array(width)].map(() => [...Array(height)].map(() => false));

                const drawing_container = document.createElement("div");
                drawing_container.className = "jono-drawing-container";

                drawing_container.style["background-color"] = "rgb(40, 40, 40)";
                drawing_container.style["position"] = "fixed";
                drawing_container.style["z-index"] = "999999";
                drawing_container.style["left"] = "200px";
                drawing_container.style["bottom"] = "200px";
                drawing_container.style["border-radius"] = "8px";

                /* table */
                const table = document.createElement("table");
                table.style["border-collapse"] = "collapse";
                table.style["background-color"] = "rgb(60, 60, 60)";
                table.style["margin"] = "10px";

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

                drawing_container.appendChild(table);
                /* table */

                /* submit button */
                const submit_button = document.createElement("div");

                submit_button.innerText = "Submit";
                submit_button.style["margin"] = "10px";
                submit_button.style["padding"] = "2px";
                submit_button.style["color"] = "lightgrey";
                submit_button.style["text-align"] = "center";
                submit_button.style["border"] = "1px solid black";
                submit_button.style["background-color"] = "rgb(60, 60, 60)";

                submit_button.onclick = () => {
                    drawing_container.remove();

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
                                content += "frog\n" + line + "\n";
                            }
                        }
                    }

                    // send the message (if they drew something)
                    if (content) {
                        JonoUtils.sendMessage(channelid, `\`\`\`${content}\`\`\``);
                    }
                };

                drawing_container.appendChild(submit_button);
                /* submit button */

                app_element.appendChild(drawing_container);
        });

        this.addCommand("test", "Testing purposes", ["arg1", "arg2"], ["optional1"])
            .onCommand(args => {
                console.log(args);
        });
    }
}

// wrapper around some BdApi functions (heavily inspired by Zere's Library)
const JonoUtils = {
    setup: plugin => {
        // constants
        JonoUtils.MAX_TOASTS = 5;
        JonoUtils.MAX_TOASTS_QUEUE = 10;

        JonoUtils.main_plugin = plugin;

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

        // discord selectors
        JonoUtils.ContextMenuSelector = BdApi.findModuleByProps("contextMenu");
        JonoUtils.CheckboxSelector = BdApi.findModuleByProps("checkboxInner");
        JonoUtils.MarkupSelector = BdApi.findModuleByProps("markup");
        JonoUtils.MessagesSelector = BdApi.findModuleByProps("username", "divider");
        JonoUtils.AppSelector = BdApi.findModuleByProps("app");

        // request wrapper that uses promises
        JonoUtils.request = require("request");
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

        // send any queued toasts, if they exist
        JonoUtils.heartbeat_interval = setInterval(() => {
            JonoUtils._flushToasts();
        }, 500);

        // dispatch custom callback
        JonoUtils._hookDispatch(data => {
            if (JonoUtils.main_plugin.onDispatch) {
                JonoUtils.main_plugin.onDispatch(data);
            }
        });

        // context menu custom callback
        JonoUtils._hookContextMenu(() => {
            if (JonoUtils.main_plugin.onContextMenu) {
                JonoUtils.main_plugin.onContextMenu();
            }
        });
    },
    release: () => {
        JonoUtils._removeDispatchHooks();
        JonoUtils._removeContextHooks();

        document.querySelectorAll(".jono-drawing-container").forEach(x => x.remove());

        clearInterval(JonoUtils.heartbeat_interval);
    },

    // dispatch callbacks
    _hookDispatch: func => {
        const unpatchFunc = BdApi.monkeyPatch(BdApi.findModuleByProps("dispatch"), 'dispatch', { after: func });
        JonoUtils.unpatchFuncs = JonoUtils.unpatchFuncs || [];
        JonoUtils.unpatchFuncs.push(unpatchFunc)
    },
    _removeDispatchHooks: () => {
        if (!JonoUtils.unpatchFuncs) {
            return;
        }

        JonoUtils.unpatchFuncs.forEach(func => func());
        JonoUtils.unpatchFuncs = []
    },

    // context menu callbacks
    _hookContextMenu: func => {
        document.addEventListener("contextmenu", func);
        JonoUtils.contextListeners = JonoUtils.contextListeners || [];
        JonoUtils.contextListeners.push(func);
    },
    _removeContextHooks: () => {
        if (!JonoUtils.contextListeners) {
            return;
        }

        JonoUtils.contextListeners.forEach(func => document.removeEventListener("contextmenu", func));
        JonoUtils.contextListeners = [];
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

    sendMessage: (channelid, content) => {
        if (!content) {
            return;
        }

        JonoUtils.MessageActions._sendMessage(channelid, { 
            content,
            tts: false
        });
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

        // if not focused or too many toasts
        if (!document.hasFocus() || JonoUtils.numToasts() >= JonoUtils.MAX_TOASTS) {
            JonoUtils.queued_toasts = JonoUtils.queued_toasts || [];
            if (JonoUtils.queued_toasts.length < JonoUtils.MAX_TOASTS_QUEUE) {
                JonoUtils.queued_toasts.push({ title, content, options });
            }

            return;
        } 

        JonoUtils._showToast(title, content, options);
    },
    _showToast: (title, content, options) => {
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
        toast_elem.style = "font-weight:lighter; max-width: 800px; pointer-events: auto;";

        let image_html = "";

        // if they have an icon
        if (icon_url) {
            image_html = `<img src="${icon_url}" width="20" height="20" style="border-radius: 10px; margin-right:5px" />`;
        }

        toast_elem.innerHTML += `${image_html}${title}<br>${content}`;

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