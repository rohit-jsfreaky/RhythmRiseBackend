import ytSearch from "yt-search";
import youtubesearchapi from "youtube-search-api";
import { ytmp3 } from "hydra_scraper";
import axios from "axios";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import stream from "stream";

const pipeline = promisify(stream.pipeline);
const cacheDir = path.resolve("./tmp/audio-cache");

if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

export const getAudioDetails = async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "Missing URL" });
  }

  try {
    const searchResult = await ytSearch(videoUrl);
    const videoId = new URL(videoUrl).searchParams.get("v");

    // Find exact match from results
    const video = searchResult.videos.find((v) => v.videoId === videoId);

    if (!video) {
      return res.status(404).json({ error: "Audio not found" });
    }

    return res.status(200).json({
      title: video.title,
      thumbnail: video.thumbnail,
      duration: video.timestamp,
      uploader: video.author.name,
      url: video.url,
    });
  } catch (error) {
    console.log("Error in getAudioDetails:", error);
    return res.status(500).json({ error: "Failed to get audio details" });
  }
};

export const searchSongs = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Missing search query" });
  }

  try {
    const r = await ytSearch(query);

    const data = r.videos.slice(0, 10).map((video) => ({
      title: video.title,
      thumbnail: video.thumbnail,
      uploader: video.author.name,
      duration: video.timestamp,
      url: video.url,
    }));
    return res.status(200).json(data);
  } catch (error) {
    console.log("Error in searchSongs:", error);
    return res.status(500).json({ error: "Failed to search songs" });
  }
};

export const getRelatedSongs = async (req, res) => {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId or URL" });
  }

  try {
    const data = await youtubesearchapi.GetVideoDetails(videoId);

    // console.log("Related songs data:", data.suggestion);

    if (!data.suggestion || data.suggestion.length === 0) {
      return res.status(404).json({ error: "No related songs found" });
    }

    const relatedSongs = data.suggestion.slice(0, 10).map((song) => ({
      url: `https://www.youtube.com/watch?v=${song.id}`,
      thumbnail: song.thumbnail[0].url,
      title: song.title,
      duration: song.length.simpleText,
    }));

    console.log("Related songs:", relatedSongs);

    return res.status(200).json({
      relatedSongs: relatedSongs,
    });
  } catch (error) {
    console.log("Error in getRelatedSongs:", error);
    return res.status(500).json({ error: "Failed to get related songs" });
  }
};

export const getAudioStream = async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: "Missing URL" });

  try {
    const { download, metadata } = await ytmp3(videoUrl);
    const videoId = metadata.videoId;
    const filePath = path.join(cacheDir, `${videoId}.mp3`);

    // Download if not cached
    if (!fs.existsSync(filePath)) {
      const response = await axios.get(download.url, {
        responseType: "stream",
      });
      await pipeline(response.data, fs.createWriteStream(filePath));

      // Auto delete after 30 mins
      setTimeout(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, 30 * 60 * 1000); // 30 mins
    }

    // Handle Range requests
    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    if (!range) {
      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-Length": stat.size,
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;

      const chunkSize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "audio/mpeg",
      });

      file.pipe(res);
    }
  } catch (err) {
    console.error("Stream error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
