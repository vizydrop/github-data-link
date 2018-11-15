const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');

describe('github data link suite', function () {
    this.timeout(10000);
    before('start app', () => {
        this.app = require('./app')();
        this.get = (config = {}) => request(`http://127.0.0.1:${this.app.address().port}`)
            .get(config.path ? config.path : '/')
            .set('Authorization', `token ${config.token || process.env.token}`);
    });

    before('verify github token provided', () => {
        expect(process.env.token).to.be.a('string');
    });

    it('should not be authenticated to github with non-valid token', () => this.get({token: 'not-valid'}).expect(401));

    it('should retrieve concrete repo stats', () => this.get({path: '/vizydrop/github-data-link'}).expect(200)
        .then((res) => {
            const stats = res.body;
            expect(stats).to.be.a('array');
            expect(stats).to.have.length.above(0);
            const entry = stats[0];
            expect(entry).to.have.property('Code Additions');
            expect(entry).to.have.property('Code Deletions');
            expect(entry).to.have.property('Code Commits');
            expect(entry).to.have.property('Code Commits');
            expect(entry).to.have.property('Repository Owner');
            expect(entry).to.have.property('Repository');
            expect(entry).to.have.property('Repository Created On');
            expect(entry).to.have.property('Repository Language');
            expect(entry).to.have.property('Repository Size');
            expect(entry).to.have.property('Is Private Repository');
            expect(entry).to.have.property('Contributor');
            expect(entry).to.have.property('Date');
        }));

    it('should retrieve stats for all repos where user is a member', () => this.get().expect(200));
    it('should retrieve organization repo stats', () => this.get({path: '/vizydrop'}).expect(200));

    it('should fail for incorrect organization repo stats', () => this.get({path: '/vizydrop666'}).expect(404));
    it('should fail for incorrect concrete repo stats', () => this.get({path: '/vizydrop/666'}).expect(404));
    it('should fail for incorrect team repo stats', () => this.get({path: '/vizydrop/teams/666'}).expect(404));

    after((done) => this.app.close(done));
});