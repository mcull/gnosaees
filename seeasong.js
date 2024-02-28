const { getChart } = require('billboard-top-100');
const { getLyrics } = require('genius-lyrics-api');
require('dotenv').config();

console.log("GENIUS:", process.env.GENIUS_API_KEY);