# GitHub stats link app
Stats related to weekly contributions to GitHub repositories
 
## Authentication
App is required to be authenticated to GitHub api in order to retrieve stats about repositories. You need to provide your personal authentication token from GitHub. GitHub personal token can generated at https://github.com/settings/tokens

#### Request Query String Parameter
#### ``http://<app host>?token=YOUR-GITHUB-TOKEN``
Attach ``token`` parameter with your GitHub personal token to query string

#### Request Header

#### Header: ``Authorization: token YOUR-GITHUB-TOKEN``  
Attach authorization header ``Authorization`` to your request in the following format ``token YOU-GITHUB-TOKEN`` 

## API

#### Retrieve stats of repositories where you are added as collaborator
#### ``GET: http://<app host>/``

#### Retrieve stats of repositories by organization
#### ``GET: http://<app host>/:organization`` 
- ``:organization`` is organization at github. For example ``vizydrop`` 

#### Retrieve stats of concrete repository 
#### ``GET: http://<app host>/:owner/:repository`` 
- ``:owner`` is user or organization at github
- ``:repository`` is name of the repository

#### Retrieve stats of repositories by team 
#### ``GET: http://<app host>/:organization/team/:team`` 
- ``:organization`` is organization at github. For example ``vizydrop`` 
- ``:team`` is team name or slug at github. For example ``core`` 