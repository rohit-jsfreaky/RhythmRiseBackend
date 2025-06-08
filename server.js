import fetch from "node-fetch";

async function fetchYouTubeSearch() {
  const query = "arijit singh hits";
  const res = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
  );
  const html = await res.text();

  // Extract ytInitialData JSON string using regex
  const match = html.match(/var ytInitialData = (.*?);<\/script>/);

  if (!match) throw new Error("Failed to extract ytInitialData");

  const data = JSON.parse(match[1]);

  // Now parse `data` to extract video info (this step is complex)
  return data;
}

const data = await fetchYouTubeSearch();

console.log(data);
