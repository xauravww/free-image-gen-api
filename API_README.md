# LM Arena Image Generation API

A Node.js API that provides image generation using LM Arena's AI models with queue management and caching.

## Features

- **Queue Management**: Processes one image generation request at a time to manage server load
- **Live Tracking**: Track request status using request IDs
- **Caching**: Image URLs cached with expiration (1 hour TTL)
- **REST API**: Simple endpoints for generating and tracking requests
- **Docker Support**: Containerized with headless:false browser support

## API Endpoints

### POST /generate
Submit an image generation request.

**Request Body:**
```json
{
  "prompt": "A beautiful sunset over mountains",
  "model": "ideogram-v3-quality"  // optional, defaults to ideogram-v3-quality
}
```

**Response:**
```json
{
  "requestId": "uuid-here",
  "status": "queued",
  "message": "Request queued for processing",
  "queuePosition": 1
}
```

### GET /status/:id
Check the status of a request.

**Response:**
```json
{
  "status": "completed",
  "prompt": "A beautiful sunset over mountains",
  "model": "ideogram-v3-quality",
  "imageUrl": "https://cloudflarestorage.com/...",
  "createdAt": "2025-11-25T17:41:51.950Z",
  "completedAt": "2025-11-25T17:43:51.950Z"
}
```

**Status Values:**
- `queued`: Request is waiting in queue
- `processing`: Currently being processed
- `completed`: Image generated successfully
- `failed`: Generation failed

### GET /queue
View current queue status.

**Response:**
```json
{
  "isProcessing": true,
  "queueLength": 2,
  "queue": [
    {
      "id": "uuid-1",
      "prompt": "A beautiful sunset...",
      "model": "ideogram-v3-quality"
    }
  ]
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-25T17:41:51.950Z",
  "queueLength": 0,
  "isProcessing": false
}
```

## Running Locally

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
node server.js
```

The API will be available at `http://localhost:3000`

## Running with Docker

1. Build the image:
```bash
docker build -t lmarena-api .
```

2. Run the container:
```bash
docker run -p 3000:3000 lmarena-api
```

## Usage Examples

### Generate an Image
```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A futuristic city at night"}'
```

### Check Status
```bash
curl http://localhost:3000/status/YOUR_REQUEST_ID
```

### Monitor Queue
```bash
curl http://localhost:3000/queue
```

## Notes

- The API uses `headless: false` as specified, requiring a display environment
- Docker uses Xvfb for virtual display support
- Image URLs expire after 1 hour
- Only one request is processed at a time to manage server load
- The underlying image generation uses LM Arena's ideogram-v3-quality model