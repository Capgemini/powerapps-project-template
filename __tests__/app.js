const assert = require('assert');
const fs = require('fs');
const path = require('path');
const helpers = require('yeoman-test');
const { getAllFiles, assertFileLines } = require('./helpers');

const testGeneration = path.join(__dirname, 'sample-with-solution');
const testGenerationFiles = getAllFiles(testGeneration);

describe('generator-powerapps-project:app', () => {
  let runResult;

  describe('existing solution = no', () => {
    before(async function beforeTestHook() {
      this.timeout(10000);

      runResult = await helpers
        .run(path.join(__dirname, '../generators/app'))
        .withPrompts({
          client: 'TestClient',
          package: 'TestPackage',
          existingSolution: false,
          prefix: 'test',
          solution: 'TestSolution',
          pacProfile: 'test',
          environment: 'https://dev.com',
          hasStagingEnvironment: true,
          stagingEnvironment: 'https://staging.com',
        });
    });

    it('generates to correct files', () => {
      assert.deepEqual(
        getAllFiles(runResult.cwd),
        testGenerationFiles,
        'File list does not match.',
      );
    });

    testGenerationFiles.forEach((file) => {
      it(`generates ${file} content`, () => {
        assertFileLines(
          runResult.fs.read(file, 'utf8'),
          fs.readFileSync(path.join(testGeneration, file), 'utf8'),
          `${file} does not match.`,
        );
      });
    });
  });

  describe('existing solution = yes', () => {
    before(async function beforeTestHook() {
      this.timeout(10000);

      runResult = await helpers
        .run(path.join(__dirname, '../generators/app'))
        .withPrompts({
          client: 'TestClient',
          package: 'TestPackage',
          existingSolution: true,
          solutionUniqueName: 'test_TestPackage_TestSolution',
          pacProfile: 'test',
          environment: 'https://dev.com',
          hasStagingEnvironment: true,
          stagingEnvironment: 'https://staging.com',
        });
    });

    it('generates to correct files', () => {
      assert.deepEqual(
        getAllFiles(runResult.cwd),
        testGenerationFiles,
        'File list does not match.',
      );
    });

    testGenerationFiles.forEach((file) => {
      it(`generates ${file} content`, () => {
        assertFileLines(
          runResult.fs.read(file, 'utf8'),
          fs.readFileSync(path.join(testGeneration, file), 'utf8'),
          `${file} does not match.`,
        );
      });
    });
  });
});
