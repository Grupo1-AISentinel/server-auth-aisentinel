import argon2 from 'argon2';
import crypto from 'crypto';
import { config } from '../configs/config.js';

export const hashPassword = async (password) => {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 102400, // 100 MB (
      timeCost: 2,  
      parallelism: 8, // 8 hilos 
      hashLength: 32, // 32 bytes 
      saltLength: 16, // 16 bytes 
    });
  } catch (error) {
    throw new Error('Error al hashear la contraseña');
  }
};

const verifyDotNetHashManually = async (password, hashedPassword) => {
  try {
    if (!hashedPassword.startsWith('$argon2id$v=19$')) {
      return false;
    }

    const parts = hashedPassword.split('$');
    if (parts.length !== 6) {
      return false;
    }

    const paramsStr = parts[3];
    const saltB64 = parts[4];
    const expectedHashB64 = parts[5];

    const params = {};
    paramsStr.split(',').forEach((param) => {
      const [key, value] = param.split('=');
      params[key] = parseInt(value);
    });

    const salt = Buffer.from(saltB64, 'base64');
    const expectedHash = Buffer.from(expectedHashB64, 'base64');

    const computedHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: params.m || 102400,
      timeCost: params.t || 2,
      parallelism: params.p || 8,
      salt: salt,
      hashLength: expectedHash.length,
      raw: true, 
    });

    const isMatch = crypto.timingSafeEqual(expectedHash, computedHash);
    return isMatch;
  } catch (error) {
    return false;
  }
};

const fromBase64UrlSafe = (base64url) => {
  return base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), '=');
};

const convertDotNetHashToNodeFormat = (hash) => {
  try {
    const parts = hash.split('$');
    if (parts.length !== 6) {
      return hash; 
    }

    const [, algorithm, version, params, salt, hashPart] = parts;

    const paramParts = params.split(',');
    let memory = 102400,
      time = 2,
      parallel = 8;

    paramParts.forEach((param) => {
      if (param.startsWith('m=')) {
        memory = parseInt(param.substring(2));
      } else if (param.startsWith('t=')) {
        time = parseInt(param.substring(2));
      } else if (param.startsWith('p=')) {
        parallel = parseInt(param.substring(2));
      }
    });

    const nodeParams = `m=${memory},t=${time},p=${parallel}`;

    return `$${algorithm}$${version}$${nodeParams}$${salt}$${hashPart}`;
  } catch (error) {
    return hash;
  }
};

export const verifyPassword = async (hashedPassword, plainPassword) => {
  try {
    try {
      const result = await argon2.verify(hashedPassword, plainPassword);
      if (result) return true;
    } catch (directError) {
    }

    if (hashedPassword.startsWith('$argon2id$v=19$')) {
      const manualResult = await verifyDotNetHashManually(
        plainPassword,
        hashedPassword
      );
      if (manualResult) return true;
    }

    return false;
  } catch (error) {
    console.error('Password verification error:', error.message);
    return false;
  }
};

export const validatePasswordStrength = (password) => {
  const errors = [];

  if (password.length < config.security.passwordMinLength) {
    errors.push(
      `La contraseña debe tener al menos ${config.security.passwordMinLength} caracteres`
    );
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe tener al menos una letra mayúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe tener al menos una letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe tener al menos un número');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
