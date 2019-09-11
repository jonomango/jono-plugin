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

        if (e.key != "Enter" || e.shiftKey || e.ctrlKey || e.altKey) {
            return;
        }

        const textarea = JonoUtils.getTextArea();
        if (!textarea) {
            return;
        }

        const input = textarea.value;
        if (input.length <= 0) {
            return;
        }

        const args = input.slice(1).split(" ");

        // if not command
        if (input[0] != '~') {
            for (const key in this.commands) {
                if (!this.commands[key].on_input) {
                    continue;
                }

                if (!this.commands[key].on_input(input)) {
                    continue;
                }  

                cancelInput();
            }
            return;
        }

        if (args[0] in this.commands) {
            const cmd = this.commands[args[0]];
            if (cmd.on_command) {
                cmd.on_command(args.slice(1));
            }
        }

        cancelInput();
    }

    setupCommands() {
        this.commands = {
            purge: new (() => {
                this.description = "mass deletes messages";
                this.required_args = ["amount"];
                this.on_command = async args => {
                    const userid = JonoUtils.getUser().id;
                    const amount = parseInt(args[0]);
    
                    let num_purged = 0;
                    let messages = await JonoUtils.getMessages({ userid, amount });
    
                    for (let i = 0; i < messages.length; ++i) {
                        ++num_purged;
                        JonoUtils.deleteMessage(messages[i].channel_id, messages[i].id);
                        await JonoUtils.sleep(400);
                    }
    
                    console.log(`purged ${num_purged} messages.`);
                };
            }),
            seibmoz: new (() => {
                this.description = "toggles seibmoz mode";
                this.required_args = [];
                this.on_command = args => {
                    this.seibmoz_toggle = !this.seibmoz_toggle;
                    if (this.seibmoz_toggle) {
                        JonoUtils.sendMessage(JonoUtils.getChannel().id, "seibmoz mode activated");
                    } else {
                        JonoUtils.sendMessage(JonoUtils.getChannel().id, "seibmoz mode deactivated");
                    }
                };
                this.on_input = input => {
                    if (!this.seibmoz_toggle) {
                        return false;
                    }

                    JonoUtils.sendMessage(JonoUtils.getChannel().id, `:ok_hand::skin-tone-5: ${input} :ok_hand::skin-tone-5:`);
                    return true;
                };
                this.seibmoz_toggle = false;
            })
        };
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
    sendEmbed: async embed => {
        return JonoUtils.request_promise({
            method: "POST",
            uri: "https://discordapp.com/api/channels/" + channelid + "/messages",
            headers: {
                authorization: JonoUtils.getToken()
            },
            json: { embed }
        });
    },

    deleteMessage: (channelid, messageid) => {
        JonoUtils.MessageActions.deleteMessage(channelid, messageid);
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}