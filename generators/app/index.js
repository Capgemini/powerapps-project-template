"use strict";
const Generator = require("yeoman-generator");
const chalk = require("chalk");
const yosay = require("yosay");
const fs = require("fs");

module.exports = class extends Generator {
  prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Welcome to the laudable ${chalk.red(
          "cdspackage"
        )} generator!`
      )
    );

    this.log(this.destinationPath());

    const prompts = [
      {
        type: "input",
        name: "client",
        message: "What is the name of the client?",
      },
      {
        type: "input",
        name: "package",
        message: "What is the name of the stream?",
      },
      {
        type: "input",
        name: "devUrl",
        message: "What is the dev URL?",
      },
      {
        type: "input",
        name: "devUsername",
        message: "What is the dev admin email?",
      },
      {
        type: "input",
        name: "devPassword",
        message: "What is the dev admin password?",
      },
      {
        type: "input",
        name: "dataUrl",
        message: "What is the master data URL?",
      },
      {
        type: "input",
        name: "dataUsername",
        message: "What is the master data admin email?",
      },
      {
        type: "input",
        name: "dataPassword",
        message: "What is the master data admin password?",
      },
    ];

    return this.prompt(prompts).then(props => {
      // To access props later use this.props.someAnswer;
      this.props = props;
    });
  }

  writing() {
    this.log("Cloning latest template... " + this.templatePath());

    this.spawnCommandSync("git", [
      "clone",
      "--depth=1",
      "--single-branch",
      "--branch","sample-repository",
      "-q",
      "https://capgeminiuk.visualstudio.com/Capgemini%20Reusable%20IP/_git/Capgemini.Xrm.Templates",
      this.templatePath()
    ]);

    const additionalDestinationPath = isDirectoryEmpty(this.destinationPath()) || (this.sourceRoot() === this.destinationPath()) ? "" : this.props.client + "." + this.props.package;

    this.log("Building project to: " + this.destinationPath(additionalDestinationPath));

    this.fs.copyTpl(
      this.templatePath(),
      this.destinationPath(additionalDestinationPath),
      this.props
    )
  }

  install() {
    
  }
};

function isDirectoryEmpty(dirname) {
  fs.readdir(dirname, function (err, files) {
    if (err) {
      throw err;
    } else {
      return !files.length;
    }
  });
}