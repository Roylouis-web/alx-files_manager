import * as imageThumbnail from 'image-thumbnail';
import * as Queue from 'bull';
import { promises } from 'fs';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const queue = new Queue('fileQueue');

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
    throw new Error('File not found');
  }

  const widths = ['500', '250', '100'];

  const imageBuffer = await readFile(file.localPath);

  widths.forEach(async (width) => {
    const thumbnail = await imageThumbnail(imageBuffer);
    await writeFile(`${file.localPath}_${width}`, thumbnail);
  });

  done();
});
