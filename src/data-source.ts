import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import { Measure } from './entity/Measure';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5433,
  username: 'postgres',
  password: 'postgres',
  database: 'shopper',
  synchronize: true,
  logging: false,
  entities: [User, Measure],
  migrations: [],
  subscribers: [],
});
