const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');

describe('github weekly contributions', () => {
    before('start app', () => {
        this.app = require('./app')();
        this.host = `http://127.0.0.1:${this.app.address().port}`;
    });

    before('verify github token provided', () => {
        expect(process.env.token).to.be.a('string');
    });

    it('should be authenticated to github with provided token', () =>
        request(this.host).get('/').set('Authorization', `token ${process.env.token}`)
            .expect(200));

    it('should not be authenticated to github with non-valid token', () =>
        request(this.host).get('/').set('Authorization', `token not-${process.env.token}`)
            .expect(401));


    after((done) => this.app.close(done));
});