import { spawn } from "child_process";
import path from "path";

const cookiesPath = path.resolve("cookies.txt");

const videoUrl = "https://www.youtube.com/watch?v=vnkY1TM5Ygc";

export const getAudioWithYtDlp = () => {
  return new Promise((resolve, reject) => {
    // Build the yt-dlp arguments
    const args = [
      videoUrl,
      "--cookies",
      cookiesPath,
      "-f",
      "bestaudio",
      "-g", // Get direct audio URL
    ];

    const ytdlp = spawn("yt-dlp", args);

    let output = "";
    let error = "";

    ytdlp.stdout.on("data", (data) => {
      output += data.toString();
    });

    ytdlp.stderr.on("data", (data) => {
      error += data.toString();
    });

    ytdlp.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`yt-dlp exited with code ${code}: ${error}`));
      }
    });
  });
};

getAudioWithYtDlp()
  .then((audioUrl) => {
    console.log("Audio URL:", audioUrl);
  })
  .catch((error) => {
    console.error("Error:", error.message);
  });
