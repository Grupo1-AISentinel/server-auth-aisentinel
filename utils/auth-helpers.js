import crypto from 'crypto';

export const generateEmailVerificationToken = () => {
  return generateSecureToken(32); // 32 bytes = 256 bits
};

export const generatePasswordResetToken = () => {
  return generateSecureToken(32); // 32 bytes = 256 bits
};

const generateSecureToken = (length) => {
  const bytes = crypto.randomBytes(length);
  return bytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};
