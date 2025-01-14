"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      cpf: {
        type: Sequelize.STRING(11),
        primaryKey: true,
        allowNull: false,
      },
      fullName: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      password: {
        type: Sequelize.STRING(256),
        allowNull: false,
      },
      accepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },

      idUnit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "unit", key: "idUnit" },
        onDelete: "RESTRICT",
      },
      idRole: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "role", key: "idRole" },
        onDelete: "RESTRICT",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");
  },
};
