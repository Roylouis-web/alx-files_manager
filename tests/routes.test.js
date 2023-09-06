import { describe, it, before } from 'mocha';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import assert from 'assert';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import app from '../server';

chai.use(chaiHttp);

describe('GET /status', () => {
  it('Tests for correct response of the GET status endpoint', (done) => {
    chai.request(app)
      .get('/status')
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res._body).to.deep.equal({ redis: true, db: true });
        done();
      });
  });
});

describe('GET /stats', () => {
  it('Tests for correct response of the GET stats enpoint', (done) => {
    chai.request(app)
      .get('/stats')
      .end((err, res) => {
	const { users, files } = res._body;
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res).to.be.json;
	expect(Object.keys(res._body)).to.deep.equal(['users', 'files']);
	expect(typeof(users)).to.equal('number');
        expect(typeof(files)).to.equal('number');
	expect(users >= 0).to.be.true;
        expect(files >= 0).to.be.true;
        done();
      });
  });
});

describe('POST /users', () => {
  it.skip('Test for correct response of the POST /users endpoint with correct body data', (done) => {
    chai.request(app)
      .post('/users')
      .set('Content-Type', 'application/json')
      .send({ email: 'roy@web.com', password: 'roy@web' })
      .end((err, res) => {
        const { id, email } = res._body;
        expect(err).to.be.null;
        expect(res).to.have.status(201);
        expect(res).to.be.json;
        expect(Object.keys(res._body)).to.deep.equal(['id', 'email']);
        expect(typeof(id)).to.equal('string');
        expect(typeof(email)).to.equal('string');
        expect(id.length).to.equal(24);
        expect(email).to.equal('roy@web.com');
        done();
      });
  });

  it('Test for correct response of the POST /users endpoint with missing email', (done) => {
    chai.request(app)
      .post('/users')
      .set('Content-Type', 'application/json')
      .send({ password: 'jess@tech' })
      .end((err, res) => {
	const { error } = res._body;
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        expect(res).to.be.json;
        expect(Object.keys(res._body)).to.deep.equal(['error']);
        expect(typeof(error)).to.equal('string');
        expect(error).to.equal('Missing email');
        done();
      });
  });

  it('Test for correct response of the POST /users endpoint with missing password', (done) => {
    chai.request(app)
      .post('/users')
      .set('Content-Type', 'application/json')
      .send({ email: 'jess@tech.com' })
      .end((err, res) => {
        const { error } = res._body;
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        expect(res).to.be.json;
        expect(Object.keys(res._body)).to.deep.equal(['error']);
        expect(typeof(error)).to.equal('string');
        expect(error).to.equal('Missing password');
        done();
      });
  });

  it('Test for correct response of the POST /users endpoint with existing email and password', (done) => {
    chai.request(app)
      .post('/users')
      .set('Content-Type', 'application/json')
      .send({ email: 'roy@web.com', password: 'roy@web' })
      .end((err, res) => {
        const { error } = res._body;
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        expect(res).to.be.json;
        expect(Object.keys(res._body)).to.deep.equal(['error']);
        expect(typeof(error)).to.equal('string');
        expect(error).to.equal('Already exist');
        done();
      });
  });
});

describe('GET /connect', () => {
  it.skip('Test for correct response of the GET /connect endpoint with existing user', (done) => {
    chai.request(app)
      .get('/connect')
      .set('Authorization', 'Basic cm95QHdlYi5jb206cm95QHdlYg==')
      .end((err, res) => {
        const { token } = res._body;
	const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(res).to.have.status(200);
	expect(req).to.have.header('Authorization', 'Basic cm95QHdlYi5jb206cm95QHdlYg==');
        expect(res).to.be.json;
        expect(Object.keys(res._body)).to.deep.equal(['token']);
        expect(typeof(token)).to.equal('string');
        expect(token.length).to.equal(36);
        done();
      });
  });

  it('Test for correct response of the GET /connect endpoint non existing user', (done) => {
    chai.request(app)
      .get('/connect')
      .set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=')
      .end((err, res) => {
	const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(res).to.have.status(401);
	expect(req).to.have.header('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=');
        expect(res._body).to.deep.equal({ error: 'Unauthorized' });
        done();
      });
  });
});

describe('GET /disconnect', () => {
  it.skip('Test for correct response of the GET /disconnect endpoint with existing user', (done) => {
    chai.request(app)
      .get('/disconnect')
      .set('X-Token', '8838ac52-dd70-4f3d-9592-c4b9c16b4e58')
      .end((err, res) => {
	const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(res._body).to.equal(undefined);
        expect(res).to.have.status(204);
        expect(req).to.have.header('X-Token', '8838ac52-dd70-4f3d-9592-c4b9c16b4e58');
        done();
      });
  });

  it('Test for correct response of the GET /disconnect endpoint with existing user', (done) => {
    chai.request(app)
      .get('/disconnect')
      .set('X-Token', '8838ac52-dd70-4f3d-9592-c4b9c16b4e58')
      .end((err, res) => {
        const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(res._body).to.deep.equal({ error: 'Unauthorized' });
        expect(res).to.have.status(401);
	expect(req).to.have.header('X-Token', '8838ac52-dd70-4f3d-9592-c4b9c16b4e58');
        done();
      });
  });
});

describe('GET /users/me', () => {
  it('Test for correct response of the GET /users/me endpoint with valid token', (done) => {
    chai.request(app)
      .get('/users/me')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .end((err, res) => {
        const { req } = res;
	const { id, email } = res._body;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(id.length).to.equal(24);
        expect(email).to.equal('roy@web.com');
	expect(res).to.have.status(200);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
        done();
      });
  });

  it('Test for correct response of the GET /users/me endpoint with invalid token', (done) => {
    chai.request(app)
      .get('/users/me')
      .set('X-Token', '8838ac52-dd70-4f3d-9592-c4b9c16b4e58')
      .end((err, res) => {
        const { req } = res;
        expect(err).to.be.null;
        expect(res).to.be.json;
        expect(res._body).to.deep.equal({ error: 'Unauthorized' });
        expect(res).to.have.status(401);
        expect(req).to.have.header('X-Token', '8838ac52-dd70-4f3d-9592-c4b9c16b4e58');
        done();
    });
  });
});

describe('POST /files', () => {
  it.skip('Test for correct response of the POST /files endpoint with valid token', (done) => {
    chai.request(app)
      .post('/files')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .send({ name: 'images', type: 'folder' })
      .end((err, res) => {
        const { req } = res;
	const { id, userId, parentId, name, type, isPublic } = res._body;
	const temp1 = { name, type, isPublic };
	const temp2 = { name: 'images', type: 'folder', isPublic: false };
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(temp1).to.deep.equal(temp2);
	expect(typeof(id)).to.equal('string');
	expect(typeof(userId)).to.equal('string');
        expect(id.length).to.equal(24);
        expect(userId.length).to.equal(24);
        expect(parentId).to.equal(0);
        expect(res).to.have.status(201);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
        done();
      });
  });

   it('Test for correct response of the POST /files endpoint with an invalid token', (done) => {
      chai.request(app)
        .post('/files')
        .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6b5')
        .send({ name: 'myText.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==' })
        .end((err, res) => {
          const { req } = res;
          expect(res).to.be.json;
          expect(err).to.be.null;
          expect(res._body).to.deep.equal({ error: 'Unauthorized' });
          expect(res).to.have.status(401);
	  expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6b5');
          done();
	});
   });

  it('Test for correct response of the POST /files endpoint with name missing', (done) => {
    chai.request(app)
      .post('/files')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .send({ type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==' })
      .end((err, res) => {
        const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(res._body).to.deep.equal({ error: 'Missing name' });
        expect(res).to.have.status(400);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
        done();
    });
  });

  it('Test for correct response of the POST /files endpoint with type missing', (done) => {
    chai.request(app)
      .post('/files')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .send({ name: 'myText.txt', data: 'SGVsbG8gV2Vic3RhY2shCg==' })
      .end((err, res) => {
        const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(res._body).to.deep.equal({ error: 'Missing type' });
        expect(res).to.have.status(400);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
        done();
      });
  });

    it('Test for correct response of the POST /files endpoint with data missing', (done) => {
    chai.request(app)
      .post('/files')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .send({ name: 'myText.txt', type: 'file' })
      .end((err, res) => {
        const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(res._body).to.deep.equal({ error: 'Missing data' });
        expect(res).to.have.status(400);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
        done();
      });
   });

  it('Test for correct response of the POST /files endpoint with not existing parent', (done) => {
    const data = { name: 'myText.txt', type: 'file', parentId: '64f8829816f7761e94f30de3', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
    chai.request(app)
      .post('/files')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .send(data)
      .end((err, res) => {
        const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(res._body).to.deep.equal({ error: 'Parent not found' });
        expect(res).to.have.status(400);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
        done();
      });
   });

  it('Test for correct response of the POST /files endpoint with file as parent id', (done) => {
  const data = { name: 'myText.txt', type: 'file',  data: 'SGVsbG8gV2Vic3RhY2shCg==', parentId: '64f8829816f7761e94f30de1' };
  chai.request(app)
    .post('/files')
    .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
    .send(data)
    .end((err, res) => {
      const { req } = res;
      expect(res).to.be.json;
      expect(err).to.be.null;
      expect(res._body).to.deep.equal({ error: 'Parent is not a folder' });
      expect(res).to.have.status(400);
      expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
      done();
    });
  })
});

describe('GET /files/:id', () => {
  it('Test for correct response of the GET /files/:id endpoint with a invalid token', (done) => {
    chai.request(app)
      .get('/files/64f8829816f7761e94f30de1')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6b5')
      .end((err, res) => {
        const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(res._body).to.deep.equal({ error: 'Unauthorized' });
        expect(res).to.have.status(401);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6b5');
        done();
    });
  });

  it('Test for correct response of the GET /files/:id endpoint with an invalid id', (done) => {
  chai.request(app)
    .get('/files/64f8829816f7761e94f30de5')
    .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
    .end((err, res) => {
      const { req } = res;
      expect(res).to.be.json;
      expect(err).to.be.null;
      expect(res._body).to.deep.equal({ error: 'Not found' });
      expect(res).to.have.status(404);
      expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
      done();
    });
  });

  it('Test for correct response of the GET /files/:id endpoint a valid id', (done) => {
  chai.request(app)
    .get('/files/64f8829816f7761e94f30de1')
    .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
    .end((err, res) => {
      const { req } = res;
      const { id, userId, parentId, name, type, isPublic } = res._body;
      expect(res).to.be.json;
      expect(typeof(id)).to.equal('string');
      expect(id.length).to.equal(24);
      expect(typeof(userId)).to.equal('string');
      expect(userId.length).to.equal(24);
      assert((typeof(parentId) === 'string' && parentId.length === 24) || typeof(parentId) === 'number');
      expect(typeof(name)).to.equal('string');
      expect(typeof(type)).to.equal('string');
      expect(typeof(isPublic)).to.equal('boolean');
      expect(err).to.be.null;
      expect(res).to.have.status(200);
      expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
      done();
   });
  });
});

describe('GET /files', () => {
  it('Test for correct response of the GET /files with invalid token', (done) => {
    chai.request(app)
      .get('/files')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6b4')
      .end((err, res) => {
        const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(res._body).to.deep.equal({ error: 'Unauthorized' });
        expect(res).to.have.status(401);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6b4');
        done();
    });
  });

  it('Test for correct response of the GET /files with valid token', (done) => {
    chai.request(app)
      .get('/files')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .end((err, res) => {
        const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        res._body.map((data) => {
          const { id, userId, parentId, name, type, isPublic } = data;
          expect(typeof(id)).to.equal('string');
          expect(id.length).to.equal(24);
          expect(typeof(userId)).to.equal('string');
          expect(userId.length).to.equal(24);
          assert((typeof(parentId) === 'string' && parentId.length === 24) || typeof(parentId) === 'number');
          expect(typeof(name)).to.equal('string');
          expect(typeof(type)).to.equal('string');
          expect(typeof(isPublic)).to.equal('boolean');
	});
        assert(res._body.length >= 0 && res._body.length <= 20);
        expect(res).to.have.status(200);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
        done();
      });
    });

  it('Test for correct response of the GET /files with non existing parentId', (done) => {
    chai.request(app)
      .get('/files?parentId=64f8829816f7761e94f30de1')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .end((err, res) => {
        const { req } = res;
        expect(res).to.be.json;
        expect(err).to.be.null;
        expect(res._body).to.deep.equal([]);
        expect(res).to.have.status(200);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
        done();
    });
  });
});

describe('/files/:id/data', () => {
  it('Test for correct response of the GET /files/:id/data', (done) => {
    chai.request(app)
      .get('/files/64f8ed24aec4680d2b36d4eb/data')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .end((err, res) => {
        const { req } = res;
        expect(err).to.be.null;
	expect(res).to.be.text;
        expect(res.text).to.equal('Hello Webstack!\n');
        expect(res).to.have.status(200);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
      done();
    });
  });

  it('Test for correct response of the GET /files/:id/data with wrong id', (done) => {
    chai.request(app)
      .get('/files/64f8ed24aec4680d2b37d4eb/data')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .end((err, res) => {
        const { req } = res;
        expect(err).to.be.null;
	expect(res).to.be.json;
        expect(res._body).to.deep.equal({ error: 'Not found' });
        expect(res).to.have.status(404);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
        done();
      });
    });

  it('Test for correct response of the GET /files/:id/data', (done) => {
    chai.request(app)
    .get('/files/64f8f6657bb9df116019830e/data')
    .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
    .end((err, res) => {
      const { req } = res;
      expect(err).to.be.null;
      expect(res).to.be.json;
      expect(res._body).to.deep.equal({ error: 'A folder doesn\'t have content' });
      expect(res).to.have.status(400);
      expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
      done();
    });
  });
});

describe('PUT /files/:id/publish', async () => {
  it('Test for correct response of the PUT /files/:id/publish with wrong id', (done) => {
    chai.request(app)
      .put('/files/64f8ed24aec4680d2b37d4eb/publish')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .end((err, res) => {
        const { req } = res;
        expect(err).to.be.null;
        expect(res).to.be.json;
        expect(res._body).to.deep.equal({ error: 'Not found' });
        expect(res).to.have.status(404)
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
        done();
    });
  });

  it('Test for correct response of the PUT correct /files/:id/publish', (done) => {
    chai.request(app)
      .put('/files/64f8f8a28e8de01351dba9dc/publish')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .end((err, res) => {
        const { req } = res;
        const { id, userId, parentId, name, type, isPublic } = res._body;
        expect(err).to.be.null;
        expect(res).to.be.json;
        expect(typeof(id)).to.equal('string');
        expect(id.length).to.equal(24);
        expect(typeof(userId)).to.equal('string');
        expect(userId.length).to.equal(24);
        assert((typeof(parentId) === 'string' && parentId.length === 24) || typeof(parentId) === 'number');
        expect(typeof(name)).to.equal('string');
        expect(typeof(type)).to.equal('string');
        expect(typeof(isPublic)).to.equal('boolean');
	expect(isPublic).to.equal(true);
        expect(res).to.have.status(200);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
      done();
    });
  });
});

describe('PUT /files/:id/unpublish', async () => {
  it('Test for correct response of the PUT /files/:id/unpublish with wrong id', (done) => {
  chai.request(app)
    .put('/files/64f8ed24aec4680d2b37d4eb/publish')
    .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
    .end((err, res) => {
      const { req } = res;
      expect(err).to.be.null;
      expect(res).to.be.json;
      expect(res._body).to.deep.equal({ error: 'Not found' });
      expect(res).to.have.status(404)
      expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
      done();
    });
  });

  it('Test for correct response of the PUT correct /files/:id/publish', (done) => {    chai.request(app)
      .put('/files/64f8f8a28e8de01351dba9dc/unpublish')
      .set('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf')
      .end((err, res) => {
        const { req } = res;
        const { id, userId, parentId, name, type, isPublic } = res._body;
        expect(err).to.be.null;
        expect(res).to.be.json;
        expect(typeof(id)).to.equal('string');
        expect(id.length).to.equal(24);
        expect(typeof(userId)).to.equal('string');
        expect(userId.length).to.equal(24);
        assert((typeof(parentId) === 'string' && parentId.length === 24) || typeof(parentId) === 'number');
        expect(typeof(name)).to.equal('string');
        expect(typeof(type)).to.equal('string');
        expect(typeof(isPublic)).to.equal('boolean');
        expect(isPublic).to.equal(false);
        expect(res).to.have.status(200);
        expect(req).to.have.header('X-Token', '3533e226-c675-4e7a-b6d7-8152bb77e6bf');
        done();
    });
  });
});
