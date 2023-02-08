# Milestone 1 - 🛠️ Build 

[Checkpoint Report](https://github.ncsu.edu/CSC-DevOps-S22/DEVOPS-33/blob/main/reports/CHECKPOINT-M1.md) - March 2nd

## Tasks

* Automatically provision and configure a build server.
* Create a build job specification.
* Automatically configure a build environment for given build job specification. 

## Pre-requisites on local machine

1. Nodejs 16.14.0 LTS is recommended, note that the latest version 17.x.x will fail on MacOS.
2. VirtualBox should be installed.
3. bakerx should be installed.

## Use
#### 1. `cd` into project directory `/DEVOPS-33`, then
```
npm i
npm link
```
#### 2. Create your own `.env` file under `/DEVOPS-33` using below template. (`.env` file is ignored and won't be committed)  
```
NCSU_GIT_USER=example_ncsu_git_user
NCSU_GIT_TOKEN=example_ncsu_git_token
SSH_PRIVATE_KEY=~/.bakerx/insecure_private_key
SSH_PORT=2002 
```

#### 3. Provision and configure computing environment for pipeline:
```
pipeline init
```
or
```
node index.js init
```
#### 4. Automatically configure a build environment for iTrust2-v10
```
pipeline build itrust-build build.yml
```
or
```
node index.js build itrust-build build.yml
```
You should expect an output like this:
![testres](/img-folder/testres.png)

## Issues
 * [VirtualBox IP range restriction](https://github.ncsu.edu/CSC-DevOps-S22/DEVOPS-33/blob/main/reports/CHECKPOINT-M1.md#issues-we-ran-into)

## Screencast

Link: https://drive.google.com/file/d/1Ygg7Xdq0SvCDAu1TMeKEdYgTR-MCVzMX/view?usp=sharing

## Things we learned
* This milestone allowed us to get familiar with Maven, a software project management and comprehension tool.
* We also learned how to configure MySQL on ubuntu machines.
* We are now able to use the GitHub projects board to organize and prioritize our tasks and create customized workflows for our team.
* We learned how to read and parse the given YAML file, and then install the necessary environment within the build environment to perform build steps in that build environment.
