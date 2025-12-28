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
    // Fetch latest videos from specific triathlon channels only
    // First, resolve channel handles to IDs, then fetch their uploads
    const channels = [
      { handle: '@worldtriathlon', name: 'World Triathlon' },
      { handle: '@ironmantriathlon', name: 'Ironman' },
      { handle: '@T100Triathlon', name: 'T100 Triathlon' }
    ];

    try {
      const videosPerChannel = Math.min(parseInt(maxResults) || 2, 4);

      const allVideos = await Promise.all(
        channels.map(async (channel) => {
          // Get channel ID from handle
          const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${channel.handle}&key=${API_KEY}`;
          const channelResponse = await fetch(channelUrl);
          const channelData = await channelResponse.json();

          if (!channelData.items || channelData.items.length === 0) {
            return [];
          }

          const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;
          if (!uploadsPlaylistId) {
            return [];
          }

          // Get latest videos from uploads playlist
          const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${videosPerChannel}&key=${API_KEY}`;
          const playlistResponse = await fetch(playlistUrl);
          const playlistData = await playlistResponse.json();

          if (playlistData.items) {
            return playlistData.items.map(item => ({
              id: { videoId: item.snippet?.resourceId?.videoId },
              snippet: item.snippet,
              channelName: channel.name
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
