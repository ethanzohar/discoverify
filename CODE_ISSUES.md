# Code Issues — Discoverify Backend

Issues found during code review, ranked by severity. None of these were introduced by the logging/metrics work — all pre-existing.

---

## Critical

### 1. `isAdmin` never awaited — all admin routes are unprotected

**File:** `backend/routes/discoverDailyRoutes.js` — lines 35, 83, 98, 114, 131, 141

```js
// Every admin route does this:
if (!isAdmin(userId, refreshToken)) {   // ← isAdmin is async, this is a Promise
  return res.status(403).send('Invalid credentials');
}
// A Promise is always truthy → !Promise is always false → check never triggers
```

`isAdmin` is `async` but is called without `await`. The result is a Promise object, which is always truthy, so `!isAdmin(...)` is always `false` and the 403 branch never fires. **Every admin route (`/migration`, `/force`, `/forceNoUpdate`, `/forceSingle`, `/forceUnsubscribeUser`, `/count`, `/cleanCorrupted`) is completely unprotected** — anyone can call them.

Fix: `if (!(await isAdmin(userId, refreshToken)))`

---

### 2. Migration route wipes all stripeIds if triggered

**File:** `backend/routes/discoverDailyRoutes.js` — lines 61–63

```js
// This is active code, not commented out:
users[i].stripeId = null;
users[i].grandmothered = true;
await users[i].save();
```

The `/migration` route still has live code that sets `stripeId = null` and `grandmothered = true` for every user. Given that the `isAdmin` check is broken (issue #1), this endpoint can be triggered by anyone with the endpoint URL, wiping all Stripe subscription IDs from the DB — recreating the exact bug this session fixed. This route should either be deleted or have its body cleared after migrations are complete.

---

### 3. `updatePlaylistTracks` not awaited — playlists may silently not update

**File:** `backend/helpers/spotifyHelper.js` — line 629

```js
this.updatePlaylistTracks(playlistId, tracks, accessToken);  // ← no await
user.lastUpdated = new Date();
user.save();  // ← also no await
```

Both `updatePlaylistTracks` and `user.save()` are async but neither is awaited. The Spotify PUT request fires and is forgotten. If it fails, there's no error surface. The `playlist_updated` log event fires regardless of whether the tracks were actually written. This means users may see a successful log entry while their playlist was not updated.

Fix: `await this.updatePlaylistTracks(...)` and `await user.save()`

---

### 4. `createPlaylist` sets `playlistId` on user but doesn't save it to DB

**File:** `backend/helpers/spotifyHelper.js` — lines 494–496

```js
user.playlistId = responseJSON.id;  // sets on in-memory object only
return responseJSON;
// No user.save() here
```

When a new playlist is created, `user.playlistId` is set on the Mongoose document but never persisted. The value exists in memory for the remainder of the current request. But since `user.save()` on line 632 is also not awaited (issue #3), even that second chance is unreliable. If the process restarts between now and the next update, the user will have no `playlistId` in the DB and a new playlist will be created again next run — potentially accumulating orphaned playlists in Spotify.

Fix: `await user.save()` inside `createPlaylist` after setting `user.playlistId`.

---

## High

### 5. `/accessToken` route hangs client on non-`deleteUser` errors

**File:** `backend/routes/discoverDailyRoutes.js` — lines 284–302

```js
router.post('/accessToken', async function (req, res) {
  const { refreshToken } = req.body;
  try {
    const accessToken = await SpotifyHelper.getNewAccessToken(refreshToken);
    return res.status(200).send({ accessToken });
  } catch (e) {
    if (e.deleteUser) {
      // ... handles this case, returns
      return res.status(500).send({ deletedUser: true });
    }
    // ← No else/finally: if e.deleteUser is false, function exits without sending a response
    // Client hangs until Express times out
  }
});
```

If `getNewAccessToken` throws any error other than `SpotifyAPIException(true)` (e.g., network error, malformed response), the catch block falls through without sending a response. Express 4 doesn't auto-close the connection, so the client hangs indefinitely.

Fix: Add a fallback `return res.status(500).send({ error: 'Failed to get access token' })` after the if-block.

---

### 6. `/getUser` route returns the user's refresh token

**File:** `backend/routes/discoverDailyRoutes.js` — lines 173–191

```js
return res.status(200).send({
  user: {
    userId: req.params.userId,
    playlistId: user.playlistId,
    refreshToken: user.refreshToken,   // ← long-lived Spotify credential
    ...
  },
});
```

The Spotify refresh token is returned in the API response with no authentication gate — any caller who knows a `userId` can retrieve that user's refresh token. The refresh token grants full Spotify API access on behalf of the user. This should be removed from the response (the frontend almost certainly doesn't need it here since it already has it in localStorage).

---

### 7. `setUserPlaylistId` writes to the wrong field name

**File:** `backend/controllers/userController.js` — line 145

```js
static async setUserPlaylistId(userId, playListId) {
  const user = await this.getUser(userId);
  user.playListId = playListId;   // ← capital L: 'playListId'
  return user.save();
}
// Schema field is: playlistId (lowercase l)
```

Mongoose silently ignores writes to fields not in the schema. This method saves to a non-existent field and does nothing. If this method is called anywhere, the playlist ID is silently lost. Check if this is called and replace with `user.playlistId`.

---

### 8. `stripeSessionController.js` has a duplicate import

**File:** `backend/controllers/stripeSessionController.js` — lines 1–2

```js
const stripeSessionModel = require('../models/stripeSessionSchema');
const StripeSession = require('../models/stripeSessionSchema');  // ← same file, different name
```

Both point to the same module. `StripeSession` is used in `getSessionBySessionId` and `getAllSessions`; `stripeSessionModel` is used in `createSession` and `deleteSession`. One of them should be removed and replaced consistently.

---

## Medium

### 9. `stripeRoutes.js` has a dead `app` instance

**File:** `backend/routes/stripeRoutes.js` — lines 16–19, same in `discoverDailyRoutes.js` lines 10–13

```js
const app = express();
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
// 'app' is never used — only 'router' is exported
```

Body-parser middleware is applied to a local `express()` instance that is never mounted anywhere. The middleware has no effect. The `router` is exported and mounted in `app.js`, which already applies `bodyParser` globally. These lines can be deleted from both route files.

---

### 10. `getTop` retries silently and the retry can also throw

**File:** `backend/helpers/spotifyHelper.js` — lines 86–118

```js
try {
  // fetch top tracks
  return resultJSON.items.map(...);
} catch (e) {
  // Retries blindly with the same request
  const result = await fetch(/* same URL */);
  return resultJSON.items.map(...);  // ← if this also fails, throws up unhandled
}
```

The catch block retries the identical request with no delay and no logging. If Spotify is returning errors (rate-limited, token expired, service down), the retry will fail too and throw an unhandled error with no context. The original error `e` is also silently discarded. At minimum the original error should be logged; ideally the retry should check `result.ok` before parsing.

---

### 11. `updatePlaylistsNoUpdate` is broken — creates playlists but doesn't update them

**File:** `backend/helpers/spotifyHelper.js` — lines 740–820

The method fetches seeds and tracks, creates a playlist if missing, but then **does not call `updatePlaylistTracks`**. The tracks are computed but never written. Additionally, it has dead commented-out code and is called by the `/forceNoUpdate` admin route. It's unclear if this method was intentionally left incomplete or is a stale prototype. If it's not being used as intended, it should either be completed or removed.

---

### 12. `getNewAccessToken` silently returns `undefined` on non-`invalid_grant` Spotify errors

**File:** `backend/helpers/spotifyHelper.js` — lines 22–53

```js
const resultJSON = await result.json();
if (resultJSON.error === 'invalid_grant') {
  throw new SpotifyAPIException(true);
}
return resultJSON.access_token;  // undefined if Spotify returned any other error
```

If Spotify returns a rate-limit error, a server error, or any response where `error !== 'invalid_grant'`, the function returns `undefined`. The caller receives `undefined` as the access token and uses it in subsequent API calls, which then fail with cryptic errors rather than a clear "token refresh failed" error.

Fix: Check `if (resultJSON.error)` (not just `invalid_grant`) and throw or log appropriately.

---

### 13. No input validation on mutating routes

**File:** `backend/routes/discoverDailyRoutes.js` — `/subscribe`, `/unsubscribe`, `/restorePlaylistOptions`, `/updatePlaylistOptions`

Routes that modify user data don't validate that required fields (`userId`, `accessToken`, `options`) are present before using them. A request with a missing body field will cause Mongoose or the Spotify API to throw a cryptic error rather than returning a clean 400. With the logging now in place, these will show up as `user_unsubscribe_route_error` events rather than being caught early.

---

## Low

### 14. `doesMyPlaylistExists` has a grammatical typo in the method name

**File:** `backend/helpers/spotifyHelper.js` — line 538

`doesMyPlaylistExists` should be `doesMyPlaylistExist`. Referenced in one place so easy to rename. Minor but creates friction for anyone reading the code.

---

### 15. `addPlaylistCover` uses `fs.createReadStream` on a path argument

**File:** `backend/helpers/spotifyHelper.js` — line 570

```js
body: fs.createReadStream(encodedImage),
```

The parameter is named `encodedImage` which suggests it might be a base64 string, but `fs.createReadStream` expects a file path. If `encodedImage` is ever passed as a base64 string instead of a path, this silently sends an empty body to Spotify. Worth verifying the caller contract is consistent.

---

### 16. Stripe session records may accumulate if webhook is never received

**File:** `backend/routes/stripeRoutes.js`

When a checkout session is created, a `StripeSession` record is inserted. It's only deleted when a webhook fires (`checkout.session.completed`, `expired`, or `failed`). If Stripe fails to deliver the webhook (or the endpoint was unreachable), the session record stays in the DB indefinitely. Over time these accumulate. A TTL index on the `stripeSessionSchema` (e.g., expire after 24 hours) would clean these up automatically.

---

## Summary

| # | Issue | Severity |
|---|---|---|
| 1 | `isAdmin` never awaited — admin routes fully unprotected | Critical |
| 2 | Migration route has live stripeId-wiping code | Critical |
| 3 | `updatePlaylistTracks` and `user.save()` not awaited | Critical |
| 4 | `createPlaylist` never persists new playlistId to DB | Critical |
| 5 | `/accessToken` hangs client on non-deleteUser errors | High |
| 6 | `/getUser` leaks refresh tokens | High |
| 7 | `setUserPlaylistId` writes to wrong field name | High |
| 8 | Duplicate import in stripeSessionController | Medium |
| 9 | Dead `app` instance in route files | Medium |
| 10 | `getTop` retry swallows errors and can throw unhandled | Medium |
| 11 | `updatePlaylistsNoUpdate` computes but never writes tracks | Medium |
| 12 | `getNewAccessToken` returns `undefined` on non-`invalid_grant` errors | Medium |
| 13 | No input validation on mutating routes | Medium |
| 14 | `doesMyPlaylistExists` typo in method name | Low |
| 15 | `addPlaylistCover` assumes file path but param name suggests base64 | Low |
| 16 | Stripe sessions can accumulate without a TTL | Low |
