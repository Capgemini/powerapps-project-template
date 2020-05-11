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
3.	Edit your user .npmrc file (located at “C:\Users\\{username}\\.npmrc”) to include the Capgemini npm package source. Add the following lines:
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

### Scaffold a project
```bash
yo @capgemini/cdspackage
```
Downloads the base package (found `./src/generators/app/templates/source`), injecting in the provided names. This includes:
- Cake scripts and required dependencies
- A set of VS projects to support the separation of business logic
- A 'Deploy' VS project as a custom PackageDeployer dll
- A set of VS projects for Unit, UI, and Integration testing
- A set of ADO pipeline definitions for PR validation, build and extract.

Afterwards, the first commit is made and pushed to a newly created Azure Repo within your chosen project. This is followed by configuring the ADO project through:
- Installing extensions
- Adding variable libraries and values
- Creating service connections
- Configuring build and release pipelines.

### Add a Power Apps/Automate solution to scaffolded project
```bash
yo @capgemini/cdspackage:solution
```
Creates a folder within the `Solutions` directory which simply contains a `MappingFile.xml`, a `spkl.json` and an `environment.json` file. The `environment.json` file stores the environment URL and it's staging environment, if one exists. Next, the VS Code tasks configuration and the import configuration of the Deploy project are updated to include the newly registered solution.

This __does not create a Power Apps solution__ within the given environment, nor does it automatically extract the solution. To now extract the solution, within VS Code:
1. Open the command palette 
2. Search "Run Task"
3. Select "Extract"
4. Select the new solution listed.

### Add a web resource project (scripts) to a chosen solution
```bash
yo @capgemini/cdspackage:scripts
```
Creates an NPM package within a given solution which includes the standard dev dependencies and `tsconfig` and `tslint` configuration.

The `spkl.json` file is updated to include an empty webresource array which can be used to deploy them to the environment using the spkl CLI. 

The `MappingFile.xml` file is updated to include a wildcard file mapping of all WebResources files. This means the script built locally (or in a pipeline) are used when packing rather than those downloaded within the solution.

### Add a CWA/plugin assembly to a chosen solution
```bash
yo @capgemini/cdspackage:pluginassembly
```
Creates a CS project within a given solution which includes the standard Nuget packages, analyzers and a maintained ruleset definition.

The `spkl.json` file is updated to include the newly created assembly which is used to deploy to the environment. 

The `MappingFile.xml` file is updated to include a file mapping of the `.dll` for the extracted solution. This means the assembly built locally (or in a pipeline) is used when packing the solution rather than the download within the solution.

### Add a capgemini data migrator setup for a chosen solution
```bash
yo @capgemini/cdspackage:data
```
Creates a `Data/` folder which contains the `DataExport.json`, `DataImport.json`, and `DataSchema.xml` files for use with the Capgemini XRM Data Migrator tool.

The `MappingFile.xml` file is updated to include a file mapping of the `.dll` for the extracted solution. This means the assembly built locally (or in a pipeline) is used when packing rather than the file downloaded within the solution.

---

## Getting To Know Yeoman

 * Yeoman has a heart of gold.
 * Yeoman is a person with feelings and opinions, but is very easy to work with.
 * Yeoman can be too opinionated at times but is easily convinced not to be.
 * Feel free to [learn more about Yeoman](http://yeoman.io/).


## License

Unlicense © [Capgemini](https://capgemini.com)
