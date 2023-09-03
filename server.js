import express from 'express';
import * as bodyParser from 'body-parser';
import router from './routes/index';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/', router);

app.listen(process.env.PORT || 5000, () => console.log('Server running on port 5000'));

export default app;
