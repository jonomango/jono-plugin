# Jono's Plugin
A plugin for [BetterDiscord](https://betterdiscord.net/home/). Uses no external libraries so just copy `Jono's Plugin.plugin.js` to your `BetterDiscord/plugins` folder.

## Features
### Custom Notifications
  Shows custom notifications (toasts) when certain events are triggered. Notifications are only shown when Discord is focused-- if minimized (or in another window), notifications will queue up and be sent when focus is regained. Servers or channels can be muted by right clicking them and selecting `Mute (Jono's Plugin)`.  
  
  Notifications are sent for the following (if enabled in plugin settings):
  * A friend's status changes (online/offline)
  * Someone mentions you
  * Someone sends a message in a server or channel you're in
  
  ![Example](https://imgur.com/9ItTomv.gif)

### Popout Videos
  Adds the option to pop out videos into a new window when clicking on their link. This new window is draggable, resizeable, and will persist even when switching channels/servers. Very similar to a Discord RichEmbed video player except it's in a new window.  

  Supported videos:
  * YouTube
  * Twitch (clips + live channels with chat support)

### Commands
  By default, commands have the prefix `~`. This can be changed in the plugin settings. Optional arguments are prefixed by a `?`. Calling commands is simple, just type the prefix followed by the command name followed by the command arguments (if any).  
  
  _Example:_  
  `~command_name arg1 arg2 "arg 3 (between parentheses)" arg\"4`
  
#### _help_
  Provides information on every command or a specified command.  
  Usage: `~help [?command]`
#### _eval_
  Evaluates javascript code.  
  Usage: `~eval [code]`  
  
  ![Example](https://imgur.com/KauM55x.gif)
#### _repeat_
  Repeats text a certain amount of times.  
  Usage: `~repeat [amount] [text]`
#### _clear_
  Clears the chat by spamming a bunch of whitespace (client-side only).  
  Usage: `~clear`
#### _imdb_
  Returns the results of searching up a movie (or series) on IMDB. Must provide an [API key](https://www.omdbapi.com) in settings to work.  
  Usage: `~imdb [title]`  
  
  ![Example](https://imgur.com/jzXNODb.gif)
#### _ip_
  Returns information about the provided ip. Must provide an [API key](https://ipdata.co) in settings to work.  
  Usage: `~ip [ip]`  
  
  ![Example](https://imgur.com/U6imBA7.gif)
#### _mc_
  Returns information about the provided minecraft user. Does not require an API key.  
  Usage: `~mc [username]`
#### _steam_
  Returns information about the provided steam user. Accepts a steam id or custom url. Does not require an API key.  
  Usage: `~steam [id]`  
  
  ![Example](https://imgur.com/1XR4Rjn.gif)
#### _echo_
  Echoes whatever text you provide back to you. Not very useful.  
  Usage: `~echo [text]`
#### _seibmoz_
  Prefixes and appends text to any messages you send. `text` defaults to `:ok_hand::skin-tone-5:`.  
  Usage: `~seibmoz [?text]`
#### _draw_
  Lets you draw ascii art and send it in the current channel. `width` defaults to `60` and `height` defaults to `30`.  
  Usage: `~draw [caption] [?width] [?height]`  
  
  ![Example](https://imgur.com/qSjw1lG.gif)
#### _pickle_
  Watch the Pickle Rick episode.  
  Usage: `~pickle`  
#### _alias_
  Add an alias for text, which also works with commands. Author is the id of the alias creator, leaving this empty with default it to the current user. Each value in `values...` will be sent in sequential order. For example, if you type `~alias my_alias "" "Hello world!" "From my_alias!"` then enter `~my_alias` you will send the message `Hello world!` followed by `From my_alias!`.  
  Usage: `~alias [name] [author] [values...]`  
#### _rm_alias_
  Removes an alias.  
  Usage: `~rm_alias [name]`  
#### _ex_alias_
  Exports an alias in chat for easy copy-pasting.  
  Usage: `~ex_alias [name]`  