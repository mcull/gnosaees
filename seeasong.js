import { OpenAI } from 'openai';
import { image as downloadImage } from 'image-downloader';
import { getChart } from 'billboard-top-100';
import { getLyrics } from 'genius-lyrics-api';
import filenamify from 'filenamify';
import { readFileSync, writeFileSync } from 'fs';
import dayjs from 'dayjs' 
import fetch from 'node-fetch';
const today = dayjs().format()

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = __dirname + '/songs.json';
const songsJSON = readFileSync(jsonPath);
let db = JSON.parse(songsJSON);

import "dotenv/config.js";

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], 
});
  

let imageOptions = {
    url: 'http://someurl.com/image.jpg',
    dest: '/path/to/dest',               // will be saved to /path/to/dest/image.jpg
}; 

const promptCarousel = 
["award-winning photograph, Sigma 85 mm f/8, Slow Shutter Speed, Golden Hour Lighting, Uneven skin tone",
"Canon EOS 1000D, ƒ/3.5, focal length: 18.0 mm, exposure time: 1/5, ISO 400, flash on, photograph of a photograph",
"grainy expired film photo photograph from a magazine shoot ",
"a slightly blurry black and white photograph medium distance high contrast of a puppet show",
"child's drawing ",
"stencil ",
"Art Nouveau poster art ",
"old timey newspaper ",
"vintage advertisement ",
"vintage postcard ",
"glitchy VHS tape playing on an old 1980s CRT television with a VHS player ",
"a tattoo",
"Autochrome Lumière photograph ",
"Surveillance & CCTV footage ",
"Daguerrotype",
"Disposable camera photograph ",
"Vintage Polaroid photograph ",
"Vintage 35mm photograph ",
"Double exposure",
"Drone photography",
"Fashion photography",  
"Film noir",
"Found photography",
"High dynamic range imaging",
"High-speed photography",
"Instant film",
"Kinetic photography",
"Light painting",
"Low-key photography",
"Macro photography",
"Flash, harsh flash",
"Lomography",
"Long-exposure photography",
"Pinhole photography, camera obscura",
"knitted into a sweater",
"as a mideval tapestry",
"as a mosaic",
"as a stained glass window",
"as a wood carving",
"as a sculpture",
"as an impressionist painting",
"as a surrealist painting",
"as a cubist painting",
"as newspaper editorial cartoon",
"as mural on the side of a brick building",
"as a watercolor painting",
"in the style of a silent movie",
"in the style of a film noir",
"claymation",
"stop motion",
"as a charcoal drawing",
"with felt animal characters",
"as a 1970's arcade game",
"as a 1980's arcade game",
"as a 1990's arcade game",
"as a first person shooter video game",
"as a role playing game",
"as a real time strategy game",
"as a board game",
"in the style of a subway poster",
"in the style of a movie poster",
"in the style of a concert poster",
"in the style of a political campaign poster",
"in the style of a soviet propaganda poster",
"in the style of a renaissance painting",
"as a sand painting",
"made out of watch parts",
"made from legos",
"made from paper mache",
"made from recycled materials",
"made from found objects",
"made from food"

]

const DELAY = 1000*15;
const applyStyle = true;
let drawings = 0;

function drawSong(title, artist, delay) {
    setTimeout(() => {
        console.log(`Title: ${title} Artist: ${artist}`);
        if (!db.songs.find(song => song.title === title && song.artist === artist)) {
            try {
                let songOptions = {
                    apiKey: process.env.GENIUS_API_KEY,
                    title: title,
                    artist: artist,
                    optimizeQuery: true
                };
                getLyrics(songOptions).then(async (lyrics) => 
                {
                    console.log("got lyrics!");
                    let image = null;
                    let filename = null;
                    let url = null;
                    let error = null;
                    let revisedPrompt = null
                    
                    try {
                        let prompt = ` about ${title} by ${artist} that captures the tone and essential message of the following lyrics without using any typographical elements  ${lyrics}`;
                        if (applyStyle) {
                            let style = `${promptCarousel[Math.floor(Math.random() * promptCarousel.length)]}`;
                            console.log(style);
                            prompt = `${style} of ${prompt}`;
                        }
                       
                        image = await openai.images.generate({ 
                            model: "dall-e-3",
                            prompt: prompt,
                            n: 1,
                            size: "1024x1024"
                        });
                        revisedPrompt = image.data[0].revised_prompt
                        url = image.data[0].url;
                        console.log(`got image ${url}`);
                        filename = `${__dirname}/images/${filenamify(title + '_' + artist + '_' + today + '.png')}`;
                        downloadImage({'url':url, 'dest': filename}).then(({ filename }) => {
                            console.log('Saved to', filename); 
                        }).catch((err) => console.error(err));
                    } catch (openAIError) { 
                        error = openAIError;
                        console.log(error);
                        console.log('Moving on to the next song');
                    }
                    db.songs.push({renderDate: today, title: title, artist: artist, lyrics: lyrics, image: filename, url: url, rewrittenPrompt: revisedPrompt, error: error});
                    writeFileSync(jsonPath, JSON.stringify(db, null, 2), 'utf8');
                    drawings++;
                });
            } catch (lyricsError) {
                console.log(lyricsError);
            }
        } else {
            console.log("Already have this song in the database")
        }
    }, delay);
}

function drawTop100Songs() {
    getChart('hot-100', '2024-02-24', (err, chart) => {
        if (drawings > 0) { return; }
        if (err) console.log(err);
        chart.songs.forEach((song, i) => {
            const title = song.title;
            const artist = song.artist;
            drawSong(title, artist, i*DELAY);
        });
    });
}

function drawAlbum(albumName, artistName) {
    (async () => {
        try {
            const request = `https://api.deezer.com/search?q=artist:"${artistName}" album:"${albumName}"`
            const response = await fetch(request);
            const data = await response.json();
            let alreadyFound = false;
            console.log(request);
            data.data.forEach((album, i) => {
                if (alreadyFound || album.album.title !== albumName) { return; }
                alreadyFound = true;
                const tracks = album.album.tracklist;
                (async () => {
                    try {
                        const prettyTracks = [];
                        const tracklist = await fetch(tracks);
                        const tracksData = await tracklist.json();
                        tracksData.data.forEach((track, i) => {
                            const title = track.title;
                            prettyTracks.push(`${i}. ${title}`);
                            drawSong(title, artistName, i*DELAY);
                        });
                        console.log(prettyTracks);
                    } catch (error) {
                        console.log(error);
                    }
                })();
            });
        } catch (error) {
            console.log(error);
        }
    })();   
}


const strategy = process.argv[2];
if (strategy === 'top100') {
    drawTop100Songs();
} else if (strategy.startsWith('album')) {
    const albumDetails = strategy.split(':')[1];
    const artistName = albumDetails.split('_')[0];
    const albumName = albumDetails.split('_')[1];
    drawAlbum(albumName, artistName);
} else if (strategy.startsWith('song')) {
    const songDetails = strategy.split(':')[1];
    const artistName = songDetails.split('_')[0];
    const songName = songDetails.split('_')[1];
    drawSong(songName, artistName, 0);
} else {
    console.log("Usage: node seeasong.js [top100|album:albumName_artistName]")
}


