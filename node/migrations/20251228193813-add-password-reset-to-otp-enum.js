"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Otps_type"
      ADD VALUE IF NOT EXISTS 'password_reset';
    `);
  },

  async down() {
    // ⚠️ PostgreSQL does not support removing ENUM values safely
  },
};
