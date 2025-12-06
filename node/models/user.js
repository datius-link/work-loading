export default (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
    password: DataTypes.STRING,
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    otp: DataTypes.STRING,
    otpExpires: DataTypes.DATE
  });

  return User;
};
