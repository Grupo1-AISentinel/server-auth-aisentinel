import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { TwoFactorAuth } from '../src/two-factor/two-factor.model.js';
import { config } from '../configs/config.js';

const APP_NAME = config.app?.name || 'KinalSports';

/**
 * Genera 8 códigos de recuperación aleatorios
 * De 8 caracteres cada uno (Base64 URL-safe en mayúsculas)
 * @returns {string[]} Array de 8 códigos
 */
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

/**
 * Genera el setup inicial de 2FA: secreto TOTP, QR code y recovery codes
 * Si ya existe un setup previo, lo elimina y crea uno nuevo
 * @param {string} userId - ID del usuario
 * @param {string} userEmail - Email del usuario (usado en el URI del QR)
 * @returns {Promise<{secretKey: string, qrCodeImage: string, manualEntryKey: string, recoveryCodes: string[]}>}
 */
export const generateSetupAsync = async (userId, userEmail) => {
  // Eliminar setup previo si existe (igual que .NET: borra antes de crear)
  await TwoFactorAuth.destroy({ where: { UserId: userId } });

  // Generar secreto Base32 aleatorio (20 bytes → ~32 chars Base32)
  const secretKey = authenticator.generateSecret(20);

  // Construir URI otpauth:// compatible con Google Authenticator / Authy
  const otpUri = authenticator.keyuri(userEmail, APP_NAME, secretKey);

  // Generar imagen QR como Data URL (data:image/png;base64,...)
  const qrCodeImage = await QRCode.toDataURL(otpUri);

  // Generar códigos de recuperación
  const recoveryCodes = generateRecoveryCodes();

  // Guardar en BD con IsEnabled = false (pendiente de verificación)
  await TwoFactorAuth.create({
    UserId: userId,
    SecretKey: secretKey,
    IsEnabled: false,
    RecoveryCodes: recoveryCodes,
  });

  return {
    secretKey,
    qrCodeImage,       // Data URL de la imagen PNG del QR
    manualEntryKey: secretKey, // Para ingresar manualmente en la app
    recoveryCodes,
  };
};

/**
 * Verifica el código TOTP e habilita el 2FA para el usuario
 * @param {string} userId
 * @param {string} code - Código de 6 dígitos del Authenticator
 * @returns {Promise<{success: boolean, message: string}>}
 */
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

  const isValid = authenticator.verify({ token: code, secret: tfa.SecretKey });

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

/**
 * Verifica si un código TOTP es válido sin cambiar el estado del 2FA
 * También acepta códigos de recuperación como fallback
 * @param {string} userId
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export const verifyCodeAsync = async (userId, code) => {
  const tfa = await TwoFactorAuth.findOne({ where: { UserId: userId } });

  if (!tfa || !tfa.IsEnabled) {
    throw new Error('El 2FA no está activado para este usuario.');
  }

  // Intentar verificar como código TOTP normal
  const isValid = authenticator.verify({ token: code, secret: tfa.SecretKey });

  if (isValid) return true;

  // Fallback: verificar si es un código de recuperación
  const recoveryCodes = tfa.RecoveryCodes || [];
  const codeUpper = code.toUpperCase();
  const recoveryIndex = recoveryCodes.indexOf(codeUpper);

  if (recoveryIndex !== -1) {
    // Invalidar el código de recuperación usado (uso único)
    const updatedCodes = recoveryCodes.filter((_, i) => i !== recoveryIndex);
    tfa.RecoveryCodes = updatedCodes;
    await tfa.save();
    return true;
  }

  throw new Error(
    'Código inválido o expirado. Verifica el código en tu app Authenticator.'
  );
};

/**
 * Deshabilita el 2FA del usuario tras verificar el código actual
 * @param {string} userId
 * @param {string} code - Código TOTP actual para confirmar la desactivación
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const disableAsync = async (userId, code) => {
  const tfa = await TwoFactorAuth.findOne({ where: { UserId: userId } });

  if (!tfa || !tfa.IsEnabled) {
    throw new Error('El 2FA no está activado para este usuario.');
  }

  const isValid = authenticator.verify({ token: code, secret: tfa.SecretKey });

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

/**
 * Obtiene el estado actual del 2FA del usuario
 * @param {string} userId
 * @returns {Promise<{enabled: boolean, enabledAt: Date|null}>}
 */
export const getStatusAsync = async (userId) => {
  const tfa = await TwoFactorAuth.findOne({ where: { UserId: userId } });
  return {
    enabled: tfa?.IsEnabled ?? false,
    enabledAt: tfa?.EnabledAt ?? null,
  };
};

/**
 * Genera nuevos códigos de recuperación e invalida los anteriores
 * @param {string} userId
 * @returns {Promise<{recoveryCodes: string[]}>}
 */
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
