module.exports = (sequelize, DataTypes) => {
  const jobs = sequelize.define(
    'jobs',
    {
      company_id: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.STRING, allowNull: false },
      location: { type: DataTypes.STRING, allowNull: false },
      notes: DataTypes.STRING,
    },
    { createdAt: 'created_at', updatedAt: 'updated_at' },
  );

  jobs.associate = (models) => {
    jobs.belongsTo(models.companies, {
      foreignKey: 'company_id',
      as: 'companies',
    });
  };

  return jobs;
};
