import express from "express";
import {
  getAudioDetails,
  getAudioStreamUrl,
  getRelatedSongs,
  searchSongs,
} from "../controllers/music.js";
import { Downloader } from "ytdl-mp3";
export const musicRouter = express.Router();

musicRouter.get("/get-audio", getAudioStreamUrl);
musicRouter.get("/get-audio-details", getAudioDetails);

musicRouter.get("/search-songs", searchSongs);

musicRouter.get("/related-songs", getRelatedSongs);

musicRouter.get("/demo", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: "Missing URL" });

  try {
    const info = await getAudioUrl(videoUrl);
    if (!info || !info.audioUrl) {
      return res.status(404).json({ error: "Audio URL not found" });
    }
    return res.json({
      title: info.title,
      audioUrl: info.audioUrl,
    });
  } catch (err) {
    console.error("Extraction failed:", err);
    return res.status(500).json({ error: "Failed to get audio URL" });
  }
});
