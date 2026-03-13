import { DataTypes } from 'sequelize';
import { sequelize } from '../../configs/db.js';
import { generateUserId } from '../../helpers/uuid-generator.js';
import { User } from '../users/user.model.js';

export const TwoFactorAuth = sequelize.define(
  'TwoFactorAuth',
  {
    Id: {
      type: DataTypes.STRING(16),
      primaryKey: true,
      field: 'id',
      defaultValue: () => generateUserId(),
    },
    UserId: {
      type: DataTypes.STRING(16),
      allowNull: false,
      unique: true, // Relación 1:1 con User
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    SecretKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'secret_key',
    },
    IsEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_enabled',
    },
    EnabledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'enabled_at',
    },
    RecoveryCodes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      field: 'recovery_codes',
    },
  },
  {
    tableName: 'two_factor_auths',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

User.hasOne(TwoFactorAuth, { foreignKey: 'user_id', as: 'TwoFactorAuth' });
TwoFactorAuth.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
