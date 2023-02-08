# Milestone 2 - Test+Analysis 

In this milestone, we created a testing analysis that mixes several techniques to analyze the mutation coverage of a test suite.

The test suite includes the following test markdown files:
- test/resources/long.md
- test/resources/survey.md
- test/resources/upload.md
- test/resources/variations.md

## Pre-requisites on local machine

1. Nodejs 16.14.0 LTS is recommended, note that the latest version 17.x.x will fail on MacOS.
2. VirtualBox should be installed.
3. bakerx should be installed.

## Use

#### 1. `cd` into project directory `/DEVOPS-33`
```
npm install
```
#### 2. Create your own `.env` file under `/DEVOPS-33` using below template
```
NCSU_GIT_USER=example_ncsu_git_user
NCSU_GIT_TOKEN=example_ncsu_git_token
PRIV_GIT_USER=example_private_git_user
PRIV_GIT_TOKEN=example_private_git_token
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
#### 4. Automatically configure a build environment for iTrust2-v10 (M1)
```
pipeline build itrust-build build.yml
```
or
```
node index.js build itrust-build build.yml
```
#### 5. Trigger the mutation coverage build job and wait for output
```
pipeline build mutation-coverage build.yml
```
or
```
node index.js build mutation-coverage build.yml
```
You should expect report log output like these:
![mcsuccess](/img-folder/mcsuccess.png)
![mcfail](/img-folder/mcfail.png)
![mcstat](/img-folder/mcstat.png)

## Results

The snapshots will be saved to:

```
/DEVOPS-33/mutation/${datetime}/snapshot_base/
/DEVOPS-33/mutation/${datetime}/snapshots_TBD/
```
The running log will be saved to:

```
/DEVOPS-33/runlog/mutation/runlog${datetime}.log
```

A runlog file with 1000 iterations can be found here: [/runlog/mutation](/runlog/mutation)

Also, all the snapshots have been uploaded:

Snapshots Link: https://drive.google.com/file/d/1_VEztqJ-Ct5R7RaM85dGFeidnAvUnVGh/view?usp=sharing


## Work completed
* Generated the initial baseline snapshots of the test suite.
* Implemented multiple mutation operations, such as conditional boundary mutations, conditional expression mutation, constant Replacement, etc.
* Created a test harness that allows the team to run service with mutated code using mutation operator, obtain snapshots of mutated code for comparison, and then determine if there is any difference.
* Calculated the mutation coverage.
* Added a mutation-coverage build job to the build.yml.

## Screencast

Link: https://drive.google.com/file/d/1HetNfUdpDOzJ7HAEC94YWeIsDbnub8Lc/view?usp=sharing
