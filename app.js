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
    interval: 1000,
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

const catchGitHub401or404 = (err) => {
    console.log(`GITHUB ERROR: ${err.message}`);
    const errorCode = getErrorCode(err.response || {});
    if (errorCode === 401 || errorCode === 404) {
        err.status = errorCode;
        throw new retry.StopError(err);
    }
    throw err;
};

const processGitHubResponse = (r) => {
    console.log(`${r.config.method} ${r.status} ${r.config.url} | ${r.statusText}`);
    if (r.status === 204) {
        return [];
    }
    if (r.status !== 200) {
        const error = new Error(r.statusText);
        error.code = r.status;
        error.status = r.status;
        throw error;
    }
    return r.data;
};

const initGitHub = async (req) => new GitHub({token: getAuthToken(req)});
const execWithRetry = (fn) => retry(() => fn().then(processGitHubResponse).catch(catchGitHub401or404), RETRY_OPTS);
const getRepositoriesForLoggedUser = (github) => execWithRetry(() => github.getUser().listRepos({'type': 'collaborator'}));
const getRepositoriesForOrganization = (github, organization) => execWithRetry(() => github.getOrganization(organization).getRepos());
const getRepository = (github, owner, repository) => execWithRetry(() => github.getRepo(owner, repository).getDetails());
const getTeamRepositories = (github, team) => execWithRetry(() => github.getTeam(team.id).listRepos());
const getTeams = (github, organization) => execWithRetry(() => github.getOrganization(organization).getTeams());
const getRepoStats = (github, repo) => execWithRetry(() => github.getRepo(repo.owner.login, repo.name).getContributorStats());

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


const streamStats = async (github, repos, out) => {
    console.log(`Count of repos to process is ${repos.length}`);
    out.type('json');
    const stream = JSONStream.stringify();
    stream.pipe(out);
    await writeStatsToStream(repos, github, stream);
    stream.end();
};

app.use(body.json());
app.use(morgan(':method :status :response-time ms'));

app.get('/vizydrop-status-ping', (req, res) => {
    res.json({ok:true});
});

app.get('/', async (req, res, next) => {
    try {
        const github = await initGitHub(req);
        const repos = await getRepositoriesForLoggedUser(github);
        await streamStats(github, repos, res);
    } catch (err) {
        next(err);
    }
});

app.get('/:organization/team/:team', async (req, res, next) => {
    try {
        const github = await initGitHub(req);
        const teams = await getTeams(github, req.params.organization);
        const teamToFind = req.params.team.toLowerCase();
        const team = _.find(teams, (t) => t.name.toLowerCase() === teamToFind || t.slug.toLowerCase() === teamToFind);
        if (!team) {
            const error = new Error(`Team '${req.params.team}' is not found in ${req.params.organization}`);
            error.status = 404;
            throw error;
        }
        const repos = await getTeamRepositories(github, team);
        await streamStats(github, repos, res);
    } catch (err) {
        next(err);
    }
});

app.get('/:organization', async (req, res, next) => {
    try {
        const github = await initGitHub(req);
        const repos = await getRepositoriesForOrganization(github, req.params.organization);
        await streamStats(github, repos, res);
    } catch (err) {
        next(err);
    }
});


app.get('/:owner/:repository', async (req, res, next) => {
    try {
        const github = await initGitHub(req);
        const repo = await getRepository(github, req.params.owner, req.params.repository);
        await streamStats(github, [repo], res);
    } catch (err) {
        next(err);
    }
});

app.use((err, req, res, next) => res.status(getErrorCode(err)).send({
    message: getMessage(err),
    code: getErrorCode(err)
}));

const port = process.env.PORT || 7770;
const server = app.listen(port, () => console.log(`github-data-link is listening on port ${port}!`));
module.exports = () => server;
