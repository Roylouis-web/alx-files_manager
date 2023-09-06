import * as imageThumbnail from 'image-thumbnail';
import Queue from 'bull';
import { promises } from 'fs';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const queue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

queue.process('fileQueue', async (job, done) => {
  const filesCollection = dbClient.db.collection('files');
  const { readFile, writeFile } = promises;

  if (!job.data.fileId) {
    done(new Error('Missing fieldId'));
  }

  if (!job.data.userId) {
    done(new Error('Missing userId'));
  }

  const { fileId, userId } = job.data;

  const file = await filesCollection.findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

  if (!file) {
    done(new Error('File not found'));
  }

  const widths = ['500', '250', '100'];

  const imageBuffer = await readFile(file.localPath);

  widths.forEach(async (width) => {
    const thumbnail = await imageThumbnail(imageBuffer);
    await writeFile(`${file.localPath}_${width}`, thumbnail);
  });

  done();
});

userQueue.process('userQueue', async (job, done) => {
  const usersCollection = dbClient.db.collection('users');
  const { userId } = job.data;
  if (!job.data.userId) {
    done(new Error('Missing userId'));
  }

  const user = await usersCollection.findOne({ userId: ObjectId(userId) });

  if (!user) {
    done(new Error('User not found'));
  }

  console.log(`Welcome ${user.email}`);

  done();
});
