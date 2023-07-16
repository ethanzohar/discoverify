import React, { useEffect } from 'react';
import { Route, BrowserRouter } from 'react-router-dom';
import ReactGa from 'react-ga';
import DiscoverDaily from './DiscoverDaily/Main';
import DiscoverDailyRedirect from './DiscoverDaily/Redirect';
import DiscoverDailyLogin from './DiscoverDaily/Login';
import DiscoverDailyPlaylistOptions from './DiscoverDaily/PlaylistOptions';
import DiscoverDailySetup from './DiscoverDaily/Setup';
import DiscoverDailyStripeCancel from './DiscoverDaily/StripeCancel';
import DiscoverDailyStripeError from './DiscoverDaily/StripeError';
import DiscoverDailyStripeSuccess from './DiscoverDaily/StripeSuccess';
import './index.css';

function App() {
  document.title = 'Discoverify';

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      ReactGa.initialize(process.env.REACT_APP_GOOGLE_ANALYTICS_ID);
      ReactGa.pageview(window.location.pathname + window.location.search);
    }
  }, []);

  return (
    <BrowserRouter>
      <Route exact path="/stripe/error" component={DiscoverDailyStripeError} />
      <Route
        exact
        path="/stripe/cancel"
        component={DiscoverDailyStripeCancel}
      />
      <Route
        exact
        path="/stripe/success"
        component={DiscoverDailyStripeSuccess}
      />
      <Route exact path="/setup" component={DiscoverDailySetup} />
      <Route exact path="/options" component={DiscoverDailyPlaylistOptions} />
      <Route exact path="/redirect" component={DiscoverDailyRedirect} />
      <Route exact path="/login" component={DiscoverDailyLogin} />
      <Route exact path="/" component={DiscoverDaily} />
    </BrowserRouter>
  );
}

export default App;
