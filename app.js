const express = require('express');
const app = express();
const body = require('body-parser');
const GitHub = require('github-api');
const Promise = require('bluebird');
const JSONStream = require('JSONStream');
const moment = require('moment');
const morgan = require('morgan');
const retry = require('bluebird-retry');
const RETRY_OPTS = {
    backoff: 5,
    interval: 1000,
    max_tries: 3,
    timeout: 50000
};
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

const processGitHubResponse = (r) => {
    console.log(`${r.config.method} ${r.status} ${r.config.url} | ${r.statusText}`);
    if (r.status !== 200) {
        const error = new Error(r.statusText);
        error.code = r.status;
        throw error;
    }
    return r.data;
};

const getRepositories = (github) => retry(() => {
    return github.getUser().listRepos({'affiliation': 'organization_member'}).then(processGitHubResponse);
}, RETRY_OPTS);

const getUserProfile = (github, login) => retry(() => {
    return github.getUser(login).getProfile().then(processGitHubResponse);
}, RETRY_OPTS);

const getRepoStats = (github, repo) => retry(() => {
    return github.getRepo(repo.owner.login, repo.name).getContributorStats().then(processGitHubResponse);
}, RETRY_OPTS);

const writeRepoStatsToStream = async (github, repo, stream, getContributorName) => {
    const stats = await getRepoStats(github, repo);
    await Promise.each(stats, async (entry) => {
        const login = entry.author.login;
        const contributorName = login ? await getContributorName(login) : 'Unknown Member';
        writeContributorStatsToStream(entry, repo, contributorName, stream);
    });
};

const writeStatsToStream = async (repos, github, stream) => {
    const contributorProfiles = {};
    const getContributorName = async (login) => {
        if (!contributorProfiles[login]) {
            const profile = await getUserProfile(github, login);
            contributorProfiles[login] = profile || {};
        }
        return contributorProfiles[login].name || login || 'Uknown User';
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
        const repos = await getRepositories(github);
        console.log(`Count of repos to process is ${repos.length}`);
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
