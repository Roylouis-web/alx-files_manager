import { Router } from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

const indexRouter = Router();

indexRouter.get('/status', AppController.getStatus);
indexRouter.get('/stats', AppController.getStats);
indexRouter.post('/users', UsersController.postNew);
indexRouter.get('/connect', AuthController.getConnect);
indexRouter.get('/disconnect', AuthController.getDisconnect);
indexRouter.get('/users/me', AuthController.getMe);
indexRouter.post('/files', FilesController.postUpload)

export default indexRouter;
