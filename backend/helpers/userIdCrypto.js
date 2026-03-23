const CryptoJS = require('crypto-js');

const ACTIVE_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET;
const OLD_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET_OLD;

function parseSecret(secret) {
  if (!secret) {
    throw new Error('Missing encryption secret');
  }

  return CryptoJS.enc.Base64.parse(secret);
}

function isLikelySpotifyUserId(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[A-Za-z0-9]+$/.test(value)
  );
}

function decryptUserIdWithSecret(encryptedUserId, secret) {
  try {
    const decrypted = CryptoJS.AES.decrypt(
      encryptedUserId,
      parseSecret(secret),
      { mode: CryptoJS.mode.ECB }
    ).toString(CryptoJS.enc.Utf8);

    console.log(
      `decrypted userId with ${
        secret === ACTIVE_SECRET ? 'active' : 'old'
      } secret:`,
      decrypted
    );

    return isLikelySpotifyUserId(decrypted) ? decrypted : null;
  } catch (error) {
    console.log(
      `error decrypting userId with ${
        secret === ACTIVE_SECRET ? 'active' : 'old'
      } secret:`,
      error
    );
    return null;
  }
}

function encryptUserIdWithSecret(userId, secret) {
  return CryptoJS.AES.encrypt(userId, parseSecret(secret), {
    mode: CryptoJS.mode.ECB,
  }).toString();
}

function encryptUserId(userId) {
  return encryptUserIdWithSecret(userId, ACTIVE_SECRET);
}

function decryptUserId(encryptedUserId) {
  const activeAttempt = decryptUserIdWithSecret(encryptedUserId, ACTIVE_SECRET);
  if (activeAttempt) return activeAttempt;

  if (OLD_SECRET) {
    const oldAttempt = decryptUserIdWithSecret(encryptedUserId, OLD_SECRET);
    if (oldAttempt) return oldAttempt;
  }

  throw new Error('Unable to decrypt userId with active/old secrets');
}

function getEncryptedUserIdCandidates(userId) {
  const candidates = [encryptUserIdWithSecret(userId, ACTIVE_SECRET)];

  if (OLD_SECRET) {
    const oldEncrypted = encryptUserIdWithSecret(userId, OLD_SECRET);
    if (!candidates.includes(oldEncrypted)) {
      candidates.push(oldEncrypted);
    }
  }

  return candidates;
}

module.exports = {
  decryptUserId,
  decryptUserIdWithSecret,
  encryptUserId,
  encryptUserIdWithSecret,
  getEncryptedUserIdCandidates,
};
