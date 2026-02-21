import { User, UserProfile, UserEmail } from '../src/users/user.model.js';
import { Role, UserRole } from '../src/auth/role.model.js';
import { ADMIN_ROLE } from './role-constants.js';
import { hashPassword } from '../utils/password-utils.js';

export const seedAdmin = async () => {
  try {
    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'admin123';

    const existingAdmin = await User.findOne({ where: { Email: adminEmail } });
    
    if (existingAdmin) {
      console.log('PostgreSQL | Administrador por defecto ya existe.');
      return;
    }

    const adminRole = await Role.findOne({ where: { Name: ADMIN_ROLE } });
    if (!adminRole) {
      console.error('PostgreSQL | El rol Administrador no existe. Asegúrate de ejecutar seedRoles primero.');
      return;
    }

    const hashedPassword = await hashPassword(adminPassword);

    const adminUser = await User.create({
      Name: 'admin',
      Surname: 'admin',
      Username: 'admin',
      Email: adminEmail,
      Password: hashedPassword,
      Status: true, 
    });

    await UserProfile.create({
      UserId: adminUser.Id,
      Phone: '12345678', 
      ProfilePicture: 'default.jpg'
    });

    await UserEmail.create({
      UserId: adminUser.Id,
      EmailVerified: true,
    });

    await UserRole.create({
      UserId: adminUser.Id,
      RoleId: adminRole.Id,
    });

    console.log('PostgreSQL | Administrador por defecto creado exitosamente.');
  } catch (error) {
    console.error('Error al crear el administrador:', error.message);
  }
};