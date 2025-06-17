import { makeOptimizedRequest } from "./makeOptimizedRequest.js";

export async function getSongSpecificSuggestions(songId, targetSong, limit = 60) {
  console.log(`🎯 Getting song-specific suggestions for: ${targetSong.title}`);

  let allSuggestions = [];

  // Method 1: JioSaavn's recommendation APIs (primary approach)
  const jioSaavnSuggestionEndpoints = [
    // Official recommendation endpoint
    (baseUrl) =>
      `${baseUrl}?__call=reco.getreco&api_version=4&_format=json&_marker=0&pid=${songId}&language=${
        targetSong.language || "hindi"
      }&n=50`,
  ].filter(Boolean);

  for (const endpointTemplate of jioSaavnSuggestionEndpoints) {
    if (allSuggestions.length >= 30) break;

    try {
      const response = await makeOptimizedRequest(endpointTemplate, {
        timeout: 10000,
      });

      if (response.data) {
        console.log("songid", response);
        allSuggestions = response.data[songId];
      }
    } catch (error) {
      console.log(
        `❌ JioSaavn recommendation endpoint failed: ${error.message}`
      );
      continue;
    }
  }
  return allSuggestions;
}