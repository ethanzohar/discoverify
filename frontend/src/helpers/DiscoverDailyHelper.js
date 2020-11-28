import SpotifyHelper from './SpotifyHelper';

require('dotenv').config()
class DiscoverDailyHelper {
  static async signupUser(userId, refreshToken) {
    const response = await fetch('/api/discover-daily/subscribe', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId, refreshToken
      })
    })

    return response.json();
  }

  static async unsubscribeUser(userId, refreshToken) {
    const accessToken = await SpotifyHelper.getAccessToken(refreshToken); 

    const response = await fetch('/api/discover-daily/unsubscribe', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId, accessToken
      })
    })

    return response.json();
  }

  static async getUser(userId) {
    const response = await fetch(`/api/discover-daily/getUser/${userId}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    return response.json();
  }

  static async getAlbums(refreshToken) {
    const accessToken = await SpotifyHelper.getAccessToken(refreshToken); 

    let albums = [];
    let next = `https://api.spotify.com/v1/me/tracks?limit=50`;

    for (let i = 0; i < 10; i += 1) {
    const response = await fetch(next, {
      Accepts: 'application/json',
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
    });

    const j = await response.json();
    j.items.forEach((x) => {
      albums.push(x.track.album.images[0].url);
    })

    next = j.next;
  }

    // const albums = j.items.map((x) => x.track.album.images[0].url);
    return [...new Set(albums)];
  }
}

export default DiscoverDailyHelper;