import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import { Measure } from './entity/Measure';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'postgres',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'shopper',
  synchronize: true,
  logging: false,
  entities: [User, Measure],
  migrations: [],
  subscribers: [],
});
