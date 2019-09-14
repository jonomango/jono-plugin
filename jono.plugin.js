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

    start() {
        console.log("Jono's plugin starting!");

        JonoUtils.setup();
        this.setupCommands();

        // attach keydown listener
        const textarea = JonoUtils.getTextArea();
        if (textarea) {
            textarea.addEventListener("keydown", this.keydownEventListener = this.onKeyDown.bind(this));
        }
    }
    stop() {
        console.log("Jono's plugin stopping!");

        // remove keydown listener
        const textarea = JonoUtils.getTextArea();
        if (textarea) {
            textarea.removeEventListener("keydown", this.keydownEventListener);
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
        const parseArgs = (cmd, str) => {
            const getNextIndex = () => {
                while (true) {
                    if (str.indexOf("\\:", index + 2) + 1 == (index = str.indexOf(":", index + 1))) {
                        str = str.slice(0, index - 1) + str.slice(index);
                    } else {
                        break;
                    }
                }
            };

            let obj = {};
            if (str.length <= 0) {
                return obj;
            }

            let prev_index = 0;
            let index = 0;
            getNextIndex();

            // no : in da ting
            if (index == -1) {
                str = str.split(" ");
                const args = cmd.required_args.concat(cmd.optional_args);
                const len = Math.min(str.length, args.length);
                
                for (let i = 0; i < len; ++i) {
                    obj[args[i]] = str[i];
                }

                return obj;
            }

            while (index != -1) {
                let arg_name = str.slice(prev_index, index).split(" ");
                arg_name = arg_name[arg_name.length - 1];

                prev_index = index;
                getNextIndex();

                if (index == -1) {
                    obj[arg_name] = str.slice(prev_index + 1);
                } else {
                    obj[arg_name] = str.slice(prev_index + 1, index).split(" ").slice(0, -1).join(" ");
                }
            }

            return obj;
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
        
        const args = parseArgs(cmd, input);
        
        // check args
        let missing_args = [];
        for (let i = 0, len = cmd.required_args.length; i < len; ++i) {
            const arg = cmd.required_args[i];
            if (!(arg in args)) {
                missing_args.push(arg);
            }
        }

        if (missing_args.length > 0) {
            JonoUtils.sendBotMessage(JonoUtils.getChannel().id, `Missing arguments: ${missing_args.join(", ")}`);
            return;
        }

        cmd.callbacks.on_command(args);
    }

    addCommand(name, description, required_args, optional_args, callbacks = {}) {
        return this.commands[name] = new function() {
            this.name = name;
            this.description = description;
            this.required_args = required_args;
            this.optional_args = optional_args;
            this.callbacks = callbacks;

            // allows chaining
            this.onCommand = on_command => {
                this.callbacks.on_command = on_command;
                return this;
            };
            this.onInput = on_input => {
                this.callbacks.on_input = on_input;
                return this;
            };
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
        this.addCommand("purge", "Mass deletes your last messages", [], ["amount"])
            .onCommand(async args => {
                const userid = JonoUtils.getUser().id;
                let amount = parseInt(args.amount || "50");

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

        this.addCommand("test", "Testing purposes", [], [])
            .onCommand(args => {
                console.log(args);
        });
    }
}

// wrapper around some BdApi functions
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

    getUser: userid => {
        if (userid) {
            return JonoUtils.UserStore.getUser(userid);
        }

        return JonoUtils.UserStore.getCurrentUser();
    },
    getChannel: channelid => {
        if (channelid) {
            return JonoUtils.ChannelStore.getChannel(channelid);
        }

        return JonoUtils.ChannelStore.getChannel(JonoUtils.SelectedChannelStore.getChannelId());
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

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}