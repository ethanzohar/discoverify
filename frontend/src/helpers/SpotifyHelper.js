/* eslint-disable no-restricted-syntax */
require('dotenv').config();

const CLIENT_ID = process.env.REACT_APP_DISCOVER_DAILY_API_CLIENT_ID;

class SpotifyHelper {
  static generateRandomString(length) {
    let text = '';
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i += 1) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  static getOAuthCodeUrl(redirectUri) {
    const scope =
      'user-top-read user-read-recently-played user-library-read playlist-modify-private playlist-modify-public playlist-read-private';

    let url = 'https://accounts.spotify.com/authorize';
    url += '?response_type=code';
    url += `&client_id=${encodeURIComponent(CLIENT_ID)}`;
    url += `&scope=${encodeURIComponent(scope)}`;
    url += `&state=${encodeURIComponent(this.generateRandomString(16))}`;
    url += `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return url;
  }

  static async getUserInfo(accessToken) {
    const response = await fetch('https://api.spotify.com/v1/me', {
      Accepts: 'application/json',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.json();
  }
}
export default SpotifyHelper;
