//META{"name":"JonoPlugin"}*//

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
        let frog = `<div class="settings-open">test<hr>test</div>`;
        return frog;
    }

    start() {
        JonoUtils.setup();
        JonoUtils.hookDispatch(this.onDispatch.bind(this));

        this.setupCommands();
        this.onSwitch();
    }
    stop() {
        JonoUtils.removeDispatchHooks();

        // remove keydown listener
        const textarea = JonoUtils.getTextArea();
        if (textarea) {
            textarea.removeEventListener("keydown", this.keydownEventListener);
        }
    }

    onDispatch(data) {
        // only messages
        if (data.methodArguments[0].type != "MESSAGE_CREATE") {
            return;
        }

        const message = data.methodArguments[0].message;
        // ignore us
        if (message.author.id == JonoUtils.getUser().id) {
            return;
        }

        const channel = JonoUtils.getChannel(message.channel_id);
        if (!channel) {
            return;
        }

        // we're in this channel
        if (channel.id == JonoUtils.getChannel().id) {
            return;
        }

        // max toasts == 6
        if (JonoUtils.getNumToasts() >= 6) {
            return;
        }

        // #channelname, guildname
        let msg_location = "";
        if (channel.type == 1) {
            msg_location = `<i style="color:red;">Direct Message</i>`;
        } else {
            msg_location = "#" + channel.name;
        }

        if (message.guild_id) {
            const guild = JonoUtils.getGuild(message.guild_id);
            msg_location += ` <img class="emoji" src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp" width="20" height="20" style="border-radius: 10px; margin-right:5px" />`;
            msg_location += guild.name;
        }

        // **username** #channelname, guildname
        let title = `<span style="height: 20px; position: relative; bottom: 4px">`;
        title += `<b>${message.author.username}</b> ${msg_location}`;
        title += `</span>`;

        JonoUtils.showToast(title, JonoUtils.messageToHTML(message), {
            icon_url: JonoUtils.getAvatarURL(message.author),
            timeout: 6000
        });
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
        if (input[0] != '~') {
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

        input = input.slice(1).split(" ");
        const command_name = input[0];
        input = input.slice(1).join(" ");

        // if command doesn't exist
        if (!(command_name in this.commands)) {
            JonoUtils.sendBotMessage(JonoUtils.getChannel().id, "Command not found");
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
            // this finds the next : in a line, excluding \: and removing the \ before the :
            const getNextIndex = () => {
                while (true) {
                    if (str.indexOf("\\:", index + 1) + 1 == (index = str.indexOf(":", index + 1))) {
                        str = str.slice(0, index - 1) + str.slice(index);
                        index -= 1;
                    } else {
                        break;
                    }
                }
            };

            let obj = {};

            // no arguments
            if (str.length <= 0) {
                return obj;
            }

            let prev_index = 0;
            let index = 0;
            getNextIndex();

            // if no : in the line, treat the line as only values which are seperated by a space
            if (index == -1) {
                str = str.split(" ");
                const args = cmd.required_args.concat(cmd.optional_args);
                const len = Math.min(str.length, args.length);

                for (let i = 0; i < len; ++i) {
                    obj[args[i]] = str[i];
                }

                return obj;
            }

            // add each key:value pair into obj
            while (index != -1) {
                let arg_name = str.slice(prev_index, index).split(" ");
                arg_name = arg_name[arg_name.length - 1];

                prev_index = index;
                getNextIndex();

                if (index == -1) {
                    obj[arg_name] = str.slice(prev_index + 1).trim();
                } else {
                    obj[arg_name] = str.slice(prev_index + 1, index).split(" ").slice(0, -1).join(" ").trim();
                }
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
            JonoUtils.sendBotMessage(JonoUtils.getChannel().id, `Missing arguments: \`${missing_args.join("\`, \`")}\``);
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

                JonoUtils.sendBotEmbed(JonoUtils.getChannel().id, embed);
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

                JonoUtils.sendBotMessage(JonoUtils.getChannel().id, `Purged ${num_purged} messages`);
        });

        // embed
        this.addCommand("embed", "Sends an embedded message in the current channel", [], ["title", "description", "color", "image"])
            .onCommand(args => {
                let embed = {};

                if (args.title) {
                    embed.title = args.title;
                }
                if (args.description) {
                    embed.description = args.description;
                }
                if (args.color) {
                    embed.color = parseInt(args.color, 16);
                }
                if (args.image) {
                    embed.image = {};
                    embed.image.url = args.image;
                }

                JonoUtils.sendEmbed(JonoUtils.getChannel().id, embed);
        });

        // eval
        this.addCommand("eval", "Evaluates javascript codenz", ["code"], [])
            .onCommand(args => {
                JonoUtils.sendMessage(JonoUtils.getChannel().id, String(eval(args.code)));
        });

        // repeat
        this.addCommand("repeat", "Repeats text", ["amount", "text"], [])
            .onCommand(args => {
                JonoUtils.sendMessage(JonoUtils.getChannel().id, args.text.repeat(args.amount));
        });

        // clear
        this.addCommand("clear", "Clears chat", [], [])
            .onCommand(args => {
                JonoUtils.sendMessage(JonoUtils.getChannel().id, "`." + "\n".repeat(1990) + "cleared`");
        });

        // imdb
        this.addCommand("imdb", "Search up a movie/show on imdb", ["title"], [])
            .onCommand(async args => {
                JonoUtils.loadSettings(this.getName());
                if (!JonoUtils.settings.omdbapi_api_key) {
                    JonoUtils.sendBotMessage(JonoUtils.getChannel().id, `\`omdbapi.com\` API key not provided\nAdd \`omdbapi_api_key\` to \`${this.getName()}.config.json\``);
                    return;
                }

                JonoUtils.sendMessage(JonoUtils.getChannel().id, `Searching IMDB for \`${args.title}\``);

                const data = await JonoUtils.request_promise({
                    method: "GET",
                    uri: "http://www.omdbapi.com",
                    qs: {
                        apikey: JonoUtils.settings.omdbapi_api_key,
                        s: args.title,
                        r: "json"
                    },
                    json: true
                });

                if (!data.Search && data.Error) {
                    JonoUtils.sendMessage(JonoUtils.getChannel().id, data.Error);
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

                JonoUtils.sendMessage(JonoUtils.getChannel().id, content);
        });

        // echo
        this.addCommand("echo", "Echos stuff", ["text"], [])
            .onCommand(args => {
                JonoUtils.sendBotMessage(JonoUtils.getChannel().id, args.text);
        });

        this.addCommand("test", "Testing purposes", [], [])
            .onCommand(args => {
                console.log(JonoUtils.getNumToasts());
        });
    }
}

// wrapper around some BdApi functions (heavily inspired by Zere's Library)
const JonoUtils = {
    setup: () => {
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
    },

    hookDispatch: func => {
        const unpatchFunc = BdApi.monkeyPatch(BdApi.findModuleByProps("dispatch"), 'dispatch', { after: func });
        JonoUtils.unpatchFuncs = JonoUtils.unpatchFuncs || [];
        JonoUtils.unpatchFuncs.push(unpatchFunc)
    },
    removeDispatchHooks: () => {
        if (!JonoUtils.unpatchFuncs) {
            return;
        }

        JonoUtils.unpatchFuncs.forEach(func => func());
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
    getNumToasts: () => {
        const container = document.querySelector(".bd-toasts");
        return container ? container.children.length : 0;
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

    saveSettings: name => {
        if (!JonoUtils.settings) {
            JonoUtils.settings = {};
        }

        BdApi.saveData(name, "settings", JonoUtils.settings);
    },
    loadSettings: (name, default_settings = {}) => {
        JonoUtils.settings = BdApi.loadData(name, "settings") || default_settings;
        for (const key in default_settings) {
            if (!(key in JonoUtils.settings)) {
                JonoUtils.settings[key] = default_settings[key];
            }
        }
    },

    showToast: (title, content, options = {}) => {
        if (!bdConfig.deferLoaded)
            return;

        const { icon_url = null, timeout = 3000 } = options;

        // if the container for toasts doesn't exist, create it
        if (!document.querySelector(".bd-toasts")) {
            let toastsContainer = document.createElement("div");
            toastsContainer.classList.add("bd-toasts");     

            let chatForm = document.querySelector(".chat-3bRxxu form, #friends, .noChannel-Z1DQK7, .activityFeed-28jde9");
            toastsContainer.style.setProperty("left", chatForm ? chatForm.getBoundingClientRect().left + "px" : "0px");
            toastsContainer.style.setProperty("width", chatForm ? chatForm.offsetWidth + "px" : "100%");
            toastsContainer.style.setProperty("bottom", (document.querySelector(".chat-3bRxxu form") ? document.querySelector(".chat-3bRxxu form").offsetHeight : 80) + "px");
            document.querySelector(".app, .app-2rEoOp").appendChild(toastsContainer);
        }

        // make the toast
        let toast_elem = document.createElement("div");
        toast_elem.classList.add("bd-toast");
        toast_elem.classList.add("markup-2BOw-j");
        toast_elem.classList.add("da-markup");
        toast_elem.style = "font-weight:lighter; max-width: 800px";

        let image_html = "";
        // if they have an icon
        if (icon_url) {
            image_html = `<img src="${icon_url}" width="20" height="20" style="border-radius: 10px; margin-right:5px" />`;
        }

        toast_elem.innerHTML += `${image_html}${title}<br>${content}`;

        // add the toast
        document.querySelector(".bd-toasts").appendChild(toast_elem);

        // remove the toast after timeout has elapsed
        setTimeout(() => {
            toast_elem.classList.add("closing");

            // wait 300ms for the closing animation (i think) before actually removing the toast
            setTimeout(() => {
                toast_elem.remove();

                // didn't really understand why they remove the container but turns out its for when the window resizes
                if (document.querySelectorAll(".bd-toasts .bd-toast").length <= 0) {
                    document.querySelector(".bd-toasts").remove();
                }
            }, 300);
        }, timeout);
    },
    messageToHTML: message => {
        let content = message.content;

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

        // mentions
        message.mentions.forEach(mention => {
            const seperator = `<span class="mention wrapperHover-1GktnT wrapper-3WhCwL da-wrapperHover da-wrapper">@${mention.username}#${mention.discriminator}</span>`;
            content = content.split(`&lt;@${mention.id}&gt;`).join(seperator);
            content = content.split(`&lt;@!${mention.id}&gt;`).join(seperator);
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
    }
}