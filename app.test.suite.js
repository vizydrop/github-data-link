describe('github weekly contributions', () => {
    let app = null;
    before('start app', () => {
        app = require('./app')();
    });

    it('should be authenticated to github with provided token', () => {

    });

    after((done) => {
        app.close(done);
    });
});