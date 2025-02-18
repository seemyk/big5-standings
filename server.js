const express = require('express');
const fetch = require('node-fetch'); // using node-fetch v2
const NodeCache = require('node-cache');
const app = express();
const PORT = process.env.PORT || 3000;

// Create a cache with a TTL of 300 seconds (5 minutes)
const cache = new NodeCache({ stdTTL: 300 });

// Use your API key (or store it in Glitch's .env file)
const API_KEY = process.env.API_KEY || 'eac1def5f44245d0ba2ae2d1312901af';

// Serve static files from the 'public' folder
app.use(express.static('public'));

/**
 * Proxy endpoint for standings.
 * Usage: /proxy?code=PL&season=2024
 */
app.get('/proxy', async (req, res) => {
  const code = req.query.code;
  const season = req.query.season || '';  // read season parameter
  if (!code) {
    return res.status(400).json({ error: 'Missing code query parameter' });
  }
  // Cache key now includes both code and season.
  const cacheKey = `standings_${code}_${season}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Serving standings for ${code} season ${season} from cache.`);
    res.set('Access-Control-Allow-Origin', '*');
    return res.json(cachedData);
  }

  const url = `https://api.football-data.org/v4/competitions/${code}/standings?season=${season}`;
  try {
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': API_KEY }
    });
    const data = await response.json();
    cache.set(cacheKey, data);
    res.set('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (error) {
    console.error(`Error fetching data for ${code} season ${season}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Proxy endpoint for live matches.
 * Usage: /proxy-live?status=IN_PLAY
 */
app.get('/proxy-live', async (req, res) => {
  const status = req.query.status || 'IN_PLAY';
  const cacheKey = `live_${status}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Serving live matches (${status}) from cache.`);
    res.set('Access-Control-Allow-Origin', '*');
    return res.json(cachedData);
  }
  const url = `https://api.football-data.org/v4/matches?status=${status}`;
  try {
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': API_KEY }
    });
    const data = await response.json();
    cache.set(cacheKey, data);
    res.set('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (error) {
    console.error(`Error fetching live matches with status ${status}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Proxy endpoint for top scorers.
 * Usage: /proxy-scorers?code=PL&season=2024
 */
app.get('/proxy-scorers', async (req, res) => {
  const code = req.query.code;
  const season = req.query.season;
  if (!code || !season) {
    return res.status(400).json({ error: 'Missing code or season query parameter' });
  }
  const cacheKey = `scorers_${code}_${season}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Serving scorers for ${code} season ${season} from cache.`);
    res.set('Access-Control-Allow-Origin', '*');
    return res.json(cachedData);
  }

  const url = `https://api.football-data.org/v4/competitions/${code}/scorers?season=${season}`;
  try {
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': API_KEY }
    });
    const data = await response.json();
    cache.set(cacheKey, data);
    res.set('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (error) {
    console.error(`Error fetching scorers for ${code} season ${season}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Proxy endpoint for assists.
 * Usage: /proxy-assists?code=PL&season=2024
 * 
 * Since the API doesn't have a separate assists endpoint, we're using the scorers endpoint 
 * and caching its response separately. Your frontend can then extract the assists data.
 */
app.get('/proxy-assists', async (req, res) => {
  const code = req.query.code;
  const season = req.query.season;
  if (!code || !season) {
    return res.status(400).json({ error: 'Missing code or season query parameter' });
  }
  const cacheKey = `assists_${code}_${season}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Serving assists for ${code} season ${season} from cache.`);
    res.set('Access-Control-Allow-Origin', '*');
    return res.json(cachedData);
  }

  const url = `https://api.football-data.org/v4/competitions/${code}/scorers?season=${season}`;
  try {
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': API_KEY }
    });
    const data = await response.json();
    cache.set(cacheKey, data);
    res.set('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (error) {
    console.error(`Error fetching assists for ${code} season ${season}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
