import { makeOptimizedRequest } from "./makeOptimizedRequest.js";

export async function getSongSpecificSuggestions(
  songId,
  targetSong,
  limit = 60
) {
  console.log(`🎯 Getting song-specific suggestions for: ${targetSong.title}`);

  let allSuggestions = [];

  // Method 1: Try multiple JioSaavn recommendation endpoints
  const jioSaavnSuggestionEndpoints = [
    // Official recommendation endpoint - try different formats
    (baseUrl) =>
      `${baseUrl}?__call=reco.getreco&api_version=4&_format=json&_marker=0&pid=${songId}&language=${
        targetSong.language || "hindi"
      }&n=50`,
    // Alternative recommendation endpoint
    (baseUrl) =>
      `${baseUrl}?__call=song.getRecoBySong&api_version=4&_format=json&_marker=0&pid=${songId}&n=50`,
    // Get similar songs by artist
    (baseUrl) =>
      `${baseUrl}?__call=search.getResults&api_version=4&_format=json&_marker=0&query=${encodeURIComponent(
        targetSong.primaryArtists || targetSong.subtitle
      )}&p=1&n=20`,
  ].filter(Boolean);

  // Try each endpoint until we get results
  for (const endpointTemplate of jioSaavnSuggestionEndpoints) {
    if (allSuggestions.length >= 20) break;

    try {
      console.log(`🔄 Trying endpoint: ${endpointTemplate.toString()}`);
      
      const response = await makeOptimizedRequest(endpointTemplate, {
        timeout: 12000,
        retry: 2,
      });

      if (response.data) {
        console.log("Raw API Response:", JSON.stringify(response.data, null, 2));
        
        // Handle different response formats
        let suggestions = [];
        
        // Format 1: Direct array with songId key
        if (response.data[songId] && Array.isArray(response.data[songId])) {
          suggestions = response.data[songId];
          console.log(`✅ Found ${suggestions.length} suggestions using format 1`);
        }
        // Format 2: Nested in results
        else if (response.data.results && response.data.results.song) {
          const songData = response.data.results.song.data || response.data.results.song;
          if (Array.isArray(songData)) {
            suggestions = songData.filter(song => song.id !== songId); // Exclude original song
            console.log(`✅ Found ${suggestions.length} suggestions using format 2`);
          }
        }
        // Format 3: Direct array
        else if (Array.isArray(response.data)) {
          suggestions = response.data.filter(song => song.id !== songId);
          console.log(`✅ Found ${suggestions.length} suggestions using format 3`);
        }
        // Format 4: Check for any array in the response
        else {
          const keys = Object.keys(response.data);
          for (const key of keys) {
            if (Array.isArray(response.data[key]) && response.data[key].length > 0) {
              suggestions = response.data[key].filter(song => song.id && song.id !== songId);
              if (suggestions.length > 0) {
                console.log(`✅ Found ${suggestions.length} suggestions using key: ${key}`);
                break;
              }
            }
          }
        }

        if (suggestions.length > 0) {
          allSuggestions = [...allSuggestions, ...suggestions];
          console.log(`📝 Total suggestions so far: ${allSuggestions.length}`);
        }
      }
    } catch (error) {
      console.log(`❌ Endpoint failed: ${error.message}`);
      continue;
    }
  }

  // If still no results, try backup APIs
  if (allSuggestions.length === 0) {
    console.log("🔄 Trying backup search approach...");
    
    try {
      // Search for similar songs by artist name
      const artistQuery = targetSong.primaryArtists || targetSong.subtitle || targetSong.title;
      const backupResponse = await makeOptimizedRequest(
        (baseUrl) =>
          `${baseUrl}?__call=search.getResults&api_version=4&_format=json&_marker=0&query=${encodeURIComponent(
            artistQuery
          )}&p=1&n=30`,
        { timeout: 8000 }
      );

      if (backupResponse.data && backupResponse.data.results && backupResponse.data.results.song) {
        const songs = backupResponse.data.results.song.data || backupResponse.data.results.song;
        if (Array.isArray(songs)) {
          allSuggestions = songs
            .filter(song => song.id !== songId) // Exclude original song
            .slice(0, 20);
          console.log(`✅ Backup search found ${allSuggestions.length} suggestions`);
        }
      }
    } catch (error) {
      console.log(`❌ Backup search failed: ${error.message}`);
    }
  }
  return allSuggestions;
}
