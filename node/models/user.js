import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class User extends Model {}

User.init(
  {
    name: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    phone: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },

    accountType: {
      type: DataTypes.STRING,
      defaultValue: "SERVICE_PROVIDER",
    },
  },
  {
    sequelize,
    modelName: "User",
  }
);


  return User;
};
