import axios from "axios";
const JIOSAAVN_ENDPOINTS = [
  "https://www.jiosaavn.com/api.php",
  "https://jiosaavn.com/api.php",
  "https://saavn.me/api.php",
];

export async function makeOptimizedRequest(urlTemplate, options = {}) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    Referer: "https://www.jiosaavn.com/",
    Origin: "https://www.jiosaavn.com",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    ...options.headers,
  };

  const timeout = options.timeout || 3000;
  let lastError = null;

  // Try each endpoint with retries
  for (const baseUrl of JIOSAAVN_ENDPOINTS) {
    const url =
      typeof urlTemplate === "function"
        ? urlTemplate(baseUrl)
        : urlTemplate.replace("BASE_URL", baseUrl);

    // Try each endpoint twice
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt} for: ${url.substring(0, 100)}...`);

        const response = await axios.get(url, {
          headers,
          timeout: timeout * attempt, // Increase timeout on retry
          validateStatus: (status) => status < 500, // Accept 4xx but not 5xx
        });

        if (response.data) {
          console.log(`✅ Success from: ${baseUrl}`);

          // console.log(response.data);
          return response;
        }
      } catch (error) {
        lastError = error;
        console.log(
          `❌ Attempt ${attempt} failed for ${baseUrl}: ${error.message}`
        );

        if (attempt === 1) {
          // Small delay before retry
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    }
  }

  throw new Error(
    `All endpoints failed. Last error: ${lastError?.message || "Unknown error"}`
  );
}
