require('dotenv').config()
const fetch = require("node-fetch");

const CLIENT_ID = process.env.SPOTIFY_API_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET;
const PLAYLIST_ID = process.env.PLAYLIST_ID;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

class SpotifyHelper {
    static async getNewAccessToken(refreshToken) {
        var details = {
            'grant_type': 'refresh_token',
            'refresh_token': refreshToken,
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
    
    static async getTop(type, range, access_token) {
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
    
    static async getAllTop(access_token) {
        let allTimeArtists = await getTop('artists', 'medium_term', access_token);
        let curArtists = await getTop('artists', 'short_term', access_token);
        let allTimeTracks = await getTop('tracks', 'medium_term', access_token);
        let curTracks = await getTop('tracks', 'short_term', access_token);
    
        return [allTimeArtists, curArtists, allTimeTracks, curTracks];
    }
    
    static async getSeeds(top) {
        let allTimeArtistsPick = top[0][Math.floor(Math.random() * top[0].length)];
        let curArtistsPick = top[1][Math.floor(Math.random() * top[1].length)];
        let allTimeTracksPick = top[2][Math.floor(Math.random() * top[2].length)];
        let curTracksPick = top[3][Math.floor(Math.random() * top[3].length)];
    
        return [allTimeArtistsPick, curArtistsPick, allTimeTracksPick, curTracksPick];
    }
    
    static async getTracks(seeds, access_token) {
        const LIMIT = 50;
    
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
    
    static async clearPlaylist(playlistId, access_token) {
        let result = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + access_token
            }
        })
    
        let resultJSON = await result.json();
    
        let tracksInPlaylist = resultJSON.tracks.items.map(x => { return { 'uri': x.track.uri }; });
    
        await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
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
    
    static async addToPlaylist(playlistId, tracks, access_token) {
        await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
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

    static async updatePlaylist() {
        const access_token = await this.getNewAccessToken(REFRESH_TOKEN);
        console.log("Got access token")
        const allTop = await this.getAllTop(access_token);
        console.log("Got all top");
        const seeds = await this.getSeeds(allTop);
        console.log("Got seeds");
        const tracks = await this.getTracks(seeds, access_token);
        console.log("Got tracks");
        await this.clearPlaylist(PLAYLIST_ID, access_token);
        console.log("Playlist cleared");
        await this.addToPlaylist(PLAYLIST_ID, tracks, access_token);
        console.log("Playlist updated");
    }
}

module.exports = SpotifyHelper;