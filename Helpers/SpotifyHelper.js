require('dotenv').config()
const fetch = require("node-fetch");
const fs = require('fs');

const UserController = require('../controllers/userController');

const CLIENT_ID = process.env.SPOTIFY_API_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET;

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
    
        console.log("Got access token")
        return resultJSON.access_token;
    }
    
    static async getTop(type, range, accessToken) {
        const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?limit=25&time_range=${range}`, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
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
    
        console.log("Got all top");
        return [allTimeArtists, curArtists, allTimeTracks, curTracks];
    }
    
    static getSeeds(top) {
        const allTimeArtistsPick = top[0][Math.floor(Math.random() * top[0].length)];
        const curArtistsPick = top[1][Math.floor(Math.random() * top[1].length)];
        const allTimeTracksPick = top[2][Math.floor(Math.random() * top[2].length)];
        const curTracksPick = top[3][Math.floor(Math.random() * top[3].length)];
    
        console.log("Got seeds");
        return [allTimeArtistsPick, curArtistsPick, allTimeTracksPick, curTracksPick];
    }
    
    static async getTracks(seeds, accessToken) {
        const LIMIT = 50;
    
        let url = `https://api.spotify.com/v1/recommendations?limit=${LIMIT}&min_popularity=15`;
        url += `&seed_artists=${seeds[0]},${seeds[1]}`;
        url += `&seed_track=${seeds[2]},${seeds[3]}`;
    
        const recommendations = await fetch(url, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const uris = (await recommendations.json()).tracks.map(x => x.uri);

        console.log("Got tracks");
        return uris;
    }
    
    static async clearPlaylist(playlistId, accessToken) {
        const result = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
    
        const resultJSON = await result.json();
    
        const tracksInPlaylist = resultJSON.tracks.items.map(x => { return { 'uri': x.track.uri }; });
    
        await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                'tracks': tracksInPlaylist
            })
        })
    }
    
    static async updatePlaylistTracks(playlistId, tracks, accessToken) {
        await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                'uris': tracks
            })
        })
    }

    static async getPlaylist(userId, playlistId, accessToken) {
        if (!playlistId) return null;

        const result = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    
        let resultJSON = await result.json();

        return resultJSON.owner.id === userId ? resultJSON : null;
    }

    static async createPlaylist(userId, accessToken) {
        const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
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

    static async getMe(accessToken) {
        const response = await fetch('https://api.spotify.com/v1/me', {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        return response.json();
    }

    static async getUserPlaylists(accessToken) {
        const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        return response.json();
    }

    static async getGenericFetch(uri, accessToken) {
        const response = await fetch(uri, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        return response.json();
    }

    static async doesMyPlaylistExists(playlistId, accessToken) {
        let playlists = await this.getUserPlaylists(accessToken);
        let next = playlists.next;

        do {
            for (let i = 0; i < playlists.items.length; ++i) {
                if (playlists.items[i].id === playlistId) {
                    return true;
                }
            }

            if (next) {
                playlists = await this.getGenericFetch(next, accessToken);
                next = playlists.next;
            }
        } while (next);

        return false;
    }

    static async addPlaylistCover(playlistId, encodedImage, accessToken) {
        await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/images`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'image/jpeg',
                'Authorization': `Bearer ${accessToken}`
            },
            body: fs.createReadStream(encodedImage)
        })
        
        console.log('Playlist image added');
    }

    static async updatePlaylist(user, playlistCover) {
        console.log(`Starting job for user: ${user.userId}`);

        const access_token = await this.getNewAccessToken(user.refreshToken);

        const tracks = this.getAllTop(access_token)
            .then((allTop) => this.getSeeds(allTop))
            .then((seeds) => this.getTracks(seeds, access_token));

        const doesMyPlaylistExist = this.doesMyPlaylistExists(user.playlistId, access_token);
        let playlist = this.getPlaylist(user.userId, user.playlistId, access_token);

        if (!(await playlist) || !(await doesMyPlaylistExist)) {
            playlist = await this.createPlaylist(user.userId, access_token);
        }

        const playlistId = (await playlist).id;

        await this.updatePlaylistTracks(playlistId, await tracks, access_token);

        if (playlistCover) {
            await this.addPlaylistCover(playlistId, playlistCover, access_token);
        }

        console.log(`Playlist updated for user: ${user.userId}`);
    }

    static async updatePlaylists() {
        const users = await UserController.getAllUsers();
        const playlistCover = 'images/playlistCover.jpeg';
        await Promise.all(users.map(user => this.updatePlaylist(user, null)));
        console.log("All jobs complete");
    }
}

module.exports = SpotifyHelper;