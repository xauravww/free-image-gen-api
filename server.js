import express from 'express';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import { generateImage } from './imageGenerator.js';

// Initialize cache with 1 hour TTL for image URLs
const cache = new NodeCache({ stdTTL: 3600 });

// Simple queue implementation
let requestQueue = [];
let isProcessing = false;

const app = express();
app.use(express.json());

// POST /generate - Submit image generation request
app.post('/generate', async (req, res) => {
  const { prompt, model = 'ideogram-v3-quality' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const requestId = uuidv4();

  // Store initial status
  cache.set(requestId, {
    status: 'queued',
    prompt,
    model,
    queuePosition: requestQueue.length + 1,
    createdAt: new Date().toISOString()
  });

  // Add to queue
  requestQueue.push({ id: requestId, prompt, model });

  console.log(`📝 New request queued: ${requestId} - "${prompt}"`);

  // Start processing if not already running
  processQueue();

  res.json({
    requestId,
    status: 'queued',
    message: 'Request queued for processing',
    queuePosition: requestQueue.length
  });
});

// GET /status/:id - Check request status
app.get('/status/:id', (req, res) => {
  const { id } = req.params;
  const data = cache.get(id);

  if (!data) {
    return res.status(404).json({ error: 'Request not found' });
  }

  // Update queue position if still queued
  if (data.status === 'queued') {
    const queueIndex = requestQueue.findIndex(item => item.id === id);
    if (queueIndex !== -1) {
      data.queuePosition = queueIndex + 1;
    }
  }

  res.json(data);
});

// GET /queue - Get current queue status
app.get('/queue', (req, res) => {
  res.json({
    isProcessing,
    queueLength: requestQueue.length,
    queue: requestQueue.map(item => ({
      id: item.id,
      prompt: item.prompt.substring(0, 50) + (item.prompt.length > 50 ? '...' : ''),
      model: item.model
    }))
  });
});

// Queue processing function
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;
  console.log(`🚀 Starting queue processing (${requestQueue.length} requests)`);

  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    console.log(`🎯 Processing request: ${request.id} - "${request.prompt}"`);

    try {
      // Update status to processing
      cache.set(request.id, {
        ...cache.get(request.id),
        status: 'processing',
        startedAt: new Date().toISOString()
      });

      // Generate image
      const result = await generateImage(request.prompt, request.model);

      // Update status with result
      cache.set(request.id, {
        ...cache.get(request.id),
        status: 'completed',
        imageUrl: result.imageUrl,
        completedAt: new Date().toISOString()
      });

      console.log(`✅ Request ${request.id} completed successfully`);

    } catch (error) {
      console.error(`❌ Request ${request.id} failed: ${error.message}`);

      // Update status with error
      cache.set(request.id, {
        ...cache.get(request.id),
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      });
    }
  }

  isProcessing = false;
  console.log(`🏁 Queue processing completed`);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    queueLength: requestQueue.length,
    isProcessing
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Image generation API running on port ${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /generate - Submit image generation request`);
  console.log(`   GET /status/:id - Check request status`);
  console.log(`   GET /queue - View current queue`);
  console.log(`   GET /health - Health check`);
});