import React, { useEffect } from 'react';
import { Route, BrowserRouter } from "react-router-dom";
import DiscoverDaily from "./DiscoverDaily/Main";
import DiscoverDailyRedirect from "./DiscoverDaily/Redirect";
import DiscoverDailyLogin from "./DiscoverDaily/Login";
import DiscoverDailyPlaylistOptions from "./DiscoverDaily/PlaylistOptions";
import ReactGa from 'react-ga';
import './index.css';
// import './fonts/Gotham.otf';

function App() {
  document.title = "Discoverify"

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      ReactGa.initialize(process.env.REACT_APP_GOOGLE_ANALYTICS_ID);
      ReactGa.pageview(window.location.pathname + window.location.search);
    }
  }, [])

  return (
    <BrowserRouter>
      <Route exact path="/" component={DiscoverDaily}></Route>
      <Route exact path="/options" component={DiscoverDailyPlaylistOptions}></Route>
      <Route exact path="/redirect" component={DiscoverDailyRedirect}></Route>
      <Route exact path="/login" component={DiscoverDailyLogin}></Route>
    </BrowserRouter>
  );
}

export default App;
