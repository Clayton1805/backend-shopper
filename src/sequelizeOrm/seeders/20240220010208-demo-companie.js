/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('companies', [
      {
        name: 'ABC Corp',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'XYZ LLC',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'ACME Enterprises',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('companies', null, {});
  },
};
