// Vercel Serverless Function - Proxies requests to World Triathlon API
// This keeps your API key secret on the server side

export default async function handler(req, res) {
  // Get the API key from environment variables (set in Vercel dashboard)
  const API_KEY = process.env.TRIATHLON_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Get the endpoint path from the query parameter
  // e.g., /api/triathlon?endpoint=/search/athletes&query=brownlee
  const { endpoint, ...queryParams } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }

  // Build the full URL to the World Triathlon API
  const baseUrl = 'https://api.triathlon.org/v1';
  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

  try {
    // Make the request to World Triathlon API with the secret API key
    const response = await fetch(url, {
      headers: {
        'apikey': API_KEY,
        'Accept': 'application/json'
      }
    });

    // Get the response data
    const data = await response.json();

    // Set CORS headers so your frontend can access this
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // Return the data with the same status code
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('API proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch from triathlon API' });
  }
}
