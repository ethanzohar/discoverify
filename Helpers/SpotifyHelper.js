require('dotenv').config()
const fetch = require("node-fetch");
const UserController = require('../controllers/userController');

const CLIENT_ID = process.env.SPOTIFY_API_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET;
const PLAYLIST_ID = process.env.PLAYLIST_ID;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const PLAYLIST_NAME = "Discover Daily";
const PLAYLIST_DESCRIPTION = "Here is the playlist description."

class SpotifyHelper {
    static async getNewAccessToken(refreshToken) {
        const details = {
            'grant_type': 'refresh_token',
            'refresh_token': refreshToken,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET
        }
    
        let formBody = [];
        for (var property in details) {
            var encodedKey = encodeURIComponent(property);
            var encodedValue = encodeURIComponent(details[property]);
            formBody.push(encodedKey + "=" + encodedValue);
        }
        formBody = formBody.join("&");
    
        const result = await fetch(`https://accounts.spotify.com/api/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formBody
        });
    
        const resultJSON = await result.json();
    
        return resultJSON.access_token;
    }
    
    static async getTop(type, range, access_token) {
        const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?limit=25&time_range=${range}`, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + access_token
            }
        });
    
        const resultJSON = await result.json();
    
        return resultJSON.items.map(x => x.id);
    }
    
    static async getAllTop(access_token) {
        const allTimeArtists = await this.getTop('artists', 'medium_term', access_token);
        const curArtists = await this.getTop('artists', 'short_term', access_token);
        const allTimeTracks = await this.getTop('tracks', 'medium_term', access_token);
        const curTracks = await this.getTop('tracks', 'short_term', access_token);
    
        return [allTimeArtists, curArtists, allTimeTracks, curTracks];
    }
    
    static getSeeds(top) {
        const allTimeArtistsPick = top[0][Math.floor(Math.random() * top[0].length)];
        const curArtistsPick = top[1][Math.floor(Math.random() * top[1].length)];
        const allTimeTracksPick = top[2][Math.floor(Math.random() * top[2].length)];
        const curTracksPick = top[3][Math.floor(Math.random() * top[3].length)];
    
        return [allTimeArtistsPick, curArtistsPick, allTimeTracksPick, curTracksPick];
    }
    
    static async getTracks(seeds, access_token) {
        const LIMIT = 50;
    
        let url = `https://api.spotify.com/v1/recommendations?limit=${LIMIT}&min_popularity=15`;
        url += `&seed_artists=${seeds[0]},${seeds[1]}`;
        url += `&seed_track=${seeds[2]},${seeds[3]}`;
    
        const recommendations = await fetch(url, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + access_token
            }
        });
    
        const recommendationsJSON = await recommendations.json();
    
        return recommendationsJSON.tracks.map(x => x.uri);
    }
    
    static async clearPlaylist(playlistId, access_token) {
        const result = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + access_token
            }
        })
    
        const resultJSON = await result.json();
    
        const tracksInPlaylist = resultJSON.tracks.items.map(x => { return { 'uri': x.track.uri }; });
    
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
    
    static async updatePlaylistTracks(playlistId, tracks, access_token) {
        await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + access_token
            },
            body: JSON.stringify({
                'uris': tracks
            })
        })
    }

    static async getPlaylist(userId, playlistId, access_token) {
        if (!playlistId) return null;

        const result = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + access_token
            }
        });
    
        let resultJSON = await result.json();

        return resultJSON.owner.id === userId ? resultJSON : null;
    }

    static async createPlaylist(userId, access_token) {
        const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + access_token
            },
            body: JSON.stringify({
                name: PLAYLIST_NAME,
                public: false,
                description: PLAYLIST_DESCRIPTION
            })
        })

        const responseJSON = await response.json();

        const user = await UserController.getUser(userId);
        user.playlistId = responseJSON.id;
        user.save();

        return responseJSON;
    }

    static async updatePlaylists(users) {
        await Promise.all(users.map(user => this.updatePlaylist(user)));
        console.log("All jobs complete");
    }

    static async updatePlaylist(user) {
        console.log(`Starting job for user: ${user.userId}`);
        const access_token = await this.getNewAccessToken(user.refreshToken);
        console.log("Got access token")
        const allTop = await this.getAllTop(access_token);
        console.log("Got all top");
        const seeds = this.getSeeds(allTop);
        console.log("Got seeds");
        const tracks = await this.getTracks(seeds, access_token);
        console.log("Got tracks");
        
        let playlist = await this.getPlaylist(user.userId, user.playlistId, access_token);

        console.log(playlist);

        if (!playlist) {
            playlist = this.createPlaylist(user.userId, access_token);
        }

        await this.updatePlaylistTracks(playlist.id, tracks, access_token);
        console.log(`Playlist updated for user: ${user.userId}`);
    }
}

module.exports = SpotifyHelper;