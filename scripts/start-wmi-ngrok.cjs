const { execSync } = require('child_process');
const fs = require('fs');

// We use PowerShell with properly escaped arguments to create process via WMI
const logPath = 'C:\\Users\\sagla\\OneDrive\\Belgeler\\MD3E for web\\ngrok.log';
const commandToRun = `ngrok http 3000 --log="${logPath}"`;

const psScript = `
$cmd = '${commandToRun.replace(/'/g, "''")}';
$res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = $cmd};
Write-Host "Created PID: " $res.ProcessId;
`;

try {
  const out = execSync(`powershell -NoProfile -Command "${psScript.replace(/\r?\n/g, ' ')}"`, { encoding: 'utf8' });
  console.log(out);
} catch (e) {
  console.error('Failed to create via WMI:', e.message);
}
