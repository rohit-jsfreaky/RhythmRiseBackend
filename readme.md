# RhythmRise Music API

Base URL: `/api/music`

---

## YouTube Music Endpoints

### GET /get-audio-stream

**Description:** Stream audio from YouTube videos with caching and range request support.

**Query Parameters:**
- `url` (string, required) - YouTube video URL

**Response:**
Returns audio stream with proper headers for media playback.

---

### GET /get-audio-details

**Description:** Get detailed information about a YouTube video.

**Query Parameters:**
- `url` (string, required) - YouTube video URL

**Response:**
```json
{
  "title": "Video Title",
  "thumbnail": "https://example.com/image.jpg",
  "duration": "3:32",
  "uploader": "Uploader Name",
  "url": "https://www.youtube.com/watch?v=videoId"
}
```

---

### GET /search-songs

**Description:** Search for songs on YouTube.

**Query Parameters:**
- `q` (string, required) - Search query

**Response:**
```json
[
  {
    "title": "Song Title",
    "thumbnail": "https://example.com/thumbnail.jpg",
    "uploader": "Uploader Name",
    "duration": "3:45",
    "url": "https://www.youtube.com/watch?v=videoId"
  }
]
```

---

### GET /related-songs

**Description:** Get related songs for a YouTube video.

**Query Parameters:**
- `videoId` (string, required) - YouTube video ID

**Response:**
```json
{
  "relatedSongs": [
    {
      "title": "Related Song",
      "url": "https://www.youtube.com/watch?v=relatedId",
      "thumbnail": "https://example.com/thumb.jpg",
      "duration": "4:01"
    }
  ]
}
```

---

## JioSaavn Endpoints

### GET /search-songs-jio-savan

**Description:** Search for songs on JioSaavn platform.

**Query Parameters:**
- `q` (string, required) - Search query
- `limit` (number, optional) - Number of results (default: 20)

**Response:**
```json
{
  "results": 10,
  "data": [
    {
      "id": "song_id",
      "title": "Song Title",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "duration": 180,
      "author": "Artist Name",
      "downloadUrls": [
        {
          "quality": "96kbps",
          "url": "https://download-url.com"
        }
      ]
    }
  ]
}
```

---

### GET /related-songs-jio-savan/:id

**Description:** Get related songs for a JioSaavn track.

**URL Parameters:**
- `id` (string, required) - JioSaavn song ID

**Query Parameters:**
- `limit` (number, optional) - Number of suggestions (default: 20)

**Response:**
```json
[
  {
    "id": "song_id",
    "title": "Related Song Title",
    "thumbnail": "https://example.com/thumbnail.jpg",
    "duration": 200,
    "author": "Artist Name"
  }
]
```

---

### GET /get-trending-songs-jio-savan

**Description:** Get currently trending songs from JioSaavn.

**Query Parameters:**
- `limit` (number, optional) - Number of songs (max: 50, default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "song_id",
      "title": "Trending Song",
      "author": "Artist Name",
      "duration": 220,
      "thumbnail": "https://example.com/thumbnail.jpg"
    }
  ]
}
```

---

### GET /get-songs-details-jio-savan/:id

**Description:** Get detailed information about a specific JioSaavn song.

**URL Parameters:**
- `id` (string, required) - JioSaavn song ID

**Response:**
```json
{
  "data": {
    "id": "song_id",
    "title": "Song Title",
    "author": "Artist Name",
    "duration": 180,
    "thumbnail": "https://example.com/high-res-thumbnail.jpg",
    "downloadUrl": {
      "12kbps": "https://download-url-12k.com",
      "48kbps": "https://download-url-48k.com",
      "96kbps": "https://download-url-96k.com",
      "160kbps": "https://download-url-160k.com",
      "320kbps": "https://download-url-320k.com"
    }
  }
}
```

---

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "error": "Missing required parameter"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found",
  "message": "Detailed error message"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

---

## Features

- **YouTube Integration:** Search, stream, and get details from YouTube
- **JioSaavn Integration:** Access JioSaavn's music catalog
- **Audio Streaming:** Efficient streaming with caching and range requests
- **Related Songs:** AI-powered song recommendations
- **Trending Music:** Real-time trending songs from JioSaavn
- **Multiple Quality Options:** Various audio quality options for downloads
- **Caching System:** Optimized performance with intelligent caching