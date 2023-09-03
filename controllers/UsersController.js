import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const collection = dbClient.db.collection('users');
    const foundUser = await collection.findOne({ email });
    if (foundUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const user = await collection.insertOne({ email, password: sha1(password) });
    return res.status(201).json({ id: user.insertedId, email });
  }
}

export default UsersController;
