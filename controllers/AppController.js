import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static getStatus(req, res) {
    const response = { redis: redisClient.isAlive(), db: dbClient.isAlive() };
    return res.json(response);
  }

  static async getStats(req, res) {
    const response = { users: await dbClient.nbUsers(), files: await dbClient.nbFiles() };
    return res.json(response);
  }
}

export default AppController;
