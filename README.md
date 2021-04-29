# Power Apps Project Generator

[![Build Status](https://capgeminiuk.visualstudio.com/GitHub%20Support/_apis/build/status/CI-Builds/NPM%20package/powerapps-project-template?branchName=master)](https://capgeminiuk.visualstudio.com/GitHub%20Support/_build/latest?definitionId=229&branchName=master)
![npm (scoped)](https://img.shields.io/npm/v/capgeminiuk/generator-powerapps-project)

This Yeoman generator scaffolds Power Apps projects. This includes:

- Source code
- Build pipelines
- Release pipelines

## Table of Contents

- [Power Apps Project Generator](#power-apps-project-generator)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
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

You must have the following installed globally before you can use this generator:

- [Node](https://nodejs.org/en/)
- [Yeoman](https://yeoman.io/)
- [PAC](https://docs.microsoft.com/en-us/powerapps/developer/data-platform/powerapps-cli)

If you already have Node installed, install Yeoman:

```
npm install -g yo
```

## Installation

### Install the generator package

Install the [@capgeminiuk/generator-powerapps-project](https://www.npmjs.com/package/@capgeminiuk/generator-powerapps-project) package globally:

```
npm install -g @capgeminiuk/generator-powerapps-project
```

## Usage

Ensure that you have updated to the latest version of the generator and that your shell's current working directory is an empty folder (when running the generator for the first time) or your scaffolded repository (when using sub-generators).

### Scaffold a project

A new project can be scaffolded using the main generator:

```bash
yo @capgeminiuk/powerapps-project
```

This generator requires you to enter some information about your project. The scaffolded artifacts include:

- IDE configuration files
- Boilerplate source code

### Scaffold Azure DevOps

An Azure DevOps project can be scaffolded using the `azuredevops` sub-generator:

```bash
yo @capgeminiuk/powerapps-project:azuredevops
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
yo @capgeminiuk/powerapps-project:solution
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
yo @capgeminiuk/powerapps-project:scripts
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
yo @capgeminiuk/powerapps-project:pluginassembly
```

Running this sub-generator:

- Creates a C# class library project targeting .NET Framework 4.6.2 within the specified solution folder. This project is pre-configured with required packages and code analysers.
- Updates the `spkl.json` file to include the assembly built by the newly created project. This allows the assembly to be deployed using the spkl task runner.
- Updates the `MappingFile.xml` file to include a file mapping of the plug-in assembly `.dll`. This will cause the Solution Packager to replace the assembly with the class library project build output when packing the solution

### Scaffold reference/configuration data migration for a solution

This sub-generator generates the source code required to support the migration of reference or configuration data. This can be done using the `data` sub-generator:

```bash
yo @capgeminiuk/powerapps-project:data
```

Creates a `data` folder which contains the `DataExport.json`, `DataImport.json`, and `DataSchema.xml` files for use with the Capgemini XRM Data Migrator tool. The `ImportConfig.xml` is also updated to include the import of the data.

## Known Issues
### Yeoman Permissions error
This happens when you have a .yo-rc-global file in the root of your user directory. It tries to scaffold to this location which is not ideal. To solve this remove this file.

### Git Hangs During scaffold
This happens when git does not have credentials set to the remote repository.

## License

Unlicensed © [Capgemini](https://capgemini.com)
