// Load .env
require('dotenv').config()
// Extract the required classes from the discord.js module
const { Client, Attachment } = require('discord.js');
//Reguest lib
const request = require(`request`);
// Import the native fs module
const fs = require('fs');
//Zip lib
const AdmZip = require('adm-zip');
//uuidv4
const uuidv4 = require('uuid/v4');
// Create an instance of a Discord client
const client = new Client();
//Download lib
const download = require('download');
// Import the native path module 
const path = require('path');
// rm -rf
const rimraf = require("rimraf");
// archiver
const archiver = require('archiver');
//system calls
const exec = require('child_process').exec;

process.env.NODE_ENV === 'production'
const logLevel = 2; // 0: ERROR (only errors) | 1: INFO (only finished actions) | 2: DEBUG (all)
const botName = process.env.BOT_NAME;
fs.writeFile('./info.log', '', 'utf-8', (err) => {
    if (err) throw (err);
});

//init iq says
const iqArray = fs.readFileSync('./data/iq.txt').toString().split("\n");
const imgArray = fs.readFileSync('./data/img.txt').toString().split("\n");
/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */

client.on('ready', () => {
    log('Init!');
    log(`Logged in as ${client.user.tag}!`);
    createFolderIfNotExists("output");
    createFolderIfNotExists("workspace");
});

client.on('message', message => {
    // Check ourself
    if (message.author.bot) return;

    //!img command
    if(message.content === '!img' && false) {
        message.channel.send(`${getRandomFromArray(imgArray)}`);
    }

    //!iq command
    if(message.content === '!iq') {
        message.channel.send(getRandomFromArray(iqArray));
        log(`${message.author.username}: iq command`);
    }

    //Allow only dm-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    if (message.channel.type !== "dm") return;

    // If the message is '!obf'
    if (message.content === '!help' && false) {
        // Send the attachment in the message channel with a content
        message.channel.send(`${message.author}, Send your C# bin folder Zipped to obfuscate!`);
        message.channel.send(`Upload your Release folder zipped!`);
        message.channel.send(`Add the assembly name as a comment to the attachment`);
        message.channel.send(`Upload`);
    }

    //checks if an attachment is sent
    if(message.attachments.first() && message.attachments.first().filename.split('.').pop() === "zip" && false) {
        const assem = message.attachments.first().message;
        const instanceId = uuidv4();

        const author = message.author.username;
        log("Starting process for: " + author + " Instance: " + instanceId);

        const folderWorkspace = "workspace/workspace_" + uuidv4();
        log(`${instanceId}: Created workspace folder: ${folderWorkspace}`);

        const folderOutput = "output/output_" + uuidv4();
        log(`${instanceId}: Created output folder: ${folderOutput}`);

        const fileName = message.attachments.first().filename;
        log(`${instanceId}: Attachment filename: ${fileName}`);

        message.channel.send(`${msgLog("Processing File: "+ fileName)}`);
        log(`${instanceId}: Message send to ${author}: Processing File: ${fileName}`);

        try {
            log(assem.content);
            if(assem.content === "") {
                log(`${instanceId}: Error no assembly name passed for ${author}'s zip file: ${fileName}`);
                message.channel.send(`${msgLog("No assembly name passed for the File: "+ fileName)}`);
                throw author + " Error no assembly name";
            }
            log(`${instanceId}: Downloading attachment`);
            log(`${instanceId}: Attachment url: ${message.attachments.first().url}`);
            log(`${instanceId}: Attachment filename: ${message.attachments.first().filename}`);
            download(message.attachments.first().url, folderWorkspace, {
                'filename': fileName
            }).then(() => {
                var filePath = fromDir(folderWorkspace, '.zip');
                var zip = new AdmZip("./" + filePath);
                message.channel.send(`${msgLog("Extracting")}`);
                log(`${instanceId}: Extracting zip: ${fileName}`);
                zip.extractAllTo(/*target path*/folderWorkspace, /*overwrite*/true);
                //Delete zip
                rimraf(filePath, function () { log(`${instanceId}: Removed uploaded ZIP: ${fileName}`); });
                runObfuscation(folderWorkspace, assem).then(function () {
                    log("Ready");
                    log(`${instanceId}: Obfuscation successful for ${author}'s zip file: ${fileName}`);
                    //Zip and sendfile
                    createFolderIfNotExists(folderOutput);
                    log(`${instanceId}: Creating output zip for: ${author}`);
                    var outPutFile = __dirname + "/" + folderOutput + '/Obfuscated_' + uuidv4() + '.zip'
                    var output = fs.createWriteStream(outPutFile);
                    var archive = archiver('zip', {
                        zlib: {
                            level: 9
                        } // Sets the compression level.
                    });
                    output.on('close', function () {
                        log(`${instanceId}: ${archive.pointer()} total bytes`);
                        log(`${instanceId}: archiver has been finalized and the output file descriptor has closed.`);
            
                        message.channel.send(`${msgLog("Obfuscated your file " + fileName)} ${message.author}`, {
                            files: [outPutFile]
                        }).then(function () {
                            log(`${instanceId}: Deleting workspace folder`);
                            rimraf.sync(folderWorkspace);
            
                            log(`${instanceId}: Deleting output folder`);
                            rimraf.sync(folderOutput);
                        });
                        log(`${instanceId}: Message send to ${author}: Obfuscated your file: ${fileName}`);
                    });
                    output.on('end', function () {
                        log(`${instanceId}: Data has been drained`);
                    });
                    archive.on('warning', function (err) {
                        if (err.code === 'ENOENT') {
                            log(`${instanceId}: WARNING: ${err.code}`);
                            // log warning
                        } else {
                            log(`${instanceId}: ERROR: ${err}`);
                            // throw error
                            throw err;
                        }
                    });
                    archive.on('error', function (err) {
                        log(`${instanceId}: ERROR`);
                        throw err;
                    });
                    log(`${instanceId}: Saving the output zip`);
                    archive.pipe(output);
                    archive.directory(folderWorkspace + "/out/", false);
                    archive.finalize();
                    log(`${instanceId}: Finalize for ${author}`);
                })
                .catch(function () {
                    log(`${instanceId}: Error on obfuscation for ${author}'s zip file: ${fileName}`);
                    throw author + " Error on obfuscation";
                })
            });
        }
        catch(err) {
            log(`${instanceId}: Error for ${author}`);
            log(`${instanceId}: Messaged send: Error`);
            message.channel.send(`${message.author}, ${msgLog("Error")}`);
            log(`${instanceId}: Delete folders`);
            rimraf.sync(folderWorkspace);
            rimraf.sync(folderOutput);
        }
    }
    log(`${message.author.username} content: ${message.content}`);
});

// Log our bot in using the token from https://discordapp.com/developers/applications/me
client.login(process.env.BOT_TOKEN);

//functions
function fromDir(startPath,filter){

    //console.log('Starting from dir '+startPath+'/');

    if (!fs.existsSync(startPath)){
        log("no dir ",startPath);
        return;
    }

    var files=fs.readdirSync(startPath);
    for(var i=0;i<files.length;i++){
        var filename=path.join(startPath,files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()){
            fromDir(filename,filter); //recurse
        }
        else if (filename.indexOf(filter)>=0) {
            return filename;
        };
    };
};

function runObfuscation(workspacePath, assem) {
    return new Promise(function(resolve, reject) {
        createFolderIfNotExists(__dirname + "/" + workspacePath + "/out");
        var project = fs.readFileSync('./data/Project.crproj', 'utf8');
        project = project.replace("<NAME>", __dirname + "/" + workspacePath + "/" + assem.content);
        project = project.replace("<OUTPUT>", __dirname + "/" + workspacePath + "/out");
        project = project.replace("<WORKPLACE>", __dirname + "/" + workspacePath);
        try {
            fs.writeFile(workspacePath + "/cs.crproj", project, function(err) {
                if(err) {
                    log(err);
                }
                log(`Obfuscation Project created`);log("Running obfuscation...");
            });
            log("Running obfuscation...");
        } catch(err) {
            log(`Obfuscation error: ${err}`);
        }
        execPromise(`${path.normalize("mono ./CNF/Confuser.CLI.exe")} -n ${__dirname + "/" + workspacePath + "/cs.crproj"}`).then(function(result) {
            log(result);
            resolve(true);
        }).catch(function(error) {
            log(e.message);
            reject('reject');
        });
    });
}

function msgLog(message) {
    message = "[" + botName + "]" + ': ' + message;
    return message
}

function log(message, level = 1, kill = false) {
    let date = new Date();
    let datevalues = [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
    ];
    let timevalues = [
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
    ]

    for (let i = 0; i < timevalues.length; i++) {
        if (timevalues[i].toString().length == 1)
            timevalues[i] = '0' + timevalues[i];
    }

    let timeString = datevalues.join('/') + ' ' + timevalues.join(':');

    message = timeString + ': ' + message;

    if (kill)
        console.error(message)
    else
        console.log(message);

    if (level <= logLevel) {
        message = message + '\n';

        fs.appendFile('./info.log', message, 'utf-8', (err) => {
            if (err) throw (err);
            if (kill)
                process.exit();
        });
    }
}

function generateString(length, need_num = false) {
	let str = "";
	let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < length; i++) {
		let x = Math.floor(Math.random() * chars.length);
		str += chars.charAt(x);
	}
	if ((need_num && !str.match(/\d/)) || !(str.match(/[A-Z]/) && str.match(/[a-z]/)))
		return generateString(length, need_num);
	else
		return str;
}

function execute(command, callback){
    exec(command, function(error, stdout, stderr){ callback(stdout); });
};

function execPromise(command) {
    return new Promise(function(resolve, reject) {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(stdout.trim());
        });
    });
}

function createFolderIfNotExists(path) {
    if (!fs.existsSync(path)){
        fs.mkdirSync(path);
    }
}

function getRandomFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start, end) {
    var time = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    var month = time.getMonth() + 1;
    var day = time.getDate();
    var year = time .getFullYear();
    return month + "/" + day + "/" + year;
}
