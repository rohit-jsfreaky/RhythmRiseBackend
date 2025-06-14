import { BACKUP_APIS, CACHE_DURATION, songCache } from "../controllers/music.js";
import { makeOptimizedRequest } from "./makeOptimizedRequest.js";

export async function getSongDetails(songId) {
  // Check cache first
  if (songCache.has(songId)) {
    const cached = songCache.get(songId);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`🚀 Using cached song details for ${songId}`);
      return cached.data;
    } else {
      songCache.delete(songId);
    }
  }

  console.log(`🔍 Fetching song details for: ${songId}`);

  // Try backup APIs first (usually faster)
  for (const apiBase of BACKUP_APIS) {
    try {
      const response = await axios.get(`${apiBase}/songs/${songId}`, {
        timeout: 2000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (response.data && response.data.data) {
        const songData = Array.isArray(response.data.data)
          ? response.data.data[0]
          : response.data.data;
        if (songData && songData.id) {
          console.log(`✅ Got song details from backup API: ${apiBase}`);

          // Cache the result
          songCache.set(songId, {
            data: songData,
            timestamp: Date.now(),
          });

          return songData;
        }
      }
    } catch (error) {
      console.log(`❌ Backup API ${apiBase} failed: ${error.message}`);
      continue;
    }
  }

  // Fallback to JioSaavn direct APIs
  const songEndpoints = [
    (baseUrl) =>
      `${baseUrl}?__call=song.getDetails&cc=in&_marker=0&_format=json&pids=${songId}`,
    (baseUrl) =>
      `${baseUrl}?__call=webapi.get&token=${songId}&type=song&_format=json&_marker=0`,
    (baseUrl) =>
      `${baseUrl}?__call=song.getDetails&api_version=4&_format=json&_marker=0&pids=${songId}&includeMetaTags=1&ctx=web6dot0`,
  ];

  for (const endpointTemplate of songEndpoints) {
    try {
      const response = await makeOptimizedRequest(endpointTemplate, {
        timeout: 4000,
      });

      if (response.data) {
        let songData = null;

        // Handle different response formats
        if (response.data[songId]) {
          songData = response.data[songId];
        } else if (response.data.songs && response.data.songs[0]) {
          songData = response.data.songs[0];
        } else if (Array.isArray(response.data) && response.data[0]) {
          songData = response.data[0];
        } else if (response.data.data && response.data.data[0]) {
          songData = response.data.data[0];
        }

        if (songData && (songData.id || songData.song || songData.title)) {
          console.log(`✅ Got song details from JioSaavn`);

          // Normalize the song data
          const normalizedSong = {
            id: songData.id || songId,
            song: songData.song || songData.name || songData.title,
            title: songData.song || songData.name || songData.title,
            primary_artists:
              songData.primary_artists ||
              songData.primaryArtists ||
              songData.subtitle,
            primaryArtists:
              songData.primary_artists ||
              songData.primaryArtists ||
              songData.subtitle,
            featured_artists:
              songData.featured_artists || songData.featuredArtists || "",
            album: songData.album || songData.album_name || "Unknown Album",
            year: songData.year || songData.release_date || "2023",
            duration: songData.duration || "0",
            language: songData.language || "hindi",
            image:
              songData.image ||
              songData.media_preview_url ||
              "https://via.placeholder.com/500x500.png?text=No+Image",
            perma_url:
              songData.perma_url || songData.permaUrl || songData.url || "",
            play_count: songData.play_count || songData.playCount || "0",
            has_lyrics: songData.has_lyrics || songData.hasLyrics || false,
          };

          // Cache the result
          songCache.set(songId, {
            data: normalizedSong,
            timestamp: Date.now(),
          });

          return normalizedSong;
        }
      }
    } catch (error) {
      console.log(`❌ JioSaavn endpoint failed: ${error.message}`);
      continue;
    }
  }

  // Last resort: Try to search for the song ID
  try {
    console.log(`🔍 Last resort: Searching for song ID ${songId}...`);
    const response = await makeOptimizedRequest(
      (baseUrl) =>
        `${baseUrl}?__call=search.getResults&api_version=4&_format=json&_marker=0&query=${encodeURIComponent(
          songId
        )}&p=1&n=1`,
      { timeout: 3000 }
    );

    if (response.data && response.data.results && response.data.results.song) {
      const songs =
        response.data.results.song.data || response.data.results.song;
      if (Array.isArray(songs) && songs[0]) {
        const songData = songs[0];
        console.log(`✅ Found song via search fallback`);

        const normalizedSong = {
          id: songData.id || songId,
          song: songData.song || songData.name || songData.title,
          title: songData.song || songData.name || songData.title,
          primary_artists:
            songData.primary_artists ||
            songData.primaryArtists ||
            songData.subtitle,
          primaryArtists:
            songData.primary_artists ||
            songData.primaryArtists ||
            songData.subtitle,
          featured_artists:
            songData.featured_artists || songData.featuredArtists || "",
          album: songData.album || songData.album_name || "Unknown Album",
          year: songData.year || songData.release_date || "2023",
          duration: songData.duration || "0",
          language: songData.language || "hindi",
          image:
            songData.image ||
            songData.media_preview_url ||
            "https://via.placeholder.com/500x500.png?text=No+Image",
          perma_url:
            songData.perma_url || songData.permaUrl || songData.url || "",
          play_count: songData.play_count || songData.playCount || "0",
          has_lyrics: songData.has_lyrics || songData.hasLyrics || false,
        };

        // Cache the result
        songCache.set(songId, {
          data: normalizedSong,
          timestamp: Date.now(),
        });

        return normalizedSong;
      }
    }
  } catch (error) {
    console.log(`❌ Search fallback failed: ${error.message}`);
  }

  throw new Error("Unable to fetch song details from any source");
}