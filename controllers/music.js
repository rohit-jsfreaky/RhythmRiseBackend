import ytSearch from "yt-search";
import play from "play-dl";

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
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await play.video_info(url);

    const relatedUrls = info.related_videos.slice(0, 10);

    const relatedDetails = await Promise.all(
      relatedUrls.map(async (relatedUrl) => {
        try {
          const relatedInfo = await play.video_info(relatedUrl);
          const v = relatedInfo.video_details;

          return {
            title: v.title,
            url: v.url,
            thumbnail: v.thumbnails?.[0]?.url || null,
            duration: v.durationRaw,
            uploader: v.channel?.name,
          };
        } catch (err) {
          return null; // skip broken entries
        }
      })
    );

    return res.status(200).json({
      related: relatedDetails.filter((item) => item !== null),
    });
  } catch (error) {
    console.error("Error fetching related videos:", error);
    return res.status(500).json({ error: "Failed to fetch related videos" });
  }
};
