export default (sequelize, DataTypes) => {
  const ServiceProvider = sequelize.define("ServiceProvider", {
    username: {
      type: DataTypes.STRING,
      allowNull: true
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    profile_pic: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT
    },
    services: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    contacts: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    socials: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    teammates: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    }
  });

  ServiceProvider.associate = (models) => {
    ServiceProvider.belongsTo(models.User, {
      foreignKey: "user_id",
      onDelete: "CASCADE"
    });
  };

  return ServiceProvider;
};
