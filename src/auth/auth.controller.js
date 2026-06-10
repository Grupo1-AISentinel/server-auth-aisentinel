import {
  registerUserHelper,
  loginUserHelper,
  verifyEmailHelper,
  resendVerificationEmailHelper,
  forgotPasswordHelper,
  resetPasswordHelper,
} from '../../helpers/auth-operations.js';
import { getUserProfileHelper } from '../../helpers/profile-operations.js';
import { asyncHandler } from '../../middlewares/server-genericError-handler.js';
import { verifyCodeAsync } from '../../helpers/two-factor-operations.js';
import { verifyJWT, generateJWT } from '../../helpers/generate-jwt.js';
import { findUserById, updateUserLastActivity } from '../../helpers/user-db.js';
import { buildUserResponse } from '../../utils/user-helpers.js';
import { COORDINATOR_ROLE } from '../../helpers/role-constants.js';

export const register = asyncHandler(async (req, res) => {
  try {
    // Agregar la imagen de perfil si fue subida
    const userData = {
      ...req.body,
      profilePicture: req.file ? req.file.path : null,
    };

    const result = await registerUserHelper(userData);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error in register controller:', error);

    let statusCode = 400;
    if (
      error.message.includes('ya está registrado') ||
      error.message.includes('ya está en uso') ||
      error.message.includes('Ya existe un usuario')
    ) {
      statusCode = 409; // Conflict
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error en el registro',
      error: error.message,
    });
  }
});

export const login = asyncHandler(async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    const result = await loginUserHelper(emailOrUsername, password);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in login controller:', error);

    let statusCode = 401;
    if (
      error.message.includes('bloqueada') ||
      error.message.includes('desactivada')
    ) {
      statusCode = 423; // Locked
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error en el login',
      error: error.message,
    });
  }
});

export const verifyEmail = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;
    const result = await verifyEmailHelper(token);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in verifyEmail controller:', error);

    let statusCode = 400;
    if (error.message.includes('no encontrado')) {
      statusCode = 404;
    } else if (
      error.message.includes('inválido') ||
      error.message.includes('expirado')
    ) {
      statusCode = 401;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error en la verificación',
      error: error.message,
    });
  }
});

export const resendVerification = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    const result = await resendVerificationEmailHelper(email);

    // Check result.success to determine status code
    if (!result.success) {
      if (result.message.includes('no encontrado')) {
        return res.status(404).json(result);
      }
      if (result.message.includes('ya ha sido verificado')) {
        return res.status(400).json(result);
      }
      // Email sending failed
      return res.status(503).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in resendVerification controller:', error);

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

export const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    const result = await forgotPasswordHelper(email);

    // forgotPassword always returns success for security, even if user not found
    // But if email sending fails, we should return 503
    if (!result.success && result.data?.initiated === false) {
      return res.status(503).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in forgotPassword controller:', error);

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

export const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const result = await resetPasswordHelper(token, newPassword);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in resetPassword controller:', error);

    let statusCode = 400;
    if (error.message.includes('no encontrado')) {
      statusCode = 404;
    } else if (
      error.message.includes('inválido') ||
      error.message.includes('expirado')
    ) {
      statusCode = 401;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al resetear contraseña',
      error: error.message,
    });
  }
});

export const getProfile = asyncHandler(async (req, res) => {
  const userId = req.userId; // Viene del middleware validateJWT
  const user = await getUserProfileHelper(userId);

  // Respuesta estandarizada con envelope
  return res.status(200).json({
    success: true,
    message: 'Perfil obtenido exitosamente',
    data: user,
  });
});

export const getProfileById = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'El userId es requerido',
    });
  }

  const user = await getUserProfileHelper(userId);

  // Respuesta estandarizada con envelope
  return res.status(200).json({
    success: true,
    message: 'Perfil obtenido exitosamente',
    data: user,
  });
});


export const verifyTwoFactor = asyncHandler(async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'El campo "code" es requerido.',
      });
    }

    const tempToken =
      req.headers['x-token'] ||
      req.headers['authorization']?.replace('Bearer ', '') ||
      req.body.token;

    if (!tempToken) {
      return res.status(401).json({
        success: false,
        message: 'Token de sesión temporal no proporcionado.',
      });
    }

    let decoded;
    try {
      decoded = await verifyJWT(tempToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado. Reinicia el proceso de login.',
      });
    }

    if (!decoded.twoFactorPending) {
      return res.status(401).json({
        success: false,
        message: 'Token no válido para verificación de 2FA.',
      });
    }

    const userId = decoded.sub;

    await verifyCodeAsync(userId, code.trim());

    const user = await findUserById(userId);
    const role = user.UserRoles?.[0]?.Role?.Name || COORDINATOR_ROLE;
    const token = await generateJWT(userId, { role });

    const expiresInMs =
      (parseInt(process.env.JWT_EXPIRES_IN) || 30) * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiresInMs);

    const fullUser = buildUserResponse(user);
    const userDetails = {
      id: fullUser.id,
      username: fullUser.username,
      profilePicture: fullUser.profilePicture,
      role: fullUser.role,
      twoFactorEnabled: true,
    };

    return res.status(200).json({
      success: true,
      requiresTwoFactor: false,
      message: 'Login exitoso',
      token,
      userDetails,
      expiresAt,
    });
  } catch (error) {
    console.error('Error in verify-2fa controller:', error);

    let statusCode = 401;
    if (error.message.includes('no está activado')) statusCode = 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Código inválido',
      error: error.message,
    });
  }
});

export const heartbeat = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const updated = await updateUserLastActivity(userId);
  return res.status(200).json({
    success: true,
    userId,
    lastActivity: new Date().toISOString(),
    registered: updated,
  });
});
