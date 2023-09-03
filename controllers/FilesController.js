import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import { promises, existsSync } from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await dbClient.getUser({ _id: ObjectId(userId) });
    const {
      name,
      type,
      parentId,
      isPublic,
      data,
    } = req.body;

    const defaultParentId = parentId ? ObjectId(parentId) : 0;
    const defaultIsPublic = isPublic || false;
    const localPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const allowedTypes = ['folder', 'file', 'image'];
    const { writeFile, mkdir } = promises;
    if (!token || !userId || user.length === 0) {
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
      const file = await dbClient.getFile({ parentId: ObjectId(parentId) });
      if (file.length === 0) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (file[0].type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {
      const file = await dbClient.createFile(
        {
          userId: ObjectId(userId),
          parentId: defaultParentId,
          name,
          type,
          isPublic: defaultIsPublic,
        },
      );
      const data = {
        id: file.ops[0]._id,
        userId: file.ops[0].userId,
        name: file.ops[0].name,
        type: file.ops[0].type,
        parentId: file.ops[0].parentId,
        isPublic: file.ops[0].isPublic,
      };
      return res.status(201).json(data);
    }

    if (!existsSync(localPath)) {
      await mkdir(localPath);
    }

    const buffer = Buffer.from(data, 'base64');
    await writeFile(`${localPath}/${uuidv4()}`, buffer, 'base64');
    const file = await dbClient.createFile(
      {
        userId: ObjectId(userId),
        parentId: defaultParentId,
        name,
        type,
        isPublic: defaultIsPublic,
        localPath: `${localPath}/${uuidv4()}`,
      },
    );

    const response = {
      id: file.ops[0]._id,
      userId: file.ops[0].userId,
      parentId: file.ops[0].parentId,
      name: file.ops[0].name,
      type: file.ops[0].type,
      isPublic: file.ops[0].isPublic,
    };
    return res.status(201).json(response);
  }
}

export default FilesController;
