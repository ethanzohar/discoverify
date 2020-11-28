require('dotenv').config()

const CLIENT_ID = process.env.REACT_APP_DISCOVER_DAILY_API_CLIENT_ID;
const CLIENT_SECRET = process.env.REACT_APP_DISCOVER_DAILY_API_CLIENT_SECRET;

class SpotifyHelper {
  static generateRandomString(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  static getOAuthCodeUrl(redirect_uri) {
    let scope = 'user-top-read user-library-read playlist-modify-private playlist-modify-public playlist-read-private';

    let url = 'https://accounts.spotify.com/authorize';
    url += '?response_type=code';
    url += '&client_id=' + encodeURIComponent(CLIENT_ID);
    url += '&scope=' + encodeURIComponent(scope);
    url += '&redirect_uri=' + encodeURIComponent(redirect_uri);
    url += '&state=' + encodeURIComponent(this.generateRandomString(16));

    return url;
  }

  static async getRefreshToken(code, redirect_uri) {
    let details = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirect_uri,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }

    let formBody = [];
    for (let property in details) {
      let encodedKey = encodeURIComponent(property);
      let encodedValue = encodeURIComponent(details[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody
    });
    
    return response.json();
  }

  static async getUserInfo(access_token) {
    const response = await fetch('https://api.spotify.com/v1/me', {
      Accepts: 'application/json',
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + access_token
      }
    })

    return response.json();
  }

  static async getAccessToken(refreshToken) {
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

    return (await result.json()).access_token;
}
}
export default SpotifyHelper;