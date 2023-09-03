import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || '27017';
    this.database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${this.host}:${this.port}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true, useNewUrlParser: true });
    this.client.connect()
      .then(() => {
        this.db = this.client.db(`${this.database}`);
      })
      .catch((error) => console.log(error));
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const collection = this.getCollection('users');
    const result = await collection.countDocuments();
    return result;
  }

  async nbFiles() {
    const collection = this.getCollection('files');
    const result = await collection.countDocuments();
    return result;
  }
}

const dbClient = new DBClient();
export default dbClient;
