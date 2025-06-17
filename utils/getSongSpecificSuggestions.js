import { makeOptimizedRequest } from "./makeOptimizedRequest.js";

export async function getSongSpecificSuggestions(
  songId,
  targetSong,
  limit = 60
) {
  console.log(`🎯 Getting song-specific suggestions for: ${targetSong.title}`);
  console.log(`🆔 Song ID: ${songId}`);

  let allSuggestions = [];

  // Method 1: JioSaavn's recommendation APIs (primary approach)
  const jioSaavnSuggestionEndpoints = [
    // Official recommendation endpoint
    (baseUrl) =>
      `${baseUrl}?__call=reco.getreco&api_version=4&_format=json&_marker=0&pid=${songId}&language=${
        targetSong.language || "hindi"
      }&n=50`,
    // Alternative endpoint with different parameters
    (baseUrl) =>
      `${baseUrl}?__call=reco.getreco&api_version=4&_format=json&_marker=0&pid=${songId}&n=50`,
    // Backup endpoint
    (baseUrl) =>
      `${baseUrl}?__call=song.getRecommendationsByPid&api_version=4&_format=json&_marker=0&pid=${songId}&language=${
        targetSong.language || "hindi"
      }`,
  ].filter(Boolean);

  for (const endpointTemplate of jioSaavnSuggestionEndpoints) {
    if (allSuggestions.length >= 30) break;

    try {
      console.log(`🔄 Trying JioSaavn recommendation endpoint...`);
      const response = await makeOptimizedRequest(endpointTemplate, {
        timeout: 15000, // Increased timeout
      });

      if (response.data) {
        console.log(`📊 Raw response keys: ${Object.keys(response.data)}`);
        console.log(`📊 Response data type: ${typeof response.data}`);

        // Handle different response formats
        let suggestions = [];
        console.log(`📊 Checking response structure...`,response);
        if (Array.isArray(response.data)) {
          suggestions = response.data;
        } else if (response.data[songId]) {
          suggestions = response.data[songId];
        } else if (response.data.data) {
          suggestions = response.data.data;
        } else if (response.data.results) {
          suggestions = response.data.results;
        } else {
          // Try to find any array in the response
          for (const [key, value] of Object.entries(response.data)) {
            if (Array.isArray(value) && value.length > 0) {
              console.log(`📊 Found suggestions array in key: ${key}`);
              suggestions = value;
              break;
            }
          }
        }

        if (Array.isArray(suggestions) && suggestions.length > 0) {
          console.log(`✅ Found ${suggestions.length} suggestions`);
          allSuggestions = suggestions;
          break; // Exit loop if we found suggestions
        } else {
          console.log(`⚠️ No suggestions found in response`);
          console.log(
            `📊 Full response: ${JSON.stringify(response.data).substring(0, 500)}`
          );
        }
      }
    } catch (error) {
      console.log(
        `❌ JioSaavn recommendation endpoint failed: ${error.message}`
      );
      continue;
    }
  }

  // If no suggestions found, try alternative approach
  if (allSuggestions.length === 0) {
    console.log(`🔄 No suggestions found, trying alternative approach...`);

    try {
      // Try getting related songs from a different endpoint
      const alternativeEndpoint = (baseUrl) =>
        `${baseUrl}?__call=content.getAlbums&api_version=4&_format=json&_marker=0&n=20&p=1&query=${encodeURIComponent(
          targetSong.title
        )}`;

      const response = await makeOptimizedRequest(alternativeEndpoint, {
        timeout: 10000,
      });

      if (response.data && response.data.results) {
        console.log(
          `✅ Found alternative suggestions: ${response.data.results.length}`
        );
        allSuggestions = response.data.results.slice(0, 20);
      }
    } catch (error) {
      console.log(`❌ Alternative approach failed: ${error.message}`);
    }
  }

  console.log(`🎵 Total suggestions found: ${allSuggestions.length}`);
  return allSuggestions;
}
