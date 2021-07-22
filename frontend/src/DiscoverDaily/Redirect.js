/* eslint-disable react/button-has-type */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { images } from './images';
import github from '../images/githubLight.png';
import patreon from '../images/patreon.png';

class DiscoverDailyRedirect extends Component {
  // eslint-disable-next-line camelcase
  UNSAFE_componentWillMount() {
    const paramQuery = new URLSearchParams(this.props.location.search);

    const code = paramQuery.get('code');
    const error = paramQuery.get('error');

    if (code && !error) {
      sessionStorage.setItem('discoverDaily_code', paramQuery.get('code'));
      window.location = window.location.origin;
    } else {
      window.location = `${window.location.origin}/login`;
    }
  }

  render() {
    return (
      <div className="DiscoverDailyMain">
        <Row style={{ width: '100%', margin: '0' }}>
          <Col style={{ width: '100%', margin: '0' }}>
            <Col className="discoverDailyLeftColumn">
              <Row style={{ width: '90%', marginLeft: '4%' }}>
                <h1 style={{ margin: '0' }}>Discover Weekly...</h1>
                <h1 style={{ margin: '0 0 3% 0' }}>But Daily</h1>
                <h3>
                  Finding new songs that you love is hard, so let us take care
                  of that for you!
                </h3>
                <h3>
                  Link your Spotify account by logging in below to get access to
                  daily music playlists curated to you.
                </h3>
                <button className="btn btn-primary spotify-button" disabled>
                  Get your daily playlist
                </button>
              </Row>
            </Col>
            <Col className="discoverDailyRightColumn">
              {[0, 4, 8, 12].map((x, index) => (
                <Row
                  className={`imageRow imageRow${index}`}
                  key={`row${index}`}
                >
                  <Col className={`imageCol imageCol${0}`} key={`col${x}`}>
                    <img
                      src={images[Math.floor(Math.random() * images.length)]}
                      alt="albumImage"
                    />
                  </Col>
                  <Col className={`imageCol imageCol${1}`} key={`col${x + 1}`}>
                    <img
                      src={images[Math.floor(Math.random() * images.length)]}
                      alt="albumImage"
                    />
                  </Col>
                  <Col className={`imageCol imageCol${2}`} key={`col${x + 2}`}>
                    <img
                      src={images[Math.floor(Math.random() * images.length)]}
                      alt="albumImage"
                    />
                  </Col>
                  <Col className={`imageCol imageCol${3}`} key={`col${x + 3}`}>
                    <img
                      src={images[Math.floor(Math.random() * images.length)]}
                      alt="albumImage"
                    />
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

export default DiscoverDailyRedirect;
