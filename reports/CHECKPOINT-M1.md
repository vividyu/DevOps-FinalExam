# Checkpoint 🛂  |  Milestone 1

## Work completed
* We created a skeleton based on [pipeline-template](https://github.com/CSC-DevOps/Pipeline-Template) to start our project
* Install necessary dependencies
* Implemented `pipeline init` command to automatically create a locally provisioned virtual machine 
## Work to be done
* Refine and improve build server auto-configuration from task #1
* Design a build job specification for Java application iTrust2
* Develop a component for reading and parsing the build.yml, updating necessary environment within the build environment, then performing the build steps

## Issues we ran into
1. When we tried to create a virtual machine using `pipeline init`, the IP address we assigned to the VM is 192.168.99.99. It worked on a Windows host, but we encountered the below problem when we tried it on macOS:
```
created adapter: vboxnet5
Executing VBoxManage hostonlyif ipconfig "vboxnet5" --ip 192.168.99.1
=> exec error: Error: Command failed: VBoxManage hostonlyif ipconfig "vboxnet5" --ip 192.168.99.1
VBoxManage: error: Code E_ACCESSDENIED (0x80070005) - Access denied (extended info not available)
VBoxManage: error: Context: "EnableStaticIPConfig(Bstr(pszIp).raw(), Bstr(pszNetmask).raw())" at line 242 of file VBoxManageHostonly.cpp
```
The reason is that, as of version 6.1.28, VirtualBox restricted the valid range for host-only networks.  On Linux, Mac OS X and Solaris Oracle VM VirtualBox will only allow IP addresses in the 192.168.56.0/21 range (192.168.56.1 -> 192.168.63.254) to be assigned to host-only adapters. VirtualBox allows additional IP ranges by creating `/etc/vbox/networks.conf` and specifying allowed ranges there.    
See the docs at https://www.virtualbox.org/manual/ch06.html#network_hostonly
## Screenshots of GitHub Project
![checkpoint1](/img-folder/checkpt1.png)
