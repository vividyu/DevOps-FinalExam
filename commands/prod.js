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
const testflag = false //set to true if u wanna test without running shell

exports.command = 'prod <option> [id]';
exports.desc = 'Usage: node index.js prod <option> [id]';
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

// Retrieve our api token from the .env file
var config = {};
config.token = priv_gh_token = JSON.stringify(getDotenv().parsed.DO_TOKEN, null, 3).toString().replace(/["]+/g, '');
//console.log(chalk.green(`Your token is: ${config.token}`)); //for test

// Configure our headers to use our token when making REST api requests.
const headers =
{
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + config.token
};


class DigitalOceanProvider {
    async listRegions() {
        let response = await axios.get('https://api.digitalocean.com/v2/regions', { headers: headers })
            .catch(err => console.error(`listRegions ${err}`));

        if (!response) return;

        //console.log( response.data );

        if (response.data.regions) {
            for (let region of response.data.regions) {
                if (region.available == true) {
                    console.log(region.slug);
                }

            }
        }

        if (response.headers) {
            console.log(chalk.yellow(`Calls remaining ${response.headers["ratelimit-remaining"]}`));
        }
    }

    async listImages() {
        // HINT: Add this to the end to get better filter results: ?type=distribution&per_page=100
        let response = await axios.get('https://api.digitalocean.com/v2/images?type=distribution&per_page=100', { headers: headers })
            .catch(err => console.error(`listImages ${err}`));

        if (!response) return;

        //console.log( response.data );

        if (response.data.images) {
            for (let image of response.data.images) {
                console.log(image.slug);
            }
        }

    }

    async createDroplet(cur_time, region, imageName, InventoryPath, PubID, PubFingerprint, Type) {
        if (cur_time == "" || region == "" || imageName == "" || Type == "") {
            console.log(chalk.red("You must provide non-empty parameters for createDroplet!"));
            return;
        }

        var ssh_keys = [];
        ssh_keys.push(Number(PubID));
        ssh_keys.push(PubFingerprint);
        var fullname = `${cur_time}${Type}`;

        var data =
        {
            "name": fullname,
            "region": region,
            "size": "s-1vcpu-1gb",
            "image": imageName,
            "ssh_keys": ssh_keys,
            "backups": false,
            "ipv6": false,
            "user_data": null,
            "private_networking": null
        };

        console.log("Attempting to create: " + JSON.stringify(data));
        //console.log(headers);

        let response = await axios.post("https://api.digitalocean.com/v2/droplets",
            data,
            {
                headers: headers,
            }).catch(err =>
                console.error(chalk.red(`createDroplet ${Type}: ${err}`))
            );

        if (!response) return;

        console.log(response.status);
        console.log(response.data);

        if (response.status == 202) {
            console.log(chalk.green(`Created droplet id ${response.data.droplet.id}`));

            //output the newest droplet info to inventory file
            //Note: For each time prod up, the inventory file will be overwritten
            writefile(InventoryPath, `${Type}_DO_ID=${response.data.droplet.id}`, true);
            writefile(InventoryPath, `${Type}_DO_NAME=${fullname}`, true);
            writefile(InventoryPath, `${Type}_DO_REGION=${region}`, true);
            writefile(InventoryPath, `${Type}_DO_IMAGE=${imageName}`, true);
        }
    }

    async dropletInfo(id, writeflag = false, Type = null) {
        if (typeof id != "number") {
            console.log(chalk.red("You must provide an integer id for your droplet!"));
            return;
        }

        // Make REST request
        let response = await axios.get('https://api.digitalocean.com/v2/droplets/' + id, { headers: headers })
            .catch(err => console.error(`dropletInfo ${err}`));

        if (!response) return;

        if (response.data.droplet) {
            let droplet = response.data.droplet;
            console.log(chalk.blue("The IP of your droplet is: ") + droplet.networks.v4[0].ip_address);
            if (writeflag && Type != null) {
                console.log(chalk.blue("Writing to inventory file..."));
                writefile(InventoryPath, `${Type}_DO_IP=${droplet.networks.v4[0].ip_address}`, true);
            }

            // Print out IP address
        }

    }

    async deleteDroplet(id) {
        if (typeof id != "number") {
            console.log(chalk.red("You must provide an integer id for your droplet!"));
            return;
        }

        // HINT, use the DELETE verb.
        let response = await axios.delete('https://api.digitalocean.com/v2/droplets/' + id, { headers: headers })
            .catch(err => console.error(`deleteDroplet ${err}`));

        if (!response) return;

        // No response body will be sent back, but the response code will indicate success.
        // Specifically, the response code will be a 204, which means that the action was successful with no returned body data.
        if (response.status == 204) {
            console.log(`Deleted droplet ${id}`);
        }

    }

    async listDroplets() {
        let response = await axios.get('https://api.digitalocean.com/v2/droplets', { headers: headers })
            .catch(err => console.error(`listDroplets ${err}`));

        if (!response) return;

        //console.log( response.data );

        if (response.data.droplets) {
            for (let droplets of response.data.droplets) {
                console.log(`id=${droplets.id} name=${droplets.name}`);
            }
        }

        if (response.headers) {
            console.log(chalk.yellow(`Calls remaining ${response.headers["ratelimit-remaining"]}`));
        }
    }

    async listSSHKeys() {
        let response = await axios.get('https://api.digitalocean.com/v2/account/keys', { headers: headers })
            .catch(err => console.error(`listSSHKeys ${err}`));

        if (!response) return;

        console.log(response.data);

        if (response.data.ssh_keys) {
            for (let ssh_keys of response.data.ssh_keys) {
                //console.log(ssh_keys.public_key); //print response.data is enough
            }
        }

        if (response.headers) {
            console.log(chalk.yellow(`Calls remaining ${response.headers["ratelimit-remaining"]}`));
        }

    }

    async Waitdroplet(id) {
        if (typeof id != "number") {
            console.log(chalk.red("You must provide an integer id for your droplet!"));
            return;
        }
        //query for the 1st time
        let status = 'new';
        let response = await axios.get('https://api.digitalocean.com/v2/droplets/' + id, { headers: headers })
            .catch(err => console.error(`dropletInfo ${err}`));

        if (!response) return;

        if (response.data.droplet) {
            let droplet = response.data.droplet;
            status = droplet.status;
        }

        let max_loop = 20;
        let max_time = max_loop * 5;
        console.log(chalk.green(`Max query time set to ${max_time} seconds`));
        while (status != 'active') {
            // Make REST request
            let response = await axios.get('https://api.digitalocean.com/v2/droplets/' + id, { headers: headers })
                .catch(err => console.error(`dropletInfo ${err}`));

            if (!response) return;

            if (response.data.droplet) {
                let droplet = response.data.droplet;
                status = droplet.status;
                if (status == 'active') {
                    break;
                }
                console.log(chalk.green(`Checking status every 5 seconds until droplet [${id}] is ready. Current status = `) + droplet.status);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            max_loop--;

            if (max_loop < 1) {
                throw new Error(`Waitdroplet Time out`);
            }
        }
        console.log(chalk.green(`droplet [${id}] is active!`));

    }

};

exports.handler = async argv => {
    try {
        const { processor, option, id } = argv;
        let client = new DigitalOceanProvider();

        switch (option) {
            case 'up':
                const cur_time = print_time();
                //const dropletName = `DO${cur_time}`;
                const region = JSON.stringify(getDotenv().parsed.DO_REGION, null, 3).toString().replace(/["]+/g, '');
                const imageName = JSON.stringify(getDotenv().parsed.DO_IMAGE, null, 3).toString().replace(/["]+/g, '');
                const PubID = JSON.stringify(getDotenv().parsed.DO_PUB_ID, null, 3).toString().replace(/["]+/g, '');
                const PubFingerprint = JSON.stringify(getDotenv().parsed.DO_PUB_FINGERPRINT, null, 3).toString().replace(/["]+/g, '');

                //backup and delete the previous inventory file
                if (fs.existsSync(InventoryPath)) {
                    child.execSync(`mv ${InventoryPath} ${InventoryPath}.${cur_time}.previous`, { encoding: 'utf8', stdio: 'inherit' });
                    child.execSync(`touch ${InventoryPath}`, { encoding: 'utf8', stdio: 'inherit' });
                } else {
                    child.execSync(`touch ${InventoryPath}`, { encoding: 'utf8', stdio: 'inherit' });
                }

                //create blue environment
                await client.createDroplet(cur_time, region, imageName, InventoryPath, PubID, PubFingerprint, "BLUE");
                blue_do_id = JSON.stringify(getInventory().parsed.BLUE_DO_ID, null, 3).toString().replace(/["]+/g, '');
                //console.log(chalk.yellow(`Hints: low provisioning interval may cause error: ip undefined`));
                await new Promise(resolve => setTimeout(resolve, 1500));//delay 1.5s
                await client.Waitdroplet(Number(blue_do_id));
                await client.dropletInfo(Number(blue_do_id), true, "BLUE");

                //delay 1 s
                await new Promise(resolve => setTimeout(resolve, 1000));

                //create green environment
                await client.createDroplet(cur_time, region, imageName, InventoryPath, PubID, PubFingerprint, "GREEN");
                green_do_id = JSON.stringify(getInventory().parsed.GREEN_DO_ID, null, 3).toString().replace(/["]+/g, '');
                //console.log(chalk.yellow(`Hints: low provisioning interval may cause error: ip undefined`));
                await new Promise(resolve => setTimeout(resolve, 1500));//delay 1.5s
                await client.Waitdroplet(Number(green_do_id));
                await client.dropletInfo(Number(green_do_id), true, "GREEN");

                break;
            case 'del':
                if (id == undefined) {
                    throw new Error(`You must input a valid droplet ID`);
                }
                await client.deleteDroplet(id);
                break;
            case 'ld':
                await client.listDroplets();
                break;
            case 'lr':
                await client.listRegions();
                break;
            case 'limg':
                await client.listImages();
                break;
            case 'ip':
                if (id == undefined) {
                    throw new Error(`You must input a valid droplet ID`);
                }
                await client.dropletInfo(Number(id));
                break;
            case 'lssh':
                await client.listSSHKeys();
                break;
            case 'status':
                if (id == undefined) {
                    throw new Error(`You must input a valid droplet ID`);
                }
                await client.Waitdroplet(Number(id));
                break;
            case 'blue':
                do_ip = JSON.stringify(getInventory().parsed.BLUE_DO_IP, null, 3).toString().replace(/["]+/g, '');
                let bluekey = JSON.stringify(getDotenv().parsed.DO_PRIVATE_KEY, null, 3).toString().replace(/["]+/g, '');
                let sshblue = `ssh -q -i "${bluekey}" -p 22 -o StrictHostKeyChecking=no root@${do_ip}`;
                console.log(`Connecting with ${sshblue}`);
                child.execSync(sshblue, { stdio: ['inherit', 'inherit', 'inherit'] });
                break;
            case 'green':
                do_ip = JSON.stringify(getInventory().parsed.GREEN_DO_IP, null, 3).toString().replace(/["]+/g, '');
                let greenkey = JSON.stringify(getDotenv().parsed.DO_PRIVATE_KEY, null, 3).toString().replace(/["]+/g, '');
                let sshgreen = `ssh -q -i "${greenkey}" -p 22 -o StrictHostKeyChecking=no root@${do_ip}`;
                console.log(`Connecting with ${sshgreen}`);
                child.execSync(sshgreen, { stdio: ['inherit', 'inherit', 'inherit'] });
                break;
            case 'scp':
                if (id == undefined) {
                    throw new Error(`You must input a valid droplet IP address`);
                }
                do_ip = id;
                sshkey = JSON.stringify(getDotenv().parsed.DO_PRIVATE_KEY, null, 3).toString().replace(/["]+/g, '');
                let conn = Connector.getConnector('ssh', `root@${do_ip}:22`, { privateKey: sshkey });
                const warfile = path.resolve("deploy/" + "iTrust2-10.war");
                const tomcatservice = path.resolve("deploy/" + "tomcat.service");
                const tomcatuserxml = path.resolve("deploy/" + "tomcat-users.xml");
                console.log(chalk.yellow(warfile));
                console.log(chalk.yellow(tomcatservice));
                console.log(chalk.yellow(tomcatuserxml));
                //conn.scp(warfile, `/opt/tomcat/latest/webapps/`);
                conn.scp(warfile, `~`);
                conn.scp(tomcatservice, `~`);
                conn.scp(tomcatuserxml, `~`);

                break;
            default:
                throw new Error(`Sorry, there is no option for [${option}]`);
        }
    } catch (err) {
        console.log(chalk.red(err.message));
        process.exit();
    }
};