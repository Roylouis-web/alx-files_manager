import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const authorization = req.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(authorization, 'base64').toString();
    const [email, password] = credentials.split(':');
    const hashedPwd = sha1(password);
    const user = await dbClient.getUser({ email, password: hashedPwd });

    if (user.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user[0]._id, 86400);
    return res.json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(`auth_${token}`);
    return res.sendStatus(204);
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.getUser({ _id: ObjectId(userId) });
    if (user.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({ id: user[0]._id, email: user[0].email });
  }
}

export default AuthController;
