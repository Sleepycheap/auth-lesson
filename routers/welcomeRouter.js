import express from 'express';
import {welcomeGet} from '../controllers/welcomeController.js';

const welcomeRouter = express.Router();

welcomeRouter.get('/welcome/:username', welcomeGet);

export default welcomeRouter;