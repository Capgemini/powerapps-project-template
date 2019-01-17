"use strict";
import Generator = require("yeoman-generator");
import yosay from "yosay";
import chalk = require("chalk");
import inquirer = require("inquirer");
import rimraf = require("rimraf");
import Renamer from "renamer";

module.exports = class extends Generator {
  answers!: inquirer.Answers;
  async prompting(): Promise<void> {
    this.log(
      yosay(
        `Welcome to the laudable ${chalk.default.red("cdspackage")} generator!`
      )
    );

    const prompts: Generator.Questions = [
      {
        type: "input",
        name: "client",
        message: "What is the name of the client?",
        validate: validateNamespace,
        filter: filterNamespace,
        store: true
      },
      {
        type: "input",
        name: "package",
        message: "What is the name of the package?",
        validate: validateNamespace,
        filter: filterNamespace,
        store: true
      },
      {
        type: "input",
        name: "devUrl",
        message: "What is the dev URL?",
        validate: validateUrl,
        store: true
      },
      {
        type: "input",
        name: "devUsername",
        message: "What is the dev admin email?",
        validate: validateEmail,
        store: true
      },
      {
        type: "input",
        name: "devPassword",
        message: "What is the dev admin password?",
        store: true
      },
      {
        type: "input",
        name: "dataUrl",
        message: "What is the master data URL?",
        validate: validateUrl,
        store: true
      },
      {
        type: "input",
        name: "dataUsername",
        message: "What is the master data admin email?",
        validate: validateEmail,
        store: true
      },
      {
        type: "input",
        name: "dataPassword",
        message: "What is the master data admin password?",
        store: true
      }
    ];

    this.answers = await this.prompt(prompts);
  }

  async writing(): Promise<void> {
    this.log(`Downloading latest template to ${this.templatePath()}`);
    rimraf.sync(this.templatePath());
    this.spawnCommandSync("git", [
      "clone",
      "--depth=1",
      "--single-branch",
      "--branch",
      "sample-repository",
      "-q",
      "https://capgeminiuk.visualstudio.com/Capgemini%20Reusable%20IP/_git/Capgemini.Xrm.Templates",
      this.templatePath()
    ]);
    rimraf.sync(`${this.templatePath()}/.git`);
    const renamer = new Renamer();
    renamer.rename({
      files: [`${this.templatePath()}/**/*`],
      find: "Client.Package",
      replace: `${this.answers.client}.${this.answers.package}`,
      dryRun: false
    });
    this.fs.copyTpl(this.templatePath(), this.destinationPath(), this.answers);
    this.fs.copy(
      this.templatePath(
        `Solutions\\${this.answers.client}.${
          this.answers.package
        }.WebResources\\Scripts\\.npmrc`
      ),
      `Solutions\\${this.answers.client}.${
        this.answers.package
      }.WebResources\\Scripts\\.npmrc`
    );
  }
};

function validateNamespace(input: string): boolean | string {
  return /^[a-zA-Z]+$/.test(input)
    ? true
    : `Answer must not contain spaces, numeric characters or special characters.`;
}

function filterNamespace(input: string): string {
  return input
    .split(" ")
    .map(s => s.charAt(0).toUpperCase() + s.substring(1))
    .join();
}

function validateUrl(input: string): boolean | string {
  return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/.test(
    input
  )
    ? true
    : "You must provide a valid URL.";
}

function validateEmail(input: string): boolean | string {
  // tslint:disable-next-line:max-line-length
  return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    input
  )
    ? true
    : "You must provide a valid email.";
}
