
const esprima = require("esprima");
const escodegen = require("escodegen");
const options = { tokens: true, tolerant: true, loc: true, range: true };
const fs = require("fs");
const chalk = require('chalk');
const child = require('child_process');
const puppeteer = require('puppeteer');
const PNG = require('pngjs').PNG;
//const pixelmatch = require('pixelmatch');
//const Jimp = require('jimp');

const [, , ...args] = process.argv;

function pad2(n) {
    return n < 10 ? '0' + n : n
}

function print_time() {
    date = new Date();
    return (date.getFullYear().toString() + pad2(date.getMonth() + 1) + pad2(date.getDate()) + pad2(date.getHours()) + pad2(date.getMinutes()) + pad2(date.getSeconds()));
}

//initilizing global variables
const cur_time = print_time().toString();
const logfile = "runlog" + cur_time + ".log";
const snapshot_base_path = `/bakerx/mutation/${cur_time}/snapshot_base/`;
const snapshots_TBD_path = `/bakerx/mutation/${cur_time}/snapshots_TBD/`;
const runlog_path = `/bakerx/runlog/mutation/`;

//write run log function
const writelog = (content, NewLine) => {
    if (!fs.existsSync(runlog_path)) {
        fs.mkdirSync(runlog_path, { recursive: true });
    }

    log_fullpath = `${runlog_path}${logfile}`;

    if (NewLine == true) {
        content = content + '\n';
    }
    fs.writeFileSync(log_fullpath, content, { encoding: "utf8", flag: "a+" })
}

let operations = [
    NegateConditionals_greater_to_less,//0
    NegateConditionals_eq_to_ineq,//1
    Greater_to_greater_equal,//2
    Less_to_less_equal,//3
    AndToOr,//4
    OrToAnd,//5
    PreIncrementToPostIncrement,//6
    PostIncrementToPostDecrement,//7
    Replace0with3,//8
    NonEmptyStringMutation,//9
    EarlyReturn //10
]

function rewrite(filepath, newPath) {

    var buf = fs.readFileSync(filepath, "utf8");
    var ast = esprima.parse(buf, options);
    let op_index = getRandomInt(operations.length);
    //let op_index = 10;//for test
    let op = operations[op_index];
    console.log(chalk.red("call func -> " + op_index.toString()));//for test

    op(ast);

    let code = escodegen.generate(ast);
    fs.writeFileSync(newPath, code);
}


function NegateConditionals_greater_to_less(ast) {
    let candidates = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "BinaryExpression" && node.operator === ">") {
            candidates++;
        }
    })

    let mutateTarget = getRandomInt(candidates);
    let current = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "BinaryExpression" && node.operator === ">") {
            if (current === mutateTarget) {
                node.operator = "<"
                console.log(chalk.red(`Replacing > with < on line ${node.loc.start.line}`));
                writelog(`Operation: Replacing > with < on line ${node.loc.start.line}`, true);
            }
            current++;
        }
    })
}

function NegateConditionals_eq_to_ineq(ast) {
    let candidates = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "BinaryExpression" && node.operator === "==") {
            candidates++;
        }
    })

    let mutateTarget = getRandomInt(candidates);
    let current = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "BinaryExpression" && node.operator === "==") {
            if (current === mutateTarget) {
                node.operator = "!="
                console.log(chalk.red(`Replacing == with != on line ${node.loc.start.line}`));
                writelog(`Operation: Replacing == with != on line ${node.loc.start.line}`, true);
            }
            current++;
        }
    })
}

function Greater_to_greater_equal(ast) {
    let candidates = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "BinaryExpression" && node.operator === ">") {
            candidates++;
        }
    })

    let mutateTarget = getRandomInt(candidates);
    let current = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "BinaryExpression" && node.operator === ">") {
            if (current === mutateTarget) {
                node.operator = ">="
                console.log(chalk.red(`Replacing > with >= on line ${node.loc.start.line}`));
                writelog(`Operation: Replacing > with >= on line ${node.loc.start.line}`, true);
            }
            current++;
        }
    })
}

function Less_to_less_equal(ast) {
    let candidates = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "BinaryExpression" && node.operator === "<") {
            candidates++;
        }
    })

    let mutateTarget = getRandomInt(candidates);
    let current = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "BinaryExpression" && node.operator === "<") {
            if (current === mutateTarget) {
                node.operator = "<="
                console.log(chalk.red(`Replacing < with <= on line ${node.loc.start.line}`));
                writelog(`Operation: Replacing < with <= on line ${node.loc.start.line}`, true);
            }
            current++;
        }
    })
}

function AndToOr(ast) {
    let candidates = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "LogicalExpression" && node.operator === "&&") {
            candidates++;
        }
    })

    let mutateTarget = getRandomInt(candidates);
    let current = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "LogicalExpression" && node.operator === "&&") {
            if (current === mutateTarget) {
                node.operator = "||"
                console.log(chalk.red(`Replacing && with || on line ${node.loc.start.line}`));
                writelog(`Operation: Replacing && with || on line ${node.loc.start.line}`, true);
            }
            current++;
        }
    })
}

function OrToAnd(ast) {
    let candidates = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "LogicalExpression" && node.operator === "||") {
            candidates++;
        }
    })

    let mutateTarget = getRandomInt(candidates);
    let current = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "LogicalExpression" && node.operator === "||") {
            if (current === mutateTarget) {
                node.operator = "&&"
                console.log(chalk.red(`Replacing || with && on line ${node.loc.start.line}`));
                writelog(`Operation: Replacing || with && on line ${node.loc.start.line}`, true);
            }
            current++;
        }
    })
}

function PreIncrementToPostIncrement(ast) {
    let candidates = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "UpdateExpression" && node.operator === "++" && node.prefix === true) {
            // console.log("count");
            candidates++;
        }
    })

    let mutateTarget = getRandomInt(candidates);
    let current = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "UpdateExpression" && node.operator === "++" && node.prefix === true) {
            if (current === mutateTarget) {
                node.prefix = false
                console.log(chalk.red(`Replacing ++x with x++ on line ${node.loc.start.line}`));
                writelog(`Operation: Replacing ++x with x++ on line ${node.loc.start.line}`, true);
            }
            current++;
        }
    })
}

function PostIncrementToPostDecrement(ast) {
    let candidates = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "UpdateExpression" && node.operator === "++" && node.prefix === false) {
            // console.log("count");
            candidates++;
        }
    })

    let mutateTarget = getRandomInt(candidates);
    let current = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "UpdateExpression" && node.operator === "++" && node.prefix === false) {
            if (current === mutateTarget) {
                node.operator = "--"
                console.log(chalk.red(`Replacing x++ with x-- on line ${node.loc.start.line}`));
                writelog(`Operation: Replacing x++ with x-- on line ${node.loc.start.line}`, true);
            }
            current++;
        }
    })
}

function NonEmptyStringMutation(ast) {
    let candidates = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "Literal" && node.value === "") {
            candidates++;
            // console.log("count");
            // console.log(`${node.loc.start.line}`);
        }
    })

    let mutateTarget = getRandomInt(candidates);
    let current = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "Literal" && node.value === "") {
            if (current === mutateTarget) {
                node.raw = "<div>Bug</div>";
                node.value = "<div>Bug</div>";
                console.log(chalk.red(`Replacing "" with "<div>Bug</div>" on line ${node.loc.start.line}`));
                writelog(`Operation: Replacing "" with "<div>Bug</div>" on line ${node.loc.start.line}`, true);
            }
            current++;
        }
    })
}

function Replace0with3(ast) {
    let candidates = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "Literal" && node.raw === "0" && node.value === 0) {
            candidates++;
        }
    })

    let mutateTarget = getRandomInt(candidates);
    let current = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "Literal" && node.raw === "0" && node.value === 0) {
            if (current === mutateTarget) {
                node.raw = 3;
                node.value = 3;
                console.log(chalk.red(`Replacing constant 0 with 3 on line ${node.loc.start.line}`));
                writelog(`Operation: Replacing constant 0 with 3 on line ${node.loc.start.line}`, true);
            }
            current++;
        }
    })
}

function EarlyReturn(ast) {
    let candidates = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "ReturnStatement") {
            candidates++;
            // console.log(chalk.yellow("count"));
            // console.log(`${node.parent.length}`);
        }
    })

    let mutateTarget = getRandomInt(candidates);
    let current = 0;
    traverseWithParents(ast, (node) => {
        if (node.type === "ReturnStatement") {
            if (current === mutateTarget) {
                var ParentOfReturn = node.parent;
                var IndexOfReturn;
                //get return statement node's index
                for (var i = ParentOfReturn.length - 1; i >= 0; i--) {
                    var body = ParentOfReturn[i];
                    if (body.type === "ReturnStatement") {
                        IndexOfReturn = i;
                        // console.log(IndexOfReturn);
                    }
                }
                // insert return statement into random location
                var InsertLocation = getRandomInt(IndexOfReturn);
                // console.log("insert at " + InsertLocation);
                ParentOfReturn.splice(InsertLocation, 0, node);

                console.log(chalk.red(`Copy return statement from line ${node.loc.start.line} and insert into random location of function`));
                writelog(`Operation: Copy return statement from line ${node.loc.start.line} and insert into random location of function`, true);
            }
            current++;
        }
    })
}


function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// A function following the Visitor pattern.
// Annotates nodes with parent objects.
function traverseWithParents(object, visitor) {
    var key, child;

    visitor.call(null, object);

    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null && key != 'parent') {
                child.parent = object;
                traverseWithParents(child, visitor);
            }
        }
    }
}

// Helper function for counting children of node.
function childrenLength(node) {
    var key, child;
    var count = 0;
    for (key in node) {
        if (node.hasOwnProperty(key)) {
            child = node[key];
            if (typeof child === 'object' && child !== null && key != 'parent') {
                count++;
            }
        }
    }
    return count;
}

// Helper function for checking if a node is a "decision type node"
function isDecision(node) {
    if (node.type == 'IfStatement' || node.type == 'ForStatement' || node.type == 'WhileStatement' ||
        node.type == 'ForInStatement' || node.type == 'DoWhileStatement') {
        return true;
    }
    return false;
}

// Helper function for printing out function name.
function functionName(node) {
    if (node.id) {
        return node.id.name;
    }
    return "anon function @" + node.loc.start.line;
}

function execShellCommand(cmd) {
    const exec = require('child_process').exec;
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.warn(error);
            }
            resolve(stdout ? stdout : stderr);
        });
    });
}

function ParseSnapshotURL(u) {
    try {
        url = u.toString().replace(/["]+/g, '');
        snapshot = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('')).replace(/.md+$/, '');

        return [url, snapshot];

    } catch (err) {
        console.log(chalk.red(err.message));
    }
}

async function screenshot(sn, url_arr, mode) {
    for (let j = 0; j < url_arr.length; j++) {
        const [url, snapshot] = ParseSnapshotURL(url_arr[j]);
        let snapshot_file = '';

        switch (mode) {
            case 'init':
                snapshot_file = `${snapshot_base_path}${snapshot}_base.png`;
                break;
            case 'iter':
                snapshot_file = `${snapshots_TBD_path}${snapshot}${sn}.png`;
                break;
            default:
                throw new Error(`mode: ${mode} is undefined.`);
        }

        const browser = await puppeteer.launch({
            args: ['--no-sandbox']
        });

        try {
            const page = await browser.newPage();

            await page.goto(url, {
                waitUntil: 'networkidle0'
            });
            await page.screenshot({
                path: snapshot_file,
                fullPage: true
            });

            //await page.waitFor(10000); // To be sure all exceptions logged and handled
            await page.close();
            await browser.close();
        } catch (err) {
            new Function();
            return Promise.reject(new Error(err));
            //console.log(e);
        } finally {
            await browser.close();
        }
    }

};


function snapshot_judge(sn, url_arr) {
    try {
        for (let j = 0; j < url_arr.length; j++) {
            const [url, snapshot] = ParseSnapshotURL(url_arr[j]);

            let base_path = `${snapshot_base_path}${snapshot}_base.png`;
            let TBD_path = `${snapshots_TBD_path}${snapshot}${sn}.png`;


            if (!fs.existsSync(base_path) || !fs.existsSync(TBD_path)) {
                throw new Error(`png file not found!`);
            }

            var buf_base = fs.readFileSync(base_path);
            var buf_TBD = fs.readFileSync(TBD_path)

            var snapshot_base = PNG.sync.read(buf_base, {
                filterType: -1,
            });
            var snapshot_TBD = PNG.sync.read(buf_TBD, {
                filterType: -1,
            });

            /*
                        const { width1, height1 } = snapshot_base;
                        const { width2, height2 } = snapshot_TBD;
            
                        if (width1 == undefined) {
                            console.log(chalk.red(`???`));
                            continue;
                        }
                        if (width1 != width2 || height1 != height2) {
                            console.log(chalk.red(`${snapshot}_base.png<->${snapshot}${sn}.png: different size`));
                            console.log(chalk.red(`Difference is found, mutation coverage success.`));
                            return true;
                        }
            
                        console.log(chalk.green(`./snapshot_base/${snapshot}_base.png: ./snapshots/${snapshot}${sn}.png = ${width1} <-> ${width2}, ${height1} <-> ${height2}`));
            */
            //const numDiffPixels = pixelmatch(snapshot_base.data, snapshot_TBD.data, null, { threshold: 0.1 });
            const numDiffPixels = Buffer.compare(snapshot_base.data, snapshot_TBD.data);

            console.log(chalk.green(`${snapshot}_base.png<->${snapshot}${sn}.png: diffNum -> ${numDiffPixels}`));
            if (numDiffPixels != 0) {
                console.log(chalk.green(`Difference is found, mutation coverage success.`));
                return true;
            }
        }
        console.log(chalk.red(`All imgs are identical, mutation coverage failed.`));
        return false;

    } catch (err) {
        throw new Error(err);
    }
}

const main = async () => {
    try {
        if (args.length < 2) {
            throw new Error(`Usage: node index.js <iterations> <url1 url2 url3 ...>`);
        }

        let iterations = parseInt(args[0]);
        if (iterations == null || iterations < 1 || iterations > 9999) {
            throw new Error(`iterations should be an int between 1 to 9999`);
        }

        //read snapshots url args
        let url_arr = [];
        for (let m = 1; m < args.length; m++) {
            url_arr.push(args[m]);
        }

        //mkdir for: 1. snapshot comparison base, 2. snapshots after mutation, 3. runlog
        if (!fs.existsSync(snapshot_base_path)) {
            fs.mkdirSync(snapshot_base_path, { recursive: true });
        }
        if (!fs.existsSync(snapshots_TBD_path)) {
            fs.mkdirSync(snapshots_TBD_path, { recursive: true });
        }

        if (!fs.existsSync(runlog_path)) {
            fs.mkdirSync(runlog_path, { recursive: true });
        }

        //initialzing snapshot comparison base
        await screenshot(0, url_arr, 'init').catch((error) => {
            console.log(chalk.yellow(error.message));
        });
        console.log(chalk.yellow("snapshot comparison base generated"));
        console.log(chalk.yellow("---------------------------------------"));//for test

        let i = 0;
        let total_run = 0;
        let discard_count = 0;
        let coverage_count = 0;
        while (i < iterations) {
            let isCoverage = true;
            let screenshot_pass = true;
            ++i;
            ++total_run;

            console.log(chalk.green(`Current iteration: ${i}`));
            writelog(`Current iteration=${i}`, true);
            writelog(`TotalRun=${total_run}`, true);

            //Start with original version of code.
            child.execSync("cp /home/vagrant/checkbox.io-micro-preview/marqdown.js.bak /home/vagrant/checkbox.io-micro-preview/marqdown.js", { encoding: 'utf8', stdio: 'inherit' });

            //Apply mutation operator
            rewrite("/home/vagrant/checkbox.io-micro-preview/marqdown.js", "/home/vagrant/checkbox.io-micro-preview/marqdown.js")

            //for test purpose: copy to local repo for comparing
            //child.execSync(`cp /home/vagrant/checkbox.io-micro-preview/marqdown.js /bakerx/tmp/marqdown-mod${i}.js`, { encoding: 'utf8', stdio: 'inherit' });

            await new Promise(resolve => setTimeout(resolve, 2000));//wait test suite restart

            await screenshot(i, url_arr, 'iter').catch((error) => {
                console.log(chalk.yellow(`Test app crashed with message: ${error.message}`));
                console.log(chalk.green(`Result of run ${total_run} has been discarded`));
                --i;
                screenshot_pass = false;
                discard_count++;
                writelog(`Result=discarded`, true);
            });

            //compare snapshots with base
            if (screenshot_pass == true) {
                await new Promise(resolve => setTimeout(resolve, 1500));//make sure screenshot complete
                isCoverage = snapshot_judge(i, url_arr);
                if (isCoverage == true) {
                    coverage_count++;
                    writelog(`Result=Mutation Coverage passed`, true);
                } else {
                    writelog(`Result=Mutation Coverage failed`, true);
                }
            }

            console.log(chalk.yellow("---------------------------------------"));
            writelog("---------------------------------------", true);
        }

        //Report Summary
        writelog("Report Summary:", true);
        let coverage_percent = Number((coverage_count / iterations * 100).toFixed(2));
        console.log(chalk.yellow(`TotalRun=${total_run}; Discard=${discard_count}; ValidRun=${iterations}; Coverage=${coverage_percent}%`));
        writelog(`TotalRun=${total_run}`, true);
        writelog(`Discard=${discard_count}`, true);
        writelog(`ValidRun=${iterations}`, true);
        writelog(`CoveragePassed=${coverage_count}`, true);
        writelog(`CoveragePercent=${coverage_percent}%`, true);

        return Promise.resolve(`main() complete.`);

    } catch (err) {
        console.log(chalk.red(err));
    }
}

main();
