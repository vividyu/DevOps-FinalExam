const chalk = require('chalk');
const path = require('path');
const os = require('os');

const got = require('got');
const http = require('http');
const httpProxy = require('http-proxy');
const Connector = require('infra.connectors');
const env = require('dotenv');
const envPath = path.join(path.dirname(require.main.filename), '.env');
const InventoryPath = path.join(path.dirname(require.main.filename), 'inventory');

const getDotenv = () => {
    return env.config({ path: envPath });
}

const getInventory = () => {
    return env.config({ path: InventoryPath });
}

exports.command = 'serve';
exports.desc = 'Run traffic proxy.';
exports.builder = yargs => { };

exports.handler = async argv => {
    const { } = argv;

    (async () => {

        await run();

    })();

};

// ip address
const blueip = JSON.stringify(getInventory().parsed.BLUE_DO_IP, null, 3).toString().replace(/["]+/g, '');
const greenip = JSON.stringify(getInventory().parsed.GREEN_DO_IP, null, 3).toString().replace(/["]+/g, '');
const BLUE = `http://${blueip}:8080`;
const GREEN = `http://${greenip}:8080`;

class Production {
    constructor() {
        this.TARGET = GREEN;
        setInterval(this.healthCheck.bind(this), 5000);
    }

    proxy() {
        let options = {};
        let proxy = httpProxy.createProxyServer(options);
        let self = this;
        // Redirect requests to the active TARGET (BLUE or GREEN)
        let server = http.createServer(function (req, res) {
            // callback for redirecting requests.
            proxy.web(req, res, { target: self.TARGET });

        });
        server.listen(3090);
    }

    failover() {
        this.TARGET = BLUE;
        console.log(chalk.blue("Traffic on Blue environment now!"));
    }

    //adding a health monitor, which checks every 5 seconds 
    //if the GREEN environment has any failure. If failure does occur, 
    //then it will automatically switch the TARGET to the BLUE environment.

    async healthCheck() {
        try {
            let url = `${this.TARGET}/iTrust2-10/login`;
            const response = await got(url, { throwHttpErrors: false });
            let status = response.statusCode == 200 ? chalk.green(response.statusCode) : chalk.red(response.statusCode);
            console.log(chalk`{grey Health check on ${url}}: ${status}`);
            //add automatic failover
            if (this.TARGET == GREEN && response.statusCode != 200) {
                console.log(chalk.red("Green environment error, call function failover() now"));
                this.failover();
            }

            console.log(chalk`{grey Health check on ${url}}: ${status}`);
        }
        catch (error) {
            console.log(error);
        }
    }

}

async function run() {

    console.log(chalk.keyword('pink')('Starting proxy on localhost:3090'));

    let prod = new Production();
    prod.proxy();

}