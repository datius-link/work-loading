"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("Otps", {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    contact: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    type: {
      type: Sequelize.ENUM("phone", "email"),
      allowNull: false,
    },

    code: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    expiresAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },

    verified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },

    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },

    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("Otps");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_Otps_type";'
  );
}
