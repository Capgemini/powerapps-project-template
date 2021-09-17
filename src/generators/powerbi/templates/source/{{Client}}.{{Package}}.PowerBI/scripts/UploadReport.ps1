<#
 .SYNOPSIS
    PowerBi_Tool 

 .DESCRIPTION
    This script is used to call function defined in .PSM1 file

.PARAMETERS
        $BuildSourcesDirectory: Path to PowerShell module which is responsible for the interactions with Power BI Rest APIs. Can be selected from artifacts folder
        $checkModule : List of Modules that should be imported to run the script successfully. In this case you only need “MicrosoftPowerBIMgmt”
        $ClientID : Application Id of the app registration created as part of pre-requisites
        $ClientSecret : Secret that was added to this app registration as part of pre-requisites
        $TenantId : Tenant Id of the app registration
        $WorkSpaceName : target Workspace name
        $Path : Path of the '.pbix' file to import or override
        $ConflictAction : Determines what to do if dataset with the same name already exists. Create or Overwrite , Create , Overwrite
    #>

    [CmdletBinding()]  
    param(
        [Parameter(Mandatory=$true)][string]$BuildSourcesDirectory,
        [parameter(Mandatory=$true)]$checkModule, 
        [Parameter(Mandatory=$true)]$ClientID,  
        [Parameter(Mandatory=$true)]$ClientSecret, 
        [Parameter(Mandatory=$true)]$TenantId, 
        [Parameter(Mandatory=$true)]$WorkSpaceName,
        [Parameter(Mandatory=$true)]$Path,
        [Parameter(Mandatory=$true)]$ConflictAction    
    )

    Write-Host "Path of Release Directory :$BuildSourcesDirectory."
    # Importing UserCreationProcess.psm1 module.
    Import-Module "$BuildSourcesDirectory"
    Write-Host "Importing Module :$checkModule."
    # Importing Module ie. Active Directory .
    ModuleToImport -checkModule $checkModule

    #Upload PowerBI Report(pbix) to PowerBI workspace
    New_PBIReport -Path $path -ConflictAction $conflictaction

