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

    const foundUser = await dbClient.getUser(email);

    if (foundUser.length > 0) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPwd = sha1(password);
    await dbClient.createUser(email, hashedPwd);
    const user = await dbClient.getUser(email);
    const response = { id: user[0]._id, email: user[0].email };
    return res.json(response);
  }
}

export default UsersController;
