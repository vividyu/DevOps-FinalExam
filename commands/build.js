const chalk = require('chalk');
const path = require('path');
const child = require('child_process');
const yaml = require('js-yaml');
const fs = require('fs');
const Connector = require('infra.connectors');
const env = require('dotenv');
const envPath = path.join(path.dirname(require.main.filename), '.env');
const testflag = false //set to true if u wanna test without running shell

exports.command = 'build <jobname> <ymlfile>';
exports.desc = 'Usage: pipeline build [job-name] [yaml-file]';
exports.builder = yargs => {
    yargs.options({
    });
};

const getDotenv = () => {
    return env.config({ path: envPath });
}

async function exec(conn, cmd) {
    var response = await conn.exec(cmd);
    if (response.stderr) {
        console.log(`Error executing command: ${cmd}`);
        console.log(response);
    }
}

async function sshrun(conn, cmd, isSilent) {
    if (isSilent == true) {
        await exec(conn, cmd);
    } else {
        await conn.stream(cmd);
    }

}

function pad2(n) {
    return n < 10 ? '0' + n : n
}

function print_time() {
    date = new Date();
    return (date.getFullYear().toString() + pad2(date.getMonth() + 1) + pad2(date.getDate()) + pad2(date.getHours()) + pad2(date.getMinutes()) + pad2(date.getSeconds()));
}

const writefile = (filepath, content, NewLine) => {
    if (NewLine == true) {
        content = content + '\n';
    }
    fs.writeFileSync(filepath, content, { encoding: "utf8", flag: "a+" })
}

function ParseGitURL(url) {
    try {
        // read and parse .env file
        ncsu_gh_user = JSON.stringify(getDotenv().parsed.NCSU_GIT_USER, null, 3).toString().replace(/["]+/g, '');
        ncsu_gh_token = JSON.stringify(getDotenv().parsed.NCSU_GIT_TOKEN, null, 3).toString().replace(/["]+/g, '');
        priv_gh_user = JSON.stringify(getDotenv().parsed.PRIV_GIT_USER, null, 3).toString().replace(/["]+/g, '');
        priv_gh_token = JSON.stringify(getDotenv().parsed.PRIV_GIT_TOKEN, null, 3).toString().replace(/["]+/g, '');

        s = url;
        s = s.replace(/.git+$/, '');
        s = s.substring(s.indexOf('github'), s.lastIndexOf(''));

        rawurl = s;
        dirname = rawurl.substring(rawurl.lastIndexOf('/') + 1, rawurl.lastIndexOf(''));
        rm_cmd = `rm -rf ${dirname}`;
        if (rawurl.includes('github.ncsu.edu')) {
            clone_cmd = `git clone https://${ncsu_gh_user}:${ncsu_gh_token}@${rawurl}.git`;
        } else {
            clone_cmd = `git clone https://${priv_gh_user}:${priv_gh_token}@${rawurl}.git`;
        }

        return [rm_cmd, clone_cmd];

    } catch (err) {
        console.log(chalk.red(err.message));
    }
}

function ParseBuild(yml_steps) {
    try {
        for (const s of yml_steps) {
            if (s.url != undefined) { //yml.jobs.steps.url
                const [rm_cmd, clone_cmd] = ParseGitURL(s.url);
                writefile(tmp_sh, rm_cmd, true);//delete previous github directory
                writefile(tmp_sh, clone_cmd, true);//git clone
                cmd_count += 2;
            } else if (s.run != undefined) { //yml.jobs.steps.run
                //console.log(chalk.yellow(s.run)); //for test: print yml.jobs.steps.run
                writefile(tmp_sh, s.run, true);
                cmd_count++;
            }
        }
        return cmd_count;

    } catch (err) {
        console.log(chalk.red(err.message));
    }
}

function ParseMutationCoverage(yml_steps) {
    try {
        let iterations = 0;
        let snapshots_args = "";

        for (const s of yml_steps) {
            if (s.url != undefined) { //yml.jobs.steps.url
                const [rm_cmd, clone_cmd] = ParseGitURL(s.url);
                writefile(tmp_sh, rm_cmd, true);//delete previous github directory
                writefile(tmp_sh, clone_cmd, true);//git clone
                cmd_count += 2;
            } else if (s.mutation != undefined) { //yml.jobs.steps.mutation
                iterations = s.mutation.iterations;
                //console.log(chalk.yellow(iterations)); //for test
                for (const snapshot of s.mutation.snapshots) {
                    snapshots_args = snapshots_args + snapshot + " ";
                    //console.log(chalk.yellow(snapshot)); //for test
                }
            } else if (s.run != undefined) { //yml.jobs.steps.run
                //console.log(chalk.yellow(s.run)); //for test
                writefile(tmp_sh, s.run, true);
                cmd_count++;
            }
        }
        //run /home/vagrant/TestHarness/index.js
        let snapshot_cmd = "";
        snapshot_cmd = `node index.js ${iterations} ${snapshots_args}`;
        //console.log(chalk.blue(snapshot_cmd)); //for test
        writefile(tmp_sh, snapshot_cmd, true);

        return cmd_count;

    } catch (err) {
        console.log(chalk.red(err.message));
    }
}

function ParseYmlToShell(jobname, ymlpath) {
    try {
        cur_time = print_time()
        tmp_sh_name = "tmp" + cur_time.toString() + ".sh";
        tmp_sh = path.resolve("tmp/" + tmp_sh_name);
        //console.log(chalk.keyword('hotpink')(tmp_sh_name));
        //console.log(chalk.keyword('hotpink')(tmp_sh));

        if (!fs.existsSync('./tmp')) {
            fs.mkdirSync('./tmp');
        }

        // write shell header
        writefile(tmp_sh, "##!/bin/bash", true);

        const ymlcontent = yaml.load(fs.readFileSync(ymlpath, 'utf8'));
        console.log(chalk.bgBlue("It might take 3~10 min to run the whole process..."));

        const ymlsetup = ymlcontent.setup
        const ymljobs = ymlcontent.jobs

        //parse yml.setup and write to a shell file
        writefile(tmp_sh, "#Setup", true);
        for (const s of ymlsetup) {
            if (s.cmd != undefined) {
                for (const c of s.cmd) {
                    //console.log(chalk.green(c)); //for test: print yml.setup.cmd
                    writefile(tmp_sh, c, true);
                }
            }
        }

        //parse yml.jobs and write to a shell file
        cmd_count = 0;
        console.log(chalk.yellow("Current job: " + jobname)); //for test: print <jobname>
        writefile(tmp_sh, `#${jobname}`, true);
        for (const j of ymljobs) {
            if (jobname != j.name) { //only parse yml.jobs.steps when yml.jobs.name == <jobname>
                continue;
            }
            console.log(chalk.yellow("Job [" + j.name + "] is found in yml file, starting to parse...")); //for test: print yml.jobs.name
            if (j.steps != undefined) { //yml.jobs.steps
                switch (jobname) {
                    case 'a special build job':
                        //call your special func here
                        break;
                    case 'mutation-coverage':
                        cmd_count = ParseMutationCoverage(j.steps);
                        break;
                    default:
                        cmd_count = ParseBuild(j.steps);
                        break;
                }
            }

        }

        //clean up tmp shell on vm
        writefile(tmp_sh, "#cleanup previous shell scripts", true);
        writefile(tmp_sh, `cd /home/vagrant && ls tmp*.sh | grep -v ${tmp_sh_name} | xargs rm -f {}`, true);

        //terminate node process and exit
        writefile(tmp_sh, "#Terminate shell script", true);
        writefile(tmp_sh, `pkill -9 -f node`, true);
        writefile(tmp_sh, `exit 0`, true);

        //return null if jobname is wrong or no commands are defined
        if (cmd_count < 1) {
            throw new Error(`There is no defined command of job: ${jobname}.`);
        } else {
            console.log(chalk.green(`Num of parsed commands: ${cmd_count}`));
        }

        return tmp_sh_name

    } catch (err) {
        console.log(chalk.red(err.message));
        return null;
    }
}

exports.handler = async argv => {
    /*The destructuring assignment syntax is a JavaScript expression
    that makes it possible to unpack values from arrays, or properties from objects, into distinct variables*/
    const { processor, jobname, ymlfile } = argv;
    ymlpath = path.resolve("build/" + ymlfile);

    //check necessary configs in .env
    //check_env_build(); //integrate to dep.js

    //create temp dir
    if (!fs.existsSync('./tmp')) {
        fs.mkdirSync('./tmp');
    }

    ssh_key = JSON.stringify(getDotenv().parsed.SSH_PRIVATE_KEY, null, 3).toString().replace(/["]+/g, '');
    //console.log(chalk.keyword('hotpink')(ssh_key));
    ssh_port = JSON.stringify(getDotenv().parsed.SSH_PORT, null, 3).toString().replace(/["]+/g, '');
    //console.log(chalk.keyword('hotpink')(ssh_port));


    let conn = Connector.getConnector('ssh', `vagrant@127.0.0.1:${ssh_port}`, { privateKey: ssh_key });

    if (fs.existsSync(ymlpath)) {
        try {
            tmp_sh = ParseYmlToShell(jobname, ymlpath);
            if (tmp_sh == null) {
                process.exit();
            }

            if (!testflag) {
                local_tmp_sh = path.resolve("tmp/" + tmp_sh);
                conn.scp(local_tmp_sh, `~/${tmp_sh}`); //copy local tmp shell to vm
                await exec(conn, `sudo chmod +x ~/${tmp_sh}`);//grant x permission to tmp shell on vm
                await conn.stream(`sudo ~/${tmp_sh}`);//execute shell on vm and stream output to local machine
                fs.unlinkSync(local_tmp_sh);//delete local tmp shell
            }
        } catch (err) {
            console.log(chalk.red(err.message));
        }
    } else {
        console.log(chalk.bgRed("Error: " + ymlpath + " doesn't exist"));
        process.exit();
    }

};