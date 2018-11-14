const express = require('express');
const app = express();
const body = require('body-parser');
const GitHub = require('github-api');
const Promise = require('bluebird');
const JSONStream = require('JSONStream');
const moment = require('moment');
const morgan = require('morgan');
const retry = require('bluebird-retry');
const _ = require('lodash');

const RETRY_OPTS = {
    backoff: 5,
    interval: 2000,
    max_tries: 5
};
const getErrorCode = (err) => err.code || err.statusCode || err.status || 500;
const getMessage = (err) => {
    let message = err.message || err.statusText || 'Ops... Something terrible happens';
    if (getErrorCode(err) === 401) {
        message = `Provide your valid GitHub token to query as 'token=[your github token]' or use authorization header 'Authorization:token [your github token]'. You can retrieve personal GitHub token at https://github.com/settings/tokens`
    }
    return message;
};

const writeContributorStatsToStream = (entry, repo, contributorName, stream) => {
    entry.weeks.forEach(week => {
        if (week.a + week.d + week.c === 0) {
            return;
        }
        const v = {
            'Repository Owner': repo.owner.login,
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
    if (r.status === 204) {
        return [];
    }
    if (r.status !== 200) {
        const error = new Error(r.statusText);
        error.code = r.status;
        throw error;
    }
    return r.data;
};

const initGitHub = async (req) => {
    const accessToken = getAuthToken(req);
    const github = new GitHub({token: accessToken});
    console.log(`Logged as '${(await github.getUser().getProfile().then(processGitHubResponse)).login}'`);
    return github;
};

const getRepositories = (github) => retry(() => {
    return github.getUser().listRepos({'affiliation': 'organization_member'}).then(processGitHubResponse);
}, RETRY_OPTS);

const getRepoStats = (github, repo) => retry(() => {
    return github.getRepo(repo.owner.login, repo.name).getContributorStats().then(processGitHubResponse);
}, RETRY_OPTS);

const writeRepoStatsToStream = async (github, repo, stream) => {
    const stats = await getRepoStats(github, repo);
    await Promise.each(stats, async (entry) => {
        const login = entry.author.login;
        const contributorName = login || 'Unknown Member';
        writeContributorStatsToStream(entry, repo, contributorName, stream);
    });
};

const writeStatsToStream = async (repos, github, stream) => {
    await Promise.each(repos, (repo) => writeRepoStatsToStream(github, repo, stream))
        .catch(err => {
            console.log(`ERROR STREAMING: ${err.message}`);
            return stream.write({
                __streamError: {
                    message: getMessage(err),
                    code: getErrorCode(err)
                }
            });
        });
};

const getAuthToken = (req) => {
    const accessToken = (req.headers['authorization'] || '').replace('token ', '');
    if (accessToken) {
        return accessToken;
    }
    return req.query.token;
};

const writeStats = async (github, repos, res) => {
    console.log(`Count of repos to process is ${repos.length}`);
    res.type('json');
    const stream = JSONStream.stringify();
    stream.pipe(res);
    await writeStatsToStream(repos, github, stream);
    stream.end();
};

app.use(body.json());


app.use(morgan(':method :status :response-time ms'));
app.get('/', async (req, res, next) => {
    try {
        const github = await initGitHub(req);
        const repos = await getRepositories(github);
        await writeStats(github, repos, res);
    } catch (err) {
        next(err.response || err);
    }
});


app.get('/:organization/team/:team', async (req, res, next) => {
    try {
        const github = await initGitHub(req);
        const teams = await github.getOrganization(req.params.organization).getTeams().then(processGitHubResponse);
        const teamToFind = req.params.team.toLowerCase();
        const team = _.find(teams, (t) => t.name.toLowerCase() === teamToFind || t.slug.toLowerCase() === teamToFind);
        if (!team) {
            throw new Error(`Team '${req.params.team}' is not found at ${req.params.organization}`);
        }
        const repos = await github.getTeam(team.id).listRepos().then(processGitHubResponse);
        await writeStats(github, repos, res);
    } catch (err) {
        next(err.response || err);
    }
});

app.get('/:owner/:repository', async (req, res, next) => {
    try {
        const github = await initGitHub(req);
        const repo = await github.getRepo(req.params.owner, req.params.repository).getDetails().then(processGitHubResponse);
        await writeStats(github, [repo], res);
    } catch (err) {
        next(err.response || err);
    }
});

app.use((err, req, res, next) => res.status(getErrorCode(err)).send({
    message: getMessage(err),
    code: getErrorCode(err)
}));

const server = app.listen(process.env.PORT || 8080);
module.exports = () => server;
