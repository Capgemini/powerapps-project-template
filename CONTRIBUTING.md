# Contributing

This generator is build using the framework provided by [yeoman](https://yeoman.io/), a tool build on a plugin architecture allowing anyone to build custom generators, just like this. Additionally, this is written in [TypeScript](https://www.typescriptlang.org/).

__There are a couple of ways you can contribute to this project, and all are welcome!__ 

## Table of Contents
1. [Package Anatomy](#package-anatomy)
2. ["Source" code change](#source-code-change)
3. [Generating process change](#generating-process-change)

---

## Package Anatomy
Firstly, how is this package structured? Well, all source code is within `src/` which contains two further directories. `common/` stores several utilities used across the generators, which is the next. `generators/` stores each of the generators with `app` being the default and the others callable via `@capgemini/csdpackage:[directory]`. 

Each generator will contain an `index.ts` file which exports a class extending `Generator`. Optionally any other files and directories can be created to support that generator - like any NodeJS script, it can import whatever it needs but this file orchestrates the process. By convention, all our generators have a `templates/` directory containing the raw files to be copied/merged to the target directory.

At this point, things get a little complicated... if you need to know more check out the docs provided by yeoman [here](https://yeoman.io/authoring/index.html).

---

## "Source" code change
For a simple change of the "raw" files that make up the generated package, check out `templates/` of the generator you'd like to edit - probably `app` (`./src/generators/app/templates`). 

Although simple, this is where much of the power of this generator lies. Be it updating npm/nuget dependency versions or adding to the code analysers - these are all config which is simply lifted and shifted for __NEW projects__. I'll remind you again, this generator can't update existing packages. 

An easy way to contribute would be to apply any config changes you make to a project-specific package to the template(s) of this, assuming  they add value for a future project.

> These changes are often simple enough to be made via Azure DevOps online editors to save you even cloning the project. 😀

---

## Generating process change
If you'd like to make a change to package in terms of the tasks to carries out (such as configuring Azure DevOps) then you'll need to understand a little more regarding how the generators are executed. At the end of the day though, these are just NodeJS scripts executing which you can hopefully follow.  

Please go to the Yeoman docs if you need more help, especially these:
- https://yeoman.io/authoring/index.html#running-the-generator
- https://yeoman.io/authoring/running-context.html#the-run-loop
