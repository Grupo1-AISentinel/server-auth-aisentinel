import { getUserRoleNames } from '../helpers/role-db.js';
import { ADMIN_ROLE } from '../helpers/role-constants.js';

export const validateAdmin = async (req, res, next) => {
  try {
    const currentUserId = req.userId; 

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'No hay token válido en la petición.',
      });
    }

    const roles =
      req.user?.UserRoles?.map((ur) => ur.Role?.Name).filter(Boolean) ??
      (await getUserRoleNames(currentUserId));

    if (!roles.includes(ADMIN_ROLE)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Esta acción es exclusiva para el rol Administrador.',
      });
    }

    next();
  } catch (error) {
    console.error('Error en middleware validate-admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno verificando los permisos del usuario.',
    });
  }
};