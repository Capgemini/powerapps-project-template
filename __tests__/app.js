const assert = require("assert");
const fs = require("fs");
const path = require("path");
const helpers = require("yeoman-test");

const testGeneration = path.join(__dirname, "sample-with-solution");
const testGenerationFiles = getAllFiles(testGeneration);

describe("generator-powerapps-project:app", () => {
  let runResult;

  describe("existing solution = no", () => {
    before(async function () {
      this.timeout(10000);

      runResult = await helpers
        .run(path.join(__dirname, '../generators/app'))
        .withPrompts({
          client: "TestClient",
          package: "TestPackage",
          existingSolution: false,
          prefix: "test",
          solution: "TestSolution",
          pacProfile: "test",
          environment: "https://dev.com",
          hasStagingEnvironment: true,
          stagingEnvironment: "https://staging.com"
        })
    })

    it("generates to correct files", () => {
      assert.deepEqual(
        getAllFiles(runResult.cwd), 
        testGenerationFiles, 
        "File list does not match."
      );
    });

    testGenerationFiles.map(file => {
      it(`generates ${file} content`, () => {
        assertFileLines(
          runResult.fs.read(file, 'utf8'),
          fs.readFileSync(path.join(testGeneration, file), 'utf8'),
          `${file} does not match.`
        );
      });
    });
  });

  describe("existing solution = yes", () => {
    before(async function () {
      this.timeout(10000);

      runResult = await helpers
        .run(path.join(__dirname, '../generators/app'))
        .withPrompts({
          client: "TestClient",
          package: "TestPackage",
          existingSolution: true,
          solutionUniqueName: "test_TestPackage_TestSolution",
          pacProfile: "test",
          environment: "https://dev.com",
          hasStagingEnvironment: true,
          stagingEnvironment: "https://staging.com"
        })
    })

    it("generates to correct files", () => {
      assert.deepEqual(
        getAllFiles(runResult.cwd),
        testGenerationFiles,
        "File list does not match."
      );
    });

    testGenerationFiles.map(file => {
      it(`generates ${file} content`, () => {
        assertFileLines(
          runResult.fs.read(file, 'utf8'),
          fs.readFileSync(path.join(testGeneration, file), 'utf8'),
          `${file} does not match.`
        );
      });
    });
  })
});

function getAllFiles(baseDir, dirPath = "", arrayOfFiles = []) {
  const items = fs.readdirSync(path.join(baseDir, dirPath));

  items.map(file => {
    const fileStats = fs.statSync(path.join(baseDir, dirPath, file));

    if (fileStats.isDirectory()) {
      arrayOfFiles = getAllFiles(baseDir, path.join(dirPath, file), arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, file))
    }
  });

  return arrayOfFiles
}

function assertFileLines(actualFileContent, expectedFileContent, message) {
  assert.equal(
    actualFileContent.replace(/\r?\n/g, '\n'), 
    expectedFileContent.replace(/\r?\n/g, '\n'), 
    message
  );
}
