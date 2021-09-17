function ModuleToImport 
    {
        param(
        [Parameter(Mandatory=$True)]$CheckModule)
        Write-Host "$CheckModule" 
        # If module is imported do nothing
        $checkModule =@($CheckModule)
                foreach($module in $checkModule)
                {
                    if (Get-Module | Where-Object { $_.Name -eq $module }) 
                        {
                            write-host "Module $module is already imported."
                        }
                    else 
                        {      
                            # Importing modules
                            Install-Module -Name $module -Verbose -Scope CurrentUser -Force                            
                        }
                }        
    }

function SPN_Connection
    {
        param(
        [Parameter(Mandatory=$True)]$ClientID,  
        [Parameter(Mandatory=$True)]$ClientSecret, 
        [Parameter(Mandatory=$True)]$TenantId, 
        [Parameter(Mandatory=$True)]$WorkSpaceName)  
        
        $client_Secreat = $ClientSecret| ConvertTo-SecureString -AsPlainText -Force 
        $credential = New-Object -TypeName System.Management.Automation.PSCredential -ArgumentList $ClientID, $client_Secreat
        #Connect to PowerBI
        Connect-PowerBIServiceAccount -ServicePrincipal -Credential $credential -TenantId "$TenantId"
        # Get PowerBI WorkSpace
        $workspace = Get-PowerBIWorkspace -Name $WorkSpaceName 
        Write-Host "Connect to PowerBI workSpace"
        return $workspace
    }

function Get_Token
    {
        param(
        [Parameter(Mandatory=$True)]$ClientID,  
        [Parameter(Mandatory=$True)]$ClientSecret, 
        [Parameter(Mandatory=$True)]$Authority,
        [Parameter(Mandatory=$True)]$Resource,
        [Parameter(Mandatory=$True)]$Admin_user_PowerBI,
        [Parameter(Mandatory=$True)]$Admin_password_PowerBI
        )
        
        #-------------------------------------------------------
                    # Get Authentication token
                         Write-Host "token generation is in Progress"
                        $authBody = @{
                            'resource'= $Resource
                            'client_id' = $ClientID
                            'client_secret'= $ClientSecret
                            'grant_type' = 'password'
                            'username' = $Admin_User_PowerBI
                            'password' = $Admin_Password_PowerBI
                            }
                         Write-Host "authbody created successfully"
                    #-------------------------------------------------------
                    #Authentiate to Power BI
                        Write-Host "Invoke-RestMethod -Uri $Authority -Body $authBody -Method POST"
                        $auth = Invoke-RestMethod -Uri $Authority -Body $authBody -Method POST -Verbose                        
                        Write-Host "token generated successfully"
                        
                        return $auth.access_token
    }

function Get_PBIToken
    {
        param(
        [Parameter(Mandatory=$True)]$ClientID,  
        [Parameter(Mandatory=$True)]$ClientSecret, 
        [Parameter(Mandatory=$True)]$TenantId)  
        
        $client_Secreat = $ClientSecret| ConvertTo-SecureString -AsPlainText -Force 
        $credential = New-Object -TypeName System.Management.Automation.PSCredential -ArgumentList $ClientID, $client_Secreat
        #Connect to PowerBI
        Connect-PowerBIServiceAccount -ServicePrincipal -Credential $credential -TenantId "$TenantId"

        $token = Get-PowerBIAccessToken
        $authHeader = @{
            'Content-Type'='application/json'
            'Authorization'=$token.Authorization
                        }
        Write-Host "Authentication Header created successfully"
        return $authHeader        
    }

function New_PBIReport
    {
        param(
            [Parameter(Mandatory=$True)]$Path,   
            [Parameter(Mandatory=$True)]$ConflictAction #Provide file upload option Ignore, Abort, Overwrite, CreateOrOverwrite
            )
                try
                    {
                        $ErrorActionPreference = "Stop"
                        $work_Space = SPN_Connection -ClientID $ClientID -ClientSecret $ClientSecret -TenantId $TenantId -workspacename $WorkSpaceName
                        $work_Space
                        $items = Get-ChildItem -Path $Path | Where {$_.extension -like ".pbix"}
                        foreach ($item in $items)
                            {
                            try
                                {
                                    Write-Host "Publish Report File to workspace Started : "
                                    
                                    $id= New-PowerBIReport -Path $item.FullName`
                                                                            -Name $item.BaseName`
                                                                                    -WorkspaceId $work_Space.ID -ConflictAction: $ConflictAction | Select -ExpandProperty "Id"
                                        
                            
                                        Write-Host "Report File : "$($item.BaseName)" Report ID : $id has been uploaded"
                                }
                            catch
                                {                                
                                    Write-Warning "Report Upload Error. This script is not overriding the reports."
                                    Write-Warning "Make sure to delete the existing file in PowerBI workspace, if same report file is trying to upload.." 
                                }
                            }
                            
                    }                        
            catch
                {
                    $Err = Resolve-PowerBIError -Last
                    Write-Error "Error encounters $($Err.Message) " -ErrorAction Stop
                }
     
    }


function Update_Parameter
    {
    param(
    [Parameter(Mandatory=$True)]$Dataset_Input,
    [Parameter(Mandatory=$True)]$Api_URL,
    [Parameter(Mandatory=$True)]$ClientID,  
    [Parameter(Mandatory=$True)]$ClientSecret, 
    [Parameter(Mandatory=$True)]$TenantId, 
    [Parameter(Mandatory=$True)]$WorkSpaceName,
    [Parameter(Mandatory=$True)]$ParameterCollection
    )

    try
        {
            $paramCollection = $ParameterCollection | ConvertFrom-Json
            $work_Space = SPN_Connection -ClientID $ClientID -ClientSecret $ClientSecret -TenantId $TenantId -workspacename $WorkSpaceName
            $auth_Header = Get_PBIToken -ClientID $ClientID -ClientSecret $ClientSecret -TenantId $TenantId
            Write-Host "Generated Authentication header successfully" 
            $datasetResponse = Invoke-PowerBIRestMethod -Url "groups/$($work_Space.ID)/datasets" -Method Get | ConvertFrom-Json
            
            $datasets = $datasetResponse.value
            $dataset_Input =@($Dataset_Input)
            $dataset_Input
            foreach($datasetinput in $dataset_Input)
                {
                foreach($dataset in $datasets)
                    { 
                    if($datasetinput -eq $dataset.Name)
                        {
                            $dataset_id = $dataset.id
                            Write-Host "DataSet is going to take over"
                            $url_TakeOver = "$api_URL/groups/$($work_Space.ID)/datasets/$dataset_id/Default.TakeOver"
                            $url_TakeOver
                            Invoke-RestMethod -Uri $url_TakeOver -Headers $auth_Header[1] -Method Post 
                            Write-Host "DataSet taken Over"
                            
                            $paramsList = [System.Collections.ArrayList]@()

                            foreach($param in $paramCollection)
                            {

$updateDetails = @"
{                                    
    "name": "$($param.ParamName)",
    "newValue": "$($param.ParamValue)"
}
"@;

                                $paramsList.Add($updateDetails)
                            }

                            if($paramsList.Count -gt 0)
                            {
                                $details = ""
                                if($paramsList.Count -gt 1)
                                {
                                    $details = $paramsList -Join ","
                                }
                                else
                                {
                                    $details = $paramsList
                                }

$body = @"
{
  "updateDetails": [
    $details
  ]
}
"@    

                                $URL_UpdateDataSource = "$api_URL/groups/$($Work_Space.ID)/datasets/$($dataset_id)/UpdateParameters"
                                Write-Host "Updating DataSource  $($datasetinput)"   
                                          
                                Invoke-RestMethod -Uri $URL_UpdateDataSource -Headers $auth_Header[1] -Method Post -Body $body -Verbose
                                Write-Host "Updated DataSource  $($datasetinput)"
                            }
                        }
                    }
                }
            }
        catch
            {
                $Err = Resolve-PowerBIError -Last
                Write-Error "Error encounters $($Err.Message) " -ErrorAction Stop
            }
        
    }

function Update_DataSourceCredential
    {
        param(
            [Parameter(Mandatory=$True)]$Dataset_Input,
            [Parameter(Mandatory=$True)]$Api_URL,
            [Parameter(Mandatory=$True)]$ClientID,  
            [Parameter(Mandatory=$True)]$ClientSecret, 
            [Parameter(Mandatory=$True)]$TenantId, 
            [Parameter(Mandatory=$True)]$WorkSpaceName,
            [Parameter(Mandatory=$True)]$Authority,
            [Parameter(Mandatory=$True)]$Resource,
            [Parameter(Mandatory=$True)]$Admin_User_PowerBI,
            [Parameter(Mandatory=$True)]$Admin_Password_PowerBI,
            [Parameter(Mandatory=$false)]$DataSource_Type
            )
        
            try
                {
                    $work_Space = SPN_Connection -ClientID $ClientID -ClientSecret $ClientSecret -TenantId $TenantId -workspacename $WorkSpaceName                    
                    $auth_Header = Get_PBIToken -ClientID $ClientID -ClientSecret $ClientSecret -TenantId $TenantId
                    
                    Write-Host "Generated Authentication header successfully" 
                    $datasetResponse = Invoke-PowerBIRestMethod -Url "groups/$($work_Space.ID)/datasets" -Method Get | ConvertFrom-Json
                    
                    $datasets = $datasetResponse.value
                    $dataset_Input =@($Dataset_Input)
                    $dataset_Input
                    foreach($datasetinput in $dataset_Input)
                        {
                        foreach($dataset in $datasets)
                            { 
                            if($datasetinput -eq $dataset.Name)
                                {
                                    $dataset_id = $dataset.id
                                    Write-Host "DataSet is going to take over"
                                    $url_TakeOver = "$Api_URL/groups/$($work_Space.ID)/datasets/$dataset_id/Default.TakeOver"
                                    $url_TakeOver
                                    Invoke-RestMethod -Uri $url_TakeOver -Headers $auth_Header[1] -Method Post 
                                    Write-Host "DataSet taken Over"
                                    $datasource_Type =@($DataSource_Type)

                                    foreach($dataset_input in $Datasource_Type)
                                    {                                                                                                    
                                        $DateSetGateWaysUrl = "$api_URL/groups/$($work_Space.ID)/datasets/$($dataset_id)/Default.GetBoundGatewayDatasources"
                                        $Gateways = Invoke-PowerBIRestMethod -Url $DateSetGateWaysUrl -Method Get | ConvertFrom-Json
                                        Write-Host "Gateways retrieved"

                                        $resourceToken = Get_Token -ClientID $ClientID -ClientSecret $ClientSecret -authority $Authority -Resource $Resource -Admin_User_PowerBI $Admin_User_PowerBI -Admin_Password_PowerBI $Admin_Password_PowerBI

$credDetails = @"
    {
        "credentialDetails": {
            "credentialType": "OAuth2",
            "credentials": "{\"credentialData\":[{\"name\":\"accessToken\", \"value\":\"$($resourceToken)\"}]}",
            "encryptedConnection": "Encrypted",
            "encryptionAlgorithm": "None",
            "privacyLevel": "None"
          }
    }
"@
                                    
                                        $datasourceconnectionurl = "$api_URL/gateways/$($Gateways.value.gatewayid)/datasources/$($Gateways.value.id)"
                                        $connectionreponse = Invoke-PowerBIRestMethod -Url $datasourceconnectionurl -Body $credDetails -Method Patch | ConvertFrom-Json
                                        Write-Host "DataSource Connection Updated"                                        
                                    }
                                }
                            }
                        }
                }
                catch
                    {
                        $Err = Resolve-PowerBIError -Last
                        Write-Error "Error encounters $($Err.Message) " -ErrorAction Stop
                    } 
    }