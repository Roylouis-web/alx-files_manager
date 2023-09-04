import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const { authorization } = req.headers;
    const base64 = authorization.split(' ')[1];
    const data = Buffer.from(base64, 'base64').toString();
    if (data.split(':').length !== 2) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const [email, password] = data.split(':');
    const collection = dbClient.db.collection('users');
    const user = await collection.findOne({ email });
    const token = uuidv4();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.password !== sha1(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.set(`auth_${token}`, user._id, 60 * 60 * 24);
    return res.json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const collection = dbClient.db.collection('users');
    const user = await collection.findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(`auth_${token}`);
    return res.sendStatus(204);
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const collection = dbClient.db.collection('users');
    const user = await collection.findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({ id: user._id, email: user.email });
  }
}

export default AuthController;
