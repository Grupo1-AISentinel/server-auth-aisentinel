'use strict';

import { asyncHandler } from '../../middlewares/server-genericError-handler.js';
import {
  checkUserExists,
  createNewUser,
  findUserById,
} from '../../helpers/user-db.js';
import { setUserSingleRole } from '../../helpers/role-db.js';
import { buildUserResponse } from '../../utils/user-helpers.js';
import { sequelize } from '../../configs/db.js';
import {
  User,
  UserProfile,
  UserEmail,
  UserPasswordReset,
} from '../users/user.model.js';
import { UserRole } from '../auth/role.model.js';
import { TwoFactorAuth } from '../two-factor/two-factor.model.js';
import { ALLOWED_ROLES } from '../../helpers/role-constants.js';

// POST /api/v1/internal/users
export const createInternalUser = asyncHandler(async (req, res) => {
  const { name, surname, username, email, password, phone, role } = req.body;

  if (!name || !surname || !username || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Faltan campos requeridos: name, surname, username, email, password, role',
    });
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({
      success: false,
      message: `Rol no válido. Use: ${ALLOWED_ROLES.join(', ')}`,
    });
  }

  const userExists = await checkUserExists(email, username);
  if (userExists) {
    return res.status(409).json({
      success: false,
      message: 'Ya existe un usuario con este email o nombre de usuario',
    });
  }

  const newUser = await createNewUser({
    name,
    surname,
    username,
    email,
    password,
    phone: phone || '00000000',
  });

  // createNewUser asigna COORDINATOR_ROLE por defecto; cambiar si es ADMIN_ROLE
  if (role === 'ADMIN_ROLE') {
    await setUserSingleRole(newUser, 'ADMIN_ROLE', sequelize);
  }

  const completeUser = await findUserById(newUser.Id);

  return res.status(201).json({
    success: true,
    message: 'Usuario creado exitosamente',
    data: buildUserResponse(completeUser),
  });
});

// DELETE /api/v1/internal/users/:userId
export const deleteInternalUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado',
    });
  }

  await sequelize.transaction(async (t) => {
    await TwoFactorAuth.destroy({ where: { UserId: userId }, transaction: t });
    await UserRole.destroy({ where: { UserId: userId }, transaction: t });
    await UserEmail.destroy({ where: { UserId: userId }, transaction: t });
    await UserPasswordReset.destroy({ where: { UserId: userId }, transaction: t });
    await UserProfile.destroy({ where: { UserId: userId }, transaction: t });
    await User.destroy({ where: { Id: userId }, transaction: t });
  });

  return res.status(200).json({
    success: true,
    message: 'Usuario eliminado exitosamente',
  });
});
