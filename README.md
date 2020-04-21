# generator-cdspackage [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]
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

unlicense © [Capgemini]()


[npm-image]: https://badge.fury.io/js/generator-cdspackage.svg
[npm-url]: https://npmjs.org/package/generator-cdspackage
[travis-image]: https://travis-ci.org//generator-cdspackage.svg?branch=master
[travis-url]: https://travis-ci.org//generator-cdspackage
[daviddm-image]: https://david-dm.org//generator-cdspackage.svg?theme=shields.io
[daviddm-url]: https://david-dm.org//generator-cdspackage
