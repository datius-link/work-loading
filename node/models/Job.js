import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Job extends Model {}

  Job.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      status: {
        type: DataTypes.STRING,
        defaultValue: "waiting", // waiting | active | completed
      },
    },
    {
      sequelize,
      modelName: "Job",
      tableName: "jobs",
    }
  );

  Job.associate = (models) => {
    Job.belongsTo(models.LightUser, {
      foreignKey: "light_user_id",
      onDelete: "CASCADE",
    });
  };

  return Job;
};
