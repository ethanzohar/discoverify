require('dotenv').config()
const fetch = require("node-fetch");
const fs = require('fs');

const UserController = require('../controllers/userController');

const CLIENT_ID = process.env.SPOTIFY_API_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET;

const PLAYLIST_NAME = "Discover Daily";
const PLAYLIST_DESCRIPTION = "Daily music, curated for you based on your listening history. If you don't want to get this daily playlist anymore, you can unsubscribe at https://discoverifymusic.com";

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
    
    static async getTop(type, range, accessToken) {
        const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?limit=20&time_range=${range}`, {
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
        const allTimeArtists = await this.getTop('artists', 'long_term', access_token);
        const allTimeTracks = await this.getTop('tracks', 'long_term', access_token);

        const mediumTermArtists = await this.getTop('artists', 'medium_term', access_token);
        const mediumTermTracks = await this.getTop('tracks', 'medium_term', access_token);

        const shortTermArtists = await this.getTop('artists', 'short_term', access_token);
        const shortTermTracks = await this.getTop('tracks', 'short_term', access_token);
    
        return { allTime: { artists: allTimeArtists, tracks : allTimeTracks},
                 mediumTerm: { artists: mediumTermArtists, tracks : mediumTermTracks},
                 shortTerm: { artists: shortTermArtists, tracks : shortTermTracks},   
               }
    }
    
    static getSeeds(user, top) {
        const artists = [];
        const tracks = [];

        for (let i = 0; i < user.playlistOptions.seeds.length; i += 1) {
            switch (user.playlistOptions.seeds[i]){
                case 'AT':
                    if (top.allTime.tracks.length > 0) {
                        const index = Math.floor(Math.random() * top.allTime.tracks.length);
                        tracks.push(top.allTime.tracks[index]);
                        top.allTime.tracks.splice(index, 1);
                    }
                    break;
                case 'MT':
                    if (top.mediumTerm.tracks.length > 0) {
                        const index = Math.floor(Math.random() * top.mediumTerm.tracks.length);
                        tracks.push(top.mediumTerm.tracks[index]);
                        top.mediumTerm.tracks.splice(index, 1);
                    }
                    break;
                case 'ST':
                    if (top.shortTerm.tracks.length > 0) {
                        const index = Math.floor(Math.random() * top.shortTerm.tracks.length);
                        tracks.push(top.shortTerm.tracks[index]);
                        top.shortTerm.tracks.splice(index, 1);
                    }
                    break;
                case 'AA':
                    if (top.allTime.artists.length > 0) {
                        const index = Math.floor(Math.random() * top.allTime.artists.length);
                        artists.push(top.allTime.artists[index]);
                        top.allTime.artists.splice(index, 1);
                    }
                    break;
                case 'MA':
                    if (top.mediumTerm.artists.length > 0) {
                        const index = Math.floor(Math.random() * top.mediumTerm.artists.length);
                        artists.push(top.mediumTerm.artists[index]);
                        top.mediumTerm.artists.splice(index, 1);
                    }
                    break;
                case 'SA':
                    if (top.shortTerm.artists.length > 0) {
                        const index = Math.floor(Math.random() * top.shortTerm.artists.length);
                        artists.push(top.shortTerm.artists[index]);
                        top.shortTerm.artists.splice(index, 1);
                    }
                    break;
            }
        }
    
        return { artists, tracks };
    }

    static async getLiked(trackIds, accessToken) {
        const result = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackIds.join(',')}`, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        return result.json();
    }
    
    static async getTracks(user, seeds, accessToken) {
        const PLAYLIST_SIZE = 30;
        let usr = user;

        if (!user.playlistOptions) {
            usr = await UserController.restorePlaylistOptions(user.userId);
        }
    
        let url = 'https://api.spotify.com/v1/recommendations?limit=50';

        if (seeds.artists.length > 0) {
            url += `&seed_artists=${seeds.artists.join(',')}`;
        }

        if (seeds.tracks.length > 0) {
            url += `&seed_tracks=${seeds.tracks.join(',')}`;
        }

        url += `&min_acousticness=${usr.playlistOptions.acousticness[0]/100}&max_acousticness=${usr.playlistOptions.acousticness[1]/100}`;
        url += `&min_danceability=${usr.playlistOptions.danceability[0]/100}&max_danceability=${usr.playlistOptions.danceability[1]/100}`;
        url += `&min_energy=${usr.playlistOptions.energy[0]/100}&max_energy=${usr.playlistOptions.energy[1]/100}`;
        url += `&min_instrumentalness=${usr.playlistOptions.instrumentalness[0]/100}&max_instrumentalness=${usr.playlistOptions.instrumentalness[1]/100}`;
        url += `&min_popularity=${usr.playlistOptions.popularity[0]}&max_popularity=${usr.playlistOptions.popularity[1]}`;
        url += `&min_valence=${usr.playlistOptions.valence[0]/100}&max_valence=${usr.playlistOptions.valence[1]/100}`;

        const recommendations = await fetch(url, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const tracks = (await recommendations.json()).tracks;

        if (!tracks || tracks.length === 0) return [];

        const trackIds = [];
        const uris = [];
        for (let i = 0; i < tracks.length; i += 1) {
            trackIds.push(tracks[i].id);
            uris.push(tracks[i].uri);
        }

        const liked = await this.getLiked(trackIds, accessToken);

        const likedTracks = [];
        const playlistUris = [];
        for (let i = 0; i < liked.length; i += 1) {
            if (!liked[i]) {
                playlistUris.push(uris[i]);
            } else {
                likedTracks.push(uris[i]);
            }

            if (playlistUris.length >= PLAYLIST_SIZE) break;
        }

        for (let i = 0; i < PLAYLIST_SIZE - playlistUris.length && i < likedTracks.length; i += 1) {
            playlistUris.push(likedTracks[i]);
        }

        return playlistUris;
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

    static async getUser(user) {
        const accessToken = await this.getNewAccessToken(user.refreshToken);

        const result = await fetch(`https://api.spotify.com/v1/users/${user.userId}`, {
            Accepts: 'application/json',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    
        return result.json();
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

        if (!playlists || !playlists.items) {
            return false;
        }

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
    }

    static async updatePlaylist(user, playlistCover) {
        console.log(`Starting job for user: ${user.userId}`);

        const access_token = await this.getNewAccessToken(user.refreshToken);

        const tracks = this.getAllTop(access_token)
            .then((allTop) => this.getSeeds(user, allTop))
            .then((seeds) => this.getTracks(user, seeds, access_token));

        let playlist = this.getPlaylist(user.userId, user.playlistId, access_token);
        const doesMyPlaylistExist = this.doesMyPlaylistExists(user.playlistId, access_token);

        if (!(await playlist) || !(await doesMyPlaylistExist)) {
            playlist = await this.createPlaylist(user.userId, access_token);
        }

        const playlistId = (await playlist).id;

        await this.updatePlaylistTracks(playlistId, await tracks, access_token);

        user.lastUpdated = new Date();
        user.save();

        if (playlistCover) {
            await this.addPlaylistCover(playlistId, playlistCover, access_token);
        }

        console.log(`Playlist updated for user: ${user.userId}`);
    }

    static async updatePlaylists() {
        const users = await UserController.getAllUsers();
        console.log(`running ${users.length} jobs | ${new Date()}`);
        const playlistCover = 'images/playlistCover.jpeg';
        // await Promise.all(users.map(user => this.updatePlaylist(user, null)));

        for (let i = 0; i < users.length; i += 1) {
            try {
                await this.updatePlaylist(users[i], null);
            } catch (e) {
                console.log(e);
            }
        }

        console.log(`${users.length} jobs complete | ${new Date()}`);
    }

    static async updatePlaylistsNoUpdate() {
        const users = await UserController.getAllUsers();
        console.log(`running ${users.length} jobs | ${new Date()}`);
        const playlistCover = 'images/playlistCover.jpeg';
        // await Promise.all(users.map(user => this.updatePlaylist(user, null)));

        for (let i = 0; i < users.length; i += 1) {
            try {
                const user  = users[i];
                console.log(`Running no update for user: ${user.userId}`);
                const access_token = await this.getNewAccessToken(user.refreshToken);

                const tracks = await this.getAllTop(access_token)
                    .then((allTop) => this.getSeeds(user, allTop))
                    .then((seeds) => this.getTracks(user, seeds, access_token));

                console.log(tracks);
            } catch (e) {
                console.log(e);
            }
        }

        console.log(`${users.length} jobs complete | ${new Date()}`);
    }
}

module.exports = SpotifyHelper;