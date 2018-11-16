# GitHub Data Link
Stats related to weekly contributions to GitHub repositories
 
## Authentication
App is required to be authenticated to GitHub api in order to retrieve stats about repositories. You need to provide your personal authentication token from GitHub. GitHub personal token can generated at [https://github.com/settings/tokens](https://github.com/settings/tokens)

#### Query String Parameter
#### ``?token=YOUR-GITHUB-TOKEN``
Attach ``token`` parameter with your GitHub personal token to query string of url.

``
curl "https://links.vizydrop.com/github/vizydrop?token=YOUR-GITHUB-TOKEN" 
``

#### Header

#### ``Authorization: YOUR-GITHUB-TOKEN``  
Attach authorization header ``Authorization`` to your request with your GitHub token
  
``
 curl -v -H "Authorization: YOUR-GITHUB-TOKEN" "https://links.vizydrop.com/github/vizydrop"  
``
## API


#### GET: /me 
Retrieve stats of repositories where you are added as collaborator 

``
curl "https://links.vizydrop.com/github/me?token=YOUR-GITHUB-TOKEN" 
``

#### GET: /:organization
Retrieve stats of repositories by organization 
- ``:organization`` is organization at github.

``
curl "https://links.vizydrop.com/github/vizydrop?token=YOUR-GITHUB-TOKEN" 
``
 
#### GET: /:owner/:repository
Retrieve stats of concrete repository 
- ``:owner`` is user or organization at github
- ``:repository`` is name of the repository

``
curl "https://links.vizydrop.com/github/vizydrop/github-data-link?token=YOUR-GITHUB-TOKEN" 
``
 
#### GET: /:organization/team/:team
Retrieve stats of repositories by team 
- ``:organization`` is organization at github. For example ``vizydrop`` 
- ``:team`` is team name or slug at github. For example ``core`` 

``
curl "https://links.vizydrop.com/github/vizydrop/team/core?token=YOUR-GITHUB-TOKEN" 
``

## App Source Code and Docker Image

- Source Code: [https://github.com/vizydrop/github-data-link](https://github.com/vizydrop/github-data-link)
- Docker Image: vizydrop/github-data-link