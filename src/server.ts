import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import cors from 'cors';
import { AppDataSource } from './data-source';
import { User } from './entity/User';
import { z } from 'zod';
import { BAD_REQUEST, CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } from './utils/allStatusCode';
import { Measure, MeasureTypeEnum } from './entity/Measure';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

import { GoogleAIFileManager } from '@google/generative-ai/server';
import { GoogleGenerativeAI } from '@google/generative-ai';


AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');

    const app = express();

    const PORT = 3001;

    app.use(cors());
    app.use(express.json({ limit: '50mb' }));

    app.use((req, _res, next) => {
      console.log({
        data: new Date(),
        method: req.method,
        router: req.originalUrl,
      });
      next();
    });

    const uploadBodySchema = z.object({
      customer_code: z.string(),
      measure_datetime: z.string().datetime(),
      measure_type: z.nativeEnum(MeasureTypeEnum),
      image: z.string().refine((data) => {
        const img = data.split(';base64,');
        if (img.length === 2) return img[1].match('^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$');
        return false;
      }, {
        message: 'base64 invalid',
      }),
    });
  
    app.post('/upload', async (req, res, next) => {
      try {
        const body = req.body;
    
        const bodyValidation = await uploadBodySchema.safeParseAsync(body);
        if (!bodyValidation.success)
          return res
            .status(BAD_REQUEST)
            .json({ error_code: 'INVALID_DATA', error_description: bodyValidation.error.format() });
        
        const repoUser = AppDataSource.getRepository(User);
        let user: User | null = null;
    
        const userExist = await repoUser.findOneBy({
          customer_code: bodyValidation.data.customer_code,
        });

        if (userExist) {
          const repoMeasure = AppDataSource.getRepository(Measure);
          const objDatetime = new Date(bodyValidation.data.measure_datetime);
          console.log('objDatetime.getMonth()', objDatetime.getMonth());
          const checkConflict = await repoMeasure.createQueryBuilder('measure')
            .where('measure.userId = :id', { id: userExist.id })
            .andWhere('measure.type = :type', { type: bodyValidation.data.measure_type })
            .andWhere('EXTRACT(MONTH FROM measure.datetime) = :datetime', { datetime: objDatetime.getMonth() + 1 }).getOne();
          if (checkConflict) {
            return res
              .status(CONFLICT)
              .json({ error_code: 'DOUBLE_REPORT', error_description: 'Leitura do mês já realizada'});
          }
        }
        user = userExist;
        if (!userExist) {
          const userObj = new User();
          userObj.customer_code = bodyValidation.data.customer_code;
          user = await AppDataSource.manager.save(userObj);
        }

        const base64String = bodyValidation.data.image;      
        const base64Image: any = base64String.split(';base64,').pop();
        const uuidPath = uuidv4();
        await fs.writeFile('public/images/' + uuidPath + '.jpeg', base64Image, {encoding: 'base64'}, function(err) {
          console.log('File created', err);
        });

        const GEMINI_API_KEY: string | undefined = process.env.GEMINI_API_KEY;

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-pro',
        });
  
        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY || '');

        const uploadResponse = await fileManager.uploadFile(__dirname.split('/src')[0] + '/public/images/' + uuidPath + '.jpeg', {
          mimeType: 'image/jpeg',
        });

        const getResponse = await fileManager.getFile(uploadResponse.file.name);

        console.log('getResponse', getResponse);

        const promptWater = 'What measurement is the hydrometer showing? Just answer me with the number.';
        const promptGas = 'What measurement is the gasometer showing? answer me only with the number';

        let text = '';
        if (bodyValidation.data.measure_type === MeasureTypeEnum.WATER) text = promptWater;
        if (bodyValidation.data.measure_type === MeasureTypeEnum.GAS) text = promptGas;

        // console.log('uploadResponse.file.mimeType', uploadResponse.file.mimeType);
        // console.log('uploadResponse.file.uri', uploadResponse.file.uri);

        const result = await model.generateContent([
          {
            fileData: {
              mimeType: uploadResponse.file.mimeType,
              fileUri: uploadResponse.file.uri
            }
          },
          { text },
        ]);
      
        // Output the generated text to the console
        console.log(result.response.text());

        const textResult = result.response.text();
        const numberResult = parseInt(textResult) || 0;
        console.log('numberResult', numberResult);

        const measureObj = new Measure();
        measureObj.datetime = new Date(bodyValidation.data.measure_datetime);
        measureObj.type = bodyValidation.data.measure_type;
        measureObj.image_url = uuidPath +'.jpeg';
        measureObj.measure_value = numberResult;
        if (user) measureObj.user = user;
        const measureDb = await AppDataSource.manager.save(measureObj);

        return res.status(OK).json({ image_url: 'http://localhost:3001/image/' + uuidPath +'.jpeg', measure_value: numberResult, measure_uuid: measureDb.id.toString() });
      } catch (error) {
        next(error);
      }
    });

    const confirmBodySchema = z.object({
      measure_uuid: z.string(),
      confirmed_value: z.number(),
    });

    app.patch('/confirm', async (req, res, next) => {
      try {
        const body = req.body;
    
        const bodyValidation = await confirmBodySchema.safeParseAsync(body);
        if (!bodyValidation.success)
          return res
            .status(BAD_REQUEST)
            .json({ error_code: 'INVALID_DATA', error_description: bodyValidation.error.format() });

        const repoMeasure = AppDataSource.getRepository(Measure);
        const measure = await repoMeasure.findOneBy({
          id: parseInt(bodyValidation.data.measure_uuid),
        });

        if (!measure) return res
          .status(NOT_FOUND)
          .json({ error_code: 'MEASURE_NOT_FOUND', error_description: 'Leitura do mês já realizada'});
        
        if (measure.has_confirmed) return res
          .status(CONFLICT)
          .json({ error_code: 'CONFIRMATION_DUPLICATE', error_description: 'Leitura do mês já realizada'});
        
        measure.has_confirmed = true;
        measure.measure_value = bodyValidation.data.confirmed_value;
        await repoMeasure.save(measure);

        return res.status(OK).json({ success: true });
      } catch (error) {
        next(error);
      }
    });

    app.get('/:customer_code/list', async (req, res, next) => {
      try {
        const { customer_code } = req.params;
        const query = req.query;

        if (query.measure_type && query.measure_type !== MeasureTypeEnum.WATER && query.measure_type !== MeasureTypeEnum.GAS) return res
          .status(BAD_REQUEST)
          .json({ error_code: 'INVALID_TYPE', error_description: 'Tipo de medição não permitida'});

        const repoUser = AppDataSource.getRepository(User);

        const userListMeasure = await repoUser.find({
          where: {
            customer_code: customer_code,
          },
          relations: {
            measure: true,
          }
        });

        if (userListMeasure.length === 0) return res
          .status(NOT_FOUND)
          .json({ error_code: 'MEASURES_NOT_FOUND', error_description: 'Nenhuma leitura encontrada'});

        console.log('userExist', userListMeasure, customer_code);

        const measures = userListMeasure[0].measure
          .map((measure) => ({
            measure_uuid: measure.id.toString(),
            measure_datetime: measure.datetime,
            measure_type: measure.type,
            image_url: 'http://localhost:3001/image/' + measure.image_url,
            has_confirmed: measure.has_confirmed,
          })).filter((measure) => !query.measure_type || measure.measure_type === query.measure_type);

        return res.status(OK).json({ customer_code, measures });
      } catch (error) {
        next(error);
      }
    });

    app.use('/image', express.static('public/images'));

    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
      console.error({ serverError: err.message });
      res.status(INTERNAL_SERVER_ERROR).json({ err: 'internal server error' });
    };

    app.use(errorHandler);

    app.listen(PORT, () => console.log('running port', PORT));
  })
  .catch((err) => {
    console.error('Error during Data Source initialization', err);
  });
