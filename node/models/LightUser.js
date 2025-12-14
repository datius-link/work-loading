import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class LightUser extends Model {}

  LightUser.init(
    {
      contact: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      type: {
        type: DataTypes.ENUM("phone", "email"),
        allowNull: false,
      },

      role: {
        type: DataTypes.STRING,
        defaultValue: "JOB_POSTER",
      },

      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "LightUser",
      tableName: "light_users",
    }
  );

  return LightUser;
};
