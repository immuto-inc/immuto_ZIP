var Immuto = require("immuto-backend")
var AdmZip = require('adm-zip')
var path = require('path')
var fs = require("fs")
var walk = require('walk')

var im = undefined
var password = undefined
const INVALID_IZIP = "Not valid izip file. No verification performed."

exports.authenticate = (email, pass, environment) => {
    return new Promise((resolve, reject) => {     
        if (environment) {
            im = Immuto.init(true, environment)
        } else {
            im = Immuto.init()
        }
        im.authenticate(email, pass).then((authToken) => {
            password = pass
            resolve()
        }).catch((err)=> {
            reject(err)
        })
    })
}

exports.set_host = (environment) => {
    if (environment) {
        im = Immuto.init(true, environment)
    } else {
        im = Immuto.init()
    }
}

exports.create_zip = (inputPath, outputPath, desc) => {
    return new Promise((resolve, reject) => {
        if (!desc) {
            desc = ""
        }

        var zip = new AdmZip();
        fs.lstat(inputPath, (err, stats) => {
            if (err) {
                reject(err)
                return
            }
            let hash = ""
            let provider = im.web3.currentProvider.host

            if (stats.isDirectory()) {
                get_file_hashes(inputPath).then((hashes) => {
                    hashes.sort() // for consistent order
                    let hash = compute_merkle_hash(hashes)
                    zip.addLocalFolder(inputPath)
                    im.create_data_management(hash, "izip", "basic", password, desc.substring(0, 250)).then((recordID) => {
                        zip.addFile(".izip", recordID + " " + provider)
                        zip.writeZip(outputPath)
                        resolve()
                    }).catch((err) => {
                        reject(err)
                    })
                   
                }).catch((err) =>{
                    reject(err)
                })
            } else if (stats.isFile()){
                fs.readFile(inputPath, function (err, fileData) {
                    if (err) {
                        reject(err)
                        return
                    }
                    let pathString = path.basename(inputPath).toLowerCase() // just file name, as when decompressed
                    hash = im.web3.utils.sha3(pathString + fileData.toString())
                    zip.addLocalFile(inputPath)
                    im.create_data_management(hash, "izip Record", "basic", password, desc.substring(0, 250)).then((recordID) => {
                        zip.addFile(".izip", recordID + " " + provider)
                        zip.writeZip(outputPath)
                        resolve()
                    }).catch((err) => {
                        console.error(err)
                        reject("Error creating Immuto record. Please ensure your account has credits and an active subscription.")
                    })
                });
            } else {
                reject("Unknown type: " + stats)
                return
            }
        })
    })
}

exports.decompress_zip = (inputPath, outputPath, environment) => {
    return new Promise((resolve, reject) => {
        var zip = new AdmZip(inputPath); 
        let hashes = []
        let recordID = ""
        let host = ""

        try {
            let izipEntry = zip.getEntry(".izip") 
            izipInfo = zip.readAsText(izipEntry).split(" ")
            recordID = izipInfo[0]
            host = izipInfo[1] 
            im.establish_manual_connection(host)
        } catch(err) { // invalid izip format
            console.error(err)
            zip.extractAllTo(outputPath)
            resolve(INVALID_IZIP)
            return
        }

        zip.getEntries().forEach(function(entry) {
            var entryName = entry.entryName;
            let pathString = entryName.split(path.sep).toString().toLowerCase()
            if (entryName != ".izip" && !entry.isDirectory) {
                var decompressedData = zip.readFile(entry); // decompressed buffer of the entry
                hashes.push(im.web3.utils.sha3(pathString + zip.readAsText(entry)));
            }
        });
       
        hashes.sort() // consistent ordering 
        let hash = compute_merkle_hash(hashes)
        im.verify_data_management(recordID, 'basic', hash).then((verification) => {
            zip.extractAllTo(outputPath)
            resolve(verification)
        }).catch((err) => {
            console.error(err)
        })
    })
}

function get_file_hashes(inputPath) {
    return new Promise((resolve, reject) => {
        let hashes = []
        walker = walk.walk(inputPath, { followLinks: false });
        let TOP_ROOT = undefined
 
        walker.on("file", function (root, fileStats, next) {
            if (!TOP_ROOT) {
                TOP_ROOT = root
            }
            if (fileStats.name === ".izip") {
                next()
            }
            else if (fileStats.type === 'file') {
                fs.readFile(path.join(root, fileStats.name), function (err, fileData) {
                    if (err) {
                        reject(err)
                        return
                    }
                    let topDir = path.relative(TOP_ROOT, root)
                    let localPath = path.join(topDir, fileStats.name)
                    let pathList = localPath.split(path.sep)
                    let pathString = pathList.toString().toLowerCase()
                    hashes.push(im.web3.utils.sha3(pathString + fileData.toString()))
                    next();
                });
            } else {
                next()
            }
        });

        walker.on("errors", function (root, nodeStatsArray, next) {
            reject("Error computing filehash in: " + root)
            return
        });

        walker.on("end", function () {
            resolve(hashes)
        });
    })
}


function compute_merkle_hash(hashes) {
    let merkleHashes = []
    while(hashes.length > 1) {
        for (let i = 0; i < hashes.length; i += 2) {
            if (i < hashes.length - 1) {
                merkleHashes.push(im.web3.utils.sha3(hashes[i] + hashes[i + 1]))
            } else {
                merkleHashes.push(hashes[i])
            }
        }
        hashes = merkleHashes
        merkleHashes = []
    }
    return hashes[0]
}
