module.exports = (sequelize, DataTypes) => {
  const companies = sequelize.define(
    'companies',
    {
      name: DataTypes.STRING,
    },
    { createdAt: 'created_at', updatedAt: 'updated_at' },
  );

  companies.associate = (models) => {
    companies.hasMany(models.jobs, {
      foreignKey: 'company_id',
      as: 'jobs',
    });
  };

  return companies;
};
