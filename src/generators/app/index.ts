"use strict";
import Generator = require("yeoman-generator");
import yosay = require("yosay");
import chalk = require("chalk");
import inquirer = require("inquirer");
import { readdirSync } from "fs";
import rimraf = require("rimraf");

module.exports = class extends Generator {
    answers!: inquirer.Answers;
    async prompting(): Promise<void> {
        this.log(
            yosay(
                `Welcome to the laudable ${chalk.default.red(
                    "cdspackage"
                )} generator!`
            )
        );

        const prompts: Generator.Questions = [
            {
                type: "input",
                name: "client",
                message: "What is the name of the client?",
                validate: validateNamespace,
                transformer: transformNamespace

            },
            {
                type: "input",
                name: "package",
                message: "What is the name of the package?",
                validate: validateNamespace,
                transformer: transformNamespace
            },
            {
                type: "input",
                name: "devUrl",
                message: "What is the dev URL?",
                validate: validateUrl
            },
            {
                type: "input",
                name: "devUsername",
                message: "What is the dev admin email?",
                validate: validateEmail
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
                validate: validateUrl
            },
            {
                type: "input",
                name: "dataUsername",
                message: "What is the master data admin email?",
                validate: validateEmail,
            },
            {
                type: "input",
                name: "dataPassword",
                message: "What is the master data admin password?",
            },
        ];

        this.answers = await this.prompt(prompts);
    }

    async writing(): Promise<void> {
        this.log(`Downloading latest template to ${this.templatePath()}`);
        this.spawnCommandSync("git", [
            "clone",
            "--depth=1",
            "--single-branch",
            "--branch", "sample-repository",
            "-q",
            "https://capgeminiuk.visualstudio.com/Capgemini%20Reusable%20IP/_git/Capgemini.Xrm.Templates",
            this.templatePath()
        ]);
        rimraf.sync(`${this.templatePath}/.git`);

        const outputPath: string =
            isDirectoryEmpty(this.destinationPath()) || (this.sourceRoot() === this.destinationPath()) ?
                "" : `${this.answers.client}.${this.answers.package}`;
        this.log("Building project to: " + this.destinationPath(outputPath));
        this.fs.copyTpl(this.templatePath(), this.destinationPath(outputPath), this.answers);
    }
};

function validateNamespace(input: string): boolean | string {
    return /^[a-zA-Z ]+$/.test(input) ? true : `Answer must not contain numeric or special characters.`;
}

function transformNamespace(input: string): string {
    return input.toLowerCase()
        .split(" ")
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join();
}

function validateUrl(input: string): boolean | string {
    return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/.test(input) ?
        true : "You must provide a valid URL.";
}

function validateEmail(input: string): boolean | string {
    // tslint:disable-next-line:max-line-length
    return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(input) ?
        true : "You must provide a valid email.";
}

function isDirectoryEmpty(dirname: string): boolean {
    return !readdirSync(dirname).length;
}