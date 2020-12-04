import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import SpotifyHelper from '../helpers/SpotifyHelper';
import { images } from './images';
import github from '../images/github.png';

import './discoverDaily.scss';

const DiscoverDailyLogin = () => {  
  const sendLoginRedirect = () => {
      window.location = SpotifyHelper.getOAuthCodeUrl('https://discoverifymusic.com/redirect');
  }

  return (
    <div className="DiscoverDailyMain">
      <Row style={{width: '100%', margin: '0'}}>
        <Col style={{width: '100%', margin: '0'}}>
            <Col className="discoverDailyLeftColumn">
            <Row style={{ width: '90%', marginLeft: '4%' }}>
              <h1 style={{ margin: '0' }}>Discover Weekly...</h1>
              <h1 style={{ margin: '0 0 3% 0' }}>But Daily</h1>
              <h3>Finding new songs that you love is hard, so let us take care of that for you!</h3>
              <h3>Link your Spotify account by logging in below to get access to daily music playlists curated to you.</h3>
              <button className="btn btn-primary spotify-button" onClick={sendLoginRedirect}>Login with Spotify</button>
            </Row>
          </Col>
          <Col className='discoverDailyRightColumn'>
            {[0,4,8,12].map((x, index) => (
              <Row className={`imageRow imageRow${index}`}>
                <Col className={`imageCol imageCol${0}`}>
                  <img src={images[Math.floor(Math.random() * images.length)]} alt="albumImage"></img>
                </Col>
                <Col className={`imageCol imageCol${1}`}>
                  <img src={images[Math.floor(Math.random() * images.length)]} alt="albumImage"></img>
                </Col>
                <Col className={`imageCol imageCol${2}`}>
                  <img src={images[Math.floor(Math.random() * images.length)]} alt="albumImage"></img>
                </Col>
                <Col className={`imageCol imageCol${3}`}>
                  <img src={images[Math.floor(Math.random() * images.length)]} alt="albumImage"></img>
                </Col>
              </Row>
            ))}
          </Col>
        </Col>
      </Row>
      <Row style={{ position: 'absolute', left: '15px', bottom: '0' }}>
        <a href="https://github.com/ethanzohar/discoverify" target="_blank" rel="noopener noreferrer">
          <img src={github} alt="github" width="10%" style={{ margin: '10px' }} />
        </a>
      </Row>
    </div>
  );
}

export default DiscoverDailyLogin;
