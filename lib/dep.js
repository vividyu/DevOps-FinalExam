const hasbin = require("hasbin");
const child  = require("child_process");
const chalk  = require("chalk")
const path   = require("path");
const yaml = require('js-yaml');
const fs   = require('fs');

const envPath = path.join( path.dirname(require.main.filename), '.env');
const bakerxYML = path.join( path.dirname(require.main.filename), 'bakerx.yml');

const mustBin = (bin, hint) => {
    hint = hint || '';    
    if (!hasbin.sync(bin)) throw new Error(`You must have ${bin} installed to run a vm. ${hint}`);
}

const mustEnv = (env, hint) => {
    if( ! process.env.hasOwnProperty(env) ) {
        throw new Error(`You must have ${env} defined. ${hint}`);
    }
}

const checkVBox = (cmd) => {
    
    if(cmd.replace(/\s/g, "") != "init"){
        return 0
    }

    try {
        const doc = yaml.load(fs.readFileSync(bakerxYML, 'utf8'));
        let checkvm = child.execSync("VBoxManage list vms").toString();
        //console.log( chalk.red(checkvm) );
        quoted_vm = '\"' + doc.name + '\"';
        //console.log( chalk.red(quoted_vm) );

        if( checkvm.includes(quoted_vm) ){
            console.log( chalk.bgRed(`Vitual Machine [${doc.name}] already exist! The program will quit now.`) );
            console.log( chalk.bgRed(`You can use the following command to delete this vm: `) );
            console.log( chalk.bgRed(`bakerx delete vm ${doc.name}`) );
            process.exit(1);
        }else{
            console.log( chalk.bgBlue(`No existing VMs detected, continue...`) );
        }
    } catch (err) {
        console.log( chalk.red( err.message ) );
        process.exit(1);
    }
    
}


exports.check = async argv => {
    let cmd = argv._[0];

    let processor = "Intel/Amd64";

    try { 
        let output = child.execSync("uname -a").toString();
        if( output.match(/Darwin.*arm64/) ) {
            console.log( chalk.yellow("Mac M1 detected") );
            processor = "Arm64";
            mustBin("basicvm");
            //TODO:
            //checkbasicvm();
        } else {
            mustBin('VBoxManage');
            checkVBox(cmd);
        }

        let results = require('dotenv').config({path:envPath});

        if( results.error ) {
            console.log( chalk.red( "You should have a .env containing project specific environment variables" ));
            process.exit(1)        
        } else {
            //console.log( chalk.yellow(`Loaded env file:\n${JSON.stringify(results, null, 3)}`));//for test
            console.log( chalk.yellow("Pre-requisite: Load .env file successfully!"));
            //console.log( chalk.yellow(JSON.stringify(results.parsed.NCSU_GIT_TOKEN, null, 3)) );
        }
        
        // You can enforce environment variable definitions here:
        mustEnv("NCSU_GIT_USER", "Your github.ncsu.edu username should be written into .env");
        mustEnv("NCSU_GIT_TOKEN", "Your github.ncsu.edu personal access token should be written into .env, NOT Password.");
        mustEnv("PRIV_GIT_USER", "Your github.com username should be written into .env");
        mustEnv("PRIV_GIT_TOKEN", "Your github.com personal access token should be written into .env, NOT Password.");
        mustEnv("SSH_PRIVATE_KEY", "Your ssh key path should be written into .env. In this project we use bakerx's key");
        mustEnv("SSH_PORT", "A ssh port value should be written into .env");
        mustEnv("DO_TOKEN", "DigitalOcean API token should be written into .env");
        mustEnv("DEPLOY_STRAT", "A deploy strategy must be defined!");


    } catch ( err ) {
        console.log( chalk.red( err.message ));
        process.exit(1);
    }

    return {processor};
}
