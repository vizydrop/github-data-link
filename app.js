const express = require('express');
const app = express();
const body = require('body-parser');
const GitHub = require('github-api');
const Promise = require('bluebird');
const JSONStream = require('JSONStream');
const moment = require('moment');
const morgan = require('morgan');
const retry = require('bluebird-retry');

const getErrorCode = (err) => err.code || err.statusCode || err.status || 500;
const getMessage = (err) => err.message || err.statusText;

const writeContributorStatsToStream = (entry, repo, contributorName, stream) => {
    entry.weeks.forEach(week => {
        if (week.a + week.d + week.c === 0) {
            return;
        }
        const v = {
            'Organization': repo.owner.login,
            'Repository': repo.name,
            'Repository Created On': moment(repo.created_at).format('DD-MMM-YYYY'),
            'Repository Language': repo.language || 'N/A',
            'Repository Size': repo.size,
            'Is Private Repository': repo.private,
            'Contributor': contributorName,
            'Date': moment.unix(week.w).format('DD-MMM-YYYY'),
            'Code Additions': week.a,
            'Code Deletions': week.d,
            'Code Commits': week.c
        };
        stream.write(v);
    });
};

const writeRepoStatsToStream = async (github, repo, stream, getContributorName) => {
    const stats = await github.getRepo(repo.owner.login, repo.name).getContributorStats().then(processGitHubResponse);
    await Promise.each(stats, async (entry) => {
        const login = entry.author.login;
        const contributorName = login ? await getContributorName(login) : 'Unknown Member';
        writeContributorStatsToStream(entry, repo, contributorName, stream);
    });
};

const processGitHubResponse = (r) => {
    if (r.status >= 400) {
        const error = new Error(r.statusText);
        error.code = r.status;
        throw error;
    }
    return r.data;
};

const writeStatsToStream = async (repos, github, stream) => {
    const contributorProfiles = {};
    const getContributorName = async (login) => {
        if (!contributorProfiles[login]) {
            const profile = await github.getUser(login).getProfile().then(processGitHubResponse) || {name: login};
            contributorProfiles[login] = profile || {};
        }
        return contributorProfiles[login].name || login;
    };
    await Promise.each(repos, (repo) => writeRepoStatsToStream(github, repo, stream, getContributorName))
        .catch(err => stream.write({
            __streamError: {
                message: getMessage(err),
                code: getErrorCode(err)
            }
        }));
};

const getAuthToken = (req) => {
    const accessToken = (req.headers['authorization'] || '').replace('token ', '');
    if (accessToken) {
        return accessToken;
    }
    return req.query.token;
};

app.use(body.json());
app.use(morgan(':method :status :response-time ms'));

app.get('/', async (req, res, next) => {
    try {
        const accessToken = getAuthToken(req);
        const github = new GitHub({token: accessToken});
        const me = github.getUser();
        const repos = await me.listRepos({'affiliation': 'organization_member'}).then(processGitHubResponse);
        res.type('json');
        const stream = JSONStream.stringify();
        stream.pipe(res);
        await writeStatsToStream(repos, github, stream);
        stream.end();
    } catch (err) {
        next(err.response || err);
    }
});

app.use((err, req, res, next) => res.status(getErrorCode(err)).send({
    message: getErrorCode(err),
    code: getErrorCode(err)
}));

const server = app.listen(process.env.PORT || 8080);
module.exports = () => server;
