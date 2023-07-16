function DiscoverifyAPIException(deletedUser) {
  this.deletedUser = deletedUser;
}
class DiscoverDailyHelper {
  static async signupUser(userId, refreshToken, options) {
    const response = await fetch('/api/discover-daily/subscribe', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        refreshToken,
        options,
      }),
    });

    return response.json();
  }

  static async sendToStripe(userId, refreshToken, options) {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        refreshToken,
        options,
      }),
    });

    const body = await response.json();
    window.location.href = body.url;
  }

  static async unsubscribeUser(userId, refreshToken) {
    const accessToken = await DiscoverDailyHelper.getAccessToken(refreshToken);

    const response = await fetch('/api/discover-daily/unsubscribe', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        accessToken,
      }),
    });

    return response.json();
  }

  static async restorePlaylistOptions(userId, refreshToken) {
    const accessToken = await DiscoverDailyHelper.getAccessToken(refreshToken);

    const response = await fetch('/api/discover-daily/restorePlaylistOptions', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        accessToken,
      }),
    });

    return (await response.json()).user;
  }

  static async updatePlaylistOptions(options, userId, refreshToken) {
    const accessToken = await DiscoverDailyHelper.getAccessToken(refreshToken);

    const response = await fetch('/api/discover-daily/updatePlaylistOptions', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        accessToken,
        options,
      }),
    });

    return (await response.json()).user;
  }

  static async getUser(userId) {
    const response = await fetch(`/api/discover-daily/getUser/${userId}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  static async getNow() {
    const response = await fetch('/api/discover-daily/now', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }

  static async getAlbums(refreshToken) {
    const accessToken = await DiscoverDailyHelper.getAccessToken(refreshToken);

    const albums = [];
    let next = `https://api.spotify.com/v1/me/tracks?limit=50`;

    while (next) {
      const response = await fetch(next, {
        Accepts: 'application/json',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const j = await response.json();
      console.log(`got ${j.items.length} items`);
      j.items.forEach((x) => {
        albums.push(x.track.album.images[0].url);
      });

      next = j.next;
    }
    // for (let i = 0; i < 10; i += 1) {
    //   const response = await fetch(next, {
    //     Accepts: 'application/json',
    //     method: 'GET',
    //     headers: {
    //       Authorization: `Bearer ${accessToken}`,
    //     },
    //   });

    //   const j = await response.json();
    //   j.items.forEach((x) => {
    //     albums.push(x.track.album.images[0].url);
    //   });

    //   next = j.next;
    // }

    const set = [...new Set(albums)];

    for (let i = 0; i < set.length; i += 1) {
      console.log(`"${set[i]}",`);
    }
  }

  static async getAccessToken(refreshToken) {
    const response = await fetch('/api/discover-daily/accessToken', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    const responseJSON = await response.json();

    if (response.status === 500) {
      throw new DiscoverifyAPIException(responseJSON.deletedUser);
    }

    return responseJSON.accessToken;
  }

  static async getRefreshToken(code, redirectUri) {
    const response = await fetch('/api/discover-daily/refreshToken', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirectUri,
      }),
    });

    return response.json();
  }
}

export default DiscoverDailyHelper;
