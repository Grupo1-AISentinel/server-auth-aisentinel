import {
  User,
  UserProfile,
  UserEmail,
  UserPasswordReset,
} from '../src/users/user.model.js';
import { UserRole, Role } from '../src/auth/role.model.js';
import { TwoFactorAuth } from '../src/two-factor/two-factor.model.js';
import { COORDINATOR_ROLE } from './role-constants.js';
import { hashPassword } from '../utils/password-utils.js';
import { Op } from 'sequelize';

/**
 * Helper para buscar un usuario por email o username
 * @param {string} emailOrUsername - Email o username del usuario
 * @returns {Promise<Object|null>} Usuario encontrado o null
 */
export const findUserByEmailOrUsername = async (emailOrUsername) => {
  try {
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { Email: emailOrUsername.toLowerCase() },
          { Username: emailOrUsername.toLowerCase() },
        ],
      },
      include: [
        { model: UserProfile, as: 'UserProfile' },
        { model: UserEmail, as: 'UserEmail' },
        { model: UserPasswordReset, as: 'UserPasswordReset' },
        {
          model: UserRole,
          as: 'UserRoles',
          include: [{ model: Role, as: 'Role' }],
        },
        { model: TwoFactorAuth, as: 'TwoFactorAuth' },
      ],
    });

    return user;
  } catch (error) {
    console.error('Error buscando usuario:', error);
    throw new Error('Error al buscar usuario');
  }
};

export const findUserById = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      include: [
        { model: UserProfile, as: 'UserProfile' },
        { model: UserEmail, as: 'UserEmail' },
        { model: UserPasswordReset, as: 'UserPasswordReset' },
        {
          model: UserRole,
          as: 'UserRoles',
          include: [{ model: Role, as: 'Role' }],
        },
        { model: TwoFactorAuth, as: 'TwoFactorAuth' },
      ],
    });

    return user;
  } catch (error) {
    console.error('Error buscando usuario por ID:', error);
    throw new Error('Error al buscar usuario');
  }
};

export const checkUserExists = async (email, username) => {
  try {
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { Email: email.toLowerCase() },
          { Username: username.toLowerCase() },
        ],
      },
    });

    return !!existingUser;
  } catch (error) {
    console.error('Error verificando si el usuario existe:', error);
    throw new Error('Error al verificar usuario');
  }
};

export const createNewUser = async (userData) => {
  const transaction = await User.sequelize.transaction();

  try {
    const { name, surname, username, email, password, phone, profilePicture } =
      userData;

    const hashedPassword = await hashPassword(password);

    const user = await User.create(
      {
        Name: name,
        Surname: surname,
        Username: username.toLowerCase(),
        Email: email.toLowerCase(),
        Password: hashedPassword,
        Status: false,
      },
      { transaction }
    );

    const { getDefaultAvatarPath } = await import(
      '../helpers/cloudinary-service.js'
    );
    const defaultAvatarFilename = getDefaultAvatarPath();

    await UserProfile.create(
      {
        UserId: user.Id,
        Phone: phone,
        ProfilePicture: profilePicture || defaultAvatarFilename,
      },
      { transaction }
    );

    await UserEmail.create(
      {
        UserId: user.Id,
        EmailVerified: false,
      },
      { transaction }
    );

    await UserPasswordReset.create(
      {
        UserId: user.Id,
      },
      { transaction }
    );

    const userRole = await Role.findOne(
      { where: { Name: COORDINATOR_ROLE } },
      { transaction }
    );
    if (userRole) {
      await UserRole.create(
        {
          UserId: user.Id,
          RoleId: userRole.Id,
        },
        { transaction }
      );
    } else {
      console.warn(
        `${COORDINATOR_ROLE} role not found in database during user creation for user ${user.Id}`
      );
    }

    await transaction.commit();

    const completeUser = await findUserById(user.Id);
    return completeUser;
  } catch (error) {
    await transaction.rollback();
    console.error('Error creando usuario:', error);
    throw new Error('Error al crear usuario');
  }
};

export const updateEmailVerificationToken = async (userId, token, expiry) => {
  try {
    await UserEmail.update(
      {
        EmailVerificationToken: token,
        EmailVerificationTokenExpiry: expiry,
      },
      {
        where: { UserId: userId },
      }
    );
  } catch (error) {
    console.error('Error actualizando token de verificación:', error);
    throw new Error('Error al actualizar token de verificación');
  }
};

export const markEmailAsVerified = async (userId) => {
  const transaction = await User.sequelize.transaction();

  try {
    await UserEmail.update(
      {
        EmailVerified: true,
        EmailVerificationToken: null,
        EmailVerificationTokenExpiry: null,
      },
      {
        where: { UserId: userId },
        transaction,
      }
    );

    await User.update(
      {
        Status: true,
      },
      {
        where: { Id: userId },
        transaction,
      }
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error marcando email como verificado:', error);
    throw new Error('Error al verificar email');
  }
};

export const updatePasswordResetToken = async (userId, token, expiry) => {
  try {
    await UserPasswordReset.update(
      {
        PasswordResetToken: token,
        PasswordResetTokenExpiry: expiry,
      },
      {
        where: { UserId: userId },
      }
    );
  } catch (error) {
    console.error('Error actualizando token de reset:', error);
    throw new Error('Error al actualizar token de reset');
  }
};

export const findUserByEmail = async (email) => {
  try {
    const user = await User.findOne({
      where: { Email: email.toLowerCase() },
      include: [
        { model: UserProfile, as: 'UserProfile' },
        { model: UserEmail, as: 'UserEmail' },
        { model: UserPasswordReset, as: 'UserPasswordReset' },
        {
          model: UserRole,
          as: 'UserRoles',
          include: [{ model: Role, as: 'Role' }],
        },
      ],
    });

    return user;
  } catch (error) {
    console.error('Error buscando usuario por email:', error);
    throw new Error('Error al buscar usuario');
  }
};


export const findUserByEmailVerificationToken = async (token) => {
  try {
    const user = await User.findOne({
      include: [
        {
          model: UserEmail,
          as: 'UserEmail',
          where: {
            EmailVerificationToken: token,
            EmailVerificationTokenExpiry: {
              [Op.gt]: new Date(), // Token no expirado
            },
          },
        },
        {
          model: UserProfile,
          as: 'UserProfile',
        },
        {
          model: UserPasswordReset,
          as: 'UserPasswordReset',
        },
      ],
    });

    return user;
  } catch (error) {
    console.error('Error buscando usuario por token de verificación:', error);
    throw new Error('Error al buscar usuario');
  }
};


export const findUserByPasswordResetToken = async (token) => {
  try {
    const user = await User.findOne({
      include: [
        {
          model: UserPasswordReset,
          as: 'UserPasswordReset',
          where: {
            PasswordResetToken: token,
            PasswordResetTokenExpiry: {
              [Op.gt]: new Date(), // Token no expirado
            },
          },
        },
        {
          model: UserProfile,
          as: 'UserProfile',
        },
        {
          model: UserEmail,
          as: 'UserEmail',
        },
      ],
    });

    return user;
  } catch (error) {
    console.error('Error buscando usuario por token de reset:', error);
    throw new Error('Error al buscar usuario');
  }
};

export const updateUserPassword = async (userId, hashedPassword) => {
  const transaction = await User.sequelize.transaction();

  try {
    await User.update(
      {
        Password: hashedPassword,
      },
      {
        where: { Id: userId },
        transaction,
      }
    );

    await UserPasswordReset.update(
      {
        PasswordResetToken: null,
        PasswordResetTokenExpiry: null,
      },
      {
        where: { UserId: userId },
        transaction,
      }
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error actualizando contraseña:', error);
    throw new Error('Error al actualizar contraseña');
  }
};
