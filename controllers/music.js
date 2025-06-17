import ytSearch from "yt-search";
import youtubesearchapi from "youtube-search-api";
import { ytmp3 } from "hydra_scraper";
import axios from "axios";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import stream from "stream";
import { makeOptimizedRequest } from "../utils/makeOptimizedRequest.js";
import { getSongDetails } from "../utils/getSongsDetails.js";
import { getSongSpecificSuggestions } from "../utils/getSongSpecificSuggestions.js";

const pipeline = promisify(stream.pipeline);
const cacheDir = path.join("/tmp", "audio-cache");

if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

export const BACKUP_APIS = [
  "https://jiosaavn-api-2-harsh-patel.vercel.app",
  "https://saavn.dev/api",
  "https://jiosaavn-api-privatecvc.vercel.app",
  "https://jiosaavn-api-pink.vercel.app",
];

// Cache for song-specific suggestions to prevent repetition
export const suggestionCache = new Map();
export const songCache = new Map(); // Cache for song details
export const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const getSongStreamData = async (songId) => {
  try {
    const response = await axios.get(`https://saavn.dev/api/songs/${songId}`, {
      timeout: 5000,
    });

    if (response.data && response.data.data && response.data.data[0]) {
      const songData = response.data.data[0];
      return {
        downloadUrl: {
          "12kbps": songData.downloadUrl[0]?.url || "",
          "48kbps": songData.downloadUrl[1]?.url || "",
          "96kbps": songData.downloadUrl[2]?.url || "",
          "160kbps": songData.downloadUrl[3]?.url || "",
          "320kbps": songData.downloadUrl[4]?.url || "",
        },
      };
    }
    return null;
  } catch (error) {
    console.warn(`Failed to get stream URL for song ${songId}:`, error.message);
    return null;
  }
};

const jioSavanStreamSongSongUrl = async (songs) => {
  const streamDataPromises = songs.map((song) =>
    getSongStreamData(song.id).then((streamData) => ({
      songId: song.id,
      streamData,
    }))
  );

  const streamDataResults = await Promise.allSettled(streamDataPromises);

  // Merge stream URLs with trending songs data
  const songsWithStreamUrls = songs.map((song) => {
    const streamResult = streamDataResults.find(
      (result) =>
        result.status === "fulfilled" && result.value.songId === song.id
    );

    const streamData = streamResult?.value?.streamData;

    return {
      ...song,
      downloadUrl: streamData?.downloadUrl || {
        "12kbps": "",
        "48kbps": "",
        "96kbps": "",
        "160kbps": "",
        "320kbps": "",
      },
    };
  });

  return songsWithStreamUrls;
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

  console.log("Received videoId:", videoId);

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId or URL" });
  }

  try {
    const data = await youtubesearchapi.GetVideoDetails(videoId);

    if (!data.suggestion || data.suggestion.length === 0) {
      return res.status(404).json({ error: "No related songs found" });
    }

    const relatedSongs = data.suggestion.slice(0, 10).map((song) => ({
      url: `https://www.youtube.com/watch?v=${song.id}`,
      title: song.title || "",
      duration:
        song.length?.simpleText ||
        song.length?.accessibility?.accessibilityData?.label ||
        "",
      author: song.channelTitle || song.shortBylineText || "",
      thumbnail: song.thumbnail?.[1]?.url || song.thumbnail?.[0]?.url || "",
    }));

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

export const searchSongsJioSavan = async (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    console.log(`🔍 Searching for: ${q}`);

    let searchResults = null;

    for (const apiBase of BACKUP_APIS.slice(0, 2)) {
      try {
        const response = await axios.get(`${apiBase}/search/songs`, {
          params: { query: q, page: 1, limit },
          timeout: 4000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (response.data && response.data.data && response.data.data.results) {
          searchResults = response.data.data.results;
          console.log(`✅ Search results from backup API: ${apiBase}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!searchResults) {
      try {
        const response = await makeOptimizedRequest(
          (baseUrl) =>
            `${baseUrl}?__call=search.getResults&api_version=4&_format=json&_marker=0&query=${encodeURIComponent(
              q
            )}&p=1&n=${limit}`,
          { timeout: 3000 }
        );

        if (
          response.data &&
          response.data.results &&
          response.data.results.song
        ) {
          const songs =
            response.data.results.song.data || response.data.results.song;
          if (Array.isArray(songs)) {
            searchResults = songs;
          }
        }
      } catch (error) {
        console.log(`Search failed: ${error.message}`);
      }
    }

    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({
        error: "No songs found",
        message: `No results found for "${q}". Try different keywords.`,
      });
    }

    const formattedSongs = searchResults.map((song) => ({
      id: song.id,
      title: song.name,
      thumbnail:
        song.image?.find((img) => img.quality === "150x150")?.url || "", // fallback to empty if not found
      duration: song.duration,
      author: song.label,
      downloadUrls:
        song.downloadUrl?.map((dl) => ({
          quality: dl.quality,
          url: dl.url,
        })) || [],
    }));

    res.json({
      results: formattedSongs.length,
      data: formattedSongs,
    });
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({
      error: "Failed to search songs",
      message: err.message,
    });
  }
};

export const getRelatedSongsJioSavan = async (req, res) => {
  const requestStart = Date.now();

  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    if (!id) {
      return res.status(400).json({ error: "Song ID is required" });
    }

    console.log(`🎵 Getting enhanced suggestions for song ID: ${id}`);

    // Step 1: Get target song details with better error handling
    let targetSong = null;
    try {
      targetSong = await Promise.race([
        getSongDetails(id),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Song details timeout")), 10000)
        ),
      ]);
    } catch (error) {
      console.log(`⚠️ Failed to get song details: ${error.message}`);
      // Continue with minimal song info for suggestions
      targetSong = {
        id: id,
        title: "Unknown",
        subtitle: "Unknown",
        language: "hindi",
      };
    }

    const normalizedTargetSong = {
      id: targetSong.id || id,
      title:
        targetSong.song ||
        targetSong.name ||
        targetSong.title ||
        "Unknown Title",
      subtitle:
        targetSong.primary_artists ||
        targetSong.primaryArtists ||
        targetSong.subtitle ||
        "Unknown Artist",
      image:
        targetSong.image ||
        targetSong.media_preview_url ||
        "https://via.placeholder.com/500x500.png?text=No+Image",
      duration: targetSong.duration || "0",
      url: targetSong.perma_url || targetSong.permaUrl || targetSong.url || "",
      primaryArtists:
        targetSong.primary_artists ||
        targetSong.primaryArtists ||
        "Unknown Artist",
      featuredArtists:
        targetSong.featured_artists || targetSong.featuredArtists || "",
      album: targetSong.album || targetSong.album_name || "Unknown Album",
      year: targetSong.year || targetSong.release_date || "2023",
      playCount: targetSong.play_count || targetSong.playCount || "0",
      language: targetSong.language || "hindi",
      hasLyrics:
        targetSong.has_lyrics === "true" || targetSong.hasLyrics || false,
    };

    console.log(`🎯 Target song normalized:`, {
      id: normalizedTargetSong.id,
      title: normalizedTargetSong.title,
      artist: normalizedTargetSong.primaryArtists,
    });

    let candidateSongs = [];
    candidateSongs = await Promise.race([
      getSongSpecificSuggestions(id, normalizedTargetSong, 80),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Suggestion timeout")), 20000)
      ),
    ]);

    if (candidateSongs.length === 0) {
      // Fallback: Try direct search for similar songs
      try {
        console.log("🔄 Attempting fallback search...");
        const fallbackQuery =
          normalizedTargetSong.primaryArtists !== "Unknown Artist"
            ? normalizedTargetSong.primaryArtists
            : normalizedTargetSong.title;

        const fallbackResponse = await axios.get(
          `https://saavn.dev/api/search/songs`,
          {
            params: { query: fallbackQuery, page: 1, limit: 20 },
            timeout: 8000,
          }
        );

        if (
          fallbackResponse.data &&
          fallbackResponse.data.data &&
          fallbackResponse.data.data.results
        ) {
          candidateSongs = fallbackResponse.data.data.results
            .filter((song) => song.id !== id) // Exclude original song
            .map((song) => ({
              primary_pid: song.id,
              song: song.name,
              thumb: song.image?.[0]?.url || "",
              playtime: song.duration || "0",
              label: song.label || song.primaryArtists || "",
            }));
          console.log(
            `✅ Fallback search found ${candidateSongs.length} songs`
          );
        }
      } catch (fallbackError) {
        console.log(`❌ Fallback search also failed: ${fallbackError.message}`);
        candidateSongs = [];
      }
    }

    if (candidateSongs.length === 0) {
      return res.status(404).json({
        message: "No related songs found",
        songId: id,
        suggestion: "Try searching for songs by this artist manually",
        debug: {
          targetSong: normalizedTargetSong.title,
          artist: normalizedTargetSong.primaryArtists,
        },
      });
    }

    // Transform the candidate songs with better error handling
    const suggestedSongs = candidateSongs
      .filter(
        (song) =>
          song &&
          (song.primary_pid || song.id) &&
          (song.primary_pid || song.id) !== id
      )
      .map((song) => ({
        id: song.primary_pid || song.id,
        title: song.song || song.name || song.title || "Unknown Title",
        thumbnail: song.thumb || song.image || "",
        duration: Number(song.playtime || song.duration || 0),
        author:
          song.label || song.primaryArtists || song.artist || "Unknown Artist",
      }))
      .slice(0, limit);

    console.log(`🎵 Formatted suggested songs count: ${suggestedSongs.length}`);

    if (suggestedSongs.length === 0) {
      return res.status(404).json({
        message: "No valid related songs found after processing",
        rawCandidatesCount: candidateSongs.length,
        songId: id,
      });
    }

    // Get stream URLs for all suggested songs
    const songsWithStreamUrls = await jioSavanStreamSongSongUrl(suggestedSongs);

    const totalTime = Date.now() - requestStart;
    console.log(
      `✅ Successfully returned ${songsWithStreamUrls.length} related songs in ${totalTime}ms`
    );

    res.json(songsWithStreamUrls);
  } catch (error) {
    const totalTime = Date.now() - requestStart;
    console.error("❌ Suggestions error:", error.message);
    res.status(500).json({
      error: "Failed to generate suggestions",
      message: error.message,
      performance: {
        totalTime: `${totalTime}ms`,
        success: false,
      },
      suggestion:
        "The music recommendation service is temporarily experiencing issues. Please try again in a few moments.",
    });
  }
};

export const getTrendingJioSavanSongs = async (req, res) => {
  const requestStart = Date.now();

  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 50); // Max 50 songs

    console.log(`🔥 Getting actual trending songs (limit: ${limit})`);

    let trendingSongs = [];

    const officialTrendingEndpoints = [
      // Get trending charts
      (baseUrl) =>
        `${baseUrl}?__call=content.getCharts&api_version=4&_format=json&_marker=0&cc=in&includeMetaTags=0`,
      // Get launch data (home page with trending)
      (baseUrl) =>
        `${baseUrl}?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&cc=in&includeMetaTags=0`,
    ];

    const firstApiResponse = await makeOptimizedRequest(
      officialTrendingEndpoints[0],
      {
        timeout: 8000,
      }
    );

    console.log(`📊 First API response status: ${firstApiResponse}`);

    const firstApiData = firstApiResponse.data;

    const playListId = firstApiData[0].id;

    if (playListId) {
      const playlistResponse = await makeOptimizedRequest(
        (baseUrl) =>
          `${baseUrl}?__call=playlist.getDetails&api_version=4&_format=json&_marker=0&listid=${playListId}`,
        { timeout: 8000 }
      );
      const playListData = playlistResponse.data.list;

      if (playListData && playListData.length > 0) {
        const playListSongs = playListData.map((song) => ({
          id: song.id,
          title: song.title,
          author: song.more_info?.label || "",
          duration: parseInt(song.more_info?.duration) || 0,
          thumbnail: song.image || "",
        }));

        if (playListSongs.length > 0) {
          trendingSongs = [...playListSongs];
        }
      }
    }

    const secondApiResponse = await makeOptimizedRequest(
      officialTrendingEndpoints[1],
      {
        timeout: 8000,
      }
    );

    console.log(`📊 Second API response status: ${secondApiResponse}`);
    if (secondApiResponse.data && secondApiResponse.data.new_trending) {
      const secondApiDataSongs = secondApiResponse.data.new_trending.filter(
        (song) => song.type === "song"
      );

      if (secondApiDataSongs.length > 0) {
        const secondApiSongs = secondApiDataSongs.map((song) => ({
          id: song.id,
          title: song.title,
          author: song.more_info?.label || "",
          duration: parseInt(song.more_info?.duration) || 0,
          thumbnail: song.image || "",
        }));

        if (secondApiSongs.length > 0) {
          trendingSongs = [...trendingSongs, ...secondApiSongs];
        }
      }
    }

    console.log("trandingSongs", trendingSongs.length);

    // Remove duplicates based on song ID
    const uniqueSongs = trendingSongs.filter(
      (song, index, self) => index === self.findIndex((s) => s.id === song.id)
    );

    // Limit the results
    const limitedSongs = uniqueSongs.slice(0, limit);

    console.log(
      `🎵 Fetching stream URLs for ${limitedSongs.length} trending songs in parallel...`
    );

    const songsWithStreamUrls = await jioSavanStreamSongSongUrl(limitedSongs);

    return res.json({
      success: true,
      data: songsWithStreamUrls,
    });
  } catch (error) {
    const totalTime = Date.now() - requestStart;
    console.log("❌ Trending songs error:", error.message);
    res.status(500).json({
      error: "Failed to fetch trending songs",
      message: error.message,
      performance: {
        totalTime: `${totalTime}ms`,
        success: false,
      },
    });
  }
};

export const getSongsDetailsJioSavan = async (req, res) => {
  const { id } = req.params;

  try {
    if (!id) {
      return res.status(400).json({ message: "Song ID is required" });
    }

    const response = await axios.get(`https://saavn.dev/api/songs/${id}`);

    if (!response.data && !response.data.data) {
      return res.status(404).json({ message: "Song not found" });
    }

    const songsData = response.data.data[0];

    const song = {
      id: songsData.id,
      title: songsData.name,
      author: songsData.label,
      duration: songsData.duration,
      thumbnail:
        songsData.image && songsData.image.length > 0
          ? songsData.image[songsData.image.length - 1].url
          : "",
      downloadUrl: {
        "12kbps": songsData.downloadUrl[0].url,
        "48kbps": songsData.downloadUrl[1].url,
        "96kbps": songsData.downloadUrl[2].url,
        "160kbps": songsData.downloadUrl[3].url,
        "320kbps": songsData.downloadUrl[4].url,
      },
    };

    return res.status(200).json({
      data: song,
    });
  } catch (error) {
    console.error("Error in getSongsDetailsJioSavan:", error);
    return res.status(500).json({ message: "Failed to get song details" });
  }
};
