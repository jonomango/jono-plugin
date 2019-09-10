//META{"name":"JonoPlugin"}*//

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
        return "Jono"; 
    }

    load() { }
    start() {
        console.log("Jono's plugin starting!");
    }
    stop() {
        console.log("Jono's plugin stopping!");
    }
}
