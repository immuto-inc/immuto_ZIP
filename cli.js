#!/usr/bin/env node
var izip = require('./izip')
var path = require('path')
var fs = require("fs")
var readline = require('readline');

var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
});
const [,, ... args] = process.argv
const INVALID_IZIP = "Not valid izip file. No verification performed."

if (!validate_args(args)) {
    process.exit()
}

if (args[0] === "--zip") {
    zip_files(args[1], args[2])
} else { // args[0] must be "--unzip" folowing validate_args
    unzip_files(args[1], args[2])    
}

async function zip_files(inputPath, outputPath) {
    try {
        let cred = await get_credentials()
        await izip.authenticate(cred.email, cred.password, args[3])
        await izip.create_zip(inputPath, outputPath)
        console.log("Successfully zipped files at: " + outputPath)
        process.exit()
    } catch(err) {
        console.error("Error creating Immuto ZIP file:")
        console.log(err)
        process.exit()
    }   
}

async function unzip_files(inputPath, outputPath) {
    try {
        izip.set_host(args[3]) // no need to authenticate for unzipping, but set host for dev
        let verification = await izip.decompress_zip(inputPath, outputPath)
        console.log("Successfully decompressed archive to: " + outputPath)
        if (verification) {
            if (verification === INVALID_IZIP) {
                console.log(INVALID_IZIP)
            } else {
                console.log("ZIP verified:")
                console.log(verification)
            }
           
        } else {
            console.log("Verification failed.")
        }
        process.exit()
    } catch(err) {
        console.error("Error creating Immuto ZIP file:")
        console.log(err)
        process.exit()
    }   
}

function validate_args(args) {
    if (!(args.length == 3 || args.length == 4)) {
        console.error("Expecting 3-4 args, got " + args.length)
        return false
    }
    if (args[0] === "--zip" || args[0] === "--unzip") {
        if (filepath_exists(args[1])) {
            if (!filepath_exists(args[2])) {
                    return true
            } else {
                    console.error("'" + args[2] + "' already exists")
            }
        } else {
            console.error("'" + args[1] + "' does not exist")
        } 
        return false
    } else {
        console.error("Expecting --zip or --unzip as first argument. Got '" + args[0] + "'")
        return false
    }
}

function filepath_exists(path) {
        try {
                return fs.existsSync(path)
        } catch(err) {
                console.error("Error validating filepath for '" + path + "'")
                console.error(err)
                return false
        }
}

function get_credentials() {
        return new Promise((resolve, reject) => {
                credentials = {}
                if (process.env.EMAIL && process.env.PASSWORD) {
                        credentials.email = process.env.EMAIL
                        credentials.password = process.env.PASSWORD
                        resolve(credentials)
                        return
                }

                rl.question('Immuto email: ', function(email) {
                        credentials.email = email
                        rl.stdoutMuted = true;
                        rl.question('Immuto password: ', function(password) {
                                credentials.password = password
                                rl.close();
                                resolve(credentials)
                        });
                        rl._writeToOutput = function _writeToOutput(stringToWrite) {
                                if (rl.stdoutMuted)
                                        if ("\r\n".includes(stringToWrite))
                                                rl.output.write(stringToWrite)
                                        else 
                                                rl.output.write('*');
                                else
                                        rl.output.write(stringToWrite);
                        };
                });
        })
}
