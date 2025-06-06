import express from "express";
import {
  getAudioDetails,
  getAudioStreamUrl,
  getRelatedSongs,
  searchSongs,
} from "../controllers/music.js";
export const musicRouter = express.Router();
import { YtdlCore } from "@ybd-project/ytdl-core";

musicRouter.get("/get-audio", getAudioStreamUrl);
musicRouter.get("/get-audio-details", getAudioDetails);
musicRouter.get("/search-songs", searchSongs);

musicRouter.get("/related-songs", getRelatedSongs);

const ytdl = new YtdlCore({
  // The options specified here will be the default values when functions such as getFullInfo are executed.
});

musicRouter.get("/demo", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "Invalid or missing YouTube URL" });
  }

  try {
    const info = await ytdl.getFullInfo(videoUrl);

    // Filter for audio-only format with highest quality
    const audioFormat = info.formats.find(
      (format) =>
        format.mimeType?.includes("audio") &&
        format.hasAudio &&
        !format.hasVideo
    );

    if (!audioFormat) {
      return res.status(404).json({ error: "No audio format found" });
    }

    return res.status(200).json({
      title: info.videoDetails.title,
      audioUrl: audioFormat.url,
    });
  } catch (err) {
    console.error("Error extracting audio:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
