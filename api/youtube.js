// Vercel Serverless Function - Fetches recent videos from YouTube channels
// Uses YouTube's RSS feeds which don't require API keys

export default async function handler(req, res) {
  // YouTube channel IDs for triathlon content
  const CHANNELS = {
    worldTriathlon: 'UCbWZDxB8V1VmFmN6t4KNIYQ',  // World Triathlon
    t100: 'UCHVhEkLpPMIog7k4v9A_plg',             // T100 Triathlon
  };

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour

  try {
    // Fetch RSS feeds from both channels
    const feeds = await Promise.allSettled([
      fetchChannelFeed(CHANNELS.worldTriathlon, 'World Triathlon'),
      fetchChannelFeed(CHANNELS.t100, 'T100 Triathlon'),
    ]);

    // Combine and flatten results
    let videos = [];
    feeds.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        videos = videos.concat(result.value);
      }
    });

    // Sort by date (newest first) and return top 8
    videos.sort((a, b) => new Date(b.published) - new Date(a.published));
    const recentVideos = videos.slice(0, 8);

    return res.status(200).json({ videos: recentVideos });

  } catch (error) {
    console.error('YouTube RSS error:', error);
    return res.status(500).json({ error: 'Failed to fetch YouTube videos' });
  }
}

async function fetchChannelFeed(channelId, channelName) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  try {
    const response = await fetch(feedUrl);
    if (!response.ok) return [];

    const xml = await response.text();

    // Parse the XML feed
    const videos = [];
    const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];

    entries.slice(0, 5).forEach(entry => {
      const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
      const title = entry.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || '';

      if (videoId) {
        videos.push({
          id: videoId,
          title: decodeXmlEntities(title),
          channel: channelName,
          channelUrl: `https://www.youtube.com/channel/${channelId}`,
          published,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        });
      }
    });

    return videos;
  } catch (error) {
    console.error(`Failed to fetch feed for ${channelName}:`, error);
    return [];
  }
}

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
