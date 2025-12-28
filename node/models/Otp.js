export default (sequelize, DataTypes) => {
  const Otp = sequelize.define(
    "Otp",
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      contact: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      type: {
        type: DataTypes.ENUM("phone", "email", "password_reset"),
        allowNull: false,
      },

      code: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "Otps",
    }
  );

  Otp.associate = (models) => {
    Otp.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return Otp;
};
