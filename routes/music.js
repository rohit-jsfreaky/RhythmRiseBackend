import express from "express";
import {
  getAudioDetails,
  getAudioStreamUrl,
  getRelatedSongs,
  searchSongs,
} from "../controllers/music.js";
export const musicRouter = express.Router();

import play from "play-dl";
import ytdl from "ytdl-core-discord";

musicRouter.get("/get-audio", getAudioStreamUrl);
musicRouter.get("/get-audio-details", getAudioDetails);
musicRouter.get("/search-songs", searchSongs);

musicRouter.get("/related-songs", getRelatedSongs);

musicRouter.get("/demo", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).json({ error: "Invalid or missing YouTube URL" });
  }

  try {
    const info = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(info.formats, { quality: "highestaudio" });

    return res.status(200).json({
      title: info.videoDetails.title,
      uploader: info.videoDetails.author.name,
      duration: info.videoDetails.lengthSeconds,
      audioUrl: format.url,
      thumbnail: info.videoDetails.thumbnails?.pop()?.url,
    });
  } catch (err) {
    console.error("Error extracting audio:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});