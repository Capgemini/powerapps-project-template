# generator-cdspackage 
[![Build Status](https://dev.azure.com/capgeminiuk/Capgemini%20Reusable%20IP/_apis/build/status/generator-cdspackage?branchName=master)](https://dev.azure.com/capgeminiuk/Capgemini%20Reusable%20IP/_build/latest?definitionId=115&branchName=master)
[![NPM version](https://feeds.dev.azure.com/capgeminiuk/_apis/public/Packaging/Feeds/25162f08-da5e-4c04-bac0-40216eaa4bf9/Packages/48ba9982-c47a-4df2-bc62-3f560c69391d/badge?api-version=5.1-preview.1)](https://dev.azure.com/capgeminiuk/Capgemini%20Reusable%20IP/_packaging?_a=package&feed=CapgeminiIp&package=%40capgemini%2Fgenerator-cdspackage&protocolType=Npm)

> A generator for creating the entire package for CDS (MS Dynamics and Power Apps) solutions

## Installation

1.	Install the latest version of node from https://nodejs.org/en/
2.	Install yeoman globally by running the following command 
```bash
npm install -g yo
```
3.	Edit your user .npmrc file (located at “C:\Users\{username}\.npmrc”) to include the Capgemini npm package source. Add the following lines:
```bash
registry=https://capgeminiuk.pkgs.visualstudio.com/_packaging/CapgeminiIp/npm/registry/
always-auth=true
```

4.	Run the following command from a powershell or command prompt window

```bash
vsts-npm-auth -config .npmrc
```
5.	Then run the following command to install the “CDS Package Generator” 
```bash
npm install -g @capgemini/generator-cdspackage 
```

## Running the generators
Once the cdspackage generator has been installed the following commands be run from a command prompt:

Scaffold a project
```bash
yo @capgemini/cdspackage
```
Add a solution to scaffolded project
```bash
yo @capgemini/cdspackage:solution
```
Add a web resource project to a chosen solution
```bash
yo @capgemini/cdspackage:scripts
```
Add a CWA/plugin assembly to a chosen solution
```bash
yo @capgemini/cdspackage:pluginassembly
```
Add a capgemini data migrator setup for a chosen solution
```bash
yo @capgemini/cdspackage:data
```
## Getting To Know Yeoman

 * Yeoman has a heart of gold.
 * Yeoman is a person with feelings and opinions, but is very easy to work with.
 * Yeoman can be too opinionated at times but is easily convinced not to be.
 * Feel free to [learn more about Yeoman](http://yeoman.io/).


## License

Unlicense © [Capgemini](https://cpagemini.com)
