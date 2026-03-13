import dotenv from 'dotenv';

dotenv.config();

export const config = {

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    enableSsl: process.env.SMTP_ENABLE_SSL === 'true',
    username: process.env.SMTP_USERNAME,
    password: process.env.SMTP_PASSWORD,
    fromEmail: process.env.EMAIL_FROM,
    fromName: process.env.EMAIL_FROM_NAME,
  },

  upload: {
    maxSize: 5 * 1024 * 1024, 
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'], 
    uploadPath: process.env.UPLOAD_PATH,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    baseUrl: process.env.CLOUDINARY_BASE_URL,

    defaultAvatarPath:
      process.env.CLOUDINARY_DEFAULT_AVATAR &&
      !process.env.CLOUDINARY_DEFAULT_AVATAR.includes('${')
        ? process.env.CLOUDINARY_DEFAULT_AVATAR
        : [
            process.env.CLOUDINARY_FOLDER,
            process.env.CLOUDINARY_DEFAULT_AVATAR_FILENAME,
          ]
            .filter(Boolean)
            .join('/'),
    folder: process.env.CLOUDINARY_FOLDER,
  },

  rateLimit: {
    windowMs: 1 * 60 * 1000,  
    maxRequests: 20,
    authWindowMs: 1 * 60 * 1000, 
    authMaxRequests: 5,
    emailWindowMs: 15 * 60 * 1000, 
    emailMaxRequests: 3,
  },

  security: {
    saltRounds: 12,
    maxLoginAttempts: 5,
    lockoutTime: 30 * 60 * 1000,
    passwordMinLength: 8,
    blacklistedIPs: process.env.BLACKLISTED_IPS
      ? process.env.BLACKLISTED_IPS.split(',').map((ip) => ip.trim())
      : [],
    whitelistedIPs: process.env.WHITELISTED_IPS
      ? process.env.WHITELISTED_IPS.split(',').map((ip) => ip.trim())
      : [],
    restrictedPaths: process.env.RESTRICTED_PATHS
      ? process.env.RESTRICTED_PATHS.split(',').map((path) => path.trim())
      : [],
  },

  app: {
    frontendUrl: process.env.FRONTEND_URL,
    name: process.env.APP_NAME || 'AI Sentinal',
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : [],
    adminAllowedOrigins: process.env.ADMIN_ALLOWED_ORIGINS
      ? process.env.ADMIN_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : [],
  },

  verification: {
    emailTokenExpiry:
      (process.env.VERIFICATION_EMAIL_EXPIRY_HOURS
        ? parseInt(process.env.VERIFICATION_EMAIL_EXPIRY_HOURS, 10)
        : 24) *
      60 *
      60 *
      1000,
    passwordResetExpiry:
      (process.env.PASSWORD_RESET_EXPIRY_HOURS
        ? parseInt(process.env.PASSWORD_RESET_EXPIRY_HOURS, 10)
        : 1) *
      60 *
      60 *
      1000,
  },
};
