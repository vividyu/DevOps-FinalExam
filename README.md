# Final Exam

## Pre-requisites on local machine

1. Nodejs 16.14.0 LTS is recommended, note that the latest version 17.x.x will fail on MacOS.
2. VirtualBox should be installed.
3. bakerx should be installed.
4. a **.env** file.

## Overview
The build and deploy part of final milestone is a generalized version of `M3`, application related code is removed, all configurations are integrated to `.env` and `build.yml`

Here are the two applications deployed in this milestone by two different methods:

The Lounge: https://github.com/thelounge/thelounge `Nodejs`, deploy via using Git hooks.

Medusa: https://github.com/pymedusa/Medusa `Python3`, OneStep deploy via parsing build.yml


## New Features or Stages
1. Deploy applications to `DigitalOcean` cloud instances via `Git hooks`. Use `Nginx` to forward traffic.

## Usage

### Before Start

#### 1. `cd` into project directory `/DEVOPS-33`
```
npm install
npm link
```

#### 2. Create your own `.env` file under `/DEVOPS-33` using below template:
```
NCSU_GIT_USER=your_github.ncsu.edu_user_name
NCSU_GIT_TOKEN=your_github.ncsu.edu_token__not_password__
PRIV_GIT_USER=your_github.com_user_name
PRIV_GIT_TOKEN=your_github.com_token__not_password__
SSH_PRIVATE_KEY=~/.bakerx/insecure_private_key
SSH_PORT=2002
DO_TOKEN=your_digital_ocean_api_token
DO_REGION=nyc1
DO_IMAGE=ubuntu-18-04-x64
DO_PRIVATE_KEY=~/.ssh/id_rsa
DO_PUB_ID=34379664
DO_PUB_FINGERPRINT=70:8b:2d:7a:bb:c0:32:44:b5:03:35:a0:20:db:53:df
DEPLOY_STRAT=blue-green
```
Field specification:

SSH_PRIVATE_KEY: Your **bakerx** private ssh key path.

DO_TOKEN: You can generate the token at https://cloud.digitalocean.com/account/api/tokens after registering a DigitalOcean account.

DO_REGION: You can use `node index.js prod lr` to list DigitalOcean server regions and select one.

DO_IMAGE: You can use `node index.js prod limg` to list DigitalOcean images and select one.

DO_PRIVATE_KEY: Your **PC's** private ssh key path, can be generated by `ssh-keygen`

DO_PUB_ID and DO_PUB_FINGERPRINT: Steps to set these two fields are a bit complicate:

1. Add your public SSH key (generated by `ssh-keygen` command) into your DigitalOcean account at https://cloud.digitalocean.com/account/security

2. Use `node index.js prod lssh` to list SSH keys on your DigitalOcean account. An example output:
```sh
{
  ssh_keys: [
    {
      id: 34379664,
      public_key: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC4b/otm0Tod3t072MKRnEtuzRyxfRyoB3DTVzJhqaV7MYmBhiQEbSUv/EzzKzWEoEr6+BzGzbC7whSgBRVoboV1xEQ9hXoznj6jsXdCVCsnnsisg9lm2/imd82Fe/DOhq4LjvRuhKh68ZPmpm9JwyZT+Hl/V6/jEVJBUUdr3m+baQc8x/9nioeAQ3F3pT2sawAbf0Ts0M8WhKPujHY1B1vd9g26QooA+9gbpQkAF/mwTFA6GDhmMW+2alyWGDSkAoqb0Loi2z23pse0rxzO/5hgHh+od7a2bXqWUnwXTy7YkjS8B0D4fU5t9doEJilQZNVJwJzBhA85lLziR0SdT5kHamZUl1AaHesvA74qiZSZ7SqYJ+pk++uSpMFtp5Y52O6tH7XC2j0kN0CpYMuFRM3dCvkeTJgJecI7RfJPgw0EnCzVkXRRl9CzLO6a7HyCNPhvb5SuIbwD5ImAEPKoXqh2+CosBGYJDrqu98dzKeW/8krgDJ8aUob7xxYxmcT95s= vi@Nokia9580',
      name: 'nokia',
      fingerprint: '70:8b:2d:7a:bb:c0:32:44:b5:03:35:a0:20:db:53:df'
    }
  ],
  links: { pages: {} },
  meta: { total: 1 }
}
```
Then set `id` and `fingerprint` values to **DO_PUB_ID** and **DO_PUB_FINGERPRINT** without single quotation marks. i.e., fingerprint, not 'fingerprint'

Offical Guide: https://docs.digitalocean.com/products/droplets/how-to/add-ssh-keys/to-account/

Here are some support commands to make setup easier:

`node index.js prod del <droplet_id>`: delete a droplet by id

`node index.js prod ld`: list all droplets on your DigitalOcean account

`node index.js prod lr`: list DigitalOcean server regions

`node index.js prod limg`: list DigitalOcean images

`node index.js prod ip <droplet_id>`: print the ip address of a droplet by id

`node index.js prod lssh`: list all SSH keys on your DigitalOcean account

`node index.js prod blue`: SSH connect to the blue environment

`node index.js prod green`: SSH connect to the green environment

### Deploy `The Lounge`

The Lounge is a web IRC client with sign-in and chatting UIs.

#### 1. Provision a test environment:
```
node index.js init
```
#### 2. Git clone `The Lounge` and run test on test environment automatically:
```
node index.js build thelounge-build build.yml
```
#### 3. Provisioning cloud instance

When test is passed at Step 2, continue the remaining steps.
![tltest](/img-folder/tltest.png)
```
node index.js prod up
```
#### 4. Setting git endpoints and install dependencies for `The Lounge`
```
node index.js deploy inventory thelounge-deploy build.yml
```

#### 5. Setting git remotes for `The Lounge`
Recall the private ssh key generated by `ssh-keygen`. For my computer, the path is `~/.ssh/id_rsa`

If you are using Mac or Linux:
```sh
export GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no"
```

If you are using Windows 11 and PowerShell 7 just like me:
```sh
setx GIT_SSH_COMMAND "ssh -i ~/.ssh/id_rsa" 
setx GIT_SSH "C:\Program Files\Git\usr\bin"
```

You can find **BLUE_DO_IP** and **GREEN_DO_IP** in file `/DEVOPS-33/inventory`, here is a sample of `inventory`
```
BLUE_DO_ID=298413943
BLUE_DO_NAME=20220504160304BLUE
BLUE_DO_REGION=nyc1
BLUE_DO_IMAGE=ubuntu-18-04-x64
BLUE_DO_IP=204.48.24.112
GREEN_DO_ID=298413999
GREEN_DO_NAME=20220504160304GREEN
GREEN_DO_REGION=nyc1
GREEN_DO_IMAGE=ubuntu-18-04-x64
GREEN_DO_IP=208.68.37.235
```
After setting environment variables, run the following commands in local machine:

```sh
git clone https://github.com/thelounge/thelounge.git
cd ./thelounge

git remote add blue ssh://root@BLUE_DO_IP/root/thelounge/.git
git remote add green ssh://root@GREEN_DO_IP/root/thelounge/.git
git push blue master
git push green master
```
Verify that `The Lounge` is accessible at: http://BLUE_DO_IP:9000 or http://GREEN_DO_IP:9000

### Deploy `Medusa`

Medusa is an Automatic Video Library Manager for TV Shows. It watches for new episodes of your favorite shows, and when they are posted it does its magic.

#### 1. Provision a build environment:
```
node index.js init
```
#### 2. Build `Medusa` automatically:
```
node index.js build medusa-build build.yml
```
#### 3. Provisioning cloud instance
```
node index.js prod up
```
#### 4. OneStep deploy `Medusa`
```
node index.js deploy inventory medusa-deploy build.yml
```

All done, verify that `Medusa` is accessible at: http://BLUE_DO_IP:8081 or http://GREEN_DO_IP:8081

You can find **BLUE_DO_IP** and **GREEN_DO_IP** in file `/DEVOPS-33/inventory`


## Challenges
### Finding two projects
I tried many other projects, some were really hard to deploy in limit time due to database configuration required; some were too simple while some were too 'giant' to deploy, for example, I had to terminate [Horahora](https://github.com/horahoradev/horahora)'s building after 40mins hopeless waiting.

### Using Git hooks on Windows OS
I finished the Deploy workshop on my Mac. However, when operating on a Windows desktop, things are going tough. I don't know if the code snippet: `set GIT_SSH_COMMAND=ssh -i ...` in [Deploy Workshop](https://github.com/CSC-DevOps/Deployment/blob/master/Pipeline.md) works on other version of Windows OS. Whatever, the following code works for me rather than the previous one, I think set `GIT_SSH` is the key. I spent hours to figure it out. :(
```sh
setx GIT_SSH_COMMAND "ssh -i ~/.ssh/id_rsa" 
setx GIT_SSH "C:\Program Files\Git\usr\bin"
```

### Terminating post-receive
In my post-receive implementation, there is a `yarn start` command that would hang up the execution. At first I have to use Ctrl+C to terminate it. Finally I solve it by using a tricky 'asynchronous style', here is the reference:

https://stackoverflow.com/questions/17727315/asynchronous-git-hook

## Screencast link

https://youtu.be/BfnBZcxdXiI









