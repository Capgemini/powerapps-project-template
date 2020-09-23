# Power Apps Project Generator 
[![Build Status](https://dev.azure.com/capgeminiuk/Capgemini%20Reusable%20IP/_apis/build/status/generator-cdspackage?branchName=master)](https://dev.azure.com/capgeminiuk/Capgemini%20Reusable%20IP/_build/latest?definitionId=115&branchName=master)
[![NPM version](https://feeds.dev.azure.com/capgeminiuk/_apis/public/Packaging/Feeds/25162f08-da5e-4c04-bac0-40216eaa4bf9/Packages/48ba9982-c47a-4df2-bc62-3f560c69391d/badge?api-version=5.1-preview.1)](https://dev.azure.com/capgeminiuk/Capgemini%20Reusable%20IP/_packaging?_a=package&feed=CapgeminiIp&package=%40capgemini%2Fgenerator-cdspackage&protocolType=Npm)

This Yeoman generator scaffolds Power Apps projects. This includes:

- Source code
- Build pipelines
- Release pipelines

## Table of Contents
- [Power Apps Project Generator](#power-apps-project-generator)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
    - [Connect to the Capgemini UK npm feed](#connect-to-the-capgemini-uk-npm-feed)
    - [Install the generator package](#install-the-generator-package)
  - [Usage](#usage)
    - [Scaffold a project](#scaffold-a-project)
    - [Scaffold Azure DevOps](#scaffold-azure-devops)
    - [Scaffold a solution](#scaffold-a-solution)
    - [Scaffold a web resource project for a solution](#scaffold-a-web-resource-project-for-a-solution)
    - [Scaffold a custom workflow activity/plug-in assembly for a solution](#scaffold-a-custom-workflow-activityplug-in-assembly-for-a-solution)
    - [Scaffold reference/configuration data migration for a solution](#scaffold-referenceconfiguration-data-migration-for-a-solution)
  - [License](#license)

## Prerequisites

You must have [Node](https://nodejs.org/en/) and [Yeoman](https://yeoman.io/) installed globally before you can use this generator.

If you already have Node installed, install Yeoman: 

```
npm install -g yo
```

## Installation

### Connect to the Capgemini UK npm feed

The generator is currently published to a private npm feed hosted on Azure Artifacts. You can connect to the feed by following this [link](https://capgeminiuk.visualstudio.com/Microsoft%20Community/_packaging?_a=connect&feed=CapgeminiIp) and then selecting 'npm' from the list of available package managers. You should add the the registry to your user-scoped .npmrc file i.e. `C:\Users\\USERNAME\\.npmrc`.

### Install the generator package

Install the [@capgemini/generate-cdspackage](https://dev.azure.com/capgeminiuk/Microsoft%20Community/_packaging?_a=package&feed=CapgeminiIp&package=%40capgemini%2Fgenerator-cdspackage&protocolType=Npm) package globally: 

```
npm install -g @capgemini/generator-cdspackage
```

## Usage

Ensure that you have updated to the latest version of the generator and that your shell's current working directory is an empty folder (when running the generator for the first time) or your scaffolded repository (when using sub-generators).

### Scaffold a project

A new project can be scaffolded using the main generator:

```bash
yo @capgemini/cdspackage
```

This generator requires you to enter some information about your project. The scaffolded artifacts include:

- IDE configuration files
- Boilerplate source code

### Scaffold Azure DevOps

An Azure DevOps project can be scaffolded using the `azuredevops` sub-generator:

```bash
yo @capgemini/cdspackage:azuredevops
```

This generator requires you to enter some information about your project as well as an Azure DevOps personal access token and a tenant ID, application ID, and client secret of an Azure service principal. The scaffolded artifacts include:

- Azure DevOps repository
- Azure DevOps extensions
- Azure DevOps variables
- Azure DevOps service connections
- Azure DevOps build pipelines
- Azure DevOps release pipeline

> You can easily generate the service principal using the script provided by Microsoft [here](https://docs.microsoft.com/en-us/power-platform/alm/devops-build-tools#create-service-principal-and-client-secret-using-powershell). This will output the information required for the scaffolder.

### Scaffold a solution

A new solution within the package can be scaffolded using the `solution` sub-generator:

```bash
yo @capgemini/cdspackage:solution
```

This sub-generator requires some information about your solution and generates the source code required to support the source control, build, and deployment of this solution.

> This does __not__ create a solution within the Common Data Service environment. The corresponding solution must be created manually and extracted after scaffolding.

Running this sub-generator:

- Creates a corresponding folder within the `src/solutions` directory. This folder contains:
    - A `MappingFile.xml` file which is used when packing the solution with the solution packager
    - A `spkl.json` file which is used to contain [spkl task runner](https://github.com/scottdurow/SparkleXrm/wiki/spkl) configuration 
    - An `environment.json` file which stores information regarding the development and staging (if applicable) environments for the solution
- Updates the `ImportConfig.xml` file within the deployment project is updated to include the scaffolded solution in the deployment
- Updates the `.vscode/tasks.json` file to allow for build tasks to be ran against the new solution

### Scaffold a web resource project for a solution

This sub-generator generates the source code required to support the development of script web resources. A new web resource project can be generated within a solution using the `scripts` sub-generator:

```bash
yo @capgemini/cdspackage:scripts
```

Running this sub-generator:

- Creates a `WebResources/Scripts` folder within the specified solution folder. This folder contains:
    - A `tsconfig.json` file for TypeScript configuration
    - A `tslint.json` file for TSLint configuration
    - A `package.json` file for managing npm dependencies
- Updates the `spkl.json` file to include an empty `webresource` array which can be used to deploy the web resources with the spkl task runner
- Updates the `MappingFile.xml` file to include a wildcard file mapping of all WebResources files. This will cause the Solution Packager to replace the web resources with the TypeScript compilation output when packing the solution

### Scaffold a custom workflow activity/plug-in assembly for a solution

This sub-generator generates the source code required to support the development of custom workflow activities and plug-ins. A new custom workflow activity/plug-in project can be generated within a solution using the `pluginassembly` sub-generator:

```bash
yo @capgemini/cdspackage:pluginassembly
```

Running this sub-generator:

- Creates a C# class library project targeting .NET Framework 4.6.2 within the specified solution folder. This project is pre-configured with required packages and code analysers.
- Updates the `spkl.json` file to include the assembly built by the newly created project. This allows the assembly to be deployed using the spkl task runner.
- Updates the `MappingFile.xml` file to include a file mapping of the plug-in assembly `.dll`. This will cause the Solution Packager to replace the assembly with the class library project build output when packing the solution

### Scaffold reference/configuration data migration for a solution

This sub-generator generates the source code required to support the migration of reference or configuration data. This can be done using the `data` sub-generator:

```bash
yo @capgemini/cdspackage:data
```

Creates a `data` folder which contains the `DataExport.json`, `DataImport.json`, and `DataSchema.xml` files for use with the Capgemini XRM Data Migrator tool. The `ImportConfig.xml` is also updated to include the import of the data.

##Known Issues
###Yeoman Permissions error
This happens when you have a .yo-rc-global file in the root of your user directory. It tries to scaffold to this location which is not ideal. To solve this remove this file.

###Git Hangs During scaffold
This happens when git does not have credentials set to the remote repository.

## License

Unlicensed © [Capgemini](https://capgemini.com)
