import express from 'express';
import * as bodyParser from 'body-parser';
import router from './routes/index';

const app = express();
const port = parseInt(process.env.PORT, 10) || 5000;
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/', router);
app.listen(port, () => console.log(`Server running on port ${port}`));

export default app;
