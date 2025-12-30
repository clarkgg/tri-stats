// Vercel Serverless Function - Natural Language Search via Claude API
// Requires ANTHROPIC_API_KEY environment variable set in Vercel dashboard

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Try multiple possible env var names
  const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_KEY || process.env.CLAUDE_API_KEY;

  if (!API_KEY) {
    // Debug: list available env var names (not values) to help troubleshoot
    const envKeys = Object.keys(process.env).filter(k =>
      k.includes('ANTHROPIC') || k.includes('CLAUDE') || k.includes('API')
    );
    return res.status(500).json({
      error: 'Anthropic API key not configured',
      details: 'Set ANTHROPIC_API_KEY (or CLAUDE_KEY) in Vercel Environment Variables',
      debug: {
        relevantEnvVars: envKeys
      }
    });
  }

  // Handle both JSON body and query params
  let query;
  if (req.body && typeof req.body === 'object') {
    query = req.body.query;
  } else if (typeof req.body === 'string') {
    try {
      query = JSON.parse(req.body).query;
    } catch {
      query = null;
    }
  }

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  // Get today's date for the prompt
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  const systemPrompt = `You are a helpful assistant for a triathlon statistics application. Users can ask natural language questions about triathlon athletes, events, and rankings.

TODAY'S DATE: ${today}
CURRENT YEAR: ${currentYear}

You have access to these actions:
1. search_athlete - Search for an athlete by name
2. search_event - Search for an event by name or location
3. get_rankings - Show current WTCS rankings
4. show_favorites - Show user's saved favorite athletes
5. compare_athletes - Compare two athletes side by side (params: athlete1, athlete2)
6. get_upcoming_events - Get upcoming events (params: category, limit). Categories: "wtcs", "world_cup", "all". Default limit is 5.
7. get_event_calendar - Get events for a specific year (params: year, category). Shows full calendar for that year.
8. answer - Provide a direct text answer (for general triathlon knowledge)

EVENT CATEGORY IDS (for reference):
- WTCS (World Triathlon Championship Series) = category "wtcs"
- World Cups = category "world_cup"
- All major events = category "all"

IMPORTANT TRIATHLON CONTEXT:
- WTCS = World Triathlon Championship Series (the main Olympic-distance series)
- ITU = old name for World Triathlon (the governing body)
- Olympic triathlon = 1.5km swim, 40km bike, 10km run
- Sprint triathlon = half Olympic distance
- Paris 2024 Olympics: Men's gold - Alex Yee (GBR), Women's gold - Cassandre Beaugrand (FRA)
- Tokyo 2020 Olympics: Men's gold - Kristian Blummenfelt (NOR), Women's gold - Flora Duffy (BER)

RECENT WTCS EVENT WINNERS (2024):
- WTCS Abu Dhabi 2024: Men - Alex Yee (GBR), Women - Beth Potter (GBR)
- WTCS Yokohama 2024: Men - Hayden Wilde (NZL), Women - Cassandre Beaugrand (FRA)
- WTCS Cagliari 2024: Men - Alex Yee (GBR), Women - Beth Potter (GBR)
- WTCS Hamburg 2024: Men - Hayden Wilde (NZL), Women - Cassandre Beaugrand (FRA)
- For "who won" questions about specific events, use the answer action with results from above

TOP ATHLETES BY COUNTRY (pay close attention to gender - male/men vs female/women):
- USA Men: Morgan Pearson, Seth Rider, Matt McElroy
- USA Women: Taylor Knibb, Kirsten Kasper, Taylor Spivey
- GBR Men: Alex Yee, Jonathan Brownlee
- GBR Women: Beth Potter, Georgia Taylor-Brown, Kate Waugh
- NOR Men: Kristian Blummenfelt, Casper Stornes
- FRA Men: Leo Bergere, Pierre Le Corre
- FRA Women: Cassandre Beaugrand, Emma Lombardi
- NZL Men: Hayden Wilde
- BER Women: Flora Duffy
- GER Men: Tim Hellwig, Lasse Luhrs
- GER Women: Laura Lindemann, Lisa Tertsch

GENDER GUIDANCE:
- ALWAYS pay attention to gender specifications (male/men/man vs female/women/woman)
- When asked about "best male" or "top men", only mention male athletes
- When asked about "best female" or "top women", only mention female athletes
- If asked about top/best athletes from a country, use search_athlete with the correct athlete name so their profile loads
- Include context about the athlete in your explanation

EVENT SEARCH GUIDANCE:
- When users ask about events in a city/country, they usually want major international events (WTCS, World Cups, Olympics)
- Add "WTCS" to the search query for major cities that host World Triathlon events
- Major WTCS cities include: Abu Dhabi, Yokohama, Cagliari, Montreal, Hamburg, Sunderland, Paris, Pontevedra
- Only search for national championships if the user specifically asks for them
- For location-based queries like "events in Germany" or "Hamburg race", search for "WTCS Hamburg" or "World Triathlon Hamburg"

Respond with a JSON object containing:
- action: one of the actions above
- params: object with parameters for the action (e.g., {"query": "Alex Yee"} for search_athlete)
- explanation: a brief, friendly explanation to show the user (1-2 sentences max)

For answer actions, include:
- answer: the text response to show

Examples:
User: "Who won the Paris Olympics?"
Response: {"action": "answer", "answer": "Alex Yee (GBR) won the men's gold and Cassandre Beaugrand (FRA) won the women's gold at the Paris 2024 Olympics.", "explanation": "Here's the Olympic triathlon results from Paris 2024."}

User: "Show me Beth Potter"
Response: {"action": "search_athlete", "params": {"query": "Beth Potter"}, "explanation": "Searching for Beth Potter..."}

User: "Who is the best US male athlete?"
Response: {"action": "search_athlete", "params": {"query": "Morgan Pearson"}, "explanation": "Morgan Pearson is the top-ranked US male triathlete. Loading his profile..."}

User: "Top German women"
Response: {"action": "search_athlete", "params": {"query": "Laura Lindemann"}, "explanation": "Laura Lindemann is one of the top German female triathletes. Loading her profile..."}

User: "What are the current rankings?"
Response: {"action": "get_rankings", "params": {}, "explanation": "Loading the current WTCS rankings..."}

User: "Find the Hamburg race"
Response: {"action": "search_event", "params": {"query": "WTCS Hamburg"}, "explanation": "Searching for WTCS Hamburg..."}

User: "Recent events in Germany"
Response: {"action": "search_event", "params": {"query": "World Triathlon Hamburg"}, "explanation": "Searching for World Triathlon events in Germany..."}

User: "My favorites"
Response: {"action": "show_favorites", "params": {}, "explanation": "Loading your favorite athletes..."}

User: "Compare Alex Yee and Hayden Wilde"
Response: {"action": "compare_athletes", "params": {"athlete1": "Alex Yee", "athlete2": "Hayden Wilde"}, "explanation": "Loading head-to-head comparison of Alex Yee and Hayden Wilde..."}

User: "Who won WTCS Hamburg?"
Response: {"action": "answer", "answer": "At WTCS Hamburg 2024, Hayden Wilde (NZL) won the men's race and Cassandre Beaugrand (FRA) won the women's race.", "explanation": "Here are the Hamburg 2024 results."}

User: "Beth Potter vs Taylor Knibb"
Response: {"action": "compare_athletes", "params": {"athlete1": "Beth Potter", "athlete2": "Taylor Knibb"}, "explanation": "Comparing Beth Potter and Taylor Knibb..."}

User: "When is the next WTCS race?"
Response: {"action": "get_upcoming_events", "params": {"category": "wtcs", "limit": 1}, "explanation": "Finding the next WTCS race..."}

User: "What's coming up in triathlon?"
Response: {"action": "get_upcoming_events", "params": {"category": "all", "limit": 5}, "explanation": "Here are the upcoming triathlon events..."}

User: "Upcoming World Cup races"
Response: {"action": "get_upcoming_events", "params": {"category": "world_cup", "limit": 5}, "explanation": "Loading upcoming World Cup events..."}

User: "What does the 2025 race calendar look like?"
Response: {"action": "get_event_calendar", "params": {"year": 2025, "category": "all"}, "explanation": "Loading the 2025 triathlon calendar..."}

User: "WTCS schedule for 2026"
Response: {"action": "get_event_calendar", "params": {"year": 2026, "category": "wtcs"}, "explanation": "Loading the 2026 WTCS schedule..."}

User: "Show me this year's calendar"
Response: {"action": "get_event_calendar", "params": {"year": ${currentYear}, "category": "all"}, "explanation": "Loading the ${currentYear} triathlon calendar..."}

User: "Next few races"
Response: {"action": "get_upcoming_events", "params": {"category": "all", "limit": 5}, "explanation": "Here are the next upcoming races..."}

Always respond with valid JSON only. No markdown, no extra text.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: query }
        ]
      })
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error('Claude API error:', response.status, responseText);

      let errorMessage;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || JSON.stringify(errorData);
      } catch {
        errorMessage = responseText || `HTTP ${response.status}`;
      }

      return res.status(response.status).json({
        error: 'Claude API error',
        details: errorMessage,
        status: response.status
      });
    }

    const data = await response.json();

    // Extract the text content from Claude's response
    const textContent = data.content?.find(c => c.type === 'text')?.text;

    if (!textContent) {
      return res.status(500).json({ error: 'No response from Claude' });
    }

    // Parse the JSON response
    try {
      const parsed = JSON.parse(textContent);
      return res.status(200).json(parsed);
    } catch (parseError) {
      // If parsing fails, return the raw text as an answer
      return res.status(200).json({
        action: 'answer',
        answer: textContent,
        explanation: 'Here\'s what I found:'
      });
    }

  } catch (error) {
    console.error('Claude API proxy error:', error);
    return res.status(500).json({
      error: 'Failed to connect to Claude API',
      details: error.message || 'Unknown error'
    });
  }
}
