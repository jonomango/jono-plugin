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

        // attach keydown listener
        const textarea = JonoUtils.getTextArea();
        if (textarea) {
            textarea.addEventListener("keydown", this.onKeyDown);
        }
    }
    stop() {
        console.log("Jono's plugin stopping!");

        // remove keydown listener
        const textarea = JonoUtils.getTextArea();
        if (textarea) {
            textarea.removeEventListener("keydown", this.onKeyDown);
        }
    }

    onSwitch() {
        // attach keydown listener
        const textarea = JonoUtils.getTextArea();
        if (textarea) {
            textarea.addEventListener("keydown", this.onKeyDown);
        }
    }
    onKeyDown(e) {
        if (e.key != "Enter" || e.shiftKey || e.ctrlKey || e.altKey) {
            return;
        }

        const textarea = JonoUtils.getTextArea();
        if (!textarea) {
            return;
        }

        const input = textarea.value;
        console.log(input);
    }
}

// wrapper around some BdApi functions
const JonoUtils = {
    setup: () => {
        JonoUtils.MessageActions = BdApi.findModuleByProps("jumpToMessage", "_sendMessage");
        JonoUtils.UserInfoStore = BdApi.findModuleByProps("getToken");
        JonoUtils.UserStore = BdApi.findModuleByProps("getCurrentUser");
        JonoUtils.TextArea = BdApi.findModuleByProps("channelTextArea", "textArea");
    },

    getToken: () => {
        return JonoUtils.UserInfoStore.getToken();
    },
    getUser: userid => {
        if (userid) {
            return JonoUtils.UserStore.getUser(userid);
        }

        return JonoUtils.UserStore.getCurrentUser();
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
    sendEmbed: channelid => {
        // TODO: implemment
    }
}