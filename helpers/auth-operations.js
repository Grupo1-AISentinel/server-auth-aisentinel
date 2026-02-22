import crypto from 'crypto';
import {
  checkUserExists,
  createNewUser,
  findUserByEmailOrUsername,
  updateEmailVerificationToken,
  markEmailAsVerified,
  findUserByEmail,
  updatePasswordResetToken,
  updateUserPassword,
  findUserByEmailVerificationToken,
  findUserByPasswordResetToken,
} from './user-db.js';
import {
  generateEmailVerificationToken,
  generatePasswordResetToken,
} from '../utils/auth-helpers.js';
import { verifyPassword } from '../utils/password-utils.js';
import { buildUserResponse } from '../utils/user-helpers.js';
import { sendVerificationEmail } from './email-service.js';
import { generateJWT } from './generate-jwt.js';
import path from 'path';
import { uploadImage } from './cloudinary-service.js';
import { config } from '../configs/config.js';

const getExpirationTime = (timeString) => {
  const timeValue = parseInt(timeString);
  const timeUnit = timeString.replace(timeValue.toString(), '');

  switch (timeUnit) {
    case 's':
      return timeValue * 1000;
    case 'm':
      return timeValue * 60 * 1000;
    case 'h':
      return timeValue * 60 * 60 * 1000;
    case 'd':
      return timeValue * 24 * 60 * 60 * 1000;
    default:
      return 30 * 60 * 1000; //30 minutos
  }
};

export const registerUserHelper = async (userData) => {
  try {
    const { email, username, password, name, surname, phone, profilePicture } =
      userData;

    const userExists = await checkUserExists(email, username);
    if (userExists) {
      throw new Error(
        'Ya existe un usuario con este email o nombre de usuario'
      );
    }
    let profilePictureToStore = profilePicture;
    if (profilePicture) {
      const uploadPath = config.upload.uploadPath;

      const isLocalFile =
        profilePicture.includes('uploads/') ||
        profilePicture.includes(uploadPath) ||
        profilePicture.startsWith('./');

      if (isLocalFile) {
        try {
          const ext = path.extname(profilePicture);
          const randomHex = crypto.randomBytes(6).toString('hex');
          const cloudinaryFileName = `profile-${randomHex}${ext}`;

          profilePictureToStore = await uploadImage(
            profilePicture,
            cloudinaryFileName
          );
        } catch (err) {
          console.error(
            'Error uploading profile picture to Cloudinary during registration:',
            err
          );
          profilePictureToStore = null;
        }
      } else {
        try {
          const baseUrl = config.cloudinary.baseUrl || '';
          const folder = config.cloudinary.folder || '';
          let normalized = profilePicture;
          if (normalized.startsWith(baseUrl)) {
            normalized = normalized.slice(baseUrl.length);
          }
          if (folder && normalized.startsWith(`${folder}/`)) {
            normalized = normalized.slice(folder.length + 1);
          }
          profilePictureToStore = normalized.split('/').pop();
        } catch (normErr) {
          console.warn('Could not normalize profile picture path:', normErr);
          profilePictureToStore = null;
        }
      }
    }

    const newUser = await createNewUser({
      name,
      surname,
      username,
      email,
      password,
      phone,
      profilePicture: profilePictureToStore,
    });

    const verificationToken = await generateEmailVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); //24 horas

    await updateEmailVerificationToken(
      newUser.Id,
      verificationToken,
      tokenExpiry
    );


    Promise.resolve()
      .then(() => sendVerificationEmail(email, name, verificationToken))
      .catch((err) =>
        console.error('Async email send (verification) failed:', err)
      );

    return {
      success: true,
      user: buildUserResponse(newUser),
      message:
        'Usuario registrado exitosamente. Por favor, verifica tu email para activar la cuenta.',
      emailVerificationRequired: true,
    };
  } catch (error) {
    console.error('Error en registro:', error);
    throw error;
  }
};

export const loginUserHelper = async (emailOrUsername, password) => {
  try {

    const user = await findUserByEmailOrUsername(emailOrUsername);

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isValidPassword = await verifyPassword(user.Password, password);

    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    if (!user.UserEmail || !user.UserEmail.EmailVerified) {
      throw new Error(
        'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada o reenvía el email de verificación.'
      );
    }

    if (!user.Status) {
      throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
    }

    const role = user.UserRoles?.[0]?.Role?.Name || 'Coordinador';

 
    if (user.TwoFactorAuth?.IsEnabled === true) {
      const tempToken = await generateJWT(
        user.Id.toString(),
        { role, twoFactorPending: true },
        { expiresIn: '5m' }
      );

      const fullUser = buildUserResponse(user);
      const userDetails = {
        id: fullUser.id,
        username: fullUser.username,
        profilePicture: fullUser.profilePicture,
        role: fullUser.role,
        twoFactorEnabled: true,
      };

      return {
        success: true,
        requiresTwoFactor: true,
        message: 'Se requiere verificación de dos factores. Ingresa el código de tu app Authenticator.',
        token: tempToken,
        userDetails,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos para completar 2FA
      };
    }

    const token = await generateJWT(user.Id.toString(), { role });

    const expiresInMs = getExpirationTime(process.env.JWT_EXPIRES_IN || '30m');
    const expiresAt = new Date(Date.now() + expiresInMs);

    const fullUser = buildUserResponse(user);
    const userDetails = {
      id: fullUser.id,
      username: fullUser.username,
      profilePicture: fullUser.profilePicture,
      role: fullUser.role,
      twoFactorEnabled: false,
    };

    return {
      success: true,
      requiresTwoFactor: false,
      message: 'Login exitoso',
      token,
      userDetails,
      expiresAt,
    };
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};

export const verifyEmailHelper = async (token) => {
  try {
    if (!token || typeof token !== 'string' || token.length < 40) {
      throw new Error('Token inválido para verificación de email');
    }

    const user = await findUserByEmailVerificationToken(token);
    if (!user) {
      throw new Error('Usuario no encontrado o token inválido');
    }

    const userEmail = user.UserEmail;
    if (!userEmail) {
      throw new Error('Registro de email no encontrado');
    }

    if (userEmail.EmailVerified) {
      throw new Error('El email ya ha sido verificado');
    }

    await markEmailAsVerified(user.Id);

    Promise.resolve()
      .then(async () => {
        const { sendWelcomeEmail } = await import('./email-service.js');
        return sendWelcomeEmail(user.Email, user.Name);
      })
      .catch((emailError) => {
        console.error('Async email send (welcome) failed:', emailError);
      });

    return {
      success: true,
      message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
      data: {
        email: user.Email,
        verified: true,
      },
    };
  } catch (error) {
    console.error('Error verificando email:', error);

    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token de verificación inválido');
    } else if (error.name === 'TokenExpiredError') {
      throw new Error('Token de verificación expirado');
    }

    throw error;
  }
};

export const resendVerificationEmailHelper = async (email) => {
  try {
    const user = await findUserByEmail(email.toLowerCase());

    if (!user) {
      return {
        success: false,
        message: 'Usuario no encontrado',
        data: { email, sent: false },
      };
    }

    if (user.UserEmail && user.UserEmail.EmailVerified) {
      return {
        success: false,
        message: 'El email ya ha sido verificado',
        data: { email: user.Email, verified: true },
      };
    }

    const verificationToken = await generateEmailVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await updateEmailVerificationToken(user.Id, verificationToken, tokenExpiry);

    try {
      await sendVerificationEmail(user.Email, user.Name, verificationToken);
      return {
        success: true,
        message: 'Email de verificación enviado exitosamente',
        data: { email: user.Email, sent: true },
      };
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return {
        success: false,
        message:
          'Error al enviar el email de verificación. Por favor, intenta nuevamente más tarde.',
        data: { email: user.Email, sent: false },
      };
    }
  } catch (error) {
    console.error('Error en resendVerificationEmailHelper:', error);
    return {
      success: false,
      message: 'Error interno del servidor',
      data: { email, sent: false },
    };
  }
};

export const forgotPasswordHelper = async (email) => {
  try {
    const user = await findUserByEmail(email.toLowerCase());

    if (!user) {
      return {
        success: true,
        message: 'Si el email existe, se ha enviado un enlace de recuperación',
        data: { email, initiated: true },
      };
    }

    const resetToken = await generatePasswordResetToken();
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await updatePasswordResetToken(user.Id, resetToken, tokenExpiry);

    const { sendPasswordResetEmail } = await import('./email-service.js');
    Promise.resolve()
      .then(() => sendPasswordResetEmail(user.Email, user.Name, resetToken))
      .catch((emailError) => {
        console.error(
          `Failed to send password reset email to ${email}:`,
          emailError
        );
      });

    return {
      success: true,
      message: 'Si el email existe, se ha enviado un enlace de recuperación',
      data: { email, initiated: true },
    };
  } catch (error) {
    console.error('Error en forgotPasswordHelper:', error);
    return {
      success: true,
      message: 'Si el email existe, se ha enviado un enlace de recuperación',
      data: { email, initiated: true },
    };
  }
};

export const resetPasswordHelper = async (token, newPassword) => {
  try {
    if (!token || typeof token !== 'string' || token.length < 40) {
      throw new Error('Token inválido para reset de contraseña');
    }

    const user = await findUserByPasswordResetToken(token);
    if (!user) {
      throw new Error('Usuario no encontrado o token inválido');
    }

    const userPasswordReset = user.UserPasswordReset;
    if (!userPasswordReset || !userPasswordReset.PasswordResetToken) {
      throw new Error('Token de reset inválido o ya utilizado');
    }

    const { hashPassword } = await import('../utils/password-utils.js');
    const hashedPassword = await hashPassword(newPassword);

    await updateUserPassword(user.Id, hashedPassword);

    try {
      const { sendPasswordChangedEmail } = await import('./email-service.js');
      Promise.resolve()
        .then(() => sendPasswordChangedEmail(user.Email, user.Name))
        .catch((emailError) => {
          console.error('Error sending password changed email:', emailError);
        });
    } catch (emailError) {
      console.error('Error scheduling password changed email:', emailError);
    }

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente',
      data: { email: user.Email, reset: true },
    };
  } catch (error) {
    console.error('Error en resetPasswordHelper:', error);

    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token de reset inválido');
    } else if (error.name === 'TokenExpiredError') {
      throw new Error('Token de reset expirado');
    }

    throw error;
  }
};
