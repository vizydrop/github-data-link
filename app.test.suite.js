const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');

describe('github data link suite', function () {
    this.timeout(100000);
    before('start app', () => {
        this.app = require('./app')();
        this.get = (config = {}) => request(`http://127.0.0.1:${this.app.address().port}`)
            .get('/')
            .set('Authorization', `token ${config.token || process.env.token}`);
    });

    before('verify github token provided', () => {
        expect(process.env.token).to.be.a('string');
    });

    it('should not be authenticated to github with non-valid token', () => this.get({token: 'not-valid'}).expect(401));

    it('should be retrieve stats with provided token', () => this.get()
        .expect(200)
        .then((res) => {
            const stats = res.body;
            expect(stats).to.be.a('array');
            expect(stats).to.have.length.above(0);
            const entry = stats[0];
            expect(entry).to.have.property('Code Additions');
            expect(entry).to.have.property('Code Deletions');
            expect(entry).to.have.property('Code Commits');
            expect(entry).to.have.property('Code Commits');
            expect(entry).to.have.property('Organization');
            expect(entry).to.have.property('Repository');
            expect(entry).to.have.property('Repository Created On');
            expect(entry).to.have.property('Repository Language');
            expect(entry).to.have.property('Repository Size');
            expect(entry).to.have.property('Is Private Repository');
            expect(entry).to.have.property('Contributor');
            expect(entry).to.have.property('Date');
        }));

    after((done) => this.app.close(done));
});