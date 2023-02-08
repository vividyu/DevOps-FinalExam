const chalk = require('chalk');
const path = require('path');
const os = require('os');
const child = require('child_process');
const bakerxYML = path.join(path.dirname(require.main.filename), 'bakerx.yml');
const yaml = require('js-yaml');
const fs = require('fs');
const envPath = path.join(path.dirname(require.main.filename), '.env');

exports.command = 'init';
exports.desc = 'Prepare tool';
exports.builder = yargs => {
    yargs.options({
    });
};

async function getFirstLine(filePath) {
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    return (fileContent.match(/(^.*)/) || [])[1] || '';
}

exports.handler = async argv => {
    const { processor } = argv;
    console.log(chalk.green("Preparing computing environment..."));

    //provisioning vm via bakerx
    let cmd = `bakerx run`;
    try {
        child.execSync(cmd, { stdio: ['inherit', 'inherit', 'inherit'] });
        //console.log(chalk.yellow("comment cmd && comment out this line for testing..."));
    } catch (err) {
        console.log(chalk.red(err.message));
    }

    try {
        //create temp dir
        if (!fs.existsSync('./tmp')) {
            fs.mkdirSync('./tmp');
        }
        //create deploy dir
        if (!fs.existsSync('./deploy')) {
            fs.mkdirSync('./deploy');
        }
        
        const doc = yaml.load(fs.readFileSync(bakerxYML, 'utf8'));
        console.log(chalk.hex('#FFA500')("VM IP: " + doc.ip));
        console.log(chalk.hex('#FFA500')("VM user: vagrant"));

        //write current vm's port to a tmp file
        tmpfilepath = "./tmp/cur_port.conf";
        let getVM_port = `vboxmanage showvminfo ${doc.name}|grep "guest port = 22"|awk -F'host port =' ' { print $NF } '|awk -F',' '{print $1}'`
        child.execSync(getVM_port + " > " + tmpfilepath, { encoding: 'utf8', stdio: 'inherit' });

        //read the tmp file
        sshport = (await getFirstLine(tmpfilepath)).toString().replace(/\s/g, "");
        console.log(chalk.hex('#FFA500')("Current SSH port forwarding: 22->" + sshport));

        //update port value in .env

        //write_port_cmd = `sed -i '/SSH_PORT/c\SSH_PORT=${sshport}' ${envPath}`
        //child.execSync(write_port_cmd, { encoding: 'utf8', stdio: 'inherit' });

        fs.readFile(envPath, 'utf8', function (err, data) {
            var formatted = data.replace(/^SSH_PORT(.*)$/mg, `SSH_PORT=${sshport}`);
            fs.writeFile(envPath, formatted, 'utf8', function (err) {
                if (err) return console.log(err);
            });
        });

    } catch (err) {
        console.log(chalk.red(err.message));
    }


};
