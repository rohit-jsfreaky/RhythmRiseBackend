import ytSearch from "yt-search";
import ytdl from "@distube/ytdl-core";
import dotenv from "dotenv";
import { spawn } from "child_process";
import path from "path";

dotenv.config(); // Load .env variables

const cookiesPath = path.resolve("cookies.txt");

export const getAudioWithYtDlp = (videoUrl) => {
  return new Promise((resolve, reject) => {
    // Build the yt-dlp arguments
    const args = [
      videoUrl,
      "--cookies",
      cookiesPath,
      "-f",
      "bestaudio",
      "-g", // Get direct audio URL
    ];

    const ytdlp = spawn("yt-dlp", args);

    let output = "";
    let error = "";

    ytdlp.stdout.on("data", (data) => {
      output += data.toString();
    });

    ytdlp.stderr.on("data", (data) => {
      error += data.toString();
    });

    ytdlp.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`yt-dlp exited with code ${code}: ${error}`));
      }
    });
  });
};

export const getAudioStreamUrl = async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).json({ error: "Invalid or missing URL" });
  }

  try {
    // Use yt-dlp to get the audio URL
    const audioUrl = await getAudioWithYtDlp(videoUrl);

    if (!audioUrl) {
      return res.status(404).json({ error: "Audio not found" });
    }

    // Return the audio URL
    res.status(200).json({ url: audioUrl });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Failed to fetch audio URL",
      details: error.message,
    });
  }
};

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
    return res.status(400).json({ error: "Missing videoId" });
  }

  try {
    const video = await youtube.getVideo(videoId);

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    const related = video.related.items
      .filter((item) => item.type === "video")
      .slice(0, 10)
      .map((item) => ({
        title: item.title,
        url: item.url,
        thumbnail: item.thumbnail?.url || null,
        duration: item.duration,
        uploader: item.channel?.name || null,
      }));

    return res.json({ related });
  } catch (error) {
    console.error("Error fetching related videos:", error);
    return res.status(500).json({ error: "Failed to fetch related videos" });
  }
};
