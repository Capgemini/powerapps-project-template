const fs = require("fs");
const path = require("path");
const helpers = require("yeoman-test");

const testGeneration = path.join(__dirname, "sample-with-solution");

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

    getAllFiles(testGeneration).map(file => {
      const relativeFilePath = file.replace(testGeneration + "\\", "");

      it("file: " + relativeFilePath, () => {
        runResult.assertFile(relativeFilePath);
        runResult.assertFileContent(relativeFilePath, fs.readFileSync(file).toString());
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

    getAllFiles(testGeneration).map(file => {
      const relativeFilePath = file.replace(testGeneration + "\\", "");

      it("file: " + relativeFilePath, () => {
        runResult.assertFile(relativeFilePath);
        runResult.assertFileContent(relativeFilePath, fs.readFileSync(file).toString());
      });
    });
  })
});

function getAllFiles(dirPath, arrayOfFiles = []) {
  const items = fs.readdirSync(dirPath)

  items.map(file => {
    const fileStats = fs.statSync(path.join(dirPath, file));

    if (fileStats.isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, file))
    }
  });

  return arrayOfFiles
}
