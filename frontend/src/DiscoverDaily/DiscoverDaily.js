import React, { Component } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import CircularProgress from '@material-ui/core/CircularProgress'
import SpotifyHelper from '../helpers/SpotifyHelper';
import DiscoverDailyHelper from '../helpers/DiscoverDailyHelper';
import { images } from './images';

import './discoverDaily.scss';
class DiscoverDaily extends Component {
  constructor(props) {
    super(props)
    
    this.state = {
      user: null,
      spotifyUser: null,
      refreshToken: null,
      loading: true,
      imageIndexes: new Set(),
      submitting: false
    }

    while (this.state.imageIndexes.size < 16) {
      const randomNum = Math.floor(Math.random() * images.length);
      if (!this.state.imageIndexes.has(randomNum)){
        this.state.imageIndexes.add(randomNum);
      }
    }

    this.signupUser = this.signupUser.bind(this);
    this.unsubscribeUser = this.unsubscribeUser.bind(this);
  }

  sendToLogin() {
    window.location = window.location.origin + '/login';
  }

  updateTime() {
    let timeRange = 'second';

    const now = new Date(this.state.user.now);
    const lastUpdated = new Date(this.state.user.lastUpdated);
    let timeDif = (now.getTime() - lastUpdated.getTime()) / 1000;

    if (timeDif >= 60) {
      timeDif /= 60;
      timeRange = 'minute';
    }

    if (timeDif >= 60) {
      timeDif /= 24;
      timeRange = 'hour';
    }

    this.setState({ lastUpdated: Math.round(timeDif), timeRange })
  }

  async getUserState() {
    const code = sessionStorage.getItem('discoverDaily_code');
    const refreshToken = localStorage.getItem('discoverDaily_refreshToken');

    if (refreshToken && refreshToken !== 'null') {
      this.setState({ refreshToken });
      const accessToken = await SpotifyHelper.getAccessToken(refreshToken);
      
      if (accessToken) {
        const spotifyUser = await SpotifyHelper.getUserInfo(accessToken);
        this.setState({ spotifyUser });

        const user = await DiscoverDailyHelper.getUser(spotifyUser.id);
        if (user.userId) this.setState({ user });

        this.setState({ loading: false });
        return;
      }
    }
    
    if (code && code !== 'null') {
      const { access_token, refresh_token } = await SpotifyHelper.getRefreshToken(code, window.location.origin + '/discover-daily/redirect');
      localStorage.setItem('discoverDaily_refreshToken', refresh_token ? refresh_token : null);

      if (!access_token) this.sendToLogin();
      
      const spotifyUser = await SpotifyHelper.getUserInfo(access_token);
      const user = await DiscoverDailyHelper.getUser(spotifyUser.id);
      this.setState({ user : user.userId ? user : null, spotifyUser, refreshToken: refresh_token, loading: false });

      if (user.userId) await DiscoverDailyHelper.signupUser(spotifyUser, refresh_token);
      return;
    }

    this.sendToLogin();
  }

  async UNSAFE_componentWillMount() {
    document.title = "Discover Daily";
    await this.getUserState();
    this.updateTime();
  }
  
  async signupUser () {
    this.setState({submitting: true});
    const user = await DiscoverDailyHelper.signupUser(this.state.spotifyUser.id, this.state.refreshToken);
    this.setState({ user, submitting: false });
    this.updateTime();
  }

  async unsubscribeUser () {
    this.setState({submitting: true});
    const { success } = await DiscoverDailyHelper.unsubscribeUser(this.state.spotifyUser.id, this.state.refreshToken);
    if (success) {
      this.setState({ user: null });
    }

    this.setState({submitting: false});
  }

  render() {
    let leftColumnRow;
    if (this.state.loading) {
      leftColumnRow = <Row style={{ width: '90%', marginLeft: '4%' }}>
                        <div style={{ width: 'max-content', margin: '0 auto' }}>
                          <CircularProgress style={{width: '10vw', height: '10vw', color: 'rgb(12, 38, 88)'}}/>
                        </div>
                      </Row>;
    } else if (this.state.user) {
      leftColumnRow = <Row style={{ width: '90%', marginLeft: '4%' }}>
                        <h1 style={{ margin: '0' }}>Discover Weekly...</h1>
                        <h1 style={{ margin: '0 0 3% 0' }}>But Daily</h1>
                        <h3>{`Your playlist was updated ${this.state.lastUpdated} ${this.state.timeRange}${this.state.lastUpdated > 1 ? 's' : ''} ago`}</h3>
                        <h3>A new playlist is on its way and will be ready for you tomorrow morning!</h3>
                        <h3>If you don't want to get a daily playlist anymore you can click the button below to unsubscribe.</h3>
                        <button className="btn btn-primary spotify-button" onClick={this.unsubscribeUser} disabled={this.state.submitting} style={{ marginBottom: '2%' }}>Unsubscribe</button>
                        {this.state.submitting ? (
                          <CircularProgress style={{marginLeft: '2%', width: '4%', height: '4%', color: 'rgb(12, 38, 88)'}}/>
                          ) :
                          null}
                      </Row>;
    } else {
      leftColumnRow = <Row style={{ width: '90%', marginLeft: '4%' }}>
                        <h1 style={{ margin: '0' }}>Discover Weekly...</h1>
                        <h1 style={{ margin: '0 0 3% 0' }}>But Daily</h1>
                        <h3 >Click the button below to get a daily playlist with 30 songs that we've curated for you based on your listening history.</h3>
                        <button className="btn btn-primary spotify-button" onClick={this.signupUser} disabled={this.state.submitting}  style={{ marginBottom: '2%' }}>Get your daily playlist</button>
                        {this.state.submitting ? (
                          <CircularProgress style={{marginLeft: '2%', width: '4%', height: '4%', color: 'rgb(12, 38, 88)'}}/>
                          ) :
                          null}
                      </Row>;
    }
    const imageIndexes = [...this.state.imageIndexes];

    return (
      <div className="DiscoverDailyMain">
        <Row style={{width: '100%', margin: '0'}}>
          <Col style={{width: '100%', margin: '0'}}>
            <Col className="discoverDailyLeftColumn">
              {leftColumnRow}
            </Col>
            <Col className='discoverDailyRightColumn'>
            {[0,4,8,12].map((x, index) => (
              <Row key={index} className={`imageRow imageRow${index}`}>
                <Col className={`imageCol imageCol${0}`}>
                  <img src={images[imageIndexes[x]]} alt="albumImage"></img>
                </Col>
                <Col className={`imageCol imageCol${1}`}>
                  <img src={images[imageIndexes[x+1]]} alt="albumImage"></img>
                </Col>
                <Col className={`imageCol imageCol${2}`}>
                  <img src={images[imageIndexes[x+2]]} alt="albumImage"></img>
                </Col>
                <Col className={`imageCol imageCol${3}`}>
                  <img src={images[imageIndexes[x+3]]} alt="albumImage"></img>
                </Col>
              </Row>
            ))}
          </Col>
          </Col>
        </Row>
    </div>
    );
  }
}

export default DiscoverDaily;
