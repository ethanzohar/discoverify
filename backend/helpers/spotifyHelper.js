/* eslint-disable no-restricted-syntax */
require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

const UserController = require('../controllers/userController');
const { decryptUserId } = require('./userIdCrypto');
const logger = require('./logger');

const CLIENT_ID = process.env.SPOTIFY_API_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET;

const PLAYLIST_NAME = 'Discover Daily';
const PLAYLIST_DESCRIPTION =
  "If you would like to support Discoverify, consider visiting patreon.com/discoverify (COMPLETELY OPTIONAL). Daily music, curated for you based on your listening history. If you don't want to get this daily playlist anymore, you can unsubscribe at https://discoverifymusic.com";

function SpotifyAPIException(deleteUser) {
  this.deleteUser = deleteUser;
}

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

    if (resultJSON.error === 'invalid_grant') {
      throw new SpotifyAPIException(true);
    }

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
  static async getAllTop(playlistOptions, access_token) {
    const allTimeArtists = playlistOptions.seeds.includes('AA')
      ? await this.getTop('artists', 'long_term', access_token)
      : null;
    const allTimeTracks = playlistOptions.seeds.includes('AT')
      ? await this.getTop('tracks', 'long_term', access_token)
      : null;

    const mediumTermArtists = playlistOptions.seeds.includes('MA')
      ? await this.getTop('artists', 'medium_term', access_token)
      : null;
    const mediumTermTracks = playlistOptions.seeds.includes('MT')
      ? await this.getTop('tracks', 'medium_term', access_token)
      : null;

    const shortTermArtists = playlistOptions.seeds.includes('SA')
      ? await this.getTop('artists', 'short_term', access_token)
      : null;
    const shortTermTracks = playlistOptions.seeds.includes('ST')
      ? await this.getTop('tracks', 'short_term', access_token)
      : null;

    return {
      allTime: { artists: allTimeArtists, tracks: allTimeTracks },
      mediumTerm: { artists: mediumTermArtists, tracks: mediumTermTracks },
      shortTerm: { artists: shortTermArtists, tracks: shortTermTracks },
    };
  }

  static getSeeds(playlistOptions, top) {
    const artists = [];
    const tracks = [];

    for (let i = 0; i < playlistOptions.seeds.length; i += 1) {
      switch (playlistOptions.seeds[i]) {
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
            `Unexpected seed value found: ${playlistOptions.seeds[i]}`
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

  static getRecommendationUrls(user, seeds) {
    let baseUrl = 'https://api.spotify.com/v1/recommendations?limit=50';

    if (seeds.artists.length > 0) {
      baseUrl += `&seed_artists=${seeds.artists.join(',')}`;
    }

    if (seeds.tracks.length > 0) {
      baseUrl += `&seed_tracks=${seeds.tracks.join(',')}`;
    }

    let minMaxUrl = baseUrl;
    minMaxUrl += `&min_acousticness=${
      user.playlistOptions.acousticness[0] / 100
    }&max_acousticness=${user.playlistOptions.acousticness[1] / 100}`;
    minMaxUrl += `&min_danceability=${
      user.playlistOptions.danceability[0] / 100
    }&max_danceability=${user.playlistOptions.danceability[1] / 100}`;
    minMaxUrl += `&min_energy=${
      user.playlistOptions.energy[0] / 100
    }&max_energy=${user.playlistOptions.energy[1] / 100}`;
    minMaxUrl += `&min_instrumentalness=${
      user.playlistOptions.instrumentalness[0] / 100
    }&max_instrumentalness=${user.playlistOptions.instrumentalness[1] / 100}`;
    minMaxUrl += `&min_popularity=${user.playlistOptions.popularity[0]}&max_popularity=${user.playlistOptions.popularity[1]}`;
    minMaxUrl += `&min_valence=${
      user.playlistOptions.valence[0] / 100
    }&max_valence=${user.playlistOptions.valence[1] / 100}`;

    let targetUrl = baseUrl;
    targetUrl += `&target_acousticness=${
      (user.playlistOptions.acousticness[0] +
        user.playlistOptions.acousticness[1]) /
      200
    }`;
    targetUrl += `&target_danceability=${
      (user.playlistOptions.danceability[0] +
        user.playlistOptions.danceability[1]) /
      200
    }`;
    targetUrl += `&target_energy=${
      (user.playlistOptions.energy[0] + user.playlistOptions.energy[1]) / 200
    }`;
    targetUrl += `&target_instrumentalness=${
      (user.playlistOptions.instrumentalness[0] +
        user.playlistOptions.instrumentalness[1]) /
      200
    }`;
    targetUrl += `&target_popularity=${Math.round(
      (user.playlistOptions.popularity[0] +
        user.playlistOptions.popularity[1]) /
        2
    )}`;
    targetUrl += `&target_valence=${
      (user.playlistOptions.valence[0] + user.playlistOptions.valence[1]) / 200
    }`;

    return { minMaxUrl, targetUrl };
  }

  static async getTracks(user, userId, tracksInPlaylist, seeds, accessToken) {
    const PLAYLIST_SIZE = 30;
    let usr = user;

    if (!user.playlistOptions) {
      usr = await UserController.restorePlaylistOptions(userId);
    }

    const { minMaxUrl, targetUrl } = this.getRecommendationUrls(usr, seeds);

    let recommendations = await fetch(minMaxUrl, {
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
      logger.warn(
        { event: 'spotify_recommendations_retry', err: e.message },
        'Retrying Spotify recommendations fetch'
      );

      await new Promise((r) => setTimeout(r, 1000));

      recommendations = await fetch(minMaxUrl, {
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

    const likedTracks = new Set();
    const alreadyInPlaylist = new Set();
    const playlistUris = new Set();
    for (let i = 0; i < liked.length; i += 1) {
      if (!liked[i]) {
        playlistUris.add(uris[i]);
      } else {
        likedTracks.add(uris[i]);
      }

      if (tracksInPlaylist.has(trackIds[i])) {
        alreadyInPlaylist.add(uris[i]);
      }

      if (playlistUris.size >= PLAYLIST_SIZE) break;
    }

    if (playlistUris.size < PLAYLIST_SIZE) {
      const targetRecommendations = await fetch(targetUrl, {
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
          playlistUris.add(targetUris[i]);
        } else {
          likedTracks.add(targetUris[i]);
        }

        if (tracksInPlaylist.has(targetTrackIds[i])) {
          alreadyInPlaylist.add(targetUris[i]);
        }

        if (playlistUris.size >= PLAYLIST_SIZE) break;
      }
    }

    for (const track of alreadyInPlaylist) {
      if (playlistUris.size >= PLAYLIST_SIZE) break;

      if (!likedTracks.has(track)) {
        playlistUris.add(track);
      }
    }

    for (const track of likedTracks) {
      if (playlistUris.size >= PLAYLIST_SIZE) break;

      playlistUris.add(track);
    }

    return Array.from(playlistUris);
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
      logger.warn(
        { event: 'spotify_playlist_fetch_retry', err: e.message },
        'Retrying Spotify playlist fetch'
      );

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

  static async createPlaylist(user, userId, accessToken) {
    const response = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
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
    await user.save();

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
    const userId = decryptUserId(user.userId);
    const start = Date.now();

    logger.info(
      {
        event: 'playlist_update_started',
        userId,
        stripeId: user.stripeId || null,
        playlistId: user.playlistId || null,
        grandmothered: user.grandmothered,
      },
      `Starting playlist update for user: ${userId}`
    );

    try {
      const accessToken = await this.getNewAccessToken(user.refreshToken);

      const seeds = this.getAllTop(
        user.playlistOptions,
        accessToken
      ).then((allTop) => this.getSeeds(user.playlistOptions, allTop));

      let playlist = this.getPlaylist(userId, user.playlistId, accessToken);

      const doesMyPlaylistExist = this.doesMyPlaylistExists(
        user.playlistId,
        accessToken
      );

      if (!(await playlist) || !(await doesMyPlaylistExist)) {
        playlist = await this.createPlaylist(user, userId, accessToken);
        logger.info(
          {
            event: 'playlist_created',
            userId,
            stripeId: user.stripeId || null,
          },
          'Created new Discover Daily playlist'
        );
      }

      const playlistId = (await playlist).id;
      const tracksAlreadyInPlaylist = new Set(
        (await playlist).tracks.items.map((x) => x.track.id)
      );

      const tracks = await this.getTracks(
        user,
        userId,
        tracksAlreadyInPlaylist,
        await seeds,
        accessToken
      );

      await this.updatePlaylistTracks(playlistId, tracks, accessToken);

      user.lastUpdated = new Date();
      await user.save();

      if (playlistCover) {
        await this.addPlaylistCover(playlistId, playlistCover, accessToken);
      }

      const durationMs = Date.now() - start;
      logger.info(
        {
          event: 'playlist_updated',
          userId,
          stripeId: user.stripeId || null,
          playlistId,
          grandmothered: user.grandmothered,
          trackCount: tracks.length,
          durationMs,
        },
        `Playlist updated for user: ${userId}`
      );
    } catch (e) {
      const durationMs = Date.now() - start;

      if (e.deleteUser) {
        logger.warn(
          {
            event: 'playlist_update_failed',
            userId,
            stripeId: user.stripeId || null,
            playlistId: user.playlistId || null,
            grandmothered: user.grandmothered,
            reason: 'token_expired',
            durationMs,
          },
          `Playlist update failed — token expired for user: ${userId}`
        );
        // await UserController.deleteUser(userId);
        return;
      }

      logger.error(
        {
          event: 'playlist_update_failed',
          userId,
          stripeId: user.stripeId || null,
          playlistId: user.playlistId || null,
          grandmothered: user.grandmothered,
          reason: 'unknown',
          err: e.message,
          durationMs,
        },
        `Playlist update failed for user: ${userId}`
      );
    }
  }

  static async updatePlaylists(users) {
    logger.info(
      { event: 'cron_batch_started', userCount: users.length },
      `Starting playlist batch for ${users.length} users`
    );

    const failures = [];
    for (let i = 0; i < users.length; i += 1) {
      try {
        logger.info(
          { event: 'cron_batch_progress', current: i + 1, total: users.length },
          `Processing user ${i + 1}/${users.length}`
        );
        await this.updatePlaylist(users[i], null);
      } catch (e) {
        logger.error(
          { event: 'cron_batch_user_error', err: e.message },
          'Unexpected error processing user in batch'
        );
        failures.push(users[i]);
      }
    }

    if (failures.length > 0) {
      logger.info(
        {
          event: 'cron_batch_retrying_failures',
          failureCount: failures.length,
        },
        `Retrying ${failures.length} failed users`
      );
      for (let i = 0; i < failures.length; i += 1) {
        try {
          await this.updatePlaylist(failures[i], null);
        } catch (e) {
          logger.error(
            { event: 'cron_batch_retry_failed', err: e.message },
            'Retry also failed for user'
          );
        }
      }
    }

    logger.info(
      {
        event: 'cron_batch_complete',
        userCount: users.length,
        failureCount: failures.length,
      },
      `Playlist batch complete: ${users.length} users, ${failures.length} failures`
    );
  }

  static async updatePlaylistsNoUpdate() {
    const users = await UserController.getAllUsers();
    logger.info(
      {
        event: 'no_update_batch_started',
        userCount: users.length,
        timestamp: new Date().toISOString(),
      },
      `Running ${users.length} jobs`
    );
    // const playlistCover = 'images/playlistCover.jpeg';
    // await Promise.all(users.map(user => this.updatePlaylist(user, null)));

    for (let i = 0; i < users.length; i += 1) {
      try {
        const user = users[i];
        logger.info(
          { event: 'no_update_processing_user', userId: user.userId },
          `Processing no update for user: ${user.userId}`
        );

        const userId = decryptUserId(user.userId);

        const accessToken = await this.getNewAccessToken(user.refreshToken);

        const seeds = this.getAllTop(
          user.playlistOptions,
          accessToken
        ).then((allTop) => this.getSeeds(user.playlistOptions, allTop));

        const playlist = this.getPlaylist(userId, user.playlistId, accessToken);

        const doesMyPlaylistExist = this.doesMyPlaylistExists(
          user.playlistId,
          accessToken
        );

        if (!(await playlist) || !(await doesMyPlaylistExist)) {
          logger.info(
            {
              event: 'no_update_playlist_created',
              userId: user.userId,
              playlistId: user.playlistId,
            },
            'Had to create new playlist'
          );
        }

        const playlistId = (await playlist).id;
        const tracksAlreadyInPlaylist = new Set(
          (await playlist).tracks.items.map((x) => x.track.id)
        );

        const tracks = await this.getTracks(
          user,
          userId,
          tracksAlreadyInPlaylist,
          await seeds,
          accessToken
        );

        logger.info(
          {
            event: 'no_update_tracks_found',
            userId: user.userId,
            trackCount: tracks.length,
            playlistId,
          },
          `${tracks.length} tracks found`
        );
        logger.info(
          {
            event: 'no_update_playlist_info',
            userId: user.userId,
            playlistId,
            playlistExists: await doesMyPlaylistExist,
          },
          'Playlist info'
        );
      } catch (e) {
        logger.warn(
          { event: 'no_update_error', error: e.message, stack: e.stack },
          'Error during no update processing'
        );
      }
    }

    logger.info(
      {
        event: 'no_update_batch_complete',
        userCount: users.length,
        timestamp: new Date().toISOString(),
      },
      `${users.length} jobs complete`
    );
  }
}

module.exports = SpotifyHelper;
