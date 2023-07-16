/* eslint-disable react/button-has-type */
/* eslint-disable camelcase */
/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import CircularProgress from '@material-ui/core/CircularProgress';
import SpotifyHelper from '../helpers/SpotifyHelper';
import DiscoverDailyHelper from '../helpers/DiscoverDailyHelper';
import { images } from './images';
import github from '../images/githubLight.png';
import patreon from '../images/patreon.png';

import './discoverDaily.scss';

class DiscoverDaily extends Component {
  constructor(props) {
    super(props);

    this.state = {
      user: null,
      spotifyUser: null,
      loading: true,
      imageIndexes: new Set(),
      submitting: false,
      now: null,
    };

    while (this.state.imageIndexes.size < 16) {
      const randomNum = Math.floor(Math.random() * images.length);
      if (!this.state.imageIndexes.has(randomNum)) {
        this.state.imageIndexes.add(randomNum);
      }
    }

    this.unsubscribeUser = this.unsubscribeUser.bind(this);
    this.sendToLogin = this.sendToLogin.bind(this);
  }

  // eslint-disable-next-line camelcase
  async UNSAFE_componentWillMount() {
    await this.getUserState();
    sessionStorage.setItem(
      'discoverDaily_user',
      this.state.user ? JSON.stringify(this.state.user) : null
    );
    sessionStorage.setItem(
      'discoverDaily_spotifyUser',
      this.state.user ? JSON.stringify(this.state.spotifyUser) : null
    );

    if (this.state.user) {
      this.updateTime();
    }
  }

  async getUserState() {
    const user = sessionStorage.getItem('discoverDaily_user');
    const spotifyUserFromStorage = sessionStorage.getItem(
      'discoverDaily_spotifyUser'
    );

    if (
      user &&
      user !== 'null' &&
      user !== 'undefined' &&
      spotifyUserFromStorage &&
      spotifyUserFromStorage !== 'null' &&
      spotifyUserFromStorage !== 'undefined'
    ) {
      const { now } = await DiscoverDailyHelper.getNow();
      this.setState({
        user: JSON.parse(user),
        spotifyUser: JSON.parse(spotifyUserFromStorage),
        now,
        loading: false,
      });
      return;
    }

    const code = sessionStorage.getItem('discoverDaily_code');
    const refreshToken = localStorage.getItem('discoverDaily_refreshToken');

    if (refreshToken && refreshToken !== 'null') {
      try {
        const accessToken = await DiscoverDailyHelper.getAccessToken(
          refreshToken
        );

        if (accessToken) {
          const spotifyUser = await SpotifyHelper.getUserInfo(accessToken);
          sessionStorage.setItem(
            'discoverDaily_spotifyUser',
            JSON.stringify(spotifyUser)
          );
          this.setState({ spotifyUser });

          const getUser = await DiscoverDailyHelper.getUser(spotifyUser.id);
          const usr = getUser.user;
          const { now } = getUser;
          if (usr) this.setState({ user: usr, now });

          this.setState({ loading: false });

          sessionStorage.setItem('discoverDaily_user', JSON.stringify(user));
          return;
        }
      } catch (e) {
        if (e.deletedUser) {
          window.location = `${window.location.origin}/login`;
          sessionStorage.clear();
        }
      }
    }

    if (code && code !== 'null') {
      const {
        access_token,
        refresh_token,
      } = await DiscoverDailyHelper.getRefreshToken(
        code,
        process.env.REACT_APP_REDIRECT_URI
      );
      localStorage.setItem('discoverDaily_refreshToken', refresh_token || null);

      if (!access_token) this.sendToLogin();

      const spotifyUser = await SpotifyHelper.getUserInfo(access_token);
      sessionStorage.setItem(
        'discoverDaily_spotifyUser',
        JSON.stringify(spotifyUser)
      );
      const getUser = await DiscoverDailyHelper.getUser(spotifyUser.id);
      const usr = getUser.user;
      const { now } = getUser;
      this.setState({
        user: usr,
        now,
        spotifyUser,
        loading: false,
      });

      if (usr) {
        await DiscoverDailyHelper.signupUser(spotifyUser.id, refresh_token);
      }

      sessionStorage.setItem('discoverDaily_user', JSON.stringify(user));
      return;
    }

    this.sendToLogin();
  }

  // eslint-disable-next-line class-methods-use-this
  sendToLogin() {
    window.location = `${window.location.origin}/login`;
  }

  // eslint-disable-next-line class-methods-use-this
  sendToSetup() {
    window.location = `${window.location.origin}/setup`;
  }

  updateTime() {
    let timeRange = 'second';

    const now = new Date(this.state.now);
    const lastUpdated = new Date(this.state.user.lastUpdated);

    let timeDif = (now.getTime() - lastUpdated.getTime()) / 1000;

    if (timeDif >= 60) {
      timeDif /= 60;
      timeRange = 'minute';
    }

    if (timeDif >= 60) {
      timeDif /= 60;
      timeRange = 'hour';
    }

    this.setState({ lastUpdated: Math.round(timeDif), timeRange });
  }

  // eslint-disable-next-line class-methods-use-this
  sendToOptions() {
    window.location = `${window.location.origin}/options`;
  }

  // eslint-disable-next-line class-methods-use-this
  sendToStripePaymentPortal() {
    window.open(
      'https://billing.stripe.com/p/login/dR6aI7esz6VD6pG6oo',
      '_blank'
    );
  }

  async unsubscribeUser() {
    this.setState({ submitting: true });
    try {
      const { success } = await DiscoverDailyHelper.unsubscribeUser(
        this.state.user.userId,
        this.state.user.refreshToken
      );
      if (success) {
        this.setState({ user: null });
        sessionStorage.setItem('discoverDaily_user', null);
        sessionStorage.setItem('discoverDaily_spotifyUser', null);
      }
    } catch (e) {
      console.log(e);
      if (e.deletedUser) {
        window.location = `${window.location.origin}/login`;
        sessionStorage.clear();
      }
    }

    this.setState({ submitting: false });
  }

  render() {
    let leftColumnRow;
    if (this.state.loading) {
      leftColumnRow = (
        <Row style={{ width: '90%', marginLeft: '4%' }}>
          <div style={{ width: 'max-content', margin: '0 auto' }}>
            <CircularProgress
              className="loadingCircle"
              style={{ width: '10vw', height: '10vw' }}
            />
          </div>
        </Row>
      );
    } else if (this.state.user) {
      leftColumnRow = (
        <Row style={{ width: '90%', marginLeft: '4%' }}>
          <h1 style={{ margin: '0' }}>Discover Weekly...</h1>
          <h1 style={{ margin: '0 0 3% 0' }}>But Daily</h1>
          <h3>{`Your playlist was last updated ${this.state.lastUpdated} ${
            this.state.timeRange
          }${this.state.lastUpdated > 1 ? 's' : ''} ago`}</h3>
          <h3>
            You can find your new playlist in Spotify under the title Discover
            Daily
          </h3>
          <h3>We will update the songs in your playlist every 24 hours!</h3>
          <button
            className="btn btn-primary spotify-button"
            onClick={this.sendToOptions}
            style={{ marginBottom: '2%', marginRight: '2%' }}
          >
            Playlist Options
          </button>
          <button
            className="btn btn-primary spotify-button spotify-red"
            onClick={this.unsubscribeUser}
            disabled={this.state.submitting}
            style={{ marginBottom: '2%', marginRight: '2%' }}
          >
            Unsubscribe
          </button>
          <button
            className="btn btn-primary spotify-button stripe-blurple"
            onClick={this.sendToStripePaymentPortal}
            disabled={this.state.submitting}
            style={{ marginBottom: '2%' }}
          >
            Manage Payments
          </button>
          {this.state.submitting ? (
            <CircularProgress
              className="loadingCircle"
              style={{ marginLeft: '2%', width: '4%', height: '4%' }}
            />
          ) : null}
        </Row>
      );
    } else {
      leftColumnRow = (
        <Row style={{ width: '90%', marginLeft: '4%' }}>
          <h1 style={{ margin: '0' }}>Discover Weekly...</h1>
          <h1 style={{ margin: '0 0 3% 0' }}>But Daily</h1>
          <h3 style={{ marginBottom: '2%' }}>
            Click the button below to get a daily playlist with 30 songs that
            we've curated for you based on your listening history.
          </h3>
          <button
            className="btn btn-primary spotify-button"
            onClick={this.sendToSetup}
            disabled={this.state.submitting}
            style={{ marginBottom: '2%', marginTop: '0' }}
          >
            Get your daily playlist
          </button>
          {this.state.submitting ? (
            <CircularProgress
              className="loadingCircle"
              style={{ marginLeft: '2%', width: '4%', height: '4%' }}
            />
          ) : null}
        </Row>
      );
    }
    const imageIndexes = [...this.state.imageIndexes];

    return (
      <div className="DiscoverDailyMain">
        <Row style={{ width: '100%', margin: '0' }}>
          <Col style={{ width: '100%', margin: '0' }}>
            <Col className="discoverDailyLeftColumn">{leftColumnRow}</Col>
            <Col className="discoverDailyRightColumn">
              {[0, 4, 8, 12].map((x, index) => (
                <Row key={index} className={`imageRow imageRow${index}`}>
                  <Col className={`imageCol imageCol${0}`} key={`col${x}`}>
                    <img src={images[imageIndexes[x]]} alt="albumImage" />
                  </Col>
                  <Col className={`imageCol imageCol${1}`} key={`col${x + 1}`}>
                    <img src={images[imageIndexes[x + 1]]} alt="albumImage" />
                  </Col>
                  <Col className={`imageCol imageCol${2}`} key={`col${x + 2}`}>
                    <img src={images[imageIndexes[x + 2]]} alt="albumImage" />
                  </Col>
                  <Col className={`imageCol imageCol${3}`} key={`col${x + 3}`}>
                    <img src={images[imageIndexes[x + 3]]} alt="albumImage" />
                  </Col>
                </Row>
              ))}
            </Col>
          </Col>
        </Row>
        <Row style={{ position: 'absolute', left: '15px', bottom: '0' }}>
          <a
            href="https://github.com/ethanzohar/discoverify"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={github}
              alt="github"
              width="5%"
              style={{ margin: '10px' }}
            />
          </a>
          <a
            href="https://www.patreon.com/discoverify"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={patreon}
              alt="patreon"
              width="5%"
              style={{ margin: '10px' }}
            />
          </a>
        </Row>
      </div>
    );
  }
}

export default DiscoverDaily;
