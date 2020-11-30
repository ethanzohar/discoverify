import React, { useEffect, useState, useRef } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { makeStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import Slider from "@material-ui/core/Slider";
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Paper from '@material-ui/core/Paper';
import ListItemText from '@material-ui/core/ListItemText';
import SpotifyHelper from '../helpers/SpotifyHelper';
import DiscoverDailyHelper from '../helpers/DiscoverDailyHelper';
import { images } from './images';

import './discoverDaily.scss';

const useStyles = makeStyles((theme) => ({
  root: {
    width: 'max-content'
  },
  paper: {
    width: '55%',
    height: 90,
    overflow: 'none',
  },
}));

export default function DiscoverDailyPlaylistOptions() {
  const classes = useStyles();

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
  const [left, setLeft] = useState(["All Time Artist", "Medium Term Artist", "Short Term Artist", "All Time Track",  "Medium Term Track", "Short Term Track"]);
  const [right, setRight] = useState([]);

  const optionRef = useRef(options);

  const sendToLogin = () => {
    window.location = window.location.origin + '/login';
  }

  const sendToMain = () => {
    window.location = window.location.origin;
  }

  const updatePlaylistOptions = async (usr) => {
    if (usr.playlistOptions) {
      setAcousticness(usr.playlistOptions.acousticness);
      setDanceability(usr.playlistOptions.danceability);
      setEnergy(usr.playlistOptions.energy);
      setInstrumentalness(usr.playlistOptions.instrumentalness);
      setPopularity(usr.playlistOptions.popularity);
      setValence(usr.playlistOptions.valence);

      optionRef.current = {
        acousticness: usr.playlistOptions.acousticness,
        danceability: usr.playlistOptions.danceability,
        energy: usr.playlistOptions.energy,
        instrumentalness: usr.playlistOptions.instrumentalness,
        popularity: usr.playlistOptions.popularity,
        valence: usr.playlistOptions.valence
      }

      setOptions(optionRef.current);
    } else {
      const restoredUser = await DiscoverDailyHelper.restorePlaylistOptions(usr.userId, usr.refreshToken);
      setUser(restoredUser);
      updatePlaylistOptions(restoredUser)
      sessionStorage.setItem('discoverDaily_user', JSON.stringify(restoredUser));
    }
  }

  const getUserState = async () => {
    const user = sessionStorage.getItem('discoverDaily_user');

    if (user && user !== 'null') {
      const parsedUser = JSON.parse(user);
      setUser(parsedUser);
      updatePlaylistOptions(parsedUser);
      setLoading(false);
      return;
    }

    const code = sessionStorage.getItem('discoverDaily_code');
    const refreshToken = localStorage.getItem('discoverDaily_refreshToken');

    if (refreshToken && refreshToken !== 'null') {
      const accessToken = await SpotifyHelper.getAccessToken(refreshToken);
      
      if (accessToken) {
        const spotifyUser = await SpotifyHelper.getUserInfo(accessToken);

        const { user } = await DiscoverDailyHelper.getUser(spotifyUser.id);
        if (user.userId) {
          setUser(user);
          updatePlaylistOptions(user);
          setLoading(false);
        } else {
          sendToMain();
        }

        return;
      }
    }
    
    if (code && code !== 'null') {
      const { access_token, refresh_token } = await SpotifyHelper.getRefreshToken(code, window.location.origin + '/redirect');
      localStorage.setItem('discoverDaily_refreshToken', refresh_token ? refresh_token : null);

      if (!access_token) sendToLogin();
      
      const spotifyUser = await SpotifyHelper.getUserInfo(access_token);
      const { user } = await DiscoverDailyHelper.getUser(spotifyUser.id);
      setUser(user.userId ? user : null);
      setLoading(false);
      
      if (user.userId) {
        updatePlaylistOptions(user);
        await DiscoverDailyHelper.signupUser(spotifyUser, refresh_token);
      } else {
        sendToMain();
      }

      return;
    }

    sendToLogin();
  }

  useEffect(() => {
    async function init() {
      const imgIndexes = new Set();
      while (imgIndexes.size < 16) {
        const randomNum = Math.floor(Math.random() * images.length);
        if (!imgIndexes.has(randomNum)){
          imgIndexes.add(randomNum);
        }
      }

      setImageIndexes([...imgIndexes]);

      await getUserState();
    }

    init();
  }, []);

  const restoreDefaults = async () => {
    const usr = await DiscoverDailyHelper.restorePlaylistOptions(user.userId, user.refreshToken);
    setUser(usr);
    updatePlaylistOptions(usr)
    sessionStorage.setItem('discoverDaily_user', JSON.stringify(usr));
  }
  
  const onSliderChange = (newValue, setter, range) => {
    if (Math.abs(newValue[0] - newValue[1]) >= 10) {
      setter(newValue);
      optionRef.current[range] = newValue;
      setOptions(optionRef.current);
    }
  }

  const sendUpdatePlaylistOptions = async () => {
    const usr = await DiscoverDailyHelper.updatePlaylistOptions(optionRef.current, user.userId, user.refreshToken);
    setUser(usr);
    updatePlaylistOptions(usr)
    sessionStorage.setItem('discoverDaily_user', JSON.stringify(usr));
    setSnackbarOpen(true);
  }

  const SpotifySliderThumbComponent = (props) => {
    return (
      optionRef.current[props['aria-labelledby']] ? (
        <span {...props}>
          <span>{optionRef.current[props['aria-labelledby']][props['data-index']]}</span>
        </span>) : null
    );
  }

  const select = (value, side, index) => {
    setSelectedSide(side);
    setSelected(value);
    setSelectedIndex(index);
  }

  const handleSelectRight = () => {
    setRight(right.concat(selected));
    setSelected(null);
    setSelectedSide(null);
    setSelectedIndex(null);
  };

  const handleSelectLeft = () => {
    const r = right;
    r.splice(selectedIndex, 1);
    setRight(r);
    setSelected(null);
    setSelectedSide(null);
    setSelectedIndex(null);
  };

  const customList = (items, side) => (
    <Paper className={classes.paper}>
      <List dense component="div" role="list">
        {items.map((value, index) => {
          const labelId = `transfer-list-item-${value}-label`;

          return (
            <ListItem key={index} role="listitem" button onClick={() => { select(value, side, index); }} style={{ backgroundColor: selected === value && selectedSide === side && selectedIndex === index ? "#4fe383" : ''}}>
              <ListItemText id={labelId} primary={value} />
            </ListItem>
          );
        })}
        <ListItem />
      </List>
    </Paper>
  );

  return (
    <div className="DiscoverDailyMain">
      <Row style={{width: '100%', margin: '0'}}>
        <Col style={{width: '100%', margin: '0'}}>
          <Col className="discoverDailyLeftColumn">
            {loading ? 
            (
              <Row style={{ width: '90%', marginLeft: '4%' }}>
                <div style={{ width: 'max-content', margin: '0 auto' }}>
                  <CircularProgress style={{width: '10vw', height: '10vw', color: 'rgb(12, 38, 88)'}}/>
                </div>
              </Row>
            ) : 
            (
              <Col style={{ width: '100%' }}>
                <Row style={{ marginLeft: '4%' }}>
                  <h1 style={{ margin: '0' }}>Discover Weekly...</h1>
                  <h1 style={{ margin: '0' }}>But Daily</h1>
                </Row>
                <Row className="playlistOptionList" style={{ width: '100%', margin: '0 1%', maxHeight: '75vh', overflowY: 'auto', overflowX: 'hidden', padding: '0 8% 0 4%' }}>
                  <h3 className="spotifySliderHeader">Recommendation Seeds</h3>
                  <h5 className="spotifySliderDescription">These are your top tracks and artists taken from different time periods in your listening history. All time would encompass your entire listening history, medium term would include the past 6 months, and short term includes the past 4 weeks. Select anywhere between 1 and 5 options to influence your playlist.</h5>
                  <Grid container spacing={2} justify="center" alignItems="center" className={classes.root}>
                    <Grid item>{customList(left, 'left')}</Grid>
                      <Grid item>
                        <Grid container direction="column" alignItems="center">
                          <button
                            className="seedButton"
                            size="small"
                            onClick={handleSelectRight}
                            disabled={!selected || selectedSide !== 'left' || right.length >= 5}
                            aria-label="move selected right"
                          >
                            &gt;
                          </button>
                          <button
                            className="seedButton"
                            size="small"
                            onClick={handleSelectLeft}
                            disabled={!selected || selectedSide !== 'right' || right.length <= 1}
                            aria-label="move selected left"
                          >
                            &lt;
                          </button>
                        </Grid>
                      </Grid>
                    <Grid item>{customList(right, 'right')}</Grid>
                  </Grid>
                  <h3 className="spotifySliderHeader">Acousticness</h3>
                  <h5 className="spotifySliderDescription">A confidence measure of whether the track is acoustic.</h5>
                  <Slider
                    className="spotifySlider"
                    ThumbComponent={SpotifySliderThumbComponent}
                    value={acousticness}
                    onChange={(e, v) => onSliderChange(v, setAcousticness, 'acousticness')}
                    valueLabelDisplay="auto"
                    aria-labelledby="acousticness"
                  />
                  <h3 className="spotifySliderHeader">Danceability</h3>
                  <h5 className="spotifySliderDescription">Describes how suitable a track is for dancing based on a combination of musical elements including tempo, rhythm stability, beat strength, and overall regularity.</h5>
                  <Slider
                    className="spotifySlider"
                    ThumbComponent={SpotifySliderThumbComponent}
                    value={danceability}
                    onChange={(e, v) => onSliderChange(v, setDanceability, 'danceability')}
                    valueLabelDisplay="auto"
                    aria-labelledby="danceability"
                  />
                  <h3 className="spotifySliderHeader">Energy</h3>
                  <h5 className="spotifySliderDescription">Represents a perceptual measure of intensity and activity. Typically, energetic tracks feel fast, loud, and noisy. Perceptual features contributing to this attribute include dynamic range, perceived loudness, timbre, onset rate, and general entropy.</h5>
                  <Slider
                    className="spotifySlider"
                    ThumbComponent={SpotifySliderThumbComponent}
                    value={energy}
                    onChange={(e, v) => onSliderChange(v, setEnergy, 'energy')}
                    valueLabelDisplay="auto"
                    aria-labelledby="energy"
                  />
                  <h3 className="spotifySliderHeader">Instrumentalness</h3>
                  <h5 className="spotifySliderDescription">Predicts whether a track contains no vocals. Values above 50 are intended to represent instrumental tracks, but confidence is higher as the value approaches 100.</h5>
                  <Slider
                    className="spotifySlider"
                    ThumbComponent={SpotifySliderThumbComponent}
                    value={instrumentalness}
                    onChange={(e, v) => onSliderChange(v, setInstrumentalness, 'instrumentalness')}
                    valueLabelDisplay="auto"
                    aria-labelledby="instrumentalness"
                  />
                  <h3 className="spotifySliderHeader">Popularity</h3>
                  <h5 className="spotifySliderDescription">	The popularity of the track. The popularity is calculated by an algorithm and is based, in the most part, on the total number of plays the track has had and how recent those plays are.</h5>
                  <Slider
                    className="spotifySlider"
                    ThumbComponent={SpotifySliderThumbComponent}
                    value={popularity}
                    onChange={(e, v) => onSliderChange(v, setPopularity, 'popularity')}
                    valueLabelDisplay="auto"
                    aria-labelledby="popularity"
                  />
                  <h3 className="spotifySliderHeader">Valence</h3>
                  <h5 className="spotifySliderDescription">A measure describing the musical positiveness conveyed by a track. Tracks with high valence sound more positive (e.g. happy, cheerful, euphoric), while tracks with low valence sound more negative (e.g. sad, depressed, angry).</h5>
                  <Slider
                    className="spotifySlider"
                    ThumbComponent={SpotifySliderThumbComponent}
                    value={valence}
                    onChange={(e, v) => onSliderChange(v, setValence, 'valence')}
                    valueLabelDisplay="auto"
                    aria-labelledby="valence"
                  />
                </Row>
                <Row style={{ margin: '1% 4%' }}>
                  <button className="btn btn-primary spotify-button" style={{ float: 'right', marginLeft: '1%' }} onClick={sendToMain}>Back</button>
                  <button className="btn btn-primary spotify-button" style={{ float: 'right', marginLeft: '1%' }} onClick={sendUpdatePlaylistOptions}>Save</button>
                  <button className="btn btn-primary spotify-button" onClick={restoreDefaults}>Restore Defaults</button>
                </Row>
                <Snackbar open={snackbarOpen}
                          onClose={() => { setSnackbarOpen(false); }}
                          autoHideDuration={3000} 
                          anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'center',
                          }}>
                  <MuiAlert elevation={6} variant="filled" onClose={() => { setSnackbarOpen(false); }} severity="success" style={{ fontSize: '1.5rem' }}>
                    Your playlist preferences have been saved! These settings will now be used for all future playlists.
                  </MuiAlert>
                </Snackbar>
              </Col>
            )}
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
