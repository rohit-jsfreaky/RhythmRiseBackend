import ytSearch from "yt-search";
import ytdl from "@distube/ytdl-core";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

// Middleware to bypass YouTube restrictions
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "*/*",
  Referer: "https://www.youtube.com/",
};

export const getAudioStreamUrl = async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).json({ error: "Invalid or missing URL" });
  }

  try {
    if (!ytdl.validateURL(videoUrl)) throw new Error("Invalid YouTube URL");
    const info = await ytdl.getInfo(videoUrl, {
      requestOptions: { headers: HEADERS },
      lang: "en",
    });

    // Extract audio formats and filter valid URLs
    const audioFormats = ytdl
      .filterFormats(info.formats, "audioonly")
      .filter(
        (format) =>
          format.url &&
          !format.url.includes("ratebypass") &&
          format.mimeType.includes("audio")
      );

    if (!audioFormats.length) throw new Error("No audio streams found");

    // Select highest quality audio
    const bestAudio = audioFormats.reduce((best, current) =>
      current.audioBitrate > best.audioBitrate ? current : best
    );

    res.json({
      title: info.videoDetails.title,
      audioUrl: bestAudio.url,
      duration: info.videoDetails.lengthSeconds,
      thumbnail: info.videoDetails.thumbnails[0]?.url,
    });
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
