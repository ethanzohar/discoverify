require('dotenv').config()
const cron = require('node-cron');const fetch = require("node-fetch");

const CLIENT_ID = process.env.SPOTIFY_API_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET;
const PLAYLIST_ID = process.env.PLAYLIST_ID;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

// 1. get top artists
// 2. pick one of the stop artists to seed off of
// 3. find artists similar to seed artist

async function getNewAccessToken() {
    var details = {
        'grant_type': 'refresh_token',
        'refresh_token': REFRESH_TOKEN,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET
    }

    var formBody = [];
    for (var property in details) {
        var encodedKey = encodeURIComponent(property);
        var encodedValue = encodeURIComponent(details[property]);
        formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");

    let result = await fetch(`https://accounts.spotify.com/api/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody
    });

    let resultJSON = await result.json();

    return resultJSON.access_token;
}

async function getTop(type, range, access_token) {
    let result = await fetch(`https://api.spotify.com/v1/me/top/${type}?limit=25&time_range=${range}`, {
        Accepts: 'application/json',
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + access_token
        }
    });

    let resultJSON = await result.json();

    return resultJSON.items.map(x => x.id);
}

async function getAllTop(access_token) {
    let allTimeArtists = await getTop('artists', 'long_term', access_token);
    let curArtists = await getTop('artists', 'short_term', access_token);
    let allTimeTracks = await getTop('tracks', 'long_term', access_token);
    let curTracks = await getTop('tracks', 'short_term', access_token);

    return [allTimeArtists, curArtists, allTimeTracks, curTracks];
}

async function getSeeds(top) {
    let allTimeArtistsPick = top[0][Math.floor(Math.random() * top[0].length)];
    let curArtistsPick = top[1][Math.floor(Math.random() * top[1].length)];
    let allTimeTracksPick = top[2][Math.floor(Math.random() * top[2].length)];
    let curTracksPick = top[3][Math.floor(Math.random() * top[3].length)];

    return [allTimeArtistsPick, curArtistsPick, allTimeTracksPick, curTracksPick];
}

async function getTracks(seeds, access_token) {
    const LIMIT = 40;

    let url = `https://api.spotify.com/v1/recommendations?limit=${LIMIT}&min_popularity=15`;
    url += `&seed_artists=${seeds[0]},${seeds[1]}`;
    url += `&seed_track=${seeds[2]},${seeds[3]}`;

    let recommendations = await fetch(url, {
        Accepts: 'application/json',
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + access_token
        }
    });

    let recommendationsJSON = await recommendations.json();

    return recommendationsJSON.tracks.map(x => x.uri);
}

async function clearPlaylist(access_token) {
    let result = await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}`, {
        Accepts: 'application/json',
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + access_token
        }
    })

    let resultJSON = await result.json();

    let tracksInPlaylist = resultJSON.tracks.items.map(x => { return { 'uri': x.track.uri }; });

    await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + access_token
        },
        body: JSON.stringify({
            'tracks': tracksInPlaylist
        })
    })
}

async function addToPlaylist(tracks, access_token) {
    await fetch(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + access_token
        },
        body: JSON.stringify({
            'uris': tracks
        })
    })
}

async function updatePlaylist() {
    const access_token = await getNewAccessToken();
    console.log("Got access token")
    const allTop = await getAllTop(access_token);
    console.log("Got all top");
    const seeds = await getSeeds(allTop);
    console.log("Got seeds");
    const tracks = await getTracks(seeds, access_token);
    console.log("Got tracks");
    await clearPlaylist(access_token);
    console.log("Playlist cleared");
    await addToPlaylist(tracks, access_token);
    console.log("Playlist updated");
}

// cron.schedule('25 21 * * *', () => {
//     console.log("Starting job");
//     updatePlaylist();
// });


    updatePlaylist();