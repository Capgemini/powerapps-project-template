const assert = require('assert');
const fs = require('fs');
const path = require('path');

function getAllFiles(baseDir, dirPath = '', currentArrayOfFiles = []) {
  const items = fs.readdirSync(path.join(baseDir, dirPath));
  let arrayOfFiles = currentArrayOfFiles;

  items.forEach((file) => {
    const fileStats = fs.statSync(path.join(baseDir, dirPath, file));

    if (fileStats.isDirectory()) {
      arrayOfFiles = getAllFiles(baseDir, path.join(dirPath, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
}

function assertFileLines(actualFileContent, expectedFileContent, message) {
  assert.equal(
    actualFileContent.replace(/\r?\n/g, '\n'),
    expectedFileContent.replace(/\r?\n/g, '\n'),
    message,
  );
}

module.exports = {
  getAllFiles,
  assertFileLines,
};
