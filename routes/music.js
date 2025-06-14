import express from "express";
import {
  getAudioDetails,
  getAudioStream,
  getRelatedSongs,
  getRelatedSongsJioSavan,
  getSongsDetailsJioSavan,
  getTrendingJioSavanSongs,
  searchSongs,
  searchSongsJioSavan,
} from "../controllers/music.js";
export const musicRouter = express.Router();

musicRouter.get("/get-audio-stream", getAudioStream);
musicRouter.get("/get-audio-details", getAudioDetails);

musicRouter.get("/search-songs", searchSongs);

musicRouter.get("/related-songs", getRelatedSongs);

musicRouter.get("/search-songs-jio-savan", searchSongsJioSavan);

musicRouter.get("/related-songs-jio-savan/:id", getRelatedSongsJioSavan);

musicRouter.get("/get-trending-songs-jio-savan", getTrendingJioSavanSongs);

musicRouter.get("/get-songs-details-jio-savan/:id", getSongsDetailsJioSavan);
