/**
 * fix-coord-status.js
 * Activa y verifica todos los usuarios con email coord.*
 * Para ejecutar una sola vez: node helpers/fix-coord-status.js
 */
import 'dotenv/config';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'aisentinel_auth',
  process.env.DB_USER || 'aisentinel',
  process.env.DB_PASSWORD || 'aisentinel123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5436', 10),
    dialect: 'postgres',
    logging: false,
  }
);

const main = async () => {
  await sequelize.authenticate();
  console.log('Conectado a PostgreSQL');

  const [users] = await sequelize.query(
    "UPDATE users SET status = true WHERE email LIKE 'coord.%' RETURNING id, email, status"
  );
  console.log(`Usuarios activados: ${users.length}`);
  for (const u of users) {
    console.log(`  [OK] ${u.email} status=${u.status}`);
  }

  const [emails] = await sequelize.query(
    "UPDATE user_emails SET email_verified = true WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'coord.%') RETURNING user_id"
  );
  console.log(`Emails verificados: ${emails.length}`);

  await sequelize.close();
  console.log('COMPLETADO');
};

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
