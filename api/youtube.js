// Vercel Serverless Function - Proxies requests to YouTube Data API
// This keeps your API key secret on the server side

export default async function handler(req, res) {
  const API_KEY = process.env.YOUTUBE_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'YouTube API key not configured' });
  }

  const { action, channelId, maxResults = 3 } = req.query;

  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter' });
  }

  let url;

  if (action === 'latestVideos' && channelId) {
    // Fetch latest videos from a specific channel
    url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}&key=${API_KEY}`;
  } else if (action === 'channelVideos') {
    // Fetch latest triathlon videos using search queries
    const searches = [
      { query: 'World Triathlon race', name: 'World Triathlon' },
      { query: 'Ironman triathlon race', name: 'Ironman' },
      { query: 'T100 triathlon PTO', name: 'T100 Triathlon' }
    ];

    try {
      const videosPerSearch = Math.min(parseInt(maxResults) || 2, 4);

      const allVideos = await Promise.all(
        searches.map(async (search) => {
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(search.query)}&order=date&type=video&maxResults=${videosPerSearch}&key=${API_KEY}`;
          const response = await fetch(searchUrl);
          const data = await response.json();

          if (data.items) {
            return data.items.map(item => ({
              ...item,
              channelName: search.name
            }));
          }
          return [];
        })
      );

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

      return res.status(200).json({
        items: allVideos.flat()
      });
    } catch (error) {
      console.error('YouTube API error:', error);
      return res.status(500).json({ error: 'Failed to fetch videos' });
    }
  } else {
    return res.status(400).json({ error: 'Invalid action or missing parameters' });
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('YouTube API error:', error);
    return res.status(500).json({ error: 'Failed to fetch from YouTube API' });
  }
}
