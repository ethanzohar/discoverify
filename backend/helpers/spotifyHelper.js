/* eslint-disable no-restricted-syntax */
require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

const UserController = require('../controllers/userController');

const CLIENT_ID = process.env.SPOTIFY_API_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET;

const PLAYLIST_NAME = 'Discover Daily';
const PLAYLIST_DESCRIPTION =
  "Daily music, curated for you based on your listening history. If you don't want to get this daily playlist anymore, you can unsubscribe at https://discoverifymusic.com";

class SpotifyHelper {
  static async getNewAccessToken(refreshToken) {
    const details = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    };

    let formBody = [];
    // eslint-disable-next-line guard-for-in
    for (const property in details) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(details[property]);
      formBody.push(`${encodedKey}=${encodedValue}`);
    }
    formBody = formBody.join('&');

    const result = await fetch(`https://accounts.spotify.com/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });

    const resultJSON = await result.json();
    return resultJSON.access_token;
  }

  static async getRefreshToken(code, redirectUri) {
    const details = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    };

    let formBody = [];
    // eslint-disable-next-line guard-for-in
    for (const property in details) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(details[property]);
      formBody.push(`${encodedKey}=${encodedValue}`);
    }
    formBody = formBody.join('&');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });

    return response.json();
  }

  static async getTop(type, range, accessToken) {
    try {
      const result = await fetch(
        `https://api.spotify.com/v1/me/top/${type}?limit=20&time_range=${range}`,
        {
          Accepts: 'application/json',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const resultJSON = await result.json();

      return resultJSON.items.map((x) => x.id);
    } catch (e) {
      const result = await fetch(
        `https://api.spotify.com/v1/me/top/${type}?limit=20&time_range=${range}`,
        {
          Accepts: 'application/json',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const resultJSON = await result.json();

      return resultJSON.items.map((x) => x.id);
    }
  }

  // eslint-disable-next-line camelcase
  static async getAllTop(user, access_token) {
    const allTimeArtists = user.playlistOptions.seeds.includes('AA')
      ? await this.getTop('artists', 'long_term', access_token)
      : null;
    const allTimeTracks = user.playlistOptions.seeds.includes('AT')
      ? await this.getTop('tracks', 'long_term', access_token)
      : null;

    const mediumTermArtists = user.playlistOptions.seeds.includes('MA')
      ? await this.getTop('artists', 'medium_term', access_token)
      : null;
    const mediumTermTracks = user.playlistOptions.seeds.includes('MT')
      ? await this.getTop('tracks', 'medium_term', access_token)
      : null;

    const shortTermArtists = user.playlistOptions.seeds.includes('SA')
      ? await this.getTop('artists', 'short_term', access_token)
      : null;
    const shortTermTracks = user.playlistOptions.seeds.includes('ST')
      ? await this.getTop('tracks', 'short_term', access_token)
      : null;

    return {
      allTime: { artists: allTimeArtists, tracks: allTimeTracks },
      mediumTerm: { artists: mediumTermArtists, tracks: mediumTermTracks },
      shortTerm: { artists: shortTermArtists, tracks: shortTermTracks },
    };
  }

  static getSeeds(user, top) {
    const artists = [];
    const tracks = [];

    for (let i = 0; i < user.playlistOptions.seeds.length; i += 1) {
      switch (user.playlistOptions.seeds[i]) {
        case 'AT':
          if (top.allTime.tracks.length > 0) {
            const index = Math.floor(Math.random() * top.allTime.tracks.length);
            tracks.push(top.allTime.tracks[index]);
            top.allTime.tracks.splice(index, 1);
          }
          break;
        case 'MT':
          if (top.mediumTerm.tracks.length > 0) {
            const index = Math.floor(
              Math.random() * top.mediumTerm.tracks.length
            );
            tracks.push(top.mediumTerm.tracks[index]);
            top.mediumTerm.tracks.splice(index, 1);
          }
          break;
        case 'ST':
          if (top.shortTerm.tracks.length > 0) {
            const index = Math.floor(
              Math.random() * top.shortTerm.tracks.length
            );
            tracks.push(top.shortTerm.tracks[index]);
            top.shortTerm.tracks.splice(index, 1);
          }
          break;
        case 'AA':
          if (top.allTime.artists.length > 0) {
            const index = Math.floor(
              Math.random() * top.allTime.artists.length
            );
            artists.push(top.allTime.artists[index]);
            top.allTime.artists.splice(index, 1);
          }
          break;
        case 'MA':
          if (top.mediumTerm.artists.length > 0) {
            const index = Math.floor(
              Math.random() * top.mediumTerm.artists.length
            );
            artists.push(top.mediumTerm.artists[index]);
            top.mediumTerm.artists.splice(index, 1);
          }
          break;
        case 'SA':
          if (top.shortTerm.artists.length > 0) {
            const index = Math.floor(
              Math.random() * top.shortTerm.artists.length
            );
            artists.push(top.shortTerm.artists[index]);
            top.shortTerm.artists.splice(index, 1);
          }
          break;
        default:
          throw new Error(
            `Unexpected seed value found: ${user.playlistOptions.seeds[i]}`
          );
      }
    }

    return { artists, tracks };
  }

  static async getLiked(trackIds, accessToken) {
    const result = await fetch(
      `https://api.spotify.com/v1/me/tracks/contains?ids=${trackIds.join(',')}`,
      {
        Accepts: 'application/json',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

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

    url += `&min_acousticness=${
      usr.playlistOptions.acousticness[0] / 100
    }&max_acousticness=${usr.playlistOptions.acousticness[1] / 100}`;
    url += `&min_danceability=${
      usr.playlistOptions.danceability[0] / 100
    }&max_danceability=${usr.playlistOptions.danceability[1] / 100}`;
    url += `&min_energy=${usr.playlistOptions.energy[0] / 100}&max_energy=${
      usr.playlistOptions.energy[1] / 100
    }`;
    url += `&min_instrumentalness=${
      usr.playlistOptions.instrumentalness[0] / 100
    }&max_instrumentalness=${usr.playlistOptions.instrumentalness[1] / 100}`;
    url += `&min_popularity=${usr.playlistOptions.popularity[0]}&max_popularity=${usr.playlistOptions.popularity[1]}`;
    url += `&min_valence=${usr.playlistOptions.valence[0] / 100}&max_valence=${
      usr.playlistOptions.valence[1] / 100
    }`;

    let recommendations = await fetch(url, {
      Accepts: 'application/json',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let responseJSON;
    try {
      responseJSON = await recommendations.json();
    } catch (e) {
      // eslint-disable-next-line no-use-before-define
      console.log(responseJSON);
      console.log(e);

      await new Promise((r) => setTimeout(r, 1000));

      recommendations = await fetch(url, {
        Accepts: 'application/json',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      responseJSON = await recommendations.json();
    }

    const tracks = responseJSON.tracks || [];

    const trackIds = [];
    const uris = [];
    for (let i = 0; i < tracks.length; i += 1) {
      trackIds.push(tracks[i].id);
      uris.push(tracks[i].uri);
    }

    const liked =
      tracks.length === 0 ? [] : await this.getLiked(trackIds, accessToken);

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

    if (playlistUris.length < PLAYLIST_SIZE) {
      url = 'https://api.spotify.com/v1/recommendations?limit=50';

      if (seeds.artists.length > 0) {
        url += `&seed_artists=${seeds.artists.join(',')}`;
      }

      if (seeds.tracks.length > 0) {
        url += `&seed_tracks=${seeds.tracks.join(',')}`;
      }

      url += `&target_acousticness=${
        (usr.playlistOptions.acousticness[0] +
          usr.playlistOptions.acousticness[1]) /
        200
      }`;
      url += `&target_danceability=${
        (usr.playlistOptions.danceability[0] +
          usr.playlistOptions.danceability[1]) /
        200
      }`;
      url += `&target_energy=${
        (usr.playlistOptions.energy[0] + usr.playlistOptions.energy[1]) / 200
      }`;
      url += `&target_instrumentalness=${
        (usr.playlistOptions.instrumentalness[0] +
          usr.playlistOptions.instrumentalness[1]) /
        200
      }`;
      url += `&target_popularity=${Math.round(
        (usr.playlistOptions.popularity[0] +
          usr.playlistOptions.popularity[1]) /
          2
      )}`;
      url += `&target_valence=${
        (usr.playlistOptions.valence[0] + usr.playlistOptions.valence[1]) / 200
      }`;

      const targetRecommendations = await fetch(url, {
        Accepts: 'application/json',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const targetResponseJSON = await targetRecommendations.json();
      const targetTracks = targetResponseJSON.tracks || [];

      if (targetTracks.length === 0) {
        return [];
      }

      const targetTrackIds = [];
      const targetUris = [];
      for (let i = 0; i < targetTracks.length; i += 1) {
        targetTrackIds.push(targetTracks[i].id);
        targetUris.push(targetTracks[i].uri);
      }

      const targetLiked = await this.getLiked(targetTrackIds, accessToken);

      for (let i = 0; i < targetLiked.length; i += 1) {
        if (!targetLiked[i]) {
          if (!playlistUris.includes(targetUris[i])) {
            playlistUris.push(targetUris[i]);
          }
        } else if (!likedTracks.includes(targetUris[i])) {
          likedTracks.push(targetUris[i]);
        }

        if (playlistUris.length >= PLAYLIST_SIZE) break;
      }
    }

    for (
      let i = 0;
      i < PLAYLIST_SIZE - playlistUris.length && i < likedTracks.length;
      i += 1
    ) {
      playlistUris.push(likedTracks[i]);
    }

    return playlistUris;
  }

  static async updatePlaylistTracks(playlistId, tracks, accessToken) {
    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        uris: tracks,
      }),
    });
  }

  static async getPlaylist(userId, playlistId, accessToken) {
    if (!playlistId) return null;

    let resultJSON;
    try {
      const result = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
        {
          Accepts: 'application/json',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      resultJSON = await result.json();

      return resultJSON.owner.id === userId ? resultJSON : null;
    } catch (e) {
      console.log(resultJSON);
      console.log(e);

      const result = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
        {
          Accepts: 'application/json',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      resultJSON = await result.json();

      return resultJSON.owner.id === userId ? resultJSON : null;
    }
  }

  static async createPlaylist(user, accessToken) {
    const response = await fetch(
      `https://api.spotify.com/v1/users/${user.userId}/playlists`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: PLAYLIST_NAME,
          public: false,
          description: PLAYLIST_DESCRIPTION,
        }),
      }
    );

    const responseJSON = await response.json();

    user.playlistId = responseJSON.id;

    return responseJSON;
  }

  static async getMe(accessToken) {
    const response = await fetch('https://api.spotify.com/v1/me', {
      Accepts: 'application/json',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.json();
  }

  static async getUser(user) {
    const accessToken = await this.getNewAccessToken(user.refreshToken);

    const result = await fetch(
      `https://api.spotify.com/v1/users/${user.userId}`,
      {
        Accepts: 'application/json',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return result.json();
  }

  static async getUserPlaylists(accessToken) {
    const response = await fetch(
      'https://api.spotify.com/v1/me/playlists?limit=50',
      {
        Accepts: 'application/json',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.json();
  }

  static async getGenericFetch(uri, accessToken) {
    const response = await fetch(uri, {
      Accepts: 'application/json',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.json();
  }

  static async doesMyPlaylistExists(playlistId, accessToken) {
    let playlists = await this.getUserPlaylists(accessToken);

    if (!playlists || !playlists.items) {
      return false;
    }

    let { next } = playlists;

    do {
      for (let i = 0; i < playlists.items.length; i += 1) {
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
        Authorization: `Bearer ${accessToken}`,
      },
      body: fs.createReadStream(encodedImage),
    });
  }

  static async updatePlaylist(user, playlistCover) {
    console.log(`Starting job for user: ${user.userId}`);

    try {
      const accessToken = await this.getNewAccessToken(user.refreshToken);

      const tracks = this.getAllTop(user, accessToken)
        .then((allTop) => this.getSeeds(user, allTop))
        .then((seeds) => this.getTracks(user, seeds, accessToken));

      let playlist = this.getPlaylist(
        user.userId,
        user.playlistId,
        accessToken
      );
      const doesMyPlaylistExist = this.doesMyPlaylistExists(
        user.playlistId,
        accessToken
      );

      if (!(await playlist) || !(await doesMyPlaylistExist)) {
        playlist = await this.createPlaylist(user, accessToken);
        console.log('Had to create new playlist');
      }

      const playlistId = (await playlist).id;

      console.log(`${(await tracks).length} tracks found`);

      this.updatePlaylistTracks(playlistId, await tracks, accessToken);

      user.lastUpdated = new Date();
      user.save();

      if (playlistCover) {
        await this.addPlaylistCover(playlistId, playlistCover, accessToken);
      }

      console.log(`Playlist updated for user: ${user.userId}`);
    } catch (e) {
      console.log(e);
    }

    console.log(' ');
  }

  static async updatePlaylists() {
    const users = await UserController.getAllUsers();
    console.log(`running ${users.length} jobs | ${new Date()}`);
    // const playlistCover = 'images/playlistCover.jpeg';
    // await Promise.all(users.map(user => this.updatePlaylist(user, null)));

    const failures = [];
    for (let i = 0; i < users.length; i += 1) {
      try {
        console.log(`${i + 1}/${users.length}`);
        await this.updatePlaylist(users[i], null);
      } catch (e) {
        console.log(e);
        failures.push(users[i]);
      }
    }

    console.log();
    console.log(`running ${failures.length} failure jobs | ${new Date()}`);
    for (let i = 0; i < failures.length; i += 1) {
      try {
        console.log(`${i + 1}/${failures.length}`);
        await this.updatePlaylist(failures[i], null);
      } catch (e) {
        console.log(e);
      }
    }

    console.log(`${users.length} jobs complete | ${new Date()}`);
  }

  static async updatePlaylistsNoUpdate() {
    const users = await UserController.getAllUsers();
    console.log(`running ${users.length} jobs | ${new Date()}`);
    // const playlistCover = 'images/playlistCover.jpeg';
    // await Promise.all(users.map(user => this.updatePlaylist(user, null)));

    for (let i = 0; i < users.length; i += 1) {
      try {
        const user = users[i];
        console.log(`Running no update for user: ${user.userId}`);
        const accessToken = await this.getNewAccessToken(user.refreshToken);

        const tracks = this.getAllTop(user, accessToken)
          .then((allTop) => this.getSeeds(user, allTop))
          .then((seeds) => this.getTracks(user, seeds, accessToken));

        const playlist = this.getPlaylist(
          user.userId,
          user.playlistId,
          accessToken
        );
        const doesMyPlaylistExist = this.doesMyPlaylistExists(
          user.playlistId,
          accessToken
        );

        if (!(await playlist) || !(await doesMyPlaylistExist)) {
          console.log('HAD TO CREATE NEW PLAYLIST');
        }

        const playlistId = (await playlist).id;

        console.log(`${(await tracks).length} tracks found`);
        console.log('Playlist ID', playlistId);
        console.log('PLAYLIST EXISTS', await doesMyPlaylistExist);

        console.log(' ');
      } catch (e) {
        console.log(e);
      }
    }

    console.log(`${users.length} jobs complete | ${new Date()}`);
  }
}

module.exports = SpotifyHelper;
