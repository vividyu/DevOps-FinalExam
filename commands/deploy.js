const chalk = require('chalk');
const path = require('path');
const child = require('child_process');
const yaml = require('js-yaml');
const fs = require('fs');
const Connector = require('infra.connectors');
const env = require('dotenv');
const envPath = path.join(path.dirname(require.main.filename), '.env');
const InventoryPath = path.join(path.dirname(require.main.filename), 'inventory');
const axios = require("axios");
const testflag = true //set to true if u wanna test without running shell

exports.command = 'deploy <inventory> <jobname> <ymlfile>';
exports.desc = 'Usage: pipeline deploy [inventory-file] [job-name] [yaml-file]';
exports.builder = yargs => {
    yargs.options({
    });
};

const getDotenv = () => {
    return env.config({ path: envPath });
}

const getInventory = () => {
    return env.config({ path: InventoryPath });
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

function ParseDeploy(yml_steps) {
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

function ParseYmlToShell(jobname, ymlpath) {
    try {
        cur_time = print_time()
        tmp_sh_name = "tmp" + cur_time.toString() + ".sh";
        tmp_sh = path.resolve("deploy/" + tmp_sh_name);

        if (!fs.existsSync('./tmp')) {
            fs.mkdirSync('./tmp');
        }
        if (!fs.existsSync('./deploy')) {
            fs.mkdirSync('./deploy');
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
                    case 'special':
                        //cmd_count = ParseDeploy(j.steps);
                        //you can add special parse function for some app
                        break;
                    default:
                        cmd_count = ParseDeploy(j.steps);
                        break;
                }
            }

        }

        //clean up tmp shell on vm
        writefile(tmp_sh, "#cleanup previous shell scripts", true);
        writefile(tmp_sh, `cd ~ && ls tmp*.sh | grep -v ${tmp_sh_name} | xargs rm -f {}`, true);

        //terminate node process and exit
        //no need in deploy
        /*
        writefile(tmp_sh, "#Terminate shell script", true);
        writefile(tmp_sh, `pkill -9 -f node`, true);
        writefile(tmp_sh, `exit 0`, true);
        */

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
    try {
        const { processor, inventory, jobname, ymlfile } = argv;
        const checkinventory = path.join(path.dirname(require.main.filename), inventory);
        //const warfile = path.resolve("deploy/" + "iTrust2-10.war");
        //console.log(chalk.yellow(`taget war file: ${warfile}`));
        //const tomcatservice = path.resolve("deploy/" + "tomcat.service");
        //const tomcatuserxml = path.resolve("deploy/" + "tomcat-users.xml");
        const ymlpath = path.resolve("build/" + ymlfile);
        const deploystrategy = JSON.stringify(getDotenv().parsed.DEPLOY_STRAT, null, 3).toString().replace(/["]+/g, '');
        //const deploydir = JSON.stringify(getDotenv().parsed.DEPLOY_DIR, null, 3).toString().replace(/["]+/g, '');
        const deploysrc = path.resolve("deploy/" + jobname);
        /*
                if (!fs.existsSync(warfile)) {
                    throw new Error(`WAR file: ${warfile} does not exist!`);
                }
                if (!fs.existsSync(tomcatservice)) {
                    throw new Error(`${tomcatservice} does not exist!`);
                }
                if (!fs.existsSync(tomcatuserxml)) {
                    throw new Error(`${tomcatuserxml} does not exist!`);
                }
        */
        if (!fs.existsSync(ymlpath)) {
            throw new Error(`${ymlpath} does not exist!`);
        }
        if (!fs.existsSync(deploysrc)) {
            fs.mkdirSync(deploysrc, { recursive: true });
        }
        console.log(chalk.magenta(`Check your deploy src files in ${deploysrc}:`));
        child.execSync(`ls ${deploysrc}`, { stdio: ['inherit', 'inherit', 'inherit'] });

        //parse yml file
        tmp_sh = ParseYmlToShell(jobname, ymlpath);
        if (tmp_sh == null) {
            throw new Error(`ParseYmlToShell() error!`);
        }

        if (deploystrategy.toLowerCase() == 'blue-green') {
            if (!fs.existsSync(checkinventory)) {
                throw new Error(`Inventory file: ${checkinventory} does not exist!`);
            }

            local_tmp_sh = path.resolve("deploy/" + tmp_sh);
            const sshkey = JSON.stringify(getDotenv().parsed.DO_PRIVATE_KEY, null, 3).toString().replace(/["]+/g, '');
            const do_ip_green = JSON.stringify(getInventory().parsed.GREEN_DO_IP, null, 3).toString().replace(/["]+/g, '');
            const do_ip_blue = JSON.stringify(getInventory().parsed.BLUE_DO_IP, null, 3).toString().replace(/["]+/g, '');

            let connGreen = Connector.getConnector('ssh', `root@${do_ip_green}:22`, { privateKey: sshkey });
            let connBlue = Connector.getConnector('ssh', `root@${do_ip_blue}:22`, { privateKey: sshkey });

            console.log(chalk.green("===========Deploying on green environment==========="));
            connGreen.scp(local_tmp_sh, `~/${tmp_sh}`); //copy local tmp shell to green
            connGreen.scp(deploysrc, `~/`);//copy all files in /deploy/xxx to green
            await new Promise(resolve => setTimeout(resolve, 5000));//delay 5s for scp finish
            await exec(connGreen, `sudo chmod +x ~/${tmp_sh}`);//grant x permission to tmp shell on green
            await connGreen.stream(`sudo ~/${tmp_sh}`);//execute shell on green and stream output to local machine
            console.log(chalk.green("===========Green done!==========="));

            console.log(chalk.blue("===========Deploying on blue environment==========="));
            connBlue.scp(local_tmp_sh, `~/${tmp_sh}`); //copy local tmp shell to blue
            connBlue.scp(deploysrc, `~/`);//copy all files in /deploy/xxx to blue
            await new Promise(resolve => setTimeout(resolve, 5000));//delay 5s for scp finish
            await exec(connBlue, `sudo chmod +x ~/${tmp_sh}`);//grant x permission to tmp shell on blue
            await connBlue.stream(`sudo ~/${tmp_sh}`);//execute shell on blue and stream output to local machine
            console.log(chalk.blue("===========Blue done!==========="));
            fs.unlinkSync(local_tmp_sh);//delete local tmp shell

        } else if (deploystrategy.toLowerCase() == 'vbox') {
            //todo
            local_tmp_sh = path.resolve("deploy/" + tmp_sh);
            ssh_key = JSON.stringify(getDotenv().parsed.SSH_PRIVATE_KEY, null, 3).toString().replace(/["]+/g, '');
            ssh_port = JSON.stringify(getDotenv().parsed.SSH_PORT, null, 3).toString().replace(/["]+/g, '');
            console.log(chalk.keyword('hotpink')("vbox method under construction"));

            fs.unlinkSync(local_tmp_sh);//delete local tmp shell

        } else {
            throw new Error(`Unknown deploy strategy: ${deploystrategy}!`);
        }


    } catch (err) {
        console.log(chalk.red(err.message));
        process.exit();
    }
};