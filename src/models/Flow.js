import { Model , DataTypes } from 'sequelize';

class Flow extends Model {
  static init(sequelize) {
    super.init(
      {
        idFlow: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: DataTypes.STRING(100),
        idUnit: {
          type: DataTypes.INTEGER,
          foreignKey: true,
        },
      },
      {
        sequelize,
        tableName: 'flow'
      }
    );

    return this;
  }

  static associate(models) {
    // this.belongsTo(models.Unit, { foreignKey: 'idUnit', as: 'unit' });
    // this.hasMany(models.Stage, { foreignKey: 'idStage', as: 'stage' })
  }

}

export default Flow;