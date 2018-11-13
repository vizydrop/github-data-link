const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');

describe('github data link suite', () => {
    before('start app', () => {
        this.app = require('./app')();
        this.get = (config = {}) => request(`http://127.0.0.1:${this.app.address().port}`)
            .get('/')
            .set('Authorization', `token ${config.token || process.env.token}`);
    });

    before('verify github token provided', () => {
        expect(process.env.token).to.be.a('string');
    });

    it('should not be authenticated to github with non-valid token', () => this.get({ token: 'not-valid'}).expect(401));

    it('should be authenticated to github with provided token', () => this.get().expect(200));

    after((done) => this.app.close(done));
});