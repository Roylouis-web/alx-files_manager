import { promises, existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token')
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
    const localPath = path.join(__dirname, FOLDER_PATH, UUID);
    const allowedTypes = ['folder', 'file', 'image'];
    const usersCollection = dbClient.db.collection('users');
    const filesCollection = dbClient.db.collection('files');
    const { writeFile, mkdir } = promises;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await usersCollection.findOne({ _id: ObjectId(userId) });

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
      const file = filesCollection.findOne({ parentId: ObjectId(parentId) });
      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {
      const items = {
        userId: ObjectId(userId),
        parentId: parentId ? Object(parentId) : 0,
        name,
        type,
        isPublic: isPublic || false,
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

    if (!existsSync(path.join(__dirname, FOLDER_PATH))) {
      await mkdir(path.join(__dirname, FOLDER_PATH), { recursive: true });
    }

    const content = Buffer.from(data, 'base64');

    await writeFile(localPath, content, { encoding: 'base64' });

    const items = {
      userId: ObjectId(userId),
      parentId: parentId ? Object(parentId) : 0,
      name,
      type,
      isPublic: isPublic || false,
      localPath,
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
