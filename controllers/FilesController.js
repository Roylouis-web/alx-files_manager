import { promises, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import Queue from 'bull';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const queue = new Queue('fileQueue');
    const token = req.headers['x-token'];
    let foundParent;
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
      const file = await filesCollection.findOne({ _id: ObjectId(parentId), userId: user._id });
      foundParent = file;
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
        parentId: parentId ? foundParent._id : 0,
        name,
        type,
        isPublic: isPublic || false,
      };
      const file = await filesCollection.insertOne(items);
      const response = {
        id: file.insertedId,
        userId: user._id,
        parentId: parentId ? foundParent._id : 0,
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
      userId: user._id,
      parentId: parentId ? foundParent._id : 0,
      name,
      type,
      isPublic: isPublic || false,
      localPath: `${FOLDER_PATH}/${UUID}`,
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

    if (type === 'image') {
      queue.add('image', { userId: user._id, fileId: file.insertedId });
    }
    return res.status(201).json(response);
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const usersCollection = dbClient.db.collection('users');
    const filesCollection = dbClient.db.collection('files');
    const { id } = req.params;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await usersCollection.findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await filesCollection.findOne({ _id: ObjectId(id), userId: user._id });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const response = await filesCollection.aggregate([
      {
        $match: {
          _id: ObjectId(id),
          userId: user._id,
        },
      },
      {
        $addFields: {
          id: '$_id',
        },
      },
      {
        $project: {
          _id: 0,
          localPath: 0,
        },
      },
    ]).toArray();

    return res.json(response[0]);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const usersCollection = dbClient.db.collection('users');
    const filesCollection = dbClient.db.collection('files');
    const { parentId, page } = req.query;
    const parsedPage = page ? parseInt(page, 10) : 0;
    const limit = 20;
    let match;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await usersCollection.findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (parentId) {
      match = {
        parentId: ObjectId(parentId),
        userId: user._id,
      };
    } else {
      match = {
        userId: user._id,
      };
    }
    const query = [
      {
        $match: match,
      },
    ];

    if (parsedPage) {
      query.push(
        {
          $skip: parsedPage * limit,
        },
        {
          $limit: limit,
        },
        {
          $addFields: {
            id: '$_id',
          },
        },
        {
          $project: {
            _id: 0,
            localPath: 0,
          },
        },
      );
    } else {
      query.push(
        {
          $limit: limit,
        },
        {
          $addFields: {
            id: '$_id',
          },
        },
        {
          $project: {
            _id: 0,
            localPath: 0,
          },
        },
      );
    }
    const file = await filesCollection.aggregate(query).toArray();
    return res.json(file);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const usersCollection = dbClient.db.collection('users');
    const filesCollection = dbClient.db.collection('files');
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await usersCollection.findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await filesCollection.findOne({ _id: ObjectId(id), userId: user._id });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await filesCollection.updateOne(
      {
        _id: ObjectId(id),
        userId: user._id,
      },
      {
        $set: {
          isPublic: true,
        },
      },
    );

    const updatedFile = await filesCollection.aggregate([
      {
        $match: {
          _id: ObjectId(id),
          userId: user._id,
        },
      },
      {
        $addFields: {
          id: '$_id',
        },
      },
      {
        $project: {
          _id: 0,
          localPath: 0,
        },
      },
    ]).toArray();

    return res.json(updatedFile[0]);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const usersCollection = dbClient.db.collection('users');
    const filesCollection = dbClient.db.collection('files');
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await usersCollection.findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await filesCollection.findOne({ _id: ObjectId(id), userId: user._id });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await filesCollection.updateOne(
      {
        _id: ObjectId(id),
        userId: user._id,
      },
      {
        $set: {
          isPublic: false,
        },
      },
    );

    const updatedFile = await filesCollection.aggregate([
      {
        $match: {
          _id: ObjectId(id),
          userId: user._id,
        },
      },
      {
        $addFields: {
          id: '$_id',
        },
      },
      {
        $project: {
          _id: 0,
          localPath: 0,
        },
      },
    ]).toArray();

    return res.json(updatedFile[0]);
  }

  static async getFile(req, res) {
    const token = req.headers['x-token'];
    const { id } = req.params;
    const { size } = req.query;
    const usersCollection = dbClient.db.collection('users');
    const filesCollection = dbClient.db.collection('files');
    const { readFile } = promises;
    const foundFile = await filesCollection.findOne({ _id: ObjectId(id) });
    let content;

    if (!foundFile) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!foundFile.isPublic) {
      if (!token) {
        return res.status(404).json({ error: 'Not found' });
      }

      const userId = await redisClient.get(`auth_${token}`);

      if (!userId) {
        return res.status(404).json({ error: 'Not found' });
      }

      const user = await usersCollection.findOne({ _id: ObjectId(userId) });
      if (!user || JSON.stringify(foundFile.userId) !== JSON.stringify(user._id)) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (foundFile.type === 'folder') {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }

    const contentType = mime.contentType(foundFile.name);

    if (size) {
      try {
        content = await readFile(`${foundFile.localPath}_${size}`, 'utf-8');
      } catch (error) {
        return res.status(404).json({ error: 'Not found' });
      }
    } else {
      try {
        content = await readFile(foundFile.localPath, 'utf-8');
      } catch (error) {
        return res.status(404).json({ error: 'Not found' });
      }
    }
    res.setHeader('Content-Type', contentType);
    return res.end(content);
  }
}

export default FilesController;
