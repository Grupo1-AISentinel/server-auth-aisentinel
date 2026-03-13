import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const speakeasy = require('speakeasy');
import QRCode from 'qrcode';
import crypto from 'crypto';
import { TwoFactorAuth } from '../src/two-factor/two-factor.model.js';
import { config } from '../configs/config.js';

const APP_NAME = config.app?.name || 'AISentinel';

const generateRecoveryCodes = () => {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    const bytes = crypto.randomBytes(6);
    // Base64 URL-safe sin "=" → tomar primeros 8 caracteres en mayúsculas
    const code = bytes
      .toString('base64url')
      .substring(0, 8)
      .toUpperCase();
    codes.push(code);
  }
  return codes;
};

export const generateSetupAsync = async (userId) => {
  const existing = await TwoFactorAuth.findOne({ where: { UserId: userId } });

  if (existing?.IsEnabled) {
    throw new Error('El 2FA ya está activado en esta cuenta. Desactívalo primero desde /two-factor/disable.');
  }

  await TwoFactorAuth.destroy({ where: { UserId: userId } });
  const secretKey = speakeasy.generateSecret({ length: 20 }).base32;
  const recoveryCodes = generateRecoveryCodes();

  await TwoFactorAuth.create({
    UserId: userId,
    SecretKey: secretKey,
    IsEnabled: false,
    RecoveryCodes: recoveryCodes,
  });

  return {
    secretKey,
    manualEntryKey: secretKey,
    recoveryCodes,
  };
};


export const verifyAndEnableAsync = async (userId, code) => {
  const tfa = await TwoFactorAuth.findOne({ where: { UserId: userId } });

  if (!tfa) {
    throw new Error(
      'Setup de 2FA no encontrado. Primero genera el código QR desde /two-factor/setup.'
    );
  }

  if (tfa.IsEnabled) {
    throw new Error('El 2FA ya está activado para este usuario.');
  }

  const isValid = speakeasy.totp.verify({ secret: tfa.SecretKey, encoding: 'base32', token: code, window: 1 });

  if (!isValid) {
    throw new Error(
      'Código inválido o expirado. Asegúrate de que el tiempo de tu dispositivo esté sincronizado.'
    );
  }

  tfa.IsEnabled = true;
  tfa.EnabledAt = new Date();
  await tfa.save();

  return { success: true, message: '2FA activado exitosamente.' };
};


export const verifyCodeAsync = async (userId, code) => {
  const tfa = await TwoFactorAuth.findOne({ where: { UserId: userId } });

  if (!tfa || !tfa.IsEnabled) {
    throw new Error('El 2FA no está activado para este usuario.');
  }

  const isValid = speakeasy.totp.verify({ secret: tfa.SecretKey, encoding: 'base32', token: code, window: 1 });

  if (isValid) return true;

  const recoveryCodes = tfa.RecoveryCodes || [];
  const codeUpper = code.toUpperCase();
  const recoveryIndex = recoveryCodes.indexOf(codeUpper);

  if (recoveryIndex !== -1) {
    const updatedCodes = recoveryCodes.filter((_, i) => i !== recoveryIndex);
    tfa.RecoveryCodes = updatedCodes;
    await tfa.save();
    return true;
  }

  throw new Error(
    'Código inválido o expirado. Verifica el código en tu app Authenticator.'
  );
};


export const disableAsync = async (userId, code) => {
  const tfa = await TwoFactorAuth.findOne({ where: { UserId: userId } });

  if (!tfa || !tfa.IsEnabled) {
    throw new Error('El 2FA no está activado para este usuario.');
  }

  const isValid = speakeasy.totp.verify({ secret: tfa.SecretKey, encoding: 'base32', token: code, window: 1 });

  if (!isValid) {
    throw new Error(
      'Código inválido. No se puede deshabilitar el 2FA sin un código válido.'
    );
  }

  tfa.IsEnabled = false;
  tfa.EnabledAt = null;
  await tfa.save();

  return { success: true, message: '2FA desactivado exitosamente.' };
};


export const getStatusAsync = async (userId) => {
  const tfa = await TwoFactorAuth.findOne({ where: { UserId: userId } });
  return {
    enabled: tfa?.IsEnabled ?? false,
    enabledAt: tfa?.EnabledAt ?? null,
  };
};


export const getQRCodeBufferAsync = async (userId) => {
  const tfa = await TwoFactorAuth.findOne({ where: { UserId: userId } });

  if (!tfa) {
    throw new Error('Setup de 2FA no encontrado. Primero llama a /two-factor/setup.');
  }

  if (tfa.IsEnabled) {
    throw new Error('El 2FA ya está activado. El QR ya no está disponible.');
  }

  const { User } = await import('../src/users/user.model.js');
  const user = await User.findByPk(userId);
  const label = user?.Email ?? userId;

  const otpUri = speakeasy.otpauthURL({
    secret: tfa.SecretKey,
    issuer: APP_NAME,
    label,
    encoding: 'base32',
  });

  return QRCode.toBuffer(otpUri);
};

export const regenerateRecoveryCodesAsync = async (userId) => {
  const tfa = await TwoFactorAuth.findOne({ where: { UserId: userId } });

  if (!tfa) {
    throw new Error('Setup de 2FA no encontrado para este usuario.');
  }

  const recoveryCodes = generateRecoveryCodes();
  tfa.RecoveryCodes = recoveryCodes;
  await tfa.save();

  return { recoveryCodes };
};
