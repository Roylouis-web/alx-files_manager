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

  async getUsers() {
    const collection = this.getCollection('users');
    const users = await collection.find({}).toArray();
    return users;
  }

  async getUser(credentials) {
    const collection = this.getCollection('users');
    const user = await collection.find(credentials).toArray();
    return user;
  }

  async createUser(email, password) {
    const collection = this.getCollection('users');
    const result = await collection.insertOne({ email, password });
    return result;
  }

  async getFiles() {
    const collection = this.getCollection('files');
    const files = await collection.find({}).toArray();
    return files;
  }

  async getFile(credentials) {
    const collection = this.getCollection('files');
    const file = await collection.find(credentials).toArray();
    return file;
  }

  async createFile(credentials) {
    const collection = this.getCollection('files');
    const result = await collection.insertOne(credentials);
    return result;
  }

  getCollection(collectionName) {
    const collection = this.db.collection(collectionName);
    return collection;
  }
}

const dbClient = new DBClient();
export default dbClient;
