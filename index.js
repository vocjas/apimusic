const express = require("express");
const { Player } = require("discord-music-player-custom");
const { Client, GatewayIntentBits } = require("discord.js");
const colors = require("colors");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    641,
  ],
});

const app = express();
const port = process.env.PORT || 27028;
const token = 'votre token';

client.login(token);

const player = new Player(client, {
  deafenOnJoin: true,
  quality: "high",
});

client.player = player;

app.use(express.json());

// Middleware for error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: 500, error: "Internal Server Error" });
});

// Function to log requests
function logRequest(req, endpointInfo) {
  const { guildId, music, channelId, userId } = req.query;
  console.log(`
${colors.cyan("════════════════════════════════════════")}
🚀 ${colors.green(userId)} used ${colors.yellow(endpointInfo)}:

${colors.blue("Some info about the request:")}
${colors.magenta("Guild ID:")} ${guildId}
${colors.magenta("Song:")} ${music}
${colors.magenta("Channel ID:")} ${channelId}

${colors.cyan("════════════════════════════════════════")}
  `);
}

// Function to log errors
function logError(req, endpointInfo, error) {
  const userID = req.query.userId;
  console.error(`
${colors.red("════════════════════════════════════════")}

😱 ${colors.yellow(userID)} encountered an error in ${colors.yellow(
    endpointInfo,
  )}:
${colors.red("Error Message:")} ${error.message}
${colors.red("Stack Trace:")} ${error.stack}

${colors.red("════════════════════════════════════════")}
  `);
}

// Home
app.get("/", async (req, res) => {
  res.status(300).send("Welcome to API");
});

// Play a song
app.post("/play", async (req, res) => {
  const { guildId, music, channelId, userId } = req.query;
  logRequest(req, "/play");
  try {
    const queue = client.player.createQueue(guildId);
    const voiceChannel = client.channels.cache.get(channelId);
    if (!voiceChannel || voiceChannel.type !== 2) {
      res.status(400).json({ code: 400, error: "Invalid voice channel." });
      return;
    }

    if (!guildId || !music || !channelId || !userId) {
      logError(req, "/play", new Error("Missing query."));
      res.status(400).json({ code: 400, error: "Missing query." });
      return;
    }

    let g = client.guilds.cache.get(guildId);

    if (!g) {
      res.status(400).json({ code: 400, error: "Invalid guild ID." });
      return;
    }

    await queue.join(voiceChannel);

    const song = await queue.play(music);

    if (song) {
      res.status(200).json({
        code: 200,
        data: {
          song_name: song.name,
          song_author: song.author,
          song_url: song.url,
          song_thumbnail: song.thumbnail,
          song_duration: song.duration,
          song_position: queue.songs.indexOf(song) + 1,
          message: `Playing song: ${song.name}`,
        },
      });
    }
  } catch (error) {
    logError(req, "/play", error);
    res.status(500).json({ code: 500, error: "Error while playing the song." });
  }
});

// Play a playlist
app.post("/playlist", async (req, res) => {
  const { guildId, playlist, channelId, userId } = req.query;
  logError(req, "/playlist", error);
  try {
    const queue = client.player.createQueue(guildId);
    const voiceChannel = client.channels.cache.get(channelId);

    if (!voiceChannel || voiceChannel.type !== 2) {
      logError(req, "/play", "Invalid voice channel.");
      res.status(400).json({ code: 400, error: "Invalid voice channel." });
      return;
    }

    if (!guildId || !playlist || !channelId || !userId) {
      logError(req, "/playlist", "Missing query.");
      res.status(400).json({ code: 400, error: "Missing query." });
      return;
    }

    let g = client.guilds.cache.get(guildId);

    if (!g) {
      res.status(400).json({ code: 400, error: "Invalid guild ID." });
      return;
    }

    await queue.join(voiceChannel);

    const songs = await queue.playlist(playlist).catch((error) => {
      logError(req, "/playlist", `Error playing playlist: ${error.message}.`);

      res
        .status(500)
        .json({ code: 500, error: "Unable to play the playlist." });
    });

    if (songs) {
      console.log("Playing playlist.");
      res
        .status(200)
        .json({ code: 200, data: { message: "Playing playlist." } });
    }
  } catch (error) {
    logError(req, "/playlist", error);
    res
      .status(500)
      .json({ code: 500, error: "Error while playing the playlist." });
  }
});

// Pause playback
app.post("/pause", (req, res) => {
  const { guildId, userId } = req.query;

  if (!guildId || !userId) {
    logError(req, "/pause", "Missing query.");
    res.status(400).json({ code: 400, error: "Missing query." });
    return;
  }

  let g = client.guilds.cache.get(guildId);

  if (!g) {
    res.status(400).json({ code: 400, error: "Invalid guild ID." });
    return;
  }

  try {
    const queue = client.player.getQueue(guildId);
    queue.setPaused(true);
    res.status(200).json({ code: 200, data: { message: "Playback paused." } });
  } catch (error) {
    logError(req, "/pause", error);
    res.status(500).json({ code: 500, error: "Error while pausing playback." });
  }
});

// Resume playback
app.post("/resume", (req, res) => {
  const { guildId, userId } = req.query;

  if (!guildId || !userId) {
    logError(req, "/resume", "Missing query.");
    res.status(400).json({ code: 400, error: "Missing query." });
    return;
  }

  let g = client.guilds.cache.get(guildId);

  if (!g) {
    res.status(400).json({ code: 400, error: "Invalid guild ID." });
    return;
  }

  try {
    const queue = client.player.getQueue(guildId);
    queue.setPaused(false);
    res.status(200).json({ code: 200, data: { message: "Playback resumed." } });
  } catch (error) {
    logError(req, "/resume", error);
    res
      .status(500)
      .json({ code: 500, error: "Error while resuming playback." });
  }
});

// Get a progress bar
app.get("/progressbar", (req, res) => {
  const { guildId, userId } = req.query;

  if (!guildId || !userId) {
    logError(req, "/progressbar", "Missing query.");
    res.status(400).json({ code: 400, error: "Missing query." });
    return;
  }

  let g = client.guilds.cache.get(guildId);

  if (!g) {
    res.status(400).json({ code: 400, error: "Invalid guild ID." });
    return;
  }

  try {
    const queue = client.player.getQueue(guildId);
    const progressBar = queue.createProgressBar();
    res.json({ code: 200 , data: { message: progressBar.prettier } });
  } catch (error) {
    logError(req, "/progressbar", error);
    res
      .status(500)
      .json({ code: 500, error: "Error while getting the progress bar." });
  }
});

// Skip to the next song
app.post("/skip", (req, res) => {
  const { guildId, userId } = req.query;

  if (!guildId || !userId) {
    logError(req, "/skip", "Missing query.");
    res.status(400).json({ code: 400, error: "Missing query." });
    return;
  }

  let g = client.guilds.cache.get(guildId);

  if (!g) {
    res.status(400).json({ code: 400, error: "Invalid guild ID." });
    return;
  }

  try {
    const queue = client.player.getQueue(guildId);
    queue.skip();
    res
      .status(200)
      .json({ code: 200, data: { message: "Skipped to the next song, Refresh the embed to see the curent song." } });
  } catch (error) {
    logError(req, "/skip", error);
    res
      .status(500)
      .json({ code: 500, error: "Error while skipping to the next song." });
  }
});

// Stop playback
app.post("/stop", (req, res) => {
  const { guildId, userId } = req.query;

  if (!guildId || !userId) {
    logError(req, "/stop", "Missing query.");
    res.status(400).json({ code: 400, error: "Missing query." });
    return;
  }

  let g = client.guilds.cache.get(guildId);

  if (!g) {
    res.status(400).json({ code: 400, error: "Invalid guild ID." });
    return;
  }

  try {
    const queue = client.player.getQueue(guildId);
    queue.stop();
    res
      .status(200)
      .json({ code: 200,data: { message: "Playback stopped." } } );
  } catch (error) {
    logError(req, "/stop", error);
    res
      .status(500)
      .json({ code: 500, error: "Error while stopping playback." });
  }
});

// Set volume
app.post("/setvolume", (req, res) => {
  const { guildId, volume, userId } = req.query;

  if (!guildId || !userId || !volume) {
    logError(req, "/setvolume", "Missing query.");
    res.status(400).json({ code: 400, error: "Missing query." });
    return;
  }

  let g = client.guilds.cache.get(guildId);

  if (!g) {
    res.status(400).json({ code: 400, error: "Invalid guild ID." });
    return;
  }

  try {
    const queue = client.player.getQueue(guildId);
    queue.setVolume(parseInt(volume));
    res
      .status(200)
      .json({ code: 200, data: { message: `Volume set to ${volume}.` } });
  } catch (error) {
    logError(req, "/setvolume", error);
    res
      .status(500)
      .json({ code: 500, error: "Error while setting the volume." });
  }
});

// Get the current queue

app.get("/getqueue", (req, res) => {
  const { guildId, userId, page } = req.query;

  if (!guildId || !userId) {
    logError(req, "/getqueue", "Missing query.");
    res.status(400).json({ code: 400, error: "Missing query." });
    return;
  }

  let g = client.guilds.cache.get(guildId);

  if (!g) {
    res.status(400).json({ code: 400, error: "Invalid guild ID." });
    return;
  }

  try {
    const queue = client.player.getQueue(guildId);
    const totalSongs = queue.songs.length;
    const totalPages = Math.ceil(totalSongs / 5);
    
    const startIndex = (page - 1) * 5;
    const endIndex = Math.min(startIndex + 5, totalSongs);
    
    let songsOnPage;
    if (startIndex === endIndex - 1) {
     songsOnPage = '1';
    } else {
     songsOnPage = `${startIndex + 1}-${endIndex}`;
    }

    const queueInfo = {
      songs: {},
      currentPage: parseInt(page),
      totalPages: totalPages,
      totalSongs: totalSongs,
      songsOnPage: songsOnPage,
    };

    const songsForPage = queue.songs.slice(startIndex, endIndex);
    songsForPage.forEach((song, index) => {
      const songKey = `song_${startIndex + index + 1}`;
      queueInfo.songs[songKey] = {
        name: song.name,
        author: song.author,
        url: song.url,
        thumbnail: song.thumbnail,
        duration: song.duration,
        position: startIndex + index + 1,
      };
    });

    res.status(200).json({ code: 200, data: { queue: queueInfo } });
  } catch (error) {
    logError(req, "/getqueue", error);
    res
      .status(500)
      .json({ code: 500, error: "Error while getting the current queue." });
  }
});

// Get current volume
app.get("/getvolume", (req, res) => {
  const { guildId, userId } = req.query;

  if (!guildId || !userId) {
    logError(req, "/getvolume", "Missing query.");
    res.status(400).json({ code: 400, error: "Missing query." });
    return;
  }

  let g = client.guilds.cache.get(guildId);

  if (!g) {
    res.status(400).json({ code: 400, error: "Invalid guild ID." });
    return;
  }

  try {
    const queue = client.player.getQueue(guildId);
    res.status(200).json({ code: 200, data: { volume: queue.volume } });
  } catch (error) {
    logError(req, "/getvolume", error);
    res
      .status(500)
      .json({ code: 500, error: "Error while getting the current volume." });
  }
});

// Get currently playing song
// Get currently playing song
app.get("/nowplaying", (req, res) => {
  const { guildId, userId } = req.query;

  if (!guildId || !userId) {
    logError(req, "/nowplaying", "Missing query.");
    res.status(400).json({ code: 400, error: "Missing query." });
    return;
  }

  let g = client.guilds.cache.get(guildId);

  if (!g) {
    res.status(400).json({ code: 400, error: "Invalid guild ID." });
    return;
  }

  try {
    const queue = client.player.getQueue(guildId);
    const nowPlaying = queue.nowPlaying;

    const nowPlayingInfo = {
      name: nowPlaying.name,
      author: nowPlaying.author,
      url: nowPlaying.url,
      thumbnail: nowPlaying.thumbnail,
      position: queue.songs.indexOf(nowPlaying) + 1,
      duration: nowPlaying.duration || 'n',
    };

    res.status(200).json({ code: 200, data: { nowPlaying: nowPlayingInfo } });
  } catch (error) {
    logError(req, "/nowplaying", error);
    res.status(500).json({
      code: 500,
      error: "Error while getting the currently playing song.",
    });
  }
});

// Remove a song from the queue
app.post("/remove", (req, res) => {
  const { guildId, songIndex, userId } = req.query;

  if (!guildId || !userId || !songIndex) {
    logError(req, "/remove", "Missing query.");
    res.status(400).json({ code: 400, error: "Missing query." });
    return;
  }

  let g = client.guilds.cache.get(guildId);

  if (!g) {
    res.status(400).json({ code: 400, error: "Invalid guild ID." });
    return;
  }

  try {
    const queue = client.player.getQueue(guildId);

    const indexToRemove = parseInt(songIndex);

    if (indexToRemove < 0 || indexToRemove >= queue.songs.length) {
      res.status(400).json({ code: 400, error: "Invalid song index." });
      return;
    }
      
    const removedSongTitle = queue.songs[indexToRemove].name;

    queue.remove(indexToRemove);

    res.status(200).json({ code: 200, data: { message: `Song "${removedSongTitle}" removed from the queue.` } });
  } catch (error) {
    logError(req, "/remove", error);
    res.status(500).json({
      code: 500,
      error: "Error while removing the song from the queue.",
    });
  }
});

// Get user voice channel

app.get("/user/voice/channel", async (req, res) => {
  const { guildId, userId } = req.query;

  if (!guildId || !userId) {
    logError(req, "/user/voice/channel", "Missing query.");
    res.status(400).json({ code: 400, error: "Missing query." });
    return;
  }

  let g = client.guilds.cache.get(guildId);

  if (!g) {
    res.status(400).json({ code: 400, error: "Invalid guild ID." });
    return;
  }
  let u = g.members.cache.get(userId);
  if (!u) {
    res.status(400).json({ code: 400, error: "Invalid user ID." });
    return;
  }

  res.status(200).json({
    code: 200,
    data: {
      message: "Succefully fetched the user voice channel.",
      channel: u.voice.channel ? u.voice.channel.id : "none",
    },
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
