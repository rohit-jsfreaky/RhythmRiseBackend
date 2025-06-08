import ytSearch from "yt-search";
import youtubesearchapi from "youtube-search-api";

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
