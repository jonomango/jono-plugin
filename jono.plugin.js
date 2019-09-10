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
    }
    stop() {
        console.log("Jono's plugin stopping!");
    }
}

// wrapper around some BdApi functions
const JonoUtils = {
    setup: () => {
        JonoUtils.MessageActions = BdApi.findModuleByProps("jumpToMessage", "_sendMessage");
        JonoUtils.UserInfoStore = BdApi.findModuleByProps("getToken");
        JonoUtils.UserStore = BdApi.findModuleByProps("getCurrentUser");
    },

    getToken: () => {
        return JonoUtils.UserInfoStore.getToken();
    },
    getUser: (userid) => {
        if (userid) {
            return JonoUtils.UserStore.getUser(userid);
        }

        return JonoUtils.UserStore.getCurrentUser();
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
    sendEmbed: (channelid) => {
        // TODO: implemment
    }
}