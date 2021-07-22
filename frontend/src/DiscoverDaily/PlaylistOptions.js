/* eslint-disable react/button-has-type */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable camelcase */
import React, { useEffect, useState, useRef } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { makeStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import Slider from '@material-ui/core/Slider';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import Divider from '@material-ui/core/Divider';
import ListItemText from '@material-ui/core/ListItemText';
import SpotifyHelper from '../helpers/SpotifyHelper';
import DiscoverDailyHelper from '../helpers/DiscoverDailyHelper';
import { images } from './images';

import './discoverDaily.scss';

// eslint-disable-next-line no-unused-vars
const useStyles = makeStyles((theme) => ({
  root: {
    width: 'max-content',
  },
  cardHeader: {
    width: 'max-content',
    height: 'max-content',
    padding: 10,
    overflow: 'none',
  },
}));

export default function DiscoverDailyPlaylistOptions() {
  const classes = useStyles();

  const seedToString = {
    ST: 'Short Term Track',
    MT: 'Medium Term Track',
    AT: 'All Time Track',
    SA: 'Short Term Artist',
    MA: 'Medium Term Artist',
    AA: 'All Time Artist',
  };

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageIndexes, setImageIndexes] = useState([]);
  const [options, setOptions] = useState({});
  const [acousticness, setAcousticness] = useState([0, 100]);
  const [danceability, setDanceability] = useState([0, 100]);
  const [energy, setEnergy] = useState([0, 100]);
  const [instrumentalness, setInstrumentalness] = useState([0, 100]);
  const [popularity, setPopularity] = useState([50, 100]);
  const [valence, setValence] = useState([0, 100]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedSide, setSelectedSide] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [seeds, setSeeds] = useState(['AA', 'MA', 'SA', 'AT', 'MT', 'ST']);
  const [chosenSeeds, setChosenSeeds] = useState([]);
  const [verticalSeedArrows, setVerticalSeedArrows] = useState(false);

  const optionRef = useRef(options);

  const sendToLogin = () => {
    window.location = `${window.location.origin}/login`;
  };

  const sendToMain = () => {
    window.location = window.location.origin;
  };

  const updatePlaylistOptions = async (usr) => {
    if (usr.playlistOptions) {
      setChosenSeeds(usr.playlistOptions.seeds);
      setAcousticness(usr.playlistOptions.acousticness);
      setDanceability(usr.playlistOptions.danceability);
      setEnergy(usr.playlistOptions.energy);
      setInstrumentalness(usr.playlistOptions.instrumentalness);
      setPopularity(usr.playlistOptions.popularity);
      setValence(usr.playlistOptions.valence);

      optionRef.current = {
        seeds: usr.playlistOptions.seeds,
        acousticness: usr.playlistOptions.acousticness,
        danceability: usr.playlistOptions.danceability,
        energy: usr.playlistOptions.energy,
        instrumentalness: usr.playlistOptions.instrumentalness,
        popularity: usr.playlistOptions.popularity,
        valence: usr.playlistOptions.valence,
      };

      setOptions(optionRef.current);
    } else {
      try {
        const restoredUser = await DiscoverDailyHelper.restorePlaylistOptions(
          usr.userId,
          usr.refreshToken
        );
        setUser(restoredUser);
        updatePlaylistOptions(restoredUser);
        sessionStorage.setItem(
          'discoverDaily_user',
          JSON.stringify(restoredUser)
        );
      } catch (e) {
        if (e.deletedUser) {
          window.location = `${window.location.origin}/login`;
          sessionStorage.clear();
        }
      }
    }
  };

  const getUserState = async () => {
    const userFromSessionStorage = sessionStorage.getItem('discoverDaily_user');

    if (userFromSessionStorage && userFromSessionStorage !== 'null') {
      const parsedUser = JSON.parse(userFromSessionStorage);
      setUser(parsedUser);
      updatePlaylistOptions(parsedUser);
      setLoading(false);

      const spotifyUserFromStorage = sessionStorage.getItem(
        'discoverDaily_spotifyUser'
      );

      if (!spotifyUserFromStorage || spotifyUserFromStorage === 'null') {
        try {
          const accessToken = await DiscoverDailyHelper.getAccessToken(
            parsedUser.refreshToken
          );
          const spotifyUser = await SpotifyHelper.getUserInfo(accessToken);
          sessionStorage.setItem(
            'discoverDaily_spotifyUser',
            JSON.stringify(spotifyUser)
          );
        } catch (e) {
          if (e.deletedUser) {
            window.location = `${window.location.origin}/login`;
            sessionStorage.clear();
          }
        }
      }

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

          const usr = (await DiscoverDailyHelper.getUser(spotifyUser.id)).user;
          if (usr && usr.userId) {
            setUser(usr);
            updatePlaylistOptions(usr);
            setLoading(false);
          } else {
            sendToMain();
          }

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

      if (!access_token) sendToLogin();

      const spotifyUser = await SpotifyHelper.getUserInfo(access_token);
      sessionStorage.setItem(
        'discoverDaily_spotifyUser',
        JSON.stringify(spotifyUser)
      );
      const usr = (await DiscoverDailyHelper.getUser(spotifyUser.id)).user;
      setUser(usr.userId ? usr : null);
      setLoading(false);

      if (usr && usr.userId) {
        updatePlaylistOptions(usr);
        await DiscoverDailyHelper.signupUser(spotifyUser, refresh_token);
      } else {
        sendToMain();
      }

      return;
    }

    sendToLogin();
  };

  useEffect(() => {
    async function init() {
      const imgIndexes = new Set();
      while (imgIndexes.size < 16) {
        const randomNum = Math.floor(Math.random() * images.length);
        if (!imgIndexes.has(randomNum)) {
          imgIndexes.add(randomNum);
        }
      }

      setImageIndexes([...imgIndexes]);

      await getUserState();
    }

    function handleResize() {
      if (window.innerWidth <= 1000) {
        setSeeds(['AA', 'AT', 'MA', 'MT', 'SA', 'ST']);
      } else {
        setSeeds(['AA', 'MA', 'SA', 'AT', 'MT', 'ST']);
      }

      setVerticalSeedArrows(window.innerWidth <= 550);
    }

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restoreDefaults = async () => {
    try {
      const usr = await DiscoverDailyHelper.restorePlaylistOptions(
        user.userId,
        user.refreshToken
      );
      setUser(usr);
      updatePlaylistOptions(usr);
      sessionStorage.setItem('discoverDaily_user', JSON.stringify(usr));
    } catch (e) {
      if (e.deletedUser) {
        window.location = `${window.location.origin}/login`;
        sessionStorage.clear();
      }
    }
  };

  const onSliderChange = (newValue, setter, range) => {
    if (Math.abs(newValue[0] - newValue[1]) >= 20) {
      setter(newValue);
      optionRef.current[range] = newValue;
      setOptions(optionRef.current);
    }
  };

  const sendUpdatePlaylistOptions = async () => {
    try {
      const usr = await DiscoverDailyHelper.updatePlaylistOptions(
        optionRef.current,
        user.userId,
        user.refreshToken
      );
      setUser(usr);
      updatePlaylistOptions(usr);
      sessionStorage.setItem('discoverDaily_user', JSON.stringify(usr));
      setSnackbarOpen(true);
    } catch (e) {
      if (e.deletedUser) {
        window.location = `${window.location.origin}/login`;
        sessionStorage.clear();
      }
    }
  };

  const SpotifySliderThumbComponent = (props) =>
    optionRef.current[props['aria-labelledby']] ? (
      <span {...props}>
        <span>
          {optionRef.current[props['aria-labelledby']][props['data-index']]}
        </span>
      </span>
    ) : null;

  const select = (value, side, index) => {
    setSelectedSide(side);
    setSelected(value);
    setSelectedIndex(index);
  };

  const handleSelectRight = () => {
    optionRef.current.seeds.push(selected);
    setChosenSeeds(optionRef.current.seeds);
    setSelected(null);
    setSelectedSide(null);
    setSelectedIndex(null);
  };

  const handleSelectLeft = () => {
    optionRef.current.seeds.splice(selectedIndex, 1);
    setChosenSeeds(optionRef.current.seeds);
    setSelected(null);
    setSelectedSide(null);
    setSelectedIndex(null);
  };

  const customList = (items, side) => (
    <Card>
      {side === 'left' ? (
        <CardHeader
          className={classes.cardHeader}
          title="Available Seeds"
          style={{ padding: '19px 10px' }}
        />
      ) : (
        <CardHeader
          className={classes.cardHeader}
          title="Chosen Seeds"
          subheader={`${chosenSeeds.length}/5 selected`}
        />
      )}
      <Divider />
      <List dense component="div" role="list" className="seedList">
        {items.map((value, index) => {
          const labelId = `transfer-list-item-${value}-label`;

          return (
            <ListItem
              key={index}
              role="listitem"
              button
              onClick={() => {
                select(value, side, index);
              }}
              style={{
                backgroundColor:
                  selected === value &&
                  selectedSide === side &&
                  selectedIndex === index
                    ? '#4fe383'
                    : '',
              }}
            >
              <ListItemText id={labelId} primary={seedToString[value]} />
            </ListItem>
          );
        })}
        <ListItem />
      </List>
    </Card>
  );

  return (
    <div className="DiscoverDailyMain">
      <Row style={{ width: '100%', margin: '0' }}>
        <Col style={{ width: '100%', margin: '0' }}>
          <Col className="discoverDailyLeftColumn">
            {loading ? (
              <Row className="playlistOptionsMainRow" style={{ width: '90%' }}>
                <div style={{ width: 'max-content', margin: '0 auto' }}>
                  <CircularProgress
                    className="loadingCircle"
                    style={{ width: '10vw', height: '10vw' }}
                  />
                </div>
              </Row>
            ) : (
              <Col style={{ width: '100%' }}>
                <Row className="playlistOptionsMainRow">
                  <h1 style={{ margin: '0' }}>Discover Weekly...</h1>
                  <h1 style={{ margin: '0' }}>But Daily</h1>
                </Row>
                <Row
                  className="playlistOptionList"
                  style={{
                    width: '100%',
                    margin: '0 1%',
                    maxHeight: '75vh',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '0 8% 0 4%',
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
                  <h3 className="spotifySliderHeader">Mood</h3>
                  <h5 className="spotifySliderDescription">
                    High values correspond to positivity and happiness, while
                    low values correspond to negativity and sadness.
                  </h5>
                  <Slider
                    className="spotifySlider"
                    ThumbComponent={SpotifySliderThumbComponent}
                    value={valence}
                    onChange={(e, v) =>
                      onSliderChange(v, setValence, 'valence')
                    }
                    valueLabelDisplay="auto"
                    aria-labelledby="valence"
                  />
                  <h3 className="spotifySliderHeader">Recommendation Seeds</h3>
                  <h5 className="spotifySliderDescription">
                    These are your top tracks and artists taken from different
                    time periods in your listening history. All time would
                    encompass your entire listening history, medium term would
                    include the past 6 months, and short term includes the past
                    4 weeks. Select anywhere between 1 and 5 options to
                    influence your playlist.
                  </h5>
                  <Grid
                    id="seedGrid"
                    container
                    spacing={2}
                    justify="center"
                    alignItems="center"
                    className={classes.root}
                  >
                    <Grid item id="seedsLeft">
                      {customList(seeds, 'left')}
                    </Grid>
                    <Grid item id="seedButtons">
                      <Grid container direction="column" alignItems="center">
                        <button
                          id="seedButton1"
                          className="seedButton"
                          size="small"
                          onClick={handleSelectRight}
                          disabled={
                            !selected ||
                            selectedSide !== 'left' ||
                            chosenSeeds.length >= 5
                          }
                          aria-label="move selected right"
                        >
                          {verticalSeedArrows
                            ? String.fromCharCode(9661)
                            : String.fromCharCode(62)}
                        </button>
                        <button
                          id="seedButton2"
                          className="seedButton"
                          size="small"
                          onClick={handleSelectLeft}
                          disabled={
                            !selected ||
                            selectedSide !== 'right' ||
                            chosenSeeds.length <= 1
                          }
                          aria-label="move selected left"
                        >
                          {verticalSeedArrows
                            ? String.fromCharCode(9651)
                            : String.fromCharCode(60)}
                        </button>
                      </Grid>
                    </Grid>
                    <Grid item id="seedsRight">
                      {customList(chosenSeeds, 'right')}
                    </Grid>
                  </Grid>
                </Row>
                <Row style={{ margin: '1% 4%' }}>
                  <button
                    className="btn btn-primary spotify-button"
                    style={{ float: 'right', marginLeft: '1%' }}
                    onClick={sendToMain}
                  >
                    Back
                  </button>
                  <button
                    className="btn btn-primary spotify-button"
                    style={{ float: 'right', marginLeft: '1%' }}
                    onClick={sendUpdatePlaylistOptions}
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-primary spotify-button"
                    onClick={restoreDefaults}
                  >
                    Restore Defaults
                  </button>
                </Row>
                <Snackbar
                  open={snackbarOpen}
                  onClose={() => {
                    setSnackbarOpen(false);
                  }}
                  autoHideDuration={3000}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                  }}
                >
                  <MuiAlert
                    elevation={6}
                    variant="filled"
                    onClose={() => {
                      setSnackbarOpen(false);
                    }}
                    severity="success"
                    style={{ fontSize: '1.5rem' }}
                  >
                    Your playlist preferences have been saved! These settings
                    will now be used for all future playlists.
                  </MuiAlert>
                </Snackbar>
              </Col>
            )}
          </Col>
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
    </div>
  );
}
