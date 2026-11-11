param([Parameter(Mandatory=$true)][string]$Store)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$resolved=[IO.Path]::GetFullPath($Store)
$expected=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'MaplePath\Backups'))
if($resolved -ne $expected){throw 'Unexpected backup directory'}
[IO.Directory]::CreateDirectory($resolved) | Out-Null
$identity=[Security.Principal.WindowsIdentity]::GetCurrent().User
$acl=New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true,$false)
$acl.SetOwner($identity)
foreach($sid in @($identity,(New-Object Security.Principal.SecurityIdentifier('S-1-5-18')))){
    $rule=New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
    $acl.AddAccessRule($rule)
}
[IO.Directory]::SetAccessControl($resolved,$acl)
$keyPath=Join-Path $resolved 'key.dpapi'
if(!(Test-Path -LiteralPath $keyPath)){
    $key=New-Object byte[] 32
    $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($key)
    $rng.Dispose()
    $protected=[Security.Cryptography.ProtectedData]::Protect($key,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    $file=[IO.File]::Open($keyPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    try{$file.Write($protected,0,$protected.Length)}finally{$file.Dispose()}
}else{
    $key=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($keyPath),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
}
# Captured in the Node parent process, never printed by the backup CLI.
[Console]::Out.Write([Convert]::ToBase64String($key))
