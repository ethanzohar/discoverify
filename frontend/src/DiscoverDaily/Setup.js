/* eslint-disable camelcase */
/* eslint-disable react/button-has-type */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prop-types */
import React, { useEffect, useState, useRef } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Slider from '@material-ui/core/Slider';
import CircularProgress from '@material-ui/core/CircularProgress';
import DiscoverDailyHelper from '../helpers/DiscoverDailyHelper';
import SpotifyHelper from '../helpers/SpotifyHelper';

export default function DiscoverDailySetup() {
  const [curInput, setCurInput] = useState(0);
  const [acousticness, setAcousticness] = useState([10, 90]);
  const [danceability, setDanceability] = useState([10, 90]);
  const [energy, setEnergy] = useState([10, 100]);
  const [instrumentalness, setInstrumentalness] = useState([10, 90]);
  const [popularity, setPopularity] = useState([50, 100]);
  const [valence, setValence] = useState([10, 90]);
  const [options, setOptions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [refreshToken, setRefreshToken] = useState(null);
  const [spotifyUser, setSpotifyUser] = useState(null);

  const optionRef = useRef(options);

  useEffect(() => {
    optionRef.current = {
      acousticness: [10, 90],
      danceability: [10, 90],
      energy: [10, 90],
      instrumentalness: [10, 90],
      popularity: [50, 100],
      valence: [10, 90],
    };

    setOptions(optionRef.current);
  }, []);

  const arrowClicked = (increment) => {
    const currentDiv = document.getElementById(`setupInput${curInput}`);
    const nextDiv = document.getElementById(
      `setupInput${curInput + increment}`
    );

    if (nextDiv) {
      currentDiv.style.left = `${100 * increment * -1}vw`;
      nextDiv.style.left = '0vw';

      if (curInput + increment === 5) {
        document.getElementById('signupButton').style.left = '0vw';
      } else if (curInput === 5 && increment < 0) {
        document.getElementById('signupButton').style.left = '100vw';
      }

      setCurInput(curInput + increment);
    }
  };

  const SpotifySliderThumbComponent = (props) =>
    optionRef.current[props['aria-labelledby']] ? (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <span {...props}>
        <span>
          {optionRef.current[props['aria-labelledby']][props['data-index']]}
        </span>
      </span>
    ) : null;

  const onSliderChange = (newValue, setter, range) => {
    if (Math.abs(newValue[0] - newValue[1]) >= 20) {
      setter(newValue);
      optionRef.current[range] = newValue;
      setOptions(optionRef.current);
    }
  };

  const sendToLogin = () => {
    window.location = `${window.location.origin}/login`;
  };

  const sendToMain = () => {
    window.location = window.location.origin;
  };

  const getUserState = async () => {
    const userFromSessionStorage = sessionStorage.getItem('discoverDaily_user');
    if (userFromSessionStorage && userFromSessionStorage !== 'null') {
      sendToMain();
      return;
    }

    const code = sessionStorage.getItem('discoverDaily_code');
    const refreshTkn = localStorage.getItem('discoverDaily_refreshToken');
    setRefreshToken(refreshTkn);

    if (refreshTkn && refreshTkn !== 'null') {
      const accessToken = await DiscoverDailyHelper.getAccessToken(refreshTkn);

      if (accessToken) {
        const spotifyUsr = await SpotifyHelper.getUserInfo(accessToken);
        sessionStorage.setItem(
          'discoverDaily_spotifyUser',
          JSON.stringify(spotifyUsr)
        );

        setSpotifyUser(spotifyUsr);

        const usr = (await DiscoverDailyHelper.getUser(spotifyUsr.id)).user;
        if (usr && usr.userId) {
          sendToMain();
        }

        return;
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
      setRefreshToken(refresh_token);

      if (!access_token) sendToLogin();

      const spotifyUsr = await SpotifyHelper.getUserInfo(access_token);
      sessionStorage.setItem(
        'discoverDaily_spotifyUser',
        JSON.stringify(spotifyUsr)
      );

      setSpotifyUser(spotifyUsr);

      const usr = (await DiscoverDailyHelper.getUser(spotifyUsr.id)).user;
      if (usr && usr.userId) {
        sendToMain();
      }
    }

    sendToLogin();
  };

  useEffect(() => {
    async function init() {
      await getUserState();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signupUser = async () => {
    setSubmitting(true);

    document.getElementById('buttonLoadingCircle').style.display = '';

    if (
      !spotifyUser ||
      !spotifyUser.id ||
      !refreshToken ||
      !optionRef.current
    ) {
      window.location = `${window.location.origin}/cancel`;
      return;
    }

    await DiscoverDailyHelper.sendToStripe(
      spotifyUser.id,
      refreshToken,
      optionRef.current
    );
  };

  return (
    <div className="DiscoverDailyMain">
      <Row style={{ width: '100%', height: '100vh', margin: '0' }}>
        <Col className="setupPageSideColumn">
          {curInput > 0 ? (
            <button
              className="setupPageArrowButton"
              disabled={submitting}
              onClick={() => {
                arrowClicked(-1);
              }}
            >
              <svg
                height="25"
                role="img"
                width="25"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <polygon
                  points="1.98 12 17.57 3 17.57 21 1.98 12"
                  fill="currentColor"
                />
              </svg>
            </button>
          ) : null}
        </Col>
        <Col className="setupMainColumn">
          <Row className="setupMainRow">
            <div id="setupHeader">
              <h1>Customize your Playlist</h1>
              <h3 style={{ paddingLeft: '3px', margin: '20px 0' }}>
                Choose what types of songs get put in your playlist!
              </h3>
              <h3 style={{ paddingLeft: '3px', margin: '20px 0' }}>
                You can always change these options later on.
              </h3>
            </div>
            <div
              id="setupInput0"
              className="setupAnimationDiv setupAnimationClass"
              style={{
                left: '0vw',
              }}
            >
              <h3 className="spotifySliderHeader">Acoustics</h3>
              <h5 className="spotifySliderDescription">
                A confidence measure of whether the track is acoustic.
              </h5>
              <Slider
                className="spotifySlider"
                ThumbComponent={SpotifySliderThumbComponent}
                value={acousticness}
                onChange={(e, v) =>
                  onSliderChange(v, setAcousticness, 'acousticness')
                }
                valueLabelDisplay="auto"
                aria-labelledby="acousticness"
              />
            </div>
            <div
              id="setupInput1"
              className="setupAnimationDiv setupAnimationClass"
              style={{
                left: '100vw',
              }}
            >
              <h3 className="spotifySliderHeader">Danceability</h3>
              <h5 className="spotifySliderDescription">
                Based on tempo, rhythm stability, beat strength, and overall
                regularity.
              </h5>
              <Slider
                className="spotifySlider"
                ThumbComponent={SpotifySliderThumbComponent}
                value={danceability}
                onChange={(e, v) =>
                  onSliderChange(v, setDanceability, 'danceability')
                }
                valueLabelDisplay="auto"
                aria-labelledby="danceability"
              />
            </div>
            <div
              id="setupInput2"
              className="setupAnimationDiv setupAnimationClass"
              style={{
                left: '100vw',
              }}
            >
              <h3 className="spotifySliderHeader">Energy</h3>
              <h5 className="spotifySliderDescription">
                Represents a perceptual measure of intensity and activity.
              </h5>
              <Slider
                className="spotifySlider"
                ThumbComponent={SpotifySliderThumbComponent}
                value={energy}
                onChange={(e, v) => onSliderChange(v, setEnergy, 'energy')}
                valueLabelDisplay="auto"
                aria-labelledby="energy"
              />
            </div>
            <div
              id="setupInput3"
              className="setupAnimationDiv setupAnimationClass"
              style={{
                left: '100vw',
              }}
            >
              <h3 className="spotifySliderHeader">Instrumentality</h3>
              <h5 className="spotifySliderDescription">
                Values above 50 represent instrumental tracks.
              </h5>
              <Slider
                className="spotifySlider"
                ThumbComponent={SpotifySliderThumbComponent}
                value={instrumentalness}
                onChange={(e, v) =>
                  onSliderChange(v, setInstrumentalness, 'instrumentalness')
                }
                valueLabelDisplay="auto"
                aria-labelledby="instrumentalness"
              />
            </div>
            <div
              id="setupInput4"
              className="setupAnimationDiv setupAnimationClass"
              style={{
                left: '100vw',
              }}
            >
              <h3 className="spotifySliderHeader">Popularity</h3>
              <h5 className="spotifySliderDescription">
                Based on the total number of plays the track has had and how
                recent those plays are.
              </h5>
              <Slider
                className="spotifySlider"
                ThumbComponent={SpotifySliderThumbComponent}
                value={popularity}
                onChange={(e, v) =>
                  onSliderChange(v, setPopularity, 'popularity')
                }
                valueLabelDisplay="auto"
                aria-labelledby="popularity"
              />
            </div>
            <div
              id="setupInput5"
              className="setupAnimationDiv setupAnimationClass"
              style={{
                left: '100vw',
              }}
            >
              <h3 className="spotifySliderHeader">Mood</h3>
              <h5 className="spotifySliderDescription">
                High values correspond to positivity and happiness, while low
                values correspond to negativity and sadness.
              </h5>
              <Slider
                className="spotifySlider"
                ThumbComponent={SpotifySliderThumbComponent}
                value={valence}
                onChange={(e, v) => onSliderChange(v, setValence, 'valence')}
                valueLabelDisplay="auto"
                aria-labelledby="valence"
              />
            </div>

            <button
              className="btn btn-primary spotify-button setupAnimationClass"
              onClick={signupUser}
              disabled={submitting}
              id="signupButton"
            >
              Get your daily playlist
            </button>
            <CircularProgress
              className="loadingCircle"
              id="buttonLoadingCircle"
              style={{
                marginLeft: '2%',
                width: '4%',
                top: '415px',
                left: '350px',
                display: 'none',
                position: 'absolute',
                height: '',
              }}
            />
          </Row>
        </Col>
        {curInput < 5 ? (
          <Col className="setupPageSideColumn">
            <button
              className="setupPageArrowButton"
              disabled={submitting}
              onClick={() => {
                arrowClicked(1);
              }}
            >
              <svg
                height="25"
                role="img"
                width="25"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <polygon
                  points="21.57 12 5.98 3 5.98 21 21.57 12"
                  fill="currentColor"
                />
              </svg>
            </button>
          </Col>
        ) : null}
      </Row>
    </div>
  );
}
