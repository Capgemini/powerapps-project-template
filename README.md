# generator-cdspackage 
[![Build Status](https://dev.azure.com/capgeminiuk/Capgemini%20Reusable%20IP/_apis/build/status/generator-cdspackage?branchName=master)](https://dev.azure.com/capgeminiuk/Capgemini%20Reusable%20IP/_build/latest?definitionId=115&branchName=master)
[![NPM version](https://feeds.dev.azure.com/capgeminiuk/_apis/public/Packaging/Feeds/25162f08-da5e-4c04-bac0-40216eaa4bf9/Packages/48ba9982-c47a-4df2-bc62-3f560c69391d/badge?api-version=5.1-preview.1)](https://dev.azure.com/capgeminiuk/Capgemini%20Reusable%20IP/_packaging?_a=package&feed=CapgeminiIp&package=%40capgemini%2Fgenerator-cdspackage&protocolType=Npm)

> A generator for creating the entire package for CDS (MS Dynamics and Power Apps) solutions.

## Table of Contents
1. [Installation and setup](#installation)
2. [Usage](#usage)
3. [Contributing](./CONTRIBUTING.md)
4. [Licence](#license)

---

## Installation

Before using this tool, it must first be installed. As the generator package is published to a private npm feed, follow the below steps to connect to the feed or visit [here](https://dev.azure.com/capgeminiuk/Microsoft%20Community/_packaging?_a=connect&feed=CapgeminiIp) if you still need a hand. 

1.	Install the latest version of node from https://nodejs.org/en/.
2.	Install [yeoman](https://yeoman.io/) globally by running the following command.
    ```bash
    npm install -g yo
    ```
3.	Install [vsts-npm-auth](https://www.npmjs.com/package/vsts-npm-auth) which provides a means to authenticate a private npm Azure Artifacts feed.
    ```bash
    npm install -g vsts-npm-auth --registry https://registry.npmjs.com --always-auth false
    ```
4.  Navigate to your user directory and edit the .npmrc file (`C:\Users\{username}\.npmrc`) to include the CapgeminiIp npm package source. Add the following lines:
    ```text
    registry=https://capgeminiuk.pkgs.visualstudio.com/_packaging/CapgeminiIp/npm/registry/
    always-auth=true
    ```
4.	Staying within your user directory, run the previously installed tool to authenticate the feed with a personal PAC token.
    ```bash
    vsts-npm-auth -config .npmrc
    ```
5.	Now the feed is registered and you're authenticated, install the [@capgemini/generate-cdspackage](https://dev.azure.com/capgeminiuk/Microsoft%20Community/_packaging?_a=package&feed=CapgeminiIp&package=%40capgemini%2Fgenerator-cdspackage&protocolType=Npm).
    ```bash
    npm install -g @capgemini/generator-cdspackage 
    ```

---

## Usage
Once the package has been installed, several generators will be available to run from the `yo` CLI. Before running these, please make sure you the `@capgemini/generate-cdspackage` is updated and your command prompt/shell/terminal is within your (current or new) project directory. 

> Note that this section does not explain the usage of the Cake tasks which can be found within the README of the generated package instead.

### Scaffold a project
```bash
yo @capgemini/cdspackage
```
This instantiates a new project and should be run in a completely clean folder where it will download the base package (found `./src/generators/app/templates/source`), injecting in the provided names. This includes:
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

> This should not be run over the top of an existing package. Due to the current coupling with configuring Azure DevOps, this means you can't get any "source" updates made to the generator.   

### Add a Power Apps/Automate solution to scaffolded project
```bash
yo @capgemini/cdspackage:solution
```
Creates a folder within the `Solutions` directory which simply contains a `MappingFile.xml`, a `spkl.json` and an `environment.json` file. The `environment.json` file stores the environment URL and it's staging environment if one provided. Next, the VS Code tasks configuration and the import configuration of the Deploy project are updated to include the newly registered solution.

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

### Add a Capgemini Data Migrator set up for a chosen solution
```bash
yo @capgemini/cdspackage:data
```
Creates a `Data/` folder which contains the `DataExport.json`, `DataImport.json`, and `DataSchema.xml` files for use with the Capgemini XRM Data Migrator tool.

The `MappingFile.xml` file is updated to include a file mapping of the `.dll` for the extracted solution. This means the assembly built locally (or in a pipeline) is used when packing rather than the file downloaded within the solution.

---

## License

Unlicensed © [Capgemini](https://capgemini.com)
