import express from 'express';
import * as bodyParser from 'body-parser';
import indexRouter from './routes/index';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(indexRouter);

app.listen(process.env.PORT || 5000);

export default app;
