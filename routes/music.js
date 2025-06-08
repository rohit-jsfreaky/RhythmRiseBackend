import express from "express";
import {
  getAudioDetails,
  getAudioStream,
  getRelatedSongs,
  searchSongs,
} from "../controllers/music.js";
export const musicRouter = express.Router();

musicRouter.get("/get-audio-stream", getAudioStream);
musicRouter.get("/get-audio-details", getAudioDetails);

musicRouter.get("/search-songs", searchSongs);

musicRouter.get("/related-songs", getRelatedSongs);
