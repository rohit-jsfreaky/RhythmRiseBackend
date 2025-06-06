````md
# YouTube Music API

Base URL: `/api/music`

---

## GET /get-audio

**Query Parameters:**

- `url` (string, required)

**Response:**

```json
{
  "title": "Video Title",
  "thumbnail": "https://example.com/image.jpg",
  "duration": "212",
  "uploader": "Uploader Name",
  "audioUrl": "https://audio-stream-url.com/audio"
}
````

---

## GET /get-audio-details

**Query Parameters:**

* `url` (string, required)

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

## GET /search-songs

**Query Parameters:**

* `q` (string, required)

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

## GET /related-songs

**Query Parameters:**

* `videoId` (string, required)

**Response:**

```json
{
  "related": [
    {
      "title": "Related Song",
      "url": "https://www.youtube.com/watch?v=relatedId",
      "thumbnail": "https://example.com/thumb.jpg",
      "duration": "4:01",
      "uploader": "Music Channel"
    }
  ]
}
```

