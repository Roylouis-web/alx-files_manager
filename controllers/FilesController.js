import { promises, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const {
      name,
      type,
      parentId,
      isPublic,
      data,
    } = req.body;
    const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
    const UUID = uuidv4();
    const allowedTypes = ['folder', 'file', 'image'];
    const usersCollection = dbClient.db.collection('users');
    const filesCollection = dbClient.db.collection('files');
    const { writeFile, mkdir } = promises;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || allowedTypes.indexOf(type) === -1) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId) {
      const file = filesCollection.findOne({ _id: new ObjectId(parentId), userId: user._id });
      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {
      const items = {
        userId: user._id,
        parentId: parentId || 0,
        name,
        type,
        isPublic: isPublic || false,
      };
      const file = await filesCollection.insertOne(items);
      const response = {
        id: file.insertedId,
        userId: user._id,
        parentId: parentId || 0,
        name,
        type,
        isPublic: isPublic || false,
      };
      return res.status(201).json(response);
    }

    if (!existsSync(FOLDER_PATH)) {
      await mkdir(`${FOLDER_PATH}`);
    }

    const content = Buffer.from(data, 'base64');

    await writeFile(`${FOLDER_PATH}/${UUID}`, content, { encoding: 'utf-8' });

    const items = {
      userId: new ObjectId(userId),
      parentId: parentId ? ObjectId(parentId) : 0,
      name,
      type,
      isPublic: isPublic || false,
      localPath: `${FOLDER_PATH}/${UUID}`,
    };

    const file = await filesCollection.insertOne(items);
    const response = {
      id: file.insertedId,
      userId,
      parentId: parentId || 0,
      name,
      type,
      isPublic: isPublic || false,
    };
    return res.status(201).json(response);
  }
}

export default FilesController;
