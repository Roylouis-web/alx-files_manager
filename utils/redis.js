import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.log(err));
  }

  isAlive() {
    const result = this.client.connected;
    return result;
  }

  async get(key) {
    const { get } = this.client;
    const getPromisified = promisify(get).bind(this.client);
    const value = await getPromisified(key);
    return value;
  }

  async set(key, value, duration) {
    const { setex } = this.client;
    const setexPromisified = promisify(setex).bind(this.client);
    await setexPromisified(key, duration, value);
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
